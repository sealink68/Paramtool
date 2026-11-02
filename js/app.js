/* app.js – bootstrap: load state, wire header, check folder access, render. */
"use strict";
(function (OE) {
  OE.S = OE.loadState();
  [].forEach.call(document.querySelectorAll("#seg button"), function (b) {
    b.onclick = function () { OE.S.lang = b.dataset.l; OE.save(); OE.render(1); };
  });
  [].forEach.call(document.querySelectorAll("#line button"), function (b) {
    b.onclick = function () {
      if ((OE.S.line === "ESA" ? "ESA" : "ESC") === b.dataset.line) return;
      OE.S.line = b.dataset.line === "ESA" ? "ESA" : "ESC"; OE.save();
      var cat = OE.catalog(), f = OE.mem && OE.mem.form;
      if (f && f.fam && f.fam !== OE.CFG.OTHER && !cat[f.fam]) { f.fam = ""; f.sub = ""; f.famOther = ""; f.subOther = ""; OE.mem.sel = null; }
      (OE.fs.bindLine ? OE.fs.bindLine() : Promise.resolve()).then(function () {
        if (OE.fs.state === "granted" && OE.S.screen === "folder") OE.S.screen = "form";
        OE.render(1);
      });
    };
  });
  OE.$("help").onclick = OE.showHelp;
  OE.$("set").onclick = function () { OE.go("settings"); };
  /* Logo files missing (img/logo-full.svg, img/logo-mark.svg) -> clearly marked placeholder slot. */
  var lg = OE.$("brand-logo");
  function noLogo() { OE.$("brand").classList.add("logo-missing"); }
  lg.addEventListener("error", noLogo); if (lg.complete && !lg.naturalWidth) noLogo();
  window.addEventListener("load", OE.fitBrand);
  OE.fs.init().then(function () { OE.render(1); });
  /* PWA: service worker (relative path -> scope /Paramtool/ on GitHub Pages). Precaches the whole app for offline use;
     offline.js shows the update banner / offline badge. */
  OE.swReady = ("serviceWorker" in navigator && window.isSecureContext)
    ? new Promise(function (ok) { window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js", { scope: "./" }).then(ok, function () { ok(null); }); }); }).then(OE.swSetup)
    : Promise.resolve(null);
})(window.OE);
