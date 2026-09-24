/* ============================================================
   Site Ledger — Construction Cost & Progress Tracker
   Pure client-side app. All data lives in localStorage.
   ============================================================ */

const LS_KEY = "siteLedger.v2";      // multi-project store
const LEGACY_KEY = "siteLedger.v1";  // single-project data from the old version
const INR = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

/* ---------- Default data (pre-listed materials) ---------- */
function defaultMaterials() {
  const rows = [
    // category, name, unit, defaultRate
    ["Earthwork & Foundation", "PCC (Plain Cement Concrete)", "cu.ft", 220],
    ["Earthwork & Foundation", "Footing RCC concrete", "cu.ft", 260],
    ["Earthwork & Foundation", "Reinforcement steel (footing)", "kg", 78],
    ["Earthwork & Foundation", "Anti-termite treatment", "sqft", 12],
    ["Structure (RCC)", "Cement (OPC 53 grade)", "bag", 420],
    ["Structure (RCC)", "River sand", "unit (100 cu.ft)", 5500],
    ["Structure (RCC)", "20mm aggregate (blue metal)", "unit (100 cu.ft)", 6200],
    ["Structure (RCC)", "TMT reinforcement steel (Fe550)", "kg", 78],
    ["Structure (RCC)", "Shuttering / centering plywood", "sqft", 35],
    ["Structure (RCC)", "Column & beam concrete (RMC)", "cu.m", 6800],
    ["Structure (RCC)", "Slab concrete (RMC)", "cu.m", 6800],
    ["Masonry", "Red clay bricks", "1000 nos", 7500],
    ["Masonry", "Solid / hollow concrete blocks", "1000 nos", 42000],
    ["Masonry", "Masonry cement mortar", "bag", 380],
    ["Roofing", "Roofing slab waterproofing compound", "sqft", 45],
    ["Roofing", "Terrace tiles / weathering course", "sqft", 60],
    ["Plumbing & Sanitary", "CPVC / PVC piping", "rft", 55],
    ["Plumbing & Sanitary", "Sanitary fittings (WC, wash basin, taps)", "set", 8500],
    ["Plumbing & Sanitary", "Overhead water tank (Sintex-type)", "no", 6500],
    ["Plumbing & Sanitary", "Underground sump construction", "no", 35000],
    ["Electrical", "Copper wiring (1.5–4 sq.mm)", "rft", 22],
    ["Electrical", "Switches, sockets & MCB distribution board", "point", 650],
    ["Electrical", "Conduit piping (electrical)", "rft", 18],
    ["Electrical", "Light fittings & fans", "no", 1500],
    ["Doors & Windows", "Main door (teak/engineered wood)", "no", 22000],
    ["Doors & Windows", "Internal flush doors", "no", 7500],
    ["Doors & Windows", "UPVC / aluminium windows", "sqft", 450],
    ["Flooring & Tiling", "Vitrified floor tiles", "sqft", 85],
    ["Flooring & Tiling", "Bathroom / kitchen tiles", "sqft", 70],
    ["Flooring & Tiling", "Tile adhesive & grout", "bag", 350],
    ["Painting & Finishing", "Wall putty", "bag", 380],
    ["Painting & Finishing", "Primer", "litre", 220],
    ["Painting & Finishing", "Exterior emulsion paint", "litre", 380],
    ["Painting & Finishing", "Interior emulsion paint", "litre", 320],
    ["Miscellaneous", "Compound wall & gate", "rft", 850],
    ["Miscellaneous", "Staircase railing", "rft", 950],
  ];
  return rows.map((r, i) => ({
    id: "m" + i,
    category: r[0], name: r[1], unit: r[2],
    qty: 0, rate: r[3],
  }));
}

function defaultOtherCosts() {
  const rows = [
    ["Land & Approvals", "Plot cost"],
    ["Land & Approvals", "Registration & stamp duty"],
    ["Land & Approvals", "Building plan approval (Panchayat / Corporation)"],
    ["Land & Approvals", "Architect & structural design fees"],
    ["Utilities", "Bore well drilling & motor"],
    ["Utilities", "Electricity (EB) service connection"],
    ["Utilities", "Sewage / septic tank connection"],
    ["Labour & Execution", "Mason & labour charges"],
    ["Labour & Execution", "Contractor supervision / overhead"],
    ["Labour & Execution", "Equipment rental (mixer, scaffolding, hoist)"],
    ["Contingency", "Miscellaneous & contingency (5–8% buffer)"],
  ];
  return rows.map((r, i) => ({ id: "o" + i, category: r[0], name: r[1], amount: 0 }));
}

