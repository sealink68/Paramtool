/* i18n.js – language helpers + name sanitizing. */
"use strict";
(function (OE) {
  OE.t = function () { return OE.T[(OE.S && OE.S.lang) || "nl"]; };
  OE.fmt = function (s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); };
  var RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
  /* Windows-safe file/folder name: every character allowed except control chars; whitespace and
     \ / : * ? " < > | become "_"; trailing dots/spaces trimmed. collapse: merge runs of "_" (used for model names). */
  /* Filename only. The form keeps the typed text. Control characters, | / \ : * ? " < > and
     whitespace become "_"; repeated "_" collapse; no leading or trailing dots, spaces or underscores. */
  OE.safeName = function (s, collapse) {
    var v = String(s == null ? "" : s).replace(/[\u0000-\u001F\u007F]/g, "_")
      .replace(/[\s\u00A0\u202F\uFEFF]/g, "_").replace(/[\\/:*?"<>|]/g, "_")
      .replace(/_+/g, "_").replace(/^[\s._]+|[\s._]+$/g, "");
    if (collapse) v = v.replace(/^_+|_+$/g, "");
    if (RESERVED.test(v)) v = "_" + v;
    return v;
  };
  OE.pad = function (n) { return (n < 10 ? "0" : "") + n; };
  OE.stamp = function (d) { return d.getFullYear() + "-" + OE.pad(d.getMonth() + 1) + "-" + OE.pad(d.getDate()) + "_" + OE.pad(d.getHours()) + OE.pad(d.getMinutes()); };
  OE.human = function (d) { return OE.pad(d.getDate()) + "/" + OE.pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + OE.pad(d.getHours()) + ":" + OE.pad(d.getMinutes()); };
  OE.stampHuman = function (st) { var m = /^(\d{4})-(\d\d)-(\d\d)_(\d\d)(\d\d)$/.exec(st); return m ? m[3] + "/" + m[2] + "/" + m[1] + " " + m[4] + ":" + m[5] : st; };
})(window.OE);
