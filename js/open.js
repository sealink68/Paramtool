/* open.js – pairing code and the open-dossier API. No images, no parameter files. */
"use strict";
(function (root) {
  var OE = root.OE = root.OE || {};
  var KEY = "paramtool_pair";
  var ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
  var FIELDS = ["wo", "dossier", "account", "adres", "contact", "product", "fam", "famOther", "sub", "subOther", "line", "serial", "order", "tech", "updated"];

  function store() {
    try { return root.localStorage || localStorage; } catch (e) { return null; }
  }
  OE.openCode = function () {
    var s = store(), c = "";
    try { c = (s && s.getItem(KEY)) || ""; } catch (e) { c = ""; }
    c = String(c).toUpperCase();
    return CODE.test(c) ? c : "";
  };
  OE.openEnsureCode = function () {
    var c = OE.openCode();
    if (c) return c;
    var bytes = new Uint8Array(8), i;
    (root.crypto || crypto).getRandomValues(bytes);
    c = "";
    for (i = 0; i < 8; i++) c += ALPHA[bytes[i] % ALPHA.length];
    try { var s = store(); if (s) s.setItem(KEY, c); } catch (e) {}
    return c;
  };
  OE.openSetCode = function (raw) {
    var c = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!CODE.test(c)) return "";
    try { var s = store(); if (s) s.setItem(KEY, c); } catch (e) {}
    return c;
  };
  OE.openClearCode = function () {
    try { var s = store(); if (s) s.removeItem(KEY); } catch (e) {}
  };
  function clip(v, n) {
    v = v == null ? "" : String(v).replace(/\s+/g, " ").trim();
    return v.length > n ? v.slice(0, n) : v;
  }
  /* Whitelist. Anything else (file, image, pdf) is dropped. */
  OE.openClean = function (rec) {
    var src = rec || {}, out = {}, i, k, v, n;
    for (i = 0; i < FIELDS.length; i++) {
      k = FIELDS[i];
      n = (k === "wo" || k === "serial" || k === "order" || k === "line" || k === "updated") ? 40 : (k === "fam" || k === "sub" || k === "famOther" || k === "subOther" || k === "tech" ? 120 : 400);
      v = clip(src[k], n);
      if (k === "line") v = v === "ESA" ? "ESA" : (v === "ESC" ? "ESC" : "");
      out[k] = v;
    }
    return out;
  };
  function api() {
    return String((OE.CFG && OE.CFG.OPEN_API) || "").replace(/\/$/, "");
  }
  function call(method, path, body) {
    var code = OE.openCode();
    if (!code) return Promise.reject(new Error("code"));
    var opt = { method: method, headers: { "X-Paramtool-Code": code } };
    if (body) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
    return fetch(api() + path, opt).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json().catch(function () { return {}; });
    });
  }
  OE.openSave = function (rec) {
    var body = OE.openClean(rec);
    if (!body.wo) return Promise.reject(new Error("wo"));
    if (!OE.openCode()) OE.openEnsureCode();
    return call("POST", "/dossiers", body);
  };
  OE.openList = function () { return call("GET", "/dossiers"); };
  OE.openDrop = function (wo) {
    wo = clip(wo, 40);
    if (!wo) return Promise.resolve();
    return call("DELETE", "/dossiers/" + encodeURIComponent(wo));
  };
})(typeof window !== "undefined" ? window : globalThis);