function defaultStages() {
  const rows = [
    ["Site clearance & layout marking", 2],
    ["Excavation & earthwork", 3],
    ["Foundation (PCC + footing)", 8],
    ["Plinth beam & backfilling", 5],
    ["RCC framework — columns, beams, slab", 25],
    ["Brick / block masonry", 15],
    ["Roofing & slab finishing", 5],
    ["Electrical & plumbing rough-in", 8],
    ["Plastering (internal & external)", 8],
    ["Flooring & tiling", 8],
    ["Doors & windows fixing", 5],
    ["Painting & finishing", 6],
    ["Final fittings & handover", 2],
  ];
  return rows.map((r, i) => ({ id: "s" + i, name: r[0], weight: r[1], pct: 0 }));
}

/* ---------- Project data shape ---------- */
function defaultProjectData() {
  return {
    materials: defaultMaterials(),
    other: defaultOtherCosts(),
    stages: defaultStages(),
    plot: { length: 40, width: 30, floors: 2, floorHeight: 10, setbackFront: 5, setbackSide: 3 },
    sell: { builtupArea: 0, rate: 0, override: null },
    images: [], // {id, name, dataURL}
  };
}

/* ---------- Store: multiple named projects ---------- */
let store = loadStore();
let state = store.projects[store.activeId].data; // "state" = the ACTIVE project's data

function loadStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through */ }

  // One-time migration: bring over data from the old single-project version, if present.
  let migratedData = null, migratedName = "My Project";
  try {
    const old = localStorage.getItem(LEGACY_KEY);
    if (old) {
      const parsed = JSON.parse(old);
      migratedName = parsed.projectName || "My Project";
      delete parsed.projectName;
      migratedData = parsed;
    }
  } catch (e) { /* ignore */ }

  const id = "p" + Date.now();
  return {
    activeId: id,
    projects: { [id]: { name: migratedName, data: migratedData || defaultProjectData() } },
  };
}
function saveStore() {
  store.projects[store.activeId].data = state;
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); }
  catch (e) { console.warn("Could not save (storage may be full):", e); }
  scheduleCloudSync();
}
function saveState() { saveStore(); }

function switchProject(id) {
  if (!store.projects[id]) return;
  store.activeId = id;
  state = store.projects[id].data;
  saveStore();
  renderAll();
}
function createProject() {
  const name = prompt("Name this project (e.g. site/plot address):", "New Project");
  if (name === null) return;
  const id = "p" + Date.now();
  store.projects[id] = { name: name.trim() || "New Project", data: defaultProjectData() };
  store.activeId = id;
  saveStore();
  renderAll();
}
function renameProject() {
  const current = store.projects[store.activeId];
  const name = prompt("Rename project:", current.name);
  if (name === null || !name.trim()) return;
  current.name = name.trim();
  saveStore();
  renderProjectSwitcher();
}
function deleteProject() {
  const ids = Object.keys(store.projects);
  if (ids.length <= 1) { alert("You need at least one project — create a new one before deleting this."); return; }
  const current = store.projects[store.activeId];
  if (!confirm(`Delete "${current.name}"? This can't be undone.`)) return;
  delete store.projects[store.activeId];
  store.activeId = Object.keys(store.projects)[0];
  state = store.projects[store.activeId].data;
  saveStore();
  renderAll();
}
function exportProject() {
  const current = store.projects[store.activeId];
  const blob = new Blob([JSON.stringify({ name: current.name, data: current.data }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (current.name || "project").replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "-") + ".json";
  a.click();
  URL.revokeObjectURL(url);
}
function importProjectFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const id = "p" + Date.now();
      store.projects[id] = { name: (parsed.name || file.name.replace(/\.json$/i, "")) + " (imported)", data: parsed.data || defaultProjectData() };
      store.activeId = id;
      saveStore();
      renderAll();
    } catch (e) {
      alert("Couldn't read that file — make sure it's a project export from this app.");
    }
  };
  reader.readAsText(file);
}
function renderProjectSwitcher() {
  const sel = document.getElementById("projectSelect");
  const ids = Object.keys(store.projects);
  sel.innerHTML = ids.map(id => `<option value="${id}" ${id === store.activeId ? "selected" : ""}>${escapeHtml(store.projects[id].name)}</option>`).join("");
  document.getElementById("projTitleEcho").textContent = store.projects[store.activeId].name || "your build";
}
document.getElementById("projectSelect").addEventListener("change", e => switchProject(e.target.value));
document.getElementById("newProjectBtn").addEventListener("click", createProject);
document.getElementById("renameProjectBtn").addEventListener("click", renameProject);
document.getElementById("deleteProjectBtn").addEventListener("click", deleteProject);
document.getElementById("exportProjectBtn").addEventListener("click", exportProject);
document.getElementById("importProjectBtn").addEventListener("click", () => document.getElementById("importProjectFile").click());
document.getElementById("importProjectFile").addEventListener("change", e => {
  if (e.target.files[0]) importProjectFile(e.target.files[0]);
  e.target.value = "";
});

