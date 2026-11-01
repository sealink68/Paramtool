/* ui/common.js – DOM helpers, rendering frame, header, modal, help popup. */
"use strict";
(function (OE) {
  OE.$ = function (id) { return document.getElementById(id); };
  OE.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  OE.screens = {};
  OE.mem = {};
  OE.hdr = function () {
    var S = OE.S, L = S.lang || "nl";
    document.title = OE.CFG.APP; document.documentElement.lang = L;
    [].forEach.call(document.querySelectorAll("#seg button"), function (b) { b.classList.toggle("on", b.dataset.l === S.lang); });
    OE.$("seg").style.visibility = S.lang ? "visible" : "hidden";
    var ln = OE.$("line");
    if (ln) {
      ln.hidden = !S.lang;
      [].forEach.call(ln.querySelectorAll("button"), function (b) { b.classList.toggle("on", b.dataset.line === (S.line === "ESA" ? "ESA" : "ESC")); b.setAttribute("aria-checked", b.classList.contains("on") ? "true" : "false"); });
    }
    var st = OE.$("set"); st.hidden = S.screen === "setup" || !S.lang || !(S.tech.first && S.tech.last); st.title = st.ariaLabel = OE.t().settings.replace(/^\S+\s/, ""); if (OE.netUI) OE.netUI(); OE.fitBrand();
  };
  /* dormakaba logo (same behaviour as Onderhoud_Entretien): full word mark only when it fits next to the title, else just the red symbol. */
  OE.fitBrand = function () {
    var h = document.querySelector("header"), b = h && h.querySelector(".brand"), t = OE.$("title"), r = h && h.querySelector(".hr");
    if (!b || !t || !r) return;
    h.classList.remove("bc", "bt", "bt2", "bt3"); t.style.whiteSpace = "nowrap";
    var g = function (e) { return parseFloat(getComputedStyle(e).columnGap) || 0; }, room = h.clientWidth - r.offsetWidth - g(h);
    var over = function () { return b.offsetWidth + g(b.parentNode) + t.scrollWidth > room + 0.5; };
    if (over()) h.classList.add("bc");
    var k = ["bt", "bt2", "bt3"], i = 0;
    for (; i < k.length && over(); i++) { if (i) h.classList.remove(k[i - 1]); h.classList.add(k[i]); }
    t.style.whiteSpace = "";
  };
  window.addEventListener("resize", function () { OE.fitBrand(); });
  OE.anim = function (dir) { var c = OE.$("card"); c.classList.remove("slide-in-r", "slide-in-l"); void c.offsetWidth; c.classList.add(dir < 0 ? "slide-in-l" : "slide-in-r"); };
  /* Flow guard: language -> name -> folder -> form. */
  OE.render = function (dir) {
    var S = OE.S, fs = OE.fs.state;
    if (OE.needsSetup()) S.screen = "setup";
    else if (!S.lang) S.screen = "setup";
    else if (!(S.tech.first && S.tech.last) && S.screen !== "tech") S.screen = "setup";
    else if (fs === "ios" && S.screen === "folder") S.screen = "form";
    else if ((S.screen === "form" || S.screen === "result") && fs !== "granted" && fs !== "ios") S.screen = "folder";
    OE.brwUI(); OE.hdr(); if (OE.hideNumTip) OE.hideNumTip();
    (OE.screens[S.screen] || OE.screens.form)();
    OE.anim(dir || 1); window.scrollTo(0, 0);
  };
  /* iPhone/iPad (incl. iPadOS desktop UA): file-input fallback, Chrome banner must not block them. */
  OE.ios = function () {
    var ua = navigator.userAgent || "", p = navigator.platform || "";
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    return p === "MacIntel" && navigator.maxTouchPoints > 1;
  };
  /* Browser check: "ios" (share/download, no banner), "edge" (wipes site data on close on company laptops),
     "nofs" (no File System Access, e.g. Firefox), "" = fine (Chrome, incl. installed app). */
  OE.browser = function () {
    if (OE.ios()) return "ios";
    if (typeof window.showDirectoryPicker !== "function") return "nofs";
    var d = navigator.userAgentData, edge = !!(d && d.brands && d.brands.some(function (b) { return /Microsoft Edge/i.test(b.brand); }));
    return edge || /\bEdg(e|A|iOS)?\//.test(navigator.userAgent) ? "edge" : "";
  };
  OE.brwUI = function () {
    var el = OE.$("brw"), k = OE.browser(), S = OE.S, both = !S.lang;
    if (!el) return;
    if (!k || k === "ios" || (k === "edge" && sessionStorage.getItem("esc_brw_ok"))) { el.hidden = true; el.innerHTML = ""; return; }
    function part(L) {
      var x = OE.T[L];
      return "<h3>⚠️ " + x.brwH + "</h3><p>" + (k === "edge" ? x.brwEdge : x.brwNoFs) + '</p><ol class="brwSteps">' + x.brwSteps.split("\n").map(function (l) { return "<li>" + l.replace(/^\d+\.\s*/, "") + "</li>"; }).join("") + "</ol>";
    }
    var x = OE.T[S.lang || "nl"], t2 = both ? OE.T.fr : null;
    el.innerHTML = (both ? part("nl") + part("fr") : part(S.lang)) + '<p class="brwUrl"><code id="brwUrl">' + OE.CFG.URL + "</code></p>" +
      '<div class="brwB"><button type="button" class="btn pri" id="brwCopy">' + x.brwCopy + (t2 ? " / " + t2.brwCopy : "") + "</button>" +
      (k === "edge" ? '<button type="button" class="btn sec" id="brwGo">' + x.brwGo + (t2 ? " / " + t2.brwGo : "") + "</button>" : "") + '</div><p class="hint" id="brwMsg"></p>';
    el.hidden = false; el.dataset.kind = k;
    OE.$("brwCopy").onclick = function () {
      var m = OE.$("brwMsg");
      function ok() { m.textContent = x.brwCopied; }
      function ko() { try { var r = document.createRange(); r.selectNodeContents(OE.$("brwUrl")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); if (document.execCommand("copy")) { ok(); return; } } catch (e) {} m.textContent = x.brwCopyFail; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(OE.CFG.URL).then(ok, ko); else ko();
    };
    OE.bind("brwGo", function () { sessionStorage.setItem("esc_brw_ok", "1"); OE.brwUI(); });
  };
  OE.go = function (screen, dir) { OE.S.screen = screen; OE.save(); OE.render(dir); };
  OE.bind = function (id, fn) { var e = OE.$(id); if (e) e.onclick = fn; };
  OE.err = function (msg, id) { var e = OE.$(id || "err"); if (e) e.innerHTML = msg ? '<div class="err">⚠️ ' + OE.esc(msg) + "</div>" : ""; };
  /* User cancel stays quiet. Chrome blocking Downloads (or another system folder) is a SecurityError, sometimes surfaced as an abort. */
  OE.pickerFail = function (e) {
    if (!e) return;
    var name = e.name || "", msg = String(e.message || "");
    var userAbort = name === "AbortError" && !/system file/i.test(msg);
    if (userAbort) return;
    var x = OE.t();
    if (name === "SecurityError" || /system file/i.test(msg)) { OE.err(x.folderBlocked); return; }
    if (msg === "denied" || name === "NotAllowedError") { OE.err(x.folderDenied); return; }
    OE.err(OE.fmt(x.folderErr, { e: msg || name || e }));
  };
  OE.confirmModal = function (text, onYes) {
    var m = OE.$("modal"), x = OE.t(); m.onclick = null; m.dataset.help = "";
    m.innerHTML = '<div class="card" role="dialog" aria-modal="true"><p id="mtext" class="pre-line">' + OE.esc(text) + '</p><div class="btns"><button class="btn sec" id="mno">' + x.cancel + '</button><button class="btn ok" id="myes">' + x.ok + "</button></div></div>";
    m.hidden = false;
    OE.$("mno").onclick = function () { m.hidden = true; };
    OE.$("myes").onclick = function () { m.hidden = true; onYes(); };
  };
  function helpBody(L, sc) {
    var lines = (OE.HELP[L][sc] || OE.HELP[L].form), out = "", li = "", tag = "";
    function flush() { if (li) out += "<" + tag + ">" + li + "</" + tag + ">"; li = ""; tag = ""; }
    function item(t, s) { if (tag !== t) flush(); tag = t; li += "<li>" + OE.esc(s) + "</li>"; }
    lines.forEach(function (l) {
      var n = /^\d+\.\s+/.exec(l);
      if (l.indexOf("• ") === 0) item("ul", l.slice(2));
      else if (n) item("ol", l.slice(n[0].length));
      else if (l.indexOf("## ") === 0) { flush(); out += '<h4 class="hs">' + OE.esc(l.slice(3)) + "</h4>"; }
      else { flush(); out += "<p>" + OE.esc(l) + "</p>"; }
    });
    flush(); return out;
  }
  /* Per-screen help popup. Language screen (no language yet): both languages. */
  OE.showHelp = function () {
    var S = OE.S, m = OE.$("modal"), sc = S.lang ? S.screen : "lang", both = !S.lang, L = S.lang || "nl", H = OE.HELP[L];
    var title = both ? "Help / Aide" : H.title, close = both ? OE.HELP.nl.close + " / " + OE.HELP.fr.close : H.close;
    var body = both ? "<h3>Nederlands</h3>" + helpBody("nl", sc) + "<h3>Français</h3>" + helpBody("fr", sc) : helpBody(L, sc);
    var redo = both ? "Setup opnieuw / Reconfigurer" : OE.T[L].wizRedo;
    m.innerHTML = '<div class="card hlp" id="hlp" role="dialog" aria-modal="true" aria-labelledby="hlph"><div class="hh"><h2 id="hlph">' + OE.esc(title) + '</h2><button type="button" class="hx" id="hlpx" aria-label="' + OE.esc(close) + '">×</button></div>' +
      body + '<p><a class="linkb" id="setupBat" href="ESC_tool_setup.bat" download>ESC_tool_setup.bat</a></p><div class="btns"><button type="button" class="btn sec" id="reSetup">' + OE.esc(redo) + '</button><button type="button" class="btn sec" id="hlpc">' + OE.esc(close) + "</button></div></div>";
    m.hidden = false; m.dataset.help = "1";
    function shut() { m.hidden = true; m.dataset.help = ""; m.onclick = null; document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") shut(); }
    OE.$("hlpx").onclick = OE.$("hlpc").onclick = shut;
    OE.$("reSetup").onclick = function () { shut(); if (OE.redoSetup) OE.redoSetup(); };
    m.onclick = function (e) { if (e.target === m) shut(); };
    document.addEventListener("keydown", key);
    setTimeout(function () { try { OE.$("hlpx").focus(); } catch (e) {} }, 30);
  };
})(window.OE);
