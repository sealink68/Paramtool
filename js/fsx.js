/* fsx.js – File System Access: folder handle, permission, dossier folders, naming, retention, metadata. */
"use strict";
(function (OE) {
  var C = OE.CFG, F = OE.fs = { root: null, picked: null, state: "none" }; // state: unsupported|none|prompt|granted
  F.supported = function () { return typeof window.showDirectoryPicker === "function"; };
  function perm(h, ask) {
    if (!h.queryPermission) return Promise.resolve("granted"); // e.g. OPFS handles
    var o = { mode: "readwrite" };
    return h.queryPermission(o).then(function (p) { return p === "granted" || !ask ? p : h.requestPermission(o); });
  }
  /* ESC_Share -> its "projecten" subfolder (created if missing); a folder already named "projecten" is used as is. */
  function useHandle(h) {
    F.picked = h;
    var p = h.name.toLowerCase() === C.SUBDIR ? Promise.resolve(h) : h.getDirectoryHandle(C.SUBDIR, { create: true });
    return p.then(function (r) {
      F.root = r; F.state = "granted";
      return r.getDirectoryHandle(C.PARAM_DIR, { create: true }).catch(function () {}).then(function () { return r; });
    });
  }
  F.line = function () { return OE.S && OE.S.line === "ESA" ? "ESA" : "ESC"; };
  F.shareName = function () { return (C.SHARES && C.SHARES[F.line()]) || "ESC_Share"; };
  function saveDirs(map) {
    F._dirs = map || {};
    var jobs = [OE.idbSet("dirs", F._dirs).catch(function () {})];
    if (F._dirs.ESC) jobs.push(OE.idbSet("dir", F._dirs.ESC).catch(function () {}));
    return Promise.all(jobs);
  }
  F.bindLine = function () {
    if (OE.ios && OE.ios()) { F.picked = null; F.root = null; F.state = "ios"; return Promise.resolve(F.state); }
    if (!F.supported()) { F.state = "unsupported"; return Promise.resolve(F.state); }
    return OE.idbGet("dirs").then(function (map) {
      map = map || {};
      if (map.ESC) return map;
      return OE.idbGet("dir").then(function (h) { if (h) map.ESC = h; return map; });
    }).then(function (map) {
      F._dirs = map || {};
      var h = F._dirs[F.line()];
      if (!h) { F.picked = null; F.root = null; F.state = "none"; return F.state; }
      F.picked = h;
      return perm(h, false).then(function (p) {
        if (p === "granted") return useHandle(h).then(function () { return F.state; });
        F.root = null; F.state = "prompt"; return F.state;
      });
    }).catch(function () { F.picked = null; F.root = null; F.state = "none"; return F.state; });
  };
  F.init = function () {
    return Promise.all([F.bindLine(), F.loadSources()]).then(function () { return F.state; });
  };
  F.pick = function () { // must run inside a user gesture
    var id = F.line() === "ESA" ? "esa-share" : "esc-share";
    return window.showDirectoryPicker({ id: id, mode: "readwrite" }).then(function (h) {
      return perm(h, true).then(function (p) {
        if (p !== "granted") throw new Error("denied");
        var map = F._dirs || {}; map[F.line()] = h;
        return saveDirs(map).then(function () { return useHandle(h); });
      });
    });
  };
  F.renew = function () { // user gesture
    return perm(F.picked, true).then(function (p) { if (p !== "granted") throw new Error("denied"); return useHandle(F.picked); });
  };
  F.ensure = function () { // before a write: still allowed?
    if (!F.picked) return Promise.resolve(false);
    return perm(F.picked, false).then(function (p) { if (p !== "granted") F.state = "prompt"; return p === "granted"; });
  };
  F.label = function () {
    if (!F.picked) return "";
    return F.picked.name.toLowerCase() === C.SUBDIR ? F.picked.name : F.picked.name + "\\" + C.SUBDIR;
  };

  /* Source folders (IndexedDB handles). Defaults are suggestions; the user must pick each one once. */
  F.sources = [];
  function srcDefs() {
    return (C.SOURCES || []).map(function (s) {
      return { key: s.key, label: s.label, hint: s.hint, startIn: s.startIn, custom: false, handle: null };
    });
  }
  F.loadSources = function () {
    return OE.idbGet("sources").then(function (saved) {
      var by = {}, out = srcDefs();
      (saved || []).forEach(function (s) { if (s && s.key) by[s.key] = s; });
      out.forEach(function (s) { if (by[s.key] && by[s.key].handle) s.handle = by[s.key].handle; delete by[s.key]; });
      Object.keys(by).forEach(function (k) {
        var s = by[k];
        if (s && s.handle) out.push({ key: s.key, label: s.label || s.handle.name, hint: s.hint || "", startIn: "", custom: true, handle: s.handle });
      });
      F.sources = out; return out;
    }).catch(function () { F.sources = srcDefs(); return F.sources; });
  };
  function persistSources() {
    var rows = F.sources.filter(function (s) { return s.handle; }).map(function (s) {
      return { key: s.key, label: s.label, hint: s.hint, custom: !!s.custom, handle: s.handle };
    });
    return OE.idbSet("sources", rows).catch(function () {});
  }
  F.allowSource = function (key) { // user gesture
    var s = null; F.sources.forEach(function (x) { if (x.key === key) s = x; });
    if (!s) return Promise.reject(new Error("source"));
    var o = { id: "src-" + key, mode: "readwrite" };
    if (s.startIn) o.startIn = s.startIn;
    return window.showDirectoryPicker(o).then(function (h) {
      return perm(h, true).then(function (p) {
        if (p !== "granted") throw new Error("denied");
        s.handle = h; if (!s.label) s.label = h.name;
        return persistSources().then(function () { return s; });
      });
    });
  };
  F.addSource = function () { // user gesture, any extra folder (Flap Control Center, …)
    var key = "c" + Date.now();
    return window.showDirectoryPicker({ id: "src-" + key, mode: "readwrite" }).then(function (h) {
      return perm(h, true).then(function (p) {
        if (p !== "granted") throw new Error("denied");
        var s = { key: key, label: h.name, hint: "", startIn: "", custom: true, handle: h };
        F.sources.push(s);
        return persistSources().then(function () { return s; });
      });
    });
  };
  F.dropSource = function (key) {
    F.sources = F.sources.filter(function (s) { return s.key !== key || !s.custom; });
    F.sources.forEach(function (s) { if (s.key === key) s.handle = null; });
    return persistSources();
  };
  F.allowedExt = function (name) {
    var e = F.extKey(name);
    if (!e || (C.PARAM_DENY || []).indexOf(e) >= 0) return false;
    return (C.PARAM_EXT || []).indexOf(e) >= 0;
  };
  /* Newest allowed parameter file across all granted source folders, recursive. .mhx never matches. */
  F.newestSource = function () {
    return (async function () {
      var best = null, list = F.sources.filter(function (s) { return s.handle; });
      async function walk(dir, src) {
        for await (var e of dir.values()) {
          if (e.kind === "directory") { try { await walk(e, src); } catch (err) {} continue; }
          if (e.kind !== "file" || !F.allowedExt(e.name)) continue;
          var f = await e.getFile();
          var item = { name: e.name, file: f, time: f.lastModified, size: f.size, dir: dir, srcLabel: src.label || (src.handle && src.handle.name) || "" };
          if (!best || item.time > best.time || (item.time === best.time && item.name < best.name)) best = item;
        }
      }
      for (var i = 0; i < list.length; i++) {
        var src = list[i];
        try { if ((await perm(src.handle, false)) !== "granted") continue; await walk(src.handle, src); } catch (e) {}
      }
      return best ? [best] : [];
    })();
  };
  /* Copy the renamed parameter file into projecten/ESC-param and check the written size. */
  F.storeParam = function (name, data) {
    var want = data && data.size != null ? data.size : null;
    return F.root.getDirectoryHandle(C.PARAM_DIR, { create: true }).then(function (d) {
      return F.write(d, name, data).then(function () {
        return d.getFileHandle(name).then(function (fh) { return fh.getFile(); }).then(function (got) {
          if (want != null && got.size !== want) throw new Error("verify");
          return got;
        });
      });
    });
  };

  /* ---- naming ---- */
  F.base = function (fam, sub, dos) { return OE.safeName(fam, true) + "_" + OE.safeName(sub, true) + "_" + OE.safeName(dos); };
  F.ext = function (name) { var m = /\.([^.\\/]+)$/.exec(name || ""); return m ? "." + m[1] : ""; };
  F.paramName = function (fam, sub, dos, date, orig) { return F.base(fam, sub, dos) + "_" + OE.stamp(date) + F.ext(orig); };
  F.pdfName = function (fam, sub, dos) { return F.base(fam, sub, dos) + "_info.pdf"; };
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  /* Parameter files of this dossier: <Family>_<anything>_<Dossier>_<YYYY-MM-DD_HHMM>[.ext]; the sub-model part is free
     so files saved under an earlier sub-model choice of the same dossier also count. Newest first. */
  /* Retention groups: extension, case-insensitive (".XML" == ".xml"); no extension = own group "". */
  F.extKey = function (name) { return F.ext(name).toLowerCase(); };
  /* [{ext, files:[newest first]}], groups ordered by their newest file. */
  F.groups = function (files) {
    var g = {}, order = [];
    (files || []).forEach(function (f) { var k = f.ext != null ? f.ext : F.extKey(f.name); if (!g[k]) { g[k] = []; order.push(k); } g[k].push(f); });
    return order.map(function (k) { return { ext: k, files: g[k] }; });
  };
  /* Keep max KEEP per extension group; returns {keep, drop} (input newest first). */
  F.retain = function (files) {
    var n = {}, keep = [], drop = [];
    files.forEach(function (f) { var k = F.extKey(f.name); n[k] = (n[k] || 0) + 1; (n[k] > C.KEEP ? drop : keep).push(f); });
    return { keep: keep, drop: drop };
  };
  F.listParams = function (dir, fam, dos) {
    var re = new RegExp("^" + reEsc(OE.safeName(fam, true)) + "_.+_" + reEsc(OE.safeName(dos)) + "_(\\d{4}-\\d\\d-\\d\\d_\\d{4})(\\.[^.]+)?$");
    var out = [];
    return (async function () {
      for await (var e of dir.values()) { if (e.kind === "file") { var m = re.exec(e.name); if (m) out.push({ name: e.name, stamp: m[1], ext: F.extKey(e.name) }); } }
      out.sort(function (a, b) { return a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : (a.name < b.name ? 1 : -1); });
      return out;
    })();
  };
  F.dossierDir = function (fam, dos, create) {
    var o = { create: !!create };
    return F.root.getDirectoryHandle(OE.safeName(fam, true), o).then(function (d) { return d.getDirectoryHandle(OE.safeName(dos), o); });
  };
  F.exists = function (dir, name) { return dir.getFileHandle(name).then(function () { return true; }, function () { return false; }); };
  F.write = function (dir, name, data) {
    return dir.getFileHandle(name, { create: true }).then(function (fh) {
      return fh.createWritable().then(function (w) { return w.write(data).then(function () { return w.close(); }); });
    });
  };
  F.readMeta = function (fam, dos) {
    if (!F.root || !fam || !OE.safeName(dos)) return Promise.resolve(null);
    return F.dossierDir(fam, dos, false).then(function (d) { return d.getFileHandle(C.META); })
      .then(function (fh) { return fh.getFile(); }).then(function (f) { return f.text(); }).then(JSON.parse)
      .catch(function () { return null; });
  };
  /* All existing dossiers: projecten/<Family>/<Dossier>/ -> _esc_info.json if present, else folder name + newest
     parameter file. Newest first. */
  F.scan = function () {
    var out = [], STAMP = /_(\d{4}-\d\d-\d\d_\d{4})(\.[^.]+)?$/;
    function toIso(st) { var m = /^(\d{4})-(\d\d)-(\d\d)_(\d\d)(\d\d)$/.exec(st || ""); return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]).toISOString() : ""; }
    return (async function () {
      for await (var fd of F.root.values()) {
        if (fd.kind !== "directory") continue;
        for await (var dd of fd.values()) {
          if (dd.kind !== "directory") continue;
          var meta = null, files = [];
          try { meta = JSON.parse(await (await (await dd.getFileHandle(C.META)).getFile()).text()); } catch (e) { meta = null; }
          try { files = await F.listParams(dd, fd.name, dd.name); } catch (e) { files = []; }
          if (!files.length) { // fall back: any file with a timestamp in the name
            for await (var e of dd.values()) { var m = e.kind === "file" && STAMP.exec(e.name); if (m) files.push({ name: e.name, stamp: m[1], ext: F.extKey(e.name) }); }
            files.sort(function (a, b) { return a.stamp < b.stamp ? 1 : -1; });
          }
          var m2 = meta || {};
          out.push({ family: fd.name, folder: dd.name, dossier: m2.dossierInput || m2.dossier || dd.name, sub: m2.submodel || "", serial: m2.serial || "", order: m2.order || "",
            updated: m2.updated || toIso(files[0] && files[0].stamp), files: F.retain(files).keep, meta: !!meta });
        }
      }
      out.sort(function (a, b) { return a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0; });
      return out;
    })();
  };
  /* Which file(s) would be removed if a new one named `name` is added. */
  F.wouldDelete = function (fam, dos, name) {
    return F.dossierDir(fam, dos, false).then(function (d) { return F.listParams(d, fam, dos); }, function () { return []; }).then(function (l) {
      var st = /_(\d{4}-\d\d-\d\d_\d{4})(\.[^.]+)?$/.exec(name)[1];
      var all = l.filter(function (f) { return f.name !== name; }).concat([{ name: name, stamp: st }]);
      all.sort(function (a, b) { return a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : (a.name < b.name ? 1 : -1); });
      return F.retain(all).drop.map(function (f) { return f.name; });
    });
  };
})(window.OE);