/* ============================================================
   FIREBASE SYNC (optional) — same Google account = same data
   on every device. Falls back to local-only if not configured.
   Only the ledger data syncs (materials/costs/stages/plot/sell/
   project names). Uploaded plan/elevation images stay local to
   each device to keep documents small and free-tier friendly.
   ============================================================ */
let fbApp = null, fbAuth = null, fbDb = null, fbUser = null;
let applyingRemote = false, lastPushedAt = null, syncTimer = null;

function firebaseConfigured() {
  return typeof firebaseConfig !== "undefined"
    && firebaseConfig.apiKey && firebaseConfig.apiKey !== "REPLACE_ME";
}

function initFirebase() {
  if (typeof firebase === "undefined" || !firebaseConfigured()) {
    updateSyncUI(); // stays in "local only" mode
    return;
  }
  fbApp = firebase.initializeApp(firebaseConfig);
  fbAuth = firebase.auth();
  fbDb = firebase.firestore();
  fbAuth.onAuthStateChanged(user => {
    fbUser = user;
    updateSyncUI();
    if (user) attachRemoteListener();
  });
}

function signIn() {
  if (!firebaseConfigured()) {
    alert("Firebase isn't set up yet — add your project's keys to firebase-config.js first (see README).");
    return;
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  fbAuth.signInWithPopup(provider).catch(e => alert("Sign-in failed: " + e.message));
}
function signOutUser() { fbAuth.signOut(); }

function stripImagesForCloud(s) {
  const copy = JSON.parse(JSON.stringify(s));
  Object.values(copy.projects).forEach(p => { p.data.images = []; });
  return copy;
}

function attachRemoteListener() {
  fbDb.collection("users").doc(fbUser.uid).onSnapshot(snap => {
    if (!snap.exists) { pushToCloud(); return; } // first sign-in on this account: seed the cloud
    const remote = snap.data();
    if (remote.updatedAt && remote.updatedAt === lastPushedAt) return; // ignore echo of our own write
    applyingRemote = true;
    const localImages = {};
    Object.entries(store.projects).forEach(([id, p]) => { localImages[id] = p.data.images || []; });
    store = remote.store;
    // keep this device's own uploaded images (they never left this device)
    Object.entries(store.projects).forEach(([id, p]) => { p.data.images = localImages[id] || p.data.images || []; });
    if (!store.projects[store.activeId]) store.activeId = Object.keys(store.projects)[0];
    state = store.projects[store.activeId].data;
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
    renderAll();
    applyingRemote = false;
  }, err => console.warn("Sync listener error:", err));
}

function pushToCloud() {
  if (!fbUser) return;
  lastPushedAt = Date.now();
  fbDb.collection("users").doc(fbUser.uid)
    .set({ store: stripImagesForCloud(store), updatedAt: lastPushedAt })
    .catch(e => console.warn("Cloud sync failed:", e));
}
function scheduleCloudSync() {
  if (!fbUser || applyingRemote) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushToCloud, 900);
}

