/* storage.js – settings in localStorage, the folder handle in IndexedDB. */
"use strict";
(function (OE) {
  var KEY = "esc_state";
  OE.loadState = function () {
    var s = {}; try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    var named = !!(s.lang && s.tech && s.tech.first && s.tech.last);
    var line = s.line === "ESA" || s.line === "ESC" ? s.line : ((OE.ios && OE.ios()) ? "ESA" : "ESC");
    return { lang: s.lang || "", tech: s.tech || { first: "", last: "" }, screen: s.screen || "form", line: line,
      setupDone: s.setupDone != null ? !!s.setupDone : named, roleSet: !!s.roleSet, srcOpen: !!s.srcOpen };
  };
  OE.save = function () {
    var S = OE.S;
    try { localStorage.setItem(KEY, JSON.stringify({ lang: S.lang, tech: S.tech, screen: S.screen === "result" ? "form" : S.screen, line: S.line === "ESA" ? "ESA" : "ESC", setupDone: !!S.setupDone, roleSet: !!S.roleSet, srcOpen: !!S.srcOpen })); } catch (e) {}
  };
  OE.needsSetup = function () { return !!(OE._setupRedo || !(OE.S && OE.S.setupDone)); };
  function db() {
    return new Promise(function (ok, ko) {
      var r = indexedDB.open("esc_tool", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ko(r.error); };
    });
  }
  OE.idbGet = function (k) {
    return db().then(function (d) { return new Promise(function (ok, ko) { var q = d.transaction("kv").objectStore("kv").get(k); q.onsuccess = function () { ok(q.result); }; q.onerror = function () { ko(q.error); }; }); });
  };
  OE.idbSet = function (k, v) {
    return db().then(function (d) { return new Promise(function (ok, ko) { var t = d.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = function () { ok(); }; t.onerror = function () { ko(t.error); }; }); });
  };
})(window.OE);
