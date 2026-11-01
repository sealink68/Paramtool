# ESC_tool

Static web app for dormakaba technicians (security entrances / access control: sensor barriers, turnstiles,
revolving doors, interlocks). It saves a device's parameter file plus a bilingual (NL/FR) info PDF straight into
the OneDrive-synced folder `ESC_Share\projecten` on the Windows laptop.

Live (GitHub Pages): https://sealink68.github.io/ESC_tool/

## Requirements
- **Microsoft Edge or Google Chrome** (desktop). The app uses the File System Access API (`showDirectoryPicker`);
  Firefox and Safari get a clear NL/FR message.
- No backend, no accounts, no secrets, no network calls besides loading the app itself; works offline after one visit.

## Flow
1. First start: language (NL/FR), then the technician's first and last name (localStorage; change via ⚙).
2. Once: pick the root `ESC_Share` and/or `ESA_Share`. The header switch **ESA / ESC** chooses the target and is remembered; each share keeps its own handle. The app creates `projecten\ESC-param` or `projecten\ESA-param`. Every saved file sits flat in that folder (no per-dossier subfolders). After a browser restart, one **Toestaan / Autoriser** button re-grants every stored handle.
   The handle is kept in IndexedDB. After a browser restart, click **Toegang tot map hernieuwen / Renouveler l'accès au dossier**.
3. Form: device family + sub-model (with *Ander… / Autre…* free text), Dossiernummer (ServiceMax), Serienummer,
   Ordernummer, the parameter file (click or drag & drop). Date/time are automatic.
4. **Opslaan / Enregistrer** writes into `projecten\<Family>\<Dossier>\`:
   - `<Family>_<Submodel>_<Dossier>_<YYYY-MM-DD_HHMM>.<ext>` – the parameter file (original extension kept);
   - max. **3** parameter files per dossier: the oldest beyond 3 is deleted (the user is warned first and the
     result screen names it). The newest is *actief bij laatste bezoek / actif lors de la dernière visite*;
   - `<Family>_<Submodel>_<Dossier>_info.pdf` – A4, NL/FR labels, product image, all values as selectable text;
   - `_esc_info.json` – metadata, used to offer prefill when the same family + dossier is entered again.
5. Result screen: folder, file names, deleted file; **Nieuw toestel / Nouvel appareil** and **Open PDF**.

**ESA** lists only ES250 Proline Easy, ES250/130 Proline, ES250/180 Proline, ES250/FST Proline, ES400 Proline and ES500 Proline. **ESC** lists the existing security-entrance models.

**Laatste parameterfile ophalen** starts from one pick of `C:\Users\Public\Documents`. Every program folder that contains `projects` or `Projects` (Pavis3, Pavis96NG, and later ones) is scanned recursively. `Downloads\OSI-param` (not the Downloads folder itself; Chrome blocks that) and `C:\EEPS Files` stay optional extras. `ESC_tool_setup.bat` creates `Downloads\OSI-param`. The newest `.xml` / `.prd` / `.dat` / `.kmc` / `.eep` / `.mot` (never `.mhx`) is renamed `Familie_Submodel_Dossier_YYYY-MM-DD_HHMM.ext` and written flat into `projecten\ESC-param` or `projecten\ESA-param`. The original file is never deleted. On iPhone/iPad the same rename is offered via the share sheet or a download; the Chrome-only banner does not block iOS.

Existing dossiers: the search is hidden by default; the 🔍 button **Bestaand dossier zoeken / Rechercher un dossier
existant** next to the form title opens it (click again, ✕ or Esc closes it). Picking a dossier fills the form.

The ? help also explains, in numbered steps, how to check the OneDrive folder (**Map controleren / Vérifier le dossier**)
and how to install the app (**App installeren / Installer l'app**).

## Desktop app (PWA) and offline use
`manifest.webmanifest` + `sw.js` make the site installable in Edge/Chrome (address-bar install icon, or Edge ⋯ > Apps >
*Deze site als app installeren*). The icon is the old grey Kaba wordmark (`icons/`, from Wikimedia Commons
*Kaba Group logo.svg*, recoloured grey).

**Offline:** after one online visit the app works fully offline, including the info PDF with the right product image
for every sub-model. The service worker precaches the complete app on install (HTML, CSS, JS, jsPDF, manifest,
icons, logos, all product images, the help photos; ~1.4 MB). The app uses system fonts and the PDF uses jsPDF's
built-in Helvetica, so there are no font files and no external URLs at all.
- Precache list: generated into `sw.js` by `python3 tools/gen_precache.py` (between `PRECACHE:BEGIN/END`).
  **Run it after adding or changing any file** (new product image, JS, CSS…); `--check` fails if `sw.js` is stale
  (the tests run it). The list carries a content hash, so every change produces a new service-worker version.
- Install: 6 parallel downloads with one retry. A missing image is logged and fetched later (on activate / when the
  app comes back online); a missing core file (HTML/CSS/JS/manifest) aborts the install so the previous version keeps
  working. Old `esc-shell-*` caches are deleted on activate.
- Fetch: only same-origin GET requests inside the scope are handled. HTML/JS/CSS/manifest: network-first with a 3 s
  timeout, then the cached copy (updates still arrive online; a slow or missing network never hangs the app).
  Images: cache-first. File System Access and the folder handle in IndexedDB are never touched.
- UI (`js/offline.js`): an orange **Offline / Hors ligne** badge in the header (tooltip: saving works, OneDrive syncs
  later), a one-time toast **Klaar voor offline gebruik / Prêt pour une utilisation hors ligne**, and a banner
  **Nieuwe versie beschikbaar – Vernieuwen / Nouvelle version disponible – Actualiser** when a new version is waiting.
  The banner activates it (skipWaiting + reload); with unsaved form data it asks first, and it never reloads during a save.
- Help (folder + form screens): section **Offline werken / Travailler hors ligne**.

Names are made Windows-safe: spaces and `\ / : * ? " < > |` become `_`, trailing dots/spaces are removed
(sub-models also collapse repeated `_`, e.g. `Argus 60` → `Argus_60`).

## Structure (no build step, classic scripts)
```
index.html
css/style.css
js/config.js       all NL/FR texts, PDF labels, help texts, settings
js/models.js       families / sub-models, image mapping, short descriptions
js/i18n.js         language + name sanitizing + date helpers
js/storage.js      localStorage state, IndexedDB (folder handle)
js/fsx.js          folder access, naming, retention, metadata
js/pdf.js          info PDF (jsPDF)
js/ui/common.js    header, logo fit, modal, per-screen help
js/ui/screens.js   screens: lang, tech, folder, form, result, settings
js/offline.js      offline badge, update banner, offline-ready toast
js/app.js          bootstrap + service worker registration
manifest.webmanifest, sw.js   PWA (install as desktop app, offline precache)
tools/gen_precache.py        writes the precache list into sw.js
icons/             PWA icons (192, 512, maskable 192/512, apple-touch-icon 180, kaba-logo.svg)
js/vendor/jspdf.umd.min.js  (vendored, MIT – see jspdf.LICENSE)
img/models/*.jpg   product images (dormakaba "Product Overview Security Gates" 02/2025 and dormakaba brochures)
img/logo-full.svg, img/logo-mark.svg
.github/workflows/pages.yml  GitHub Pages deploy on push to main
```
Texts: edit `js/config.js` only. Models: edit `js/models.js` (`example: true` = image of a sibling model of the
same family, shown as *Voorbeeldafbeelding familie / Image d'exemple de la famille*).

## Deploy
Push to `main`; the workflow publishes the repo root to Pages. If needed, set *Settings → Pages → Source: GitHub Actions*.