function updateSyncUI() {
  const dot = document.getElementById("syncDot");
  const statusEl = document.getElementById("syncStatus");
  const signInBtn = document.getElementById("signInBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  if (fbUser) {
    dot.classList.add("on");
    statusEl.textContent = `Synced as ${fbUser.email || fbUser.displayName || "signed-in user"}`;
    signInBtn.style.display = "none";
    signOutBtn.style.display = "inline-block";
  } else {
    dot.classList.remove("on");
    statusEl.textContent = firebaseConfigured()
      ? "Local only on this device — sign in to sync across phone & laptop"
      : "Local only on this device (Firebase not configured — see README)";
    signInBtn.style.display = "inline-block";
    signOutBtn.style.display = "none";
  }
}
document.getElementById("signInBtn").addEventListener("click", signIn);
document.getElementById("signOutBtn").addEventListener("click", signOutUser);
initFirebase();

/* ---------- Derived totals ---------- */
function materialsTotal() {
  return state.materials.reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.rate) || 0), 0);
}
function otherTotal() {
  return state.other.reduce((s, o) => s + (Number(o.amount) || 0), 0);
}
function totalCost() { return materialsTotal() + otherTotal(); }
function overallProgress() {
  const totalWeight = state.stages.reduce((s, x) => s + x.weight, 0) || 1;
  const done = state.stages.reduce((s, x) => s + x.weight * (x.pct / 100), 0);
  return (done / totalWeight) * 100;
}
function sellingTotal() {
  if (state.sell.override !== null && state.sell.override !== "" && !isNaN(state.sell.override)) {
    return Number(state.sell.override);
  }
  return (Number(state.sell.builtupArea) || 0) * (Number(state.sell.rate) || 0);
}

/* ============================================================
   NAVIGATION
   ============================================================ */
document.querySelectorAll(".rail-btn[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".rail-btn[data-view]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById("view-" + btn.dataset.view).classList.add("active");
    if (btn.dataset.view === "dashboard") renderDashboard();
    if (btn.dataset.view === "plans") { renderGallery(); initThree(); updateMassing(); }
    if (btn.dataset.view === "profit") renderProfit();
  });
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm(`Reset "${store.projects[store.activeId].name}" (materials, costs, progress, images) back to defaults? Other projects aren't affected.`)) {
    state = defaultProjectData();
    saveStore();
    renderAll();
  }
});

/* ============================================================
   MATERIALS TABLE
   ============================================================ */
function renderMaterials() {
  const wrap = document.getElementById("materialsTableWrap");
  const byCat = {};
  state.materials.forEach(m => { (byCat[m.category] ||= []).push(m); });

  let html = `<table class="data"><thead><tr>
    <th>Material</th><th class="unit-cell">Unit</th><th class="qty-cell">Quantity</th>
    <th class="rate-cell">Rate (₹)</th><th style="text-align:right">Amount</th><th></th>
  </tr></thead><tbody>`;

  Object.keys(byCat).forEach(cat => {
    html += `<tr class="cat-row"><td colspan="6">${escapeHtml(cat)}</td></tr>`;
    byCat[cat].forEach(m => {
      const amt = (Number(m.qty) || 0) * (Number(m.rate) || 0);
      html += `<tr data-id="${m.id}">
        <td><input class="f-name" value="${escapeAttr(m.name)}"></td>
        <td class="unit-cell"><input class="f-unit" value="${escapeAttr(m.unit)}"></td>
        <td class="qty-cell"><input class="f-qty" type="number" value="${m.qty}"></td>
        <td class="rate-cell"><input class="f-rate" type="number" value="${m.rate}"></td>
        <td class="amt">${INR(amt)}</td>
        <td><button class="del" data-id="${m.id}">✕</button></td>
      </tr>`;
    });
  });

  html += `</tbody><tfoot><tr><td colspan="4">Materials total</td><td class="amt">${INR(materialsTotal())}</td><td></td></tr></tfoot></table>`;
  wrap.innerHTML = html;

  wrap.querySelectorAll("tr[data-id]").forEach(row => {
    const id = row.dataset.id;
    const mat = state.materials.find(m => m.id === id);
    row.querySelector(".f-name").addEventListener("input", e => { mat.name = e.target.value; saveState(); });
    row.querySelector(".f-unit").addEventListener("input", e => { mat.unit = e.target.value; saveState(); });
    row.querySelector(".f-qty").addEventListener("input", e => {
      mat.qty = e.target.value; saveState();
      row.querySelector(".amt").textContent = INR((Number(mat.qty) || 0) * (Number(mat.rate) || 0));
      updateMaterialsFooter();
    });
    row.querySelector(".f-rate").addEventListener("input", e => {
      mat.rate = e.target.value; saveState();
      row.querySelector(".amt").textContent = INR((Number(mat.qty) || 0) * (Number(mat.rate) || 0));
      updateMaterialsFooter();
    });
  });
  wrap.querySelectorAll(".del").forEach(b => b.addEventListener("click", () => {
    state.materials = state.materials.filter(m => m.id !== b.dataset.id);
    saveState(); renderMaterials();
  }));
}
function updateMaterialsFooter() {
  const cell = document.querySelector("#materialsTableWrap tfoot .amt");
  if (cell) cell.textContent = INR(materialsTotal());
}

