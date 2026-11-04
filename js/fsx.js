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
  F.line = function () { return OE.S && OE.S.line === "ESA" ? "ESA" : "ESC"; };
  F.shareName = function () { return (C.SHARES && C.SHARES[F.line()]) || "ESC_Share"; };
  F.paramDirName = function (line) { var k = line || F.line(); return (C.PARAM_DIRS && C.PARAM_DIRS[k]) || "ESC-param"; };
  /* Share root -> projecten/<ESC-param|ESA-param>, created if missing. F.root is that flat param folder. */
  function ensureShare(h, line) {
    var name = F.paramDirName(line);
    return h.getDirectoryHandle(C.SUBDIR, { create: true }).then(function (proj) {
      return proj.getDirectoryHandle(name, { create: true });
    });
  }
  function useHandle(h) {
    F.picked = h;
    return ensureShare(h, F.line()).then(function (param) { F.root = param; F.state = "granted"; return param; });
  }
  F.ensureAllShares = function () {
    var map = F._dirs || {}, jobs = [];
    ["ESC", "ESA"].forEach(function (line) {
      if (!map[line]) return;
      jobs.push(perm(map[line], false).then(function (p) { return p === "granted" ? ensureShare(map[line], line) : null; }).catch(function () {}));
    });
    return Promise.all(jobs);
  };
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
    return F.loadSources().then(function () { return F.bindLine(); }).then(function () { return F.ensureAllShares(); })
      .then(function () { return F.discover(); }).then(function () { return F.refreshPerm(); }).then(function () { return F.state; });
  };
  function openPicker(o) {
    return window.showDirectoryPicker(o).catch(function (e) {
      if (o.startIn && typeof o.startIn !== "string") return window.showDirectoryPicker({ id: o.id, mode: o.mode, startIn: "documents" });
      throw e;
    });
  }
  F.shareStart = function (which) {
    var map = F._dirs || {}, other = which === "ESA" ? map.ESC : map.ESA;
    return other || map[which] || "documents";
  };
  F.pick = function (line) { // must run inside a user gesture; line defaults to the active ESA/ESC switch
    var which = line === "ESA" || line === "ESC" ? line : F.line();
    var id = which === "ESA" ? "esa-share" : "esc-share";
    return openPicker({ id: id, mode: "readwrite", startIn: F.shareStart(which) }).then(function (h) {
      return perm(h, true).then(function (p) {
        if (p !== "granted") throw new Error("denied");
        var map = F._dirs || {}; map[which] = h;
        var issue = h.name !== C.SHARES[which] ? { code: "share", got: h.name, expect: C.SHARES[which] } : null;
        F.issue = issue;
        return saveDirs(map).then(function () { return which === F.line() ? useHandle(h) : ensureShare(h, which); }).then(function () { return { handle: h, issue: issue }; });
      });
    });
  };
  F.storedHandles = function () {
    var list = [], map = F._dirs || {};
    if (map.ESC) list.push(map.ESC);
    if (map.ESA) list.push(map.ESA);
    (F.sources || []).forEach(function (s) { if (s.handle) list.push(s.handle); });
    return list;
  };
  F.refreshPerm = function () {
    return Promise.all(F.storedHandles().map(function (h) {
      return perm(h, false).then(function (p) { return p !== "granted"; });
    })).then(function (flags) { F._pending = flags.filter(Boolean).length; return F._pending; }).catch(function () { F._pending = 0; return 0; });
  };
  /* One user gesture: requestPermission for every stored handle that is not granted yet. */
  F.renewAll = function () {
    return F.storedHandles().reduce(function (p, h) {
      return p.then(function () { return perm(h, false).then(function (st) { return st === "granted" ? st : perm(h, true); }); });
    }, Promise.resolve()).then(function () { return F.bindLine(); }).then(function () { return F.ensureAllShares(); }).then(function () { return F.discover(); }).then(function () { return F.refreshPerm(); });
  };
  F.renew = function () { return F.renewAll(); };
  F.ensure = function () { // before a write: still allowed?
    if (!F.picked) return Promise.resolve(false);
    return perm(F.picked, false).then(function (p) { if (p !== "granted") F.state = "prompt"; return p === "granted"; });
  };
  F.label = function () {
    if (!F.picked) return "";
    return F.shareName() + "\\" + C.SUBDIR + "\\" + F.paramDirName();
  };
  /* Last source directory a parameter file was taken from, per ESA/ESC line. */
  F.lastByLine = { ESC: null, ESA: null };
  F.rememberSource = function (dir) {
    if (!dir) return;
    F.lastSource = dir;
    F.lastByLine[F.line()] = dir;
  };
  function sourceHandle(key) {
    var h = null;
    (F.sources || []).forEach(function (s) { if (s.key === key && s.handle) h = s.handle; });
    return h;
  }
  function programHandle(names) {
    var list = names || [];
    for (var i = 0; i < list.length; i++) {
      var want = String(list[i]).toLowerCase(), hit = null;
      (F.programs || []).forEach(function (p) {
        if (!hit && p.handle && String(p.name).toLowerCase() === want) hit = p.handle;
      });
      if (hit) return hit;
    }
    return null;
  }
  function placeOf(step, group) {
    if (step === "downloads" || step === "eeps" || step === "docs") return sourceHandle(step);
    if (step === "program") return programHandle(group.programs);
    if (step === "last") return F.lastByLine[F.line()] || null;
    if (step === "param") return F.root || null;
    if (step === "documents" || step === "desktop") return step;
    return null;
  }
  function formNames(form) {
    var fam = "", sub = "";
    if (form) {
      fam = form.fam === C.OTHER ? String(form.famOther || "").trim() : String(form.fam || "");
      sub = form.sub === C.OTHER ? String(form.subOther || "").trim() : String(form.sub || "");
    }
    return { fam: fam, sub: sub };
  }
  /* First FILE_GROUPS row that matches the selected device. */
  F.deviceGroup = function (form) {
    var line = F.line(), names = formNames(form), fam = names.fam, sub = names.sub;
    var groups = C.FILE_GROUPS || [], g = null;
    for (var i = 0; i < groups.length && !g; i++) {
      var cand = groups[i];
      if (cand.line && cand.line !== line) continue;
      var fams = cand.families || [], prefs = cand.prefixes || [];
      if (!fams.length && !prefs.length) { g = cand; break; }
      var famHit = fam && fams.some(function (n) { return String(n).toLowerCase() === fam.toLowerCase(); });
      var preHit = prefs.some(function (p) {
        var u = String(p).toUpperCase();
        return (sub && sub.toUpperCase().indexOf(u) === 0) || (fam && fam.toUpperCase().indexOf(u) === 0);
      });
      if (famHit || preHit) g = cand;
    }
    if (!g) g = { id: line === "ESA" ? "proline" : "esc", ext: line === "ESA" ? [".xml"] : [".prd", ".xml", ".dat", ".mot"], source: "param", fallback: "documents" };
    return g;
  };
  function normExt(e) { e = String(e || "").toLowerCase(); return !e ? "" : (e.charAt(0) === "." ? e : "." + e); }
  /* Extensions for the selected device. Without a form: every type the app can store. */
  F.extList = function (form) {
    var raw = form ? ((F.deviceGroup(form).ext) || []) : (C.PARAM_EXT || []);
    var out = [];
    raw.forEach(function (e) { e = normExt(e); if (e && out.indexOf(e) < 0 && (C.PARAM_DENY || []).indexOf(e) < 0) out.push(e); });
    return out;
  };
  /* Where "Ander bestand kiezen" opens. { id, starts, ext } from CFG.FILE_GROUPS. starts[0] is the best handle. */
  F.fileTarget = function (form) {
    var g = F.deviceGroup(form);
    var steps = [g.source].concat(g.fallback ? (Array.isArray(g.fallback) ? g.fallback : [g.fallback]) : []);
    var starts = [];
    steps.forEach(function (step) {
      var h = placeOf(step, g);
      if (h && starts.indexOf(h) < 0) starts.push(h);
    });
    if (!starts.length || starts[starts.length - 1] !== "documents") starts.push("documents");
    return { id: "file-" + (g.id || "esc"), starts: starts, ext: F.extList(form) };
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
  function sourceIssue(key, h) {
    if (key === "eeps" && h.name !== "EEPS Files") return { code: "eeps", got: h.name };
    if (key === "downloads" && h.name !== "OSI-param") return { code: "osi", got: h.name };
    return null;
  }
  F.allowSource = function (key) { // user gesture. id is stable so Chrome remembers each picker.
    var s = null; F.sources.forEach(function (x) { if (x.key === key) s = x; });
    if (!s) return Promise.reject(new Error("source"));
    var o = { id: "src-" + key, mode: "readwrite", startIn: s.startIn || "documents" };
    return openPicker(o).then(function (h) {
      return perm(h, true).then(function (p) {
        if (p !== "granted") throw new Error("denied");
        s.handle = h; if (!s.label) s.label = h.name;
        return persistSources().then(function () { return s.key === "docs" ? F.discover() : null; }).then(function () {
          var issue = sourceIssue(s.key, h);
          if (s.key === "docs" && !(F.programs || []).some(function (pr) { return /pavis/i.test(pr.name); })) issue = { code: "docs" };
          F.issue = issue;
          return F.refreshPerm();
        }).then(function () { return { handle: h, issue: F.issue }; });
      });
    });
  };
  F.addSource = function () { // user gesture, any extra folder (Flap Control Center, …)
    var key = "c" + Date.now();
    return openPicker({ id: "src-" + key, mode: "readwrite", startIn: "documents" }).then(function (h) {
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
  /* form set: only that device's extensions. form omitted: any stored parameter type. .mhx never matches. */
  F.allowedExt = function (name, form) {
    var e = F.extKey(name);
    if (!e || (C.PARAM_DENY || []).indexOf(e) >= 0) return false;
    return F.extList(form).indexOf(e) >= 0;
  };
  function sourceLabel(key, handle) {
    var s = null;
    (F.sources || []).forEach(function (x) { if (x.key === key) s = x; });
    return (handle && handle.name) || (s && s.label) || key;
  }
  /* scan omitted: every discovered program folder plus every extra source. */
  function rootsFor(group) {
    var roots = [], seen = [];
    function add(handle, label) {
      if (!handle || seen.indexOf(handle) >= 0) return;
      seen.push(handle);
      roots.push({ handle: handle, label: label });
    }
    var scan = group && group.scan;
    if (!scan || !scan.length) {
      (F.programs || []).forEach(function (p) { add(p.handle, p.name + "\\" + p.folder); });
      (F.sources || []).forEach(function (s) { if (s.handle && s.key !== "docs") add(s.handle, sourceLabel(s.key, s.handle)); });
      return roots;
    }
    scan.forEach(function (step) {
      if (step === "program") {
        var names = ((group && group.programs) || []).map(function (n) { return String(n).toLowerCase(); });
        (F.programs || []).forEach(function (p) {
          if (names.length && names.indexOf(String(p.name).toLowerCase()) < 0) return;
          add(p.handle, p.name + "\\" + p.folder);
        });
        return;
      }
      var h = sourceHandle(step);
      if (h) add(h, sourceLabel(step, h));
    });
    return roots;
  }
  /* Direct children of Public Documents that contain projects/Projects. */
  F.programs = [];
  F.discover = function () {
    var docs = null; F.sources.forEach(function (s) { if (s.key === "docs") docs = s; });
    F.programs = [];
    if (!docs || !docs.handle) return Promise.resolve([]);
    return perm(docs.handle, false).then(function (p) {
      if (p !== "granted") return [];
      return (async function () {
        var found = [];
        for await (var e of docs.handle.values()) {
          if (e.kind !== "directory") continue;
          var proj = null;
          try {
            for await (var c of e.values()) { if (c.kind === "directory" && c.name.toLowerCase() === "projects") { proj = c; break; } }
          } catch (err) {}
          if (proj) found.push({ name: e.name, folder: proj.name, handle: proj });
        }
        found.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
        F.programs = found; return found;
      })();
    }).catch(function () { return []; });
  };
  /* Newest parameter file for this device: only its extensions, and only the group's scan folders. .mhx never matches. */
  F.newestSource = function (form) {
    return (async function () {
      var best = null, roots = rootsFor(F.deviceGroup(form));
      async function walk(dir, label) {
        for await (var e of dir.values()) {
          if (e.kind === "directory") { try { await walk(e, label); } catch (err) {} continue; }
          if (e.kind !== "file" || !F.allowedExt(e.name, form)) continue;
          var f = await e.getFile();
          var item = { name: e.name, file: f, time: f.lastModified, size: f.size, dir: dir, srcLabel: label };
          if (!best || item.time > best.time || (item.time === best.time && item.name < best.name)) best = item;
        }
      }
      for (var i = 0; i < roots.length; i++) {
        try { if ((await perm(roots[i].handle, false)) !== "granted") continue; await walk(roots[i].handle, roots[i].label); } catch (e) {}
      }
      return best ? [best] : [];
    })();
  };
  /* The parameter file is written flat into the param folder; this only checks that size. */
  F.storeParam = function (name, data) {
    var want = data && data.size != null ? data.size : null;
    if (!F.root) return Promise.reject(new Error("param"));
    return F.root.getFileHandle(name).then(function (fh) { return fh.getFile(); }).then(function (got) {
      if (want != null && got.size !== want) throw new Error("verify");
      return got;
    });
  };

  /* ---- naming ---- */
  /* File and folder names only. The form keeps the typed text.
     Manual fields that enter a name: dossiernummer, family (also Ander…), submodel (also Ander…).
     Serial and order number are not part of the file name. safeName turns whitespace, control
     characters and \ / : * ? " < > | into "_", then drops a leading or trailing dot, space or underscore. */
  F.base = function (fam, sub, dos) { return OE.safeName(fam, true) + "_" + OE.safeName(sub, true) + "_" + OE.safeName(dos); };
  F.ext = function (name) { var m = /\.([^.\\/]+)$/.exec(name || ""); return m ? "." + m[1] : ""; };
  /* Extension as stored. The allow-check still uses F.ext; this only cleans the written name. */
  function safeExt(name) {
    var raw = F.ext(name);
    if (!raw || raw.charAt(0) !== ".") return "";
    var body = OE.safeName(raw.slice(1));
    return body ? "." + body : "";
  }
  F.paramName = function (fam, sub, dos, date, orig) { return F.base(fam, sub, dos) + "_" + OE.stamp(date) + safeExt(orig); };
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
  F.metaName = function (fam, sub, dos) { return F.base(fam, sub, dos) + "_esc_info.json"; };
  /* All saves are flat in the param folder: no Family/Dossier directories. */
  F.dossierDir = function () { return Promise.resolve(F.root); };
  F.exists = function (dir, name) { return dir.getFileHandle(name).then(function () { return true; }, function () { return false; }); };
  F.write = function (dir, name, data) {
    return dir.getFileHandle(name, { create: true }).then(function (fh) {
      return fh.createWritable().then(function (w) { return w.write(data).then(function () { return w.close(); }); });
    });
  };
  F.readMeta = function (fam, dos) {
    if (!F.root || !fam || !OE.safeName(dos)) return Promise.resolve(null);
    var wantF = OE.safeName(fam, true), wantD = OE.safeName(dos);
    return (async function () {
      for await (var e of F.root.values()) {
        if (e.kind !== "file" || !/_esc_info\.json$/i.test(e.name)) continue;
        try {
          var m = JSON.parse(await (await e.getFile()).text());
          if (OE.safeName(m.family, true) === wantF && (OE.safeName(m.dossier) === wantD || OE.safeName(m.dossierInput) === wantD)) return m;
        } catch (err) {}
      }
      return null;
    })();
  };
  /* Existing dossiers from the flat param folder (metadata files + timestamped parameter files). Newest first. */
  F.scan = function () {
    function toIso(st) { var m = /^(\d{4})-(\d\d)-(\d\d)_(\d\d)(\d\d)$/.exec(st || ""); return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]).toISOString() : ""; }
    if (!F.root) return Promise.resolve([]);
    return (async function () {
      var metas = [], params = [];
      for await (var e of F.root.values()) {
        if (e.kind !== "file") continue;
        if (/_esc_info\.json$/i.test(e.name)) { try { metas.push(JSON.parse(await (await e.getFile()).text())); } catch (err) {} continue; }
        var m = /_(\d{4}-\d\d-\d\d_\d{4})(\.[^.]+)?$/.exec(e.name);
        if (m && F.allowedExt(e.name)) params.push({ name: e.name, stamp: m[1], ext: F.extKey(e.name) });
      }
      var out = metas.map(function (m2) {
        var base = OE.safeName(m2.family, true) + "_", dos = OE.safeName(m2.dossier);
        var files = params.filter(function (f) { return f.name.indexOf(base) === 0 && f.name.indexOf("_" + dos + "_") > 0; });
        files.sort(function (a, b) { return a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : 0; });
        return { family: m2.family, folder: dos, dossier: m2.dossierInput || m2.dossier, sub: m2.submodel || "", serial: m2.serial || "", order: m2.order || "",
          updated: m2.updated || toIso(files[0] && files[0].stamp), files: F.retain(files).keep, meta: true };
      });
      out.sort(function (a, b) { return a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0; });
      return out;
    })();
  };
  /* Which file(s) would be removed if a new one named `name` is added. */
  F.wouldDelete = function (fam, dos, name) {
    return F.dossierDir().then(function (d) { return d ? F.listParams(d, fam, dos) : []; }, function () { return []; }).then(function (l) {
      var st = /_(\d{4}-\d\d-\d\d_\d{4})(\.[^.]+)?$/.exec(name)[1];
      var all = l.filter(function (f) { return f.name !== name; }).concat([{ name: name, stamp: st }]);
      all.sort(function (a, b) { return a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : (a.name < b.name ? 1 : -1); });
      return F.retain(all).drop.map(function (f) { return f.name; });
    });
  };
})(window.OE);
