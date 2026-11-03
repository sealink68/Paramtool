/* offline.js – offline badge, "new version" banner and "ready for offline use" toast (service worker UI).
   Texts: OE.T[lang].offline / offlineTip / updAvail / updBtn / updDirty / offReady in config.js. */
"use strict";
(function (OE) {
  var U = OE.upd = { reg: null, asked: false, shown: false, hadCtl: !!(navigator.serviceWorker && navigator.serviceWorker.controller) };
  function txt(k) { var L = OE.S && OE.S.lang; return L ? OE.T[L][k] : OE.T.nl[k] + " / " + OE.T.fr[k]; }
  function noop() {}

  /* ---- header badge "Offline" (+ tooltip) and the banner texts; called from OE.hdr on every render ---- */
  OE.netUI = function () {
    var b = OE.$("offB"); if (!b) return;
    b.hidden = navigator.onLine !== false;
    OE.$("offT").textContent = txt("offline"); OE.$("offTip").textContent = txt("offlineTip"); OE.$("offTip").setAttribute("data-l", txt("offline"));
    b.setAttribute("aria-label", txt("offline") + ": " + txt("offlineTip"));
    var u = OE.$("updB"); if (u) { OE.$("updT").textContent = txt("updAvail"); OE.$("updGo").textContent = txt("updBtn"); u.hidden = !U.shown; }
  };
  window.addEventListener("online", function () { OE.netUI(); if (U.reg) { U.reg.update().catch(noop); OE.swAsk("TOPUP").catch(noop); } });
  window.addEventListener("offline", OE.netUI);

  /* ---- toast ---- */
  OE.toast = function (msg, ms) {
    var t = OE.$("toast"); if (!t) return;
    t.textContent = msg; t.hidden = false; void t.offsetWidth; t.classList.add("on");
    clearTimeout(OE._toastT); OE._toastT = setTimeout(function () { t.classList.remove("on"); setTimeout(function () { t.hidden = true; }, 300); }, ms || 5000);
  };

  /* ---- update banner ---- */
  OE.showUpdate = function () { U.shown = true; OE.netUI(); };
  /* Unsaved form data? (then we ask before reloading) */
  OE.formDirty = function () {
    var f = OE.mem && OE.mem.form; if (!f || !OE.S || OE.S.screen !== "form") return false;
    return !!(f.fam || f.famOther.trim() || f.sub || f.subOther.trim() || f.dossier.trim() || f.serial.trim() || f.order.trim() || f.file);
  };
  OE.applyUpdate = function () {
    if (OE.busy) { setTimeout(OE.applyUpdate, 300); return; } // never in the middle of a save
    function go() {
      var w = U.reg && U.reg.waiting;
      U.shown = false; OE.netUI();
      if (!w) { location.reload(); return; } // already active (activated by another tab)
      U.asked = true; w.postMessage({ type: "SKIP_WAITING" });
      setTimeout(function () { if (U.asked) location.reload(); }, 5000); // fallback if controllerchange never comes
    }
    if (OE.formDirty()) OE.confirmModal(txt("updDirty"), go); else go();
  };
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (U.asked) { U.asked = false; location.reload(); return; }
      if (U.hadCtl) {
        try {
          if (sessionStorage.getItem("pt_reloaded") !== "1" && !OE.formDirty()) {
            sessionStorage.setItem("pt_reloaded", "1");
            location.reload();
            return;
          }
        } catch (e) {}
        OE.showUpdate();
      }
      U.hadCtl = true;
    });
    navigator.serviceWorker.addEventListener("message", function (e) {
      var d = e.data || {};
      if (d.type === "PRECACHE_STATUS" && d.complete) {
        OE.offlineReady = d;
        var k = "esc_offline_ready"; try { if (!localStorage.getItem(k)) { localStorage.setItem(k, d.version); OE.toast("✓ " + txt("offReady")); } } catch (x) {}
      }
    });
    try { navigator.serviceWorker.startMessages(); } catch (x) {}
    // register() can wait behind a pending update check on a slow network; the active registration is enough
    if (window.isSecureContext) navigator.serviceWorker.ready.then(function (r) { OE.swSetup(r); }, noop);
  }
  /* Ask the active service worker something (STATUS = precache state, TOPUP = fetch missing files). */
  OE.swAsk = function (type) {
    return new Promise(function (ok, ko) {
      var r = U.reg, w = navigator.serviceWorker && (navigator.serviceWorker.controller || (r && r.active));
      if (!w) { ko(new Error("no service worker")); return; }
      var ch = new MessageChannel(); ch.port1.onmessage = function (e) { ok(e.data); };
      w.postMessage({ type: type }, [ch.port2]);
    });
  };
  /* Called with the registration (or null) from app.js. */
  OE.swSetup = function (reg) {
    if (!reg || U.reg === reg) return reg; U.reg = reg;
    if (reg.waiting && reg.active) OE.showUpdate();
    reg.addEventListener("updatefound", function () {
      var n = reg.installing; if (!n) return;
      n.addEventListener("statechange", function () { if (n.state === "installed" && reg.active) OE.showUpdate(); });
    });
    setInterval(function () { if (navigator.onLine) reg.update().catch(noop); }, 3600000); // PWA left open for days
    return reg;
  };
  document.addEventListener("DOMContentLoaded", function () { var g = OE.$("updGo"); if (g) g.onclick = OE.applyUpdate; });
})(window.OE);