/* ============================================================
   OTHER COSTS TABLE
   ============================================================ */
function renderOther() {
  const wrap = document.getElementById("otherTableWrap");
  const byCat = {};
  state.other.forEach(o => { (byCat[o.category] ||= []).push(o); });

  let html = `<table class="data"><thead><tr>
    <th>Item</th><th style="text-align:right">Amount (₹)</th><th></th>
  </tr></thead><tbody>`;

  Object.keys(byCat).forEach(cat => {
    html += `<tr class="cat-row"><td colspan="3">${escapeHtml(cat)}</td></tr>`;
    byCat[cat].forEach(o => {
      html += `<tr data-id="${o.id}">
        <td><input class="f-name" value="${escapeAttr(o.name)}"></td>
        <td class="rate-cell" style="width:140px"><input class="f-amt" type="number" value="${o.amount}" style="text-align:right"></td>
        <td><button class="del" data-id="${o.id}">✕</button></td>
      </tr>`;
    });
  });

  html += `</tbody><tfoot><tr><td>Other costs total</td><td class="amt">${INR(otherTotal())}</td><td></td></tr></tfoot></table>`;
  wrap.innerHTML = html;

  wrap.querySelectorAll("tr[data-id]").forEach(row => {
    const id = row.dataset.id;
    const item = state.other.find(o => o.id === id);
    row.querySelector(".f-name").addEventListener("input", e => { item.name = e.target.value; saveState(); });
    row.querySelector(".f-amt").addEventListener("input", e => {
      item.amount = e.target.value; saveState();
      updateOtherFooter();
    });
  });
  wrap.querySelectorAll(".del").forEach(b => b.addEventListener("click", () => {
    state.other = state.other.filter(o => o.id !== b.dataset.id);
    saveState(); renderOther();
  }));
}
function updateOtherFooter() {
  const cell = document.querySelector("#otherTableWrap tfoot .amt");
  if (cell) cell.textContent = INR(otherTotal());
}

/* ============================================================
   ADD ITEM MODAL (shared by Materials + Other Costs)
   ============================================================ */
const modalBackdrop = document.getElementById("modalBackdrop");
let modalMode = null; // "material" | "other"

