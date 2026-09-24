# Site Ledger — Construction Cost & Progress Tracker

A single-page web app to track building construction costs and progress:

- **Materials** — pre-listed by category (foundation, RCC, masonry, roofing, plumbing, electrical, doors/windows, flooring, painting, misc.) with editable quantity and rate; amounts calculate live.
- **Other costs** — plot cost, approvals, architect fees, bore well, EB connection, labour, contingency, etc.
- **Progress** — 13 pre-sequenced, pre-weighted construction stages. Drag each stage's slider as work happens; an overall weighted progress bar updates automatically.
- **Plans & 3D** — upload plan/elevation images, enter plot length/width/floors, and see a proportional 3D massing block (rotate/zoom). This is a dimensional block model, not a rendering of your actual drawings.
- **Profit** — total cost vs. built-up-area × selling rate (or a manual total), shows net profit/loss and margin.
- **Multiple projects** — a project switcher (top of Dashboard) lets you create, rename, delete, export and import separate buildings, each with its own materials/costs/progress/plans.
- **Cross-device sync (optional)** — sign in with Google to sync your ledger data (materials, costs, stages, plot, sell figures, project names) between your phone and laptop via Firebase (free tier). Uploaded plan/elevation images stay local to each device — see "Cloud sync" below for why.
- **Dashboard** — spend, progress and profit at a glance, plus a cost-breakdown chart.

It's a **plain static site** — just HTML, CSS and JavaScript, no build step, no backend of your own to run. Data is stored locally in your browser (`localStorage`) by default; Firebase sync is optional and off until you configure it.

> **Without Firebase configured:** the app works exactly as a local-only tool — data stays in that one browser and won't appear on another device or in incognito mode.

---

## 1. Run it locally in VS Code

1. Unzip the project and open the folder in VS Code:
   ```
   File → Open Folder → build-tracker
   ```
2. Install the **Live Server** extension (by Ritwick Dey) from the Extensions panel (`Ctrl/Cmd+Shift+X`, search "Live Server").
3. Right-click `index.html` → **Open with Live Server**. It'll open in your browser at something like `http://127.0.0.1:5500`.
4. Edit `app.js` (logic/data), `style.css` (design) or `index.html` (layout) — the page auto-reloads on save.

No `npm install` needed — the two libraries it uses (Chart.js and Three.js) load from a CDN.

### Want different default materials, cost items, or stage weights?
Open `app.js` and edit the arrays returned by `defaultMaterials()`, `defaultOtherCosts()`, and `defaultStages()` near the top of the file. Changing these only affects **new** browsers/localStorage — if you've already used the app, click **Reset** in the app (bottom of the left rail) to reload the new defaults.

---

## 2. Push it to GitHub

In VS Code's terminal (`` Ctrl/Cmd+` ``), from inside the `build-tracker` folder:

```bash
git init
git add .
git commit -m "Initial commit: site ledger app"
```

Then on GitHub.com:
1. Click **+ → New repository** on **https://github.com/Ajmal7979**, name it `site-ledger`, leave it empty (no README/gitignore), and click **Create repository**.
2. Run these in the same terminal:
   ```bash
   git remote add origin https://github.com/Ajmal7979/site-ledger.git
   git branch -M main
   git push -u origin main
   ```
3. Refresh **https://github.com/Ajmal7979/site-ledger** — your files should be there.

---

## 3. Deploy it on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (you can sign in with your GitHub account directly).
2. Click **Add New → Project**.
3. Select the `site-ledger` GitHub repo you just pushed (you may need to click "Configure GitHub App" and grant Vercel access to it the first time).
4. Vercel will detect it as a static site — you don't need to change any build settings (leave Framework Preset as "Other", Build Command empty, Output Directory empty).
5. Click **Deploy**. In under a minute you'll get a live URL like `https://site-ledger-ajmal7979.vercel.app`.

From then on, every time you `git push` to `main`, Vercel automatically redeploys.

---

## 4. Cloud sync (optional) — same data on phone and laptop

Without this step, the app works fine but each browser/device has its own separate data (that's the "starting from scratch on phone" behaviour). This step makes signing in with Google carry your data across devices, using Firebase's free tier (Spark plan — no credit card, generous free limits for personal use).

### 4.1 Create the Firebase project
1. Go to **https://console.firebase.google.com** → **Add project**.
2. Name it (e.g. `site-ledger`) → disable Google Analytics (not needed) → **Create project**.

### 4.2 Turn on Google Sign-In
1. In the left sidebar: **Build → Authentication → Get started**.
2. Under **Sign-in method**, click **Google** → **Enable** → pick a support email → **Save**.

### 4.3 Create the database
1. Left sidebar: **Build → Firestore Database → Create database**.
2. Choose **Start in production mode** → pick a nearby region (e.g. `asia-south1` for India) → **Enable**.
3. Go to the **Rules** tab and replace the contents with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
   This means each signed-in user can only ever read/write their own document — nobody else's. Click **Publish**.

### 4.4 Register a web app & get your config
1. Left sidebar: click the **gear icon → Project settings**.
2. Under "Your apps", click the **`</>`** (web) icon → nickname it `site-ledger-web` → **Register app** (skip the hosting step).
3. It shows a `firebaseConfig` object — copy those values into `firebase-config.js` in your project, replacing every `"REPLACE_ME"`.

### 4.5 Allow your domains
1. Still in the Firebase console: **Authentication → Settings → Authorized domains**.
2. `localhost` is there by default (for local testing). After you deploy to Vercel, click **Add domain** and add your Vercel URL (e.g. `site-ledger-ajmal7979.vercel.app`) — otherwise Google sign-in will fail on the live site.

### 4.6 Commit and redeploy
```bash
git add firebase-config.js
git commit -m "Add Firebase config for cross-device sync"
git push
```
Vercel redeploys automatically. Open the site, click **Sign in with Google** (top of Dashboard) on your laptop, then do the same on your phone with the same Google account — your projects, materials, costs and progress will now match on both.

**What doesn't sync:** uploaded plan/elevation images stay on the device you uploaded them from. Firestore's free tier caps each saved record at 1MB, and base64 images fill that up fast — so images are deliberately kept local-only rather than breaking sync for everything else.

---

## File structure

```
build-tracker/
├── index.html          → page structure (nav + 6 sections + modal)
├── style.css            → design system (colors, type, layout)
├── app.js               → all data, state, project-switching, and Firebase sync logic
├── firebase-config.js   → your Firebase project keys (optional — leave as "REPLACE_ME" to stay local-only)
└── README.md            → this file
```
