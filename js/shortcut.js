/* shortcut.js – keep the Paramtool desktop shortcut on the dormakaba icon.
   Setup (Paramtool_setup.bat) writes %LOCALAPPDATA%\Paramtool\paramtool.ico and sets
   the .lnk IconLocation. Technicians who already have the old shortcut never re-run
   that script: on Windows, after the app is in use, one Desktop-folder grant lets
   every later start repair Paramtool.lnk when its icon is missing or wrong. */
"use strict";
(function (OE) {
  var APP = "https://sealink68.github.io/Paramtool/";
  var DONE = "paramtool_icon_v";

  function bytes() { this.a = []; }
  bytes.prototype.push = function (list) { for (var i = 0; i < list.length; i++) this.a.push(list[i] & 255); };
  function u16(n) { return [n & 255, (n >> 8) & 255]; }
  function u32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]; }
  function asciiZ(s) { var a = []; for (var i = 0; i < s.length; i++) a.push(s.charCodeAt(i) & 255); a.push(0); return a; }
  function sizedUni(s) {
    var a = u16(s.length);
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); a.push(c & 255, (c >> 8) & 255); }
    return a;
  }
  /* LinkInfo-only .lnk. Same layout as a local pylnk3 shortcut: target, arguments, working
     directory, description and icon path (index 0). */
  function buildShortcut(target, args, icon, work, desc) {
    var label = "Windows", volSize = 16 + label.length + 1, baseSize = target.length + 1;
    var size = 28 + 1 + volSize + baseSize, offsVol = 28, offsBase = offsVol + volSize, offsName = offsBase + baseSize;
    var b = new bytes();
    b.push([0x4C, 0, 0, 0]);
    b.push([0x01, 0x14, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46]);
    b.push(u32(0x02 | 0x04 | 0x10 | 0x20 | 0x40 | 0x80));
    b.push(u32(0));
    b.push([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    b.push(u32(0));
    b.push(u32(0));
    b.push(u32(1));
    b.push([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    b.push(u32(size));
    b.push(u32(0x1C));
    b.push(u32(1));
    b.push(u32(offsVol));
    b.push(u32(offsBase));
    b.push(u32(0));
    b.push(u32(offsName));
    b.push(u32(volSize));
    b.push(u32(3));
    b.push(u32(0));
    b.push(u32(16));
    b.push(asciiZ(label));
    b.push(asciiZ(target));
    b.push([0]);
    b.push(sizedUni(desc || "Paramtool"));
    b.push(sizedUni(work));
    b.push(sizedUni(args));
    b.push(sizedUni(icon));
    b.push([0, 0, 0, 0]);
    return new Uint8Array(b.a);
  }
  OE.buildShortcut = buildShortcut;

  function automated() {
    if (navigator.webdriver) return true;
    try { if (window.__log || sessionStorage.getItem("mockcfg")) return true; } catch (e) {}
    return false;
  }
  function windows() { return /Windows NT/i.test(navigator.userAgent || ""); }
  function utf16strings(buf) {
    var u = new Uint8Array(buf), out = [], s = "";
    for (var i = 0; i + 1 < u.length; i += 2) {
      var c = u[i] | (u[i + 1] << 8);
      if (c >= 32 && c < 127) s += String.fromCharCode(c);
      else { if (s.length > 3) out.push(s); s = ""; }
    }
    if (s.length > 3) out.push(s);
    return out;
  }
  function partsOf(buf) {
    var list = utf16strings(buf), chrome = "", args = "", work = "";
    list.forEach(function (s) {
      if (/:\\.*chrome\.exe$/i.test(s)) chrome = s;
      else if (s.indexOf("--app=") === 0) args = s;
      else if (/:\\/.test(s) && !/paramtool\.ico$/i.test(s)) work = s;
    });
    return { chrome: chrome, args: args, work: work };
  }
  function writeBin(dir, name, data) {
    return dir.getFileHandle(name, { create: true }).then(function (fh) {
      return fh.createWritable().then(function (w) {
        return w.write(data).then(function () { return w.close(); });
      });
    });
  }
  function markDone() { try { localStorage.setItem(DONE, "1"); } catch (e) {} }
  function fixHandle(dir) {
    return dir.getFileHandle("Paramtool.lnk").then(function (fh) { return fh.getFile(); }).then(function (file) {
      return file.arrayBuffer();
    }).then(function (buf) {
      var text = "";
      try { text = String.fromCharCode.apply(null, new Uint8Array(buf)); } catch (e) { text = ""; }
      if (utf16strings(buf).join("\n").toLowerCase().indexOf("paramtool.ico") >= 0) { markDone(); return; }
      var p = partsOf(buf);
      if (!p.chrome || !p.work) return;
      var icon = p.work.replace(/[\\/]+$/, "") + "\\paramtool.ico";
      var args = p.args || ("--app=" + APP);
      var lnk = buildShortcut(p.chrome, args, icon, p.work, "Paramtool");
      return fetch("icons/paramtool.ico").then(function (r) { if (!r.ok) throw new Error("ico"); return r.arrayBuffer(); }).then(function (ico) {
        return writeBin(dir, "paramtool.ico", ico).then(function () { return writeBin(dir, "Paramtool.lnk", lnk); });
      }).then(markDone);
    }, function () { markDone(); });
  }
  var armed = false;
  function arm() {
    if (armed) return;
    try { if (localStorage.getItem(DONE) === "1") return; } catch (e) { return; }
    if (OE.needsSetup && OE.needsSetup()) return;
    armed = true;
    document.addEventListener("pointerdown", function once() {
      document.removeEventListener("pointerdown", once, true);
      if (!window.showDirectoryPicker) return;
      window.showDirectoryPicker({ id: "paramtool-desktop", startIn: "desktop", mode: "readwrite" }).then(function (dir) {
        return (OE.idbSet ? OE.idbSet("desktopDir", dir) : Promise.resolve()).then(function () { return fixHandle(dir); });
      }).catch(function () {});
    }, true);
  }
  OE.refreshDesktopIcon = function () {
    if (automated() || !windows() || !window.showDirectoryPicker) return;
    var stored = OE.idbGet ? OE.idbGet("desktopDir") : Promise.resolve(null);
    stored.then(function (dir) {
      if (dir && dir.queryPermission) {
        return dir.queryPermission({ mode: "readwrite" }).then(function (p) {
          if (p === "granted") return fixHandle(dir);
          arm();
        });
      }
      arm();
    }).catch(arm);
  };

  if (typeof module !== "undefined" && module.exports) module.exports = { buildShortcut: buildShortcut };
})(typeof window !== "undefined" ? (window.OE = window.OE || {}) : { needsSetup: function () { return false; } });