function openModal(mode) {
  modalMode = mode;
  document.getElementById("modalName").value = "";
  document.getElementById("modalCategory").value = "";
  document.getElementById("modalUnit").value = "";
  document.getElementById("modalQty").value = 0;
  document.getElementById("modalRate").value = 0;
  document.getElementById("modalAmount").value = 0;

  const cats = mode === "material"
    ? [...new Set(state.materials.map(m => m.category))]
    : [...new Set(state.other.map(o => o.category))];
  document.getElementById("categoryList").innerHTML = cats.map(c => `<option value="${escapeAttr(c)}">`).join("");

  document.getElementById("modalTitle").textContent = mode === "material" ? "Add material" : "Add cost item";
  document.getElementById("modalQtyRow").style.display = mode === "material" ? "grid" : "none";
  document.getElementById("modalAmountField").style.display = mode === "material" ? "none" : "flex";
  modalBackdrop.classList.add("active");
}
document.getElementById("addMaterialBtn").addEventListener("click", () => openModal("material"));
document.getElementById("addOtherBtn").addEventListener("click", () => openModal("other"));
document.getElementById("modalCancel").addEventListener("click", () => modalBackdrop.classList.remove("active"));
document.getElementById("modalSave").addEventListener("click", () => {
  const name = document.getElementById("modalName").value.trim();
  const category = document.getElementById("modalCategory").value.trim() || "Uncategorised";
  if (!name) { alert("Please enter a name."); return; }

  if (modalMode === "material") {
    state.materials.push({
      id: "m" + Date.now(),
      category, name,
      unit: document.getElementById("modalUnit").value.trim() || "unit",
      qty: Number(document.getElementById("modalQty").value) || 0,
      rate: Number(document.getElementById("modalRate").value) || 0,
    });
    renderMaterials();
  } else {
    state.other.push({
      id: "o" + Date.now(),
      category, name,
      amount: Number(document.getElementById("modalAmount").value) || 0,
    });
    renderOther();
  }
  saveState();
  modalBackdrop.classList.remove("active");
});

/* ============================================================
   PROGRESS STAGES
   ============================================================ */
function renderStages() {
  const wrap = document.getElementById("stageList");
  wrap.innerHTML = state.stages.map((s, i) => `
    <div class="stage-row" data-id="${s.id}">
      <span class="num mono">${String(i + 1).padStart(2, "0")}</span>
      <div class="info">
        <div class="name">${escapeHtml(s.name)}</div>
        <div class="weight">${s.weight}% of total build</div>
      </div>
      <div class="bar"><span style="width:${s.pct}%"></span></div>
      <input type="range" min="0" max="100" value="${s.pct}" class="range">
      <span class="pctval">${s.pct}%</span>
    </div>
  `).join("");

  wrap.querySelectorAll(".stage-row").forEach(row => {
    const stage = state.stages.find(s => s.id === row.dataset.id);
    const range = row.querySelector(".range");
    range.addEventListener("input", () => {
      stage.pct = Number(range.value);
      row.querySelector(".bar span").style.width = stage.pct + "%";
      row.querySelector(".pctval").textContent = stage.pct + "%";
      updateOverallProgress();
      saveState();
    });
  });
  updateOverallProgress();
}
function updateOverallProgress() {
  const pct = overallProgress();
  document.getElementById("overallFill").style.width = pct + "%";
  document.getElementById("overallPct").textContent = pct.toFixed(1) + "% complete";
}

/* ============================================================
   PLOT / 3D MASSING (Three.js)
   ============================================================ */
let threeScene, threeCamera, threeRenderer, threeControls, buildingGroup;

function initThree() {
  const container = document.getElementById("three-container");
  if (threeRenderer) { onThreeResize(); return; } // already initialised

  threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(0xEDEFEA);

  threeCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  threeCamera.position.set(45, 40, 55);

  threeRenderer = new THREE.WebGLRenderer({ antialias: true });
  threeRenderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(threeRenderer.domElement);

  threeControls = new THREE.OrbitControls(threeCamera, threeRenderer.domElement);
  threeControls.enableDamping = true;

  const amb = new THREE.AmbientLight(0xffffff, 0.7);
  threeScene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(30, 50, 20);
  threeScene.add(dir);

  buildingGroup = new THREE.Group();
  threeScene.add(buildingGroup);

  window.addEventListener("resize", onThreeResize);
  animateThree();
}
function onThreeResize() {
  const container = document.getElementById("three-container");
  if (!container || !threeRenderer) return;
  threeCamera.aspect = container.clientWidth / container.clientHeight;
  threeCamera.updateProjectionMatrix();
  threeRenderer.setSize(container.clientWidth, container.clientHeight);
}
function animateThree() {
  requestAnimationFrame(animateThree);
  if (threeControls) threeControls.update();
  if (threeRenderer) threeRenderer.render(threeScene, threeCamera);
}

function updateMassing() {
  if (!buildingGroup) return;
  while (buildingGroup.children.length) buildingGroup.remove(buildingGroup.children[0]);

  const p = state.plot;
  const L = Math.max(Number(p.length) || 1, 1);
  const W = Math.max(Number(p.width) || 1, 1);
  const floors = Math.max(Number(p.floors) || 1, 1);
  const fh = Math.max(Number(p.floorHeight) || 1, 1);
  const sbF = Number(p.setbackFront) || 0;
  const sbS = Number(p.setbackSide) || 0;

  // Plot ground plane
  const plotGeo = new THREE.PlaneGeometry(L, W);
  const plotMat = new THREE.MeshStandardMaterial({ color: 0xD8DCD2, side: THREE.DoubleSide });
  const plotMesh = new THREE.Mesh(plotGeo, plotMat);
  plotMesh.rotation.x = -Math.PI / 2;
  buildingGroup.add(plotMesh);

  // Building footprint (plot minus setbacks)
  const buildL = Math.max(L - sbF * 2, 2);
  const buildW = Math.max(W - sbS * 2, 2);

  const colors = [0xB9CBE0, 0x9FB8D8, 0x87A6CE, 0x7195C4];
  for (let f = 0; f < floors; f++) {
    const geo = new THREE.BoxGeometry(buildL, fh, buildW);
    const mat = new THREE.MeshStandardMaterial({ color: colors[f % colors.length] });
    const box = new THREE.Mesh(geo, mat);
    box.position.y = fh / 2 + f * fh;
    buildingGroup.add(box);

    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x2B6CB0 }));
    line.position.copy(box.position);
    buildingGroup.add(line);
  }

  // frame camera roughly on the scene
  const maxDim = Math.max(L, W, floors * fh) * 1.6;
  threeCamera.position.set(maxDim * 0.7, maxDim * 0.6, maxDim * 0.9);
  threeControls.target.set(0, (floors * fh) / 3, 0);
}

["plotLength", "plotWidth", "numFloors", "floorHeight", "setbackFront", "setbackSide"].forEach(id => {
  document.getElementById(id).addEventListener("input", (e) => {
    const map = { plotLength: "length", plotWidth: "width", numFloors: "floors", floorHeight: "floorHeight", setbackFront: "setbackFront", setbackSide: "setbackSide" };
    state.plot[map[id]] = e.target.value;
    saveState();
    updateMassing();
  });
});

/* ============================================================
   PLAN / ELEVATION UPLOADS
   ============================================================ */
const planUpload = document.getElementById("planUpload");
const uploadDrop = document.getElementById("uploadDrop");
uploadDrop.addEventListener("click", () => planUpload.click());
planUpload.addEventListener("change", (e) => handleFiles(e.target.files));
["dragover", "dragleave", "drop"].forEach(evt => uploadDrop.addEventListener(evt, e => e.preventDefault()));
uploadDrop.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

function handleFiles(files) {
  [...files].forEach(file => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.images.push({ id: "img" + Date.now() + Math.random().toString(36).slice(2), name: file.name, dataURL: reader.result });
      saveState();
      renderGallery();
    };
    reader.readAsDataURL(file);
  });
}
function renderGallery() {
  const g = document.getElementById("planGallery");
  if (!state.images.length) { g.innerHTML = `<p class="hint">No drawings uploaded yet.</p>`; return; }
  g.innerHTML = state.images.map(img => `
    <div class="thumb" data-id="${img.id}">
      <img src="${img.dataURL}" alt="${escapeAttr(img.name)}">
      <button class="rm" data-id="${img.id}">✕</button>
      <div class="lbl">${escapeHtml(img.name)}</div>
    </div>
  `).join("");
  g.querySelectorAll(".rm").forEach(b => b.addEventListener("click", () => {
    state.images = state.images.filter(i => i.id !== b.dataset.id);
    saveState(); renderGallery();
  }));
}

/* ============================================================
   PROFIT VIEW
   ============================================================ */
document.getElementById("builtupArea").value = state.sell.builtupArea;
document.getElementById("sellRate").value = state.sell.rate;
document.getElementById("builtupArea").addEventListener("input", e => { state.sell.builtupArea = e.target.value; saveState(); renderProfit(); });
document.getElementById("sellRate").addEventListener("input", e => { state.sell.rate = e.target.value; saveState(); renderProfit(); });
document.getElementById("sellTotalOverride").addEventListener("input", e => { state.sell.override = e.target.value; saveState(); renderProfit(); });

function renderProfit() {
  const mat = materialsTotal(), oth = otherTotal(), cost = mat + oth, sell = sellingTotal();
  document.getElementById("pMat").textContent = INR(mat);
  document.getElementById("pOther").textContent = INR(oth);
  document.getElementById("pTotal").textContent = INR(cost);
  document.getElementById("profSell").textContent = INR(sell);
  document.getElementById("profCost").textContent = INR(cost);
  const net = sell - cost;
  const netEl = document.getElementById("profNet");
  netEl.textContent = (net < 0 ? "-" : "") + INR(Math.abs(net));
  netEl.style.color = net < 0 ? "#D98787" : "#8FD9B4";
  const margin = sell > 0 ? (net / sell) * 100 : 0;
  document.getElementById("profMargin").textContent = margin.toFixed(1) + "% margin";
}

/* ============================================================
   DASHBOARD
   ============================================================ */
let breakdownChart = null;
function renderDashboard() {
  const mat = materialsTotal(), oth = otherTotal(), cost = mat + oth, sell = sellingTotal();
  document.getElementById("statSpent").textContent = INR(cost);
  document.getElementById("statEstimate").textContent = INR(cost);
  document.getElementById("statProgress").textContent = overallProgress().toFixed(1) + "%";
  const profit = sell - cost;
  const pEl = document.getElementById("statProfit");
  pEl.textContent = (profit < 0 ? "-" : "") + INR(Math.abs(profit));

  const ctx = document.getElementById("breakdownChart");
  const catTotals = {};
  state.materials.forEach(m => { catTotals[m.category] = (catTotals[m.category] || 0) + (Number(m.qty) || 0) * (Number(m.rate) || 0); });
  state.other.forEach(o => { catTotals[o.category] = (catTotals[o.category] || 0) + (Number(o.amount) || 0); });
  const labels = Object.keys(catTotals).filter(k => catTotals[k] > 0);
  const data = labels.map(l => catTotals[l]);

  if (breakdownChart) breakdownChart.destroy();
  if (labels.length === 0) {
    ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height);
  } else {
    breakdownChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ["#2B6CB0", "#3D8F6B", "#C97A3D", "#8B95A1", "#6B4F9E", "#D0A02B", "#4F8BC9", "#7CB08A", "#B36A56", "#556270", "#9A7FBE"],
          borderWidth: 0,
        }],
      },
      options: {
        plugins: { legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } } },
        cutout: "62%",
      },
    });
  }

  document.getElementById("dashStageList").innerHTML = state.stages.map(s => `
    <div class="stage-mini">
      <span class="name">${escapeHtml(s.name)}</span>
      <div class="bar"><span style="width:${s.pct}%"></span></div>
      <span class="pct">${s.pct}%</span>
    </div>
  `).join("");
}

/* ============================================================
   UTIL
   ============================================================ */
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escapeAttr(str) { return escapeHtml(str); }

/* ============================================================
   INITIAL RENDER
   ============================================================ */
function renderAll() {
  renderProjectSwitcher();
  document.getElementById("plotLength").value = state.plot.length;
  document.getElementById("plotWidth").value = state.plot.width;
  document.getElementById("numFloors").value = state.plot.floors;
  document.getElementById("floorHeight").value = state.plot.floorHeight;
  document.getElementById("setbackFront").value = state.plot.setbackFront;
  document.getElementById("setbackSide").value = state.plot.setbackSide;
  document.getElementById("builtupArea").value = state.sell.builtupArea;
  document.getElementById("sellRate").value = state.sell.rate;
  document.getElementById("sellTotalOverride").value = state.sell.override || "";

  renderMaterials();
  renderOther();
  renderStages();
  renderGallery();
  renderDashboard();
  renderProfit();
}
renderAll();
