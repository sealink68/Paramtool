/* ui/screens.js – one function per screen. Flow: lang -> tech (once) -> folder (once / renew) -> form -> result. settings via ⚙. */
"use strict";
(function (OE) {
  var $ = OE.$, esc = OE.esc, SC = OE.screens, C = OE.CFG, mem = OE.mem;
  function blank() { return { fam: "", famOther: "", sub: "", subOther: "", dossier: "", serial: "", order: "", file: null }; }
  mem.form = blank();

  /* ---------- language ---------- */
  SC.lang = function () {
    $("card").innerHTML = '<div class="start"><h2>Kies je taal</h2><p>Choisissez votre langue</p>' +
      '<button class="btn pri big" data-l="nl">Nederlands<small>NL</small></button>' +
      '<button class="btn sec big" data-l="fr">Français<small>FR</small></button></div>';
    [].forEach.call($("card").querySelectorAll("[data-l]"), function (b) {
      b.onclick = function () { OE.S.lang = b.dataset.l; OE.go(OE.S.tech.first && OE.S.tech.last ? "form" : "tech"); };
    });
  };

  /* ---------- technician name ---------- */
  SC.tech = function () {
    var S = OE.S, x = OE.t(), first = !(S.tech.first && S.tech.last);
    $("card").innerHTML = '<div class="narrow"><h2 class="q">' + x.techH + '</h2><p class="hint" style="margin-top:-8px">' + x.techP + "</p>" +
      '<label class="lbl" for="fn">' + x.first + '</label><input id="fn" autocomplete="given-name" placeholder="' + esc(x.firstPh) + '">' +
      '<label class="lbl" for="lnm">' + x.last + '</label><input id="lnm" autocomplete="family-name" placeholder="' + esc(x.lastPh) + '">' +
      '<div id="err"></div><div class="btns">' + (first ? "" : '<button class="btn sec" id="bk">‹ ' + x.back + "</button>") +
      '<button class="btn pri" id="go">' + (first ? x.techStart : x.techSave) + "</button></div></div>";
    $("fn").value = S.tech.first; $("lnm").value = S.tech.last;
    $("lnm").onkeydown = function (e) { if (e.key === "Enter") $("go").click(); };
    OE.bind("bk", function () { OE.go("settings", -1); });
    OE.bind("go", function () {
      var f = $("fn").value.replace(/\s+/g, " ").trim(), l = $("lnm").value.replace(/\s+/g, " ").trim();
      if (!f || !l) { OE.err(x.needName); return; }
      S.tech = { first: f, last: l }; OE.save(); var bk = OE._techBack || "settings"; OE._techBack = null; OE.go(first ? (OE.fs.state === "ios" ? "form" : "folder") : bk);
    });
  };

  /* ---------- first-run wizard (replaces the separate language and name screens) ---------- */
  function W(k) {
    var L = OE.S.lang;
    if (L === "nl" || L === "fr") return OE.T[L][k];
    return OE.T.nl[k] + " / " + OE.T.fr[k];
  }
  function srcHint(key) {
    var x = OE.t();
    if (key === "docs") return x.hintDocs;
    if (key === "eeps") return x.hintEeps;
    if (key === "downloads") return x.srcDownHint;
    return "";
  }
  function issueText(issue) {
    var x = OE.t();
    if (!issue) return "";
    if (issue.code === "share") return OE.fmt(x.shareBad, issue);
    if (issue.code === "docs") return x.docsBad;
    if (issue.code === "eeps") return OE.fmt(x.eepsBad, issue);
    if (issue.code === "osi") return OE.fmt(x.osiBad, issue);
    return "";
  }
  function resumeStep() {
    var S = OE.S;
    if (!(S.tech && S.tech.first)) return "first";
    if (!S.tech.last) return "last";
    if (!S.roleSet) return "role";
    if (!S.lang) return "lang";
    return "share";
  }
  function goStep(step) { if (!mem.wiz) mem.wiz = {}; mem.wiz.step = step; OE.render(1); }
  function finishWizard() {
    OE.S.setupDone = true; OE._setupRedo = false;
    mem.autorunLatest = !(OE.ios && OE.ios()) && OE.fs.state === "granted";
    OE.S.screen = "form"; OE.save();
    var run = function () {
      if (OE.fs.state !== "granted" && !(OE.ios && OE.ios())) { mem.autorunLatest = false; OE.S.screen = "folder"; }
      OE.render(1);
    };
    if (OE.fs.bindLine) OE.fs.bindLine().then(run, run); else run();
  }
  OE.redoSetup = function () {
    OE._setupRedo = true; OE.S.setupDone = false; mem.wiz = { step: "first" }; OE.save(); OE.go("setup");
  };
  function wizFrame(n, total, inner) {
    return '<div class="narrow" id="wiz" data-step="' + mem.wiz.step + '"><p class="wstep">' + esc(OE.fmt(W("wizStep"), { n: n, t: total })) + "</p>" + inner + "</div>";
  }
  function setupBanner() {
    if (OE.ios && OE.ios()) return "";
    return '<div class="batban" id="setupBanner"><a class="btn pri big" id="setupBat" href="Paramtool_setup.bat" download>Stap 1: Download en start Paramtool_setup.bat<small>Étape 1 : Télécharger et lancer Paramtool_setup.bat</small></a>' +
      '<p class="hint">NL: Maakt de mappen en een bureaubladsnelkoppeling. Chrome: ‘Behouden’. SmartScreen: ‘Meer info’ &gt; ‘Toch uitvoeren’.<br>FR: Crée les dossiers et un raccourci sur le bureau. Chrome : « Conserver ». SmartScreen : « Informations complémentaires » &gt; « Exécuter quand même ».</p></div>';
  }
  OE.setupBanner = setupBanner;
  function batLink() { return setupBanner(); }
  SC.setup = function () {
    if (!mem.wiz || !mem.wiz.step) mem.wiz = { step: OE._setupRedo ? "first" : resumeStep() };
    var S = OE.S, step = mem.wiz.step, x = OE.S.lang ? OE.t() : null, F = OE.fs;
    if (step === "first") {
      $("card").innerHTML = wizFrame(1, 4, setupBanner() + '<h2 class="q">' + esc(W("wizFirst")) + '</h2><label class="lbl" for="fn">' + esc(W("wizFirst")) + '</label><input id="fn" autocomplete="given-name" value="' + esc(S.tech.first || "") + '"><div id="err"></div><div class="btns"><button class="btn sec" id="wizNext">Al gedaan, verder / Déjà fait, continuer</button></div>');
      $("fn").onkeydown = function (e) { if (e.key === "Enter") $("wizNext").click(); };
      OE.bind("wizNext", function () {
        var v = $("fn").value.replace(/\s+/g, " ").trim();
        if (!v) { OE.err(W("needName")); return; }
        S.tech.first = v; OE.save(); goStep("last");
      });
      return;
    }
    if (step === "last") {
      $("card").innerHTML = wizFrame(2, 4, '<h2 class="q">' + esc(W("wizLast")) + '</h2><label class="lbl" for="lnm">' + esc(W("wizLast")) + '</label><input id="lnm" autocomplete="family-name" value="' + esc(S.tech.last || "") + '"><div id="err"></div><div class="btns"><button class="btn sec" id="wizBack">‹ ' + esc(W("back")) + '</button><button class="btn pri" id="wizNext">' + esc(W("wizNext")) + "</button></div>");
      $("lnm").onkeydown = function (e) { if (e.key === "Enter") $("wizNext").click(); };
      OE.bind("wizBack", function () { goStep("first"); });
      OE.bind("wizNext", function () {
        var v = $("lnm").value.replace(/\s+/g, " ").trim();
        if (!v) { OE.err(W("needName")); return; }
        S.tech.last = v; OE.save(); goStep("role");
      });
      return;
    }
    if (step === "role") {
      $("card").innerHTML = wizFrame(3, 4, '<h2 class="q">' + esc(W("wizRole")) + '</h2><button class="btn pri big" id="roleEsc">ESC<small>ESC_Share</small></button><button class="btn sec big" id="roleEsa">ESA<small>ESA_Share</small></button><div class="btns"><button class="btn sec" id="wizBack">‹ ' + esc(W("back")) + "</button></div>");
      function choose(line) {
        S.line = line; S.roleSet = true; OE.save();
        var nxt = function () { goStep("lang"); };
        if (F.bindLine) F.bindLine().then(nxt, nxt); else nxt();
      }
      OE.bind("roleEsc", function () { choose("ESC"); });
      OE.bind("roleEsa", function () { choose("ESA"); });
      OE.bind("wizBack", function () { goStep("last"); });
      return;
    }
    if (step === "lang") {
      $("card").innerHTML = wizFrame(4, 4, '<h2 class="q">' + esc(W("wizLang")) + '</h2><button class="btn pri big" data-l="nl">Nederlands<small>NL</small></button><button class="btn sec big" data-l="fr">Français<small>FR</small></button><div class="btns"><button class="btn sec" id="wizBack">‹ ' + esc(W("back")) + "</button></div>");
      OE.bind("wizBack", function () { goStep("role"); });
      [].forEach.call($("card").querySelectorAll("[data-l]"), function (b) {
        b.onclick = function () {
          S.lang = b.dataset.l; OE.save(); OE.hdr(); OE.brwUI();
          if (OE.ios && OE.ios()) { finishWizard(); return; }
          if (F.state === "unsupported") { S.setupDone = true; OE._setupRedo = false; S.screen = "folder"; OE.save(); OE.render(1); return; }
          goStep("share");
        };
      });
      return;
    }
    if (step === "share") {
      var ready = F.state === "granted", prompt = F.state === "prompt", other = F.line() === "ESA" ? "ESC" : "ESA";
      var h = '<h2 class="q">' + esc(OE.fmt(x.wizShare, { s: F.shareName() })) + '</h2><p class="hint" id="shareHint">' + esc(OE.fmt(x.hintShare, { s: F.shareName() })) + "</p>";
      if (F.issue && F.issue.code === "share") h += '<div class="err" id="pickWarn">' + esc(issueText(F.issue)) + "</div>";
      if (ready) h += '<p class="hint" id="shareOk">' + esc(OE.fmt(x.wizShareOk, { s: F.shareName(), p: F.paramDirName() })) + "</p>";
      if (prompt) h += '<p class="hint">' + esc(x.folderRenewP) + '</p><button class="btn pri big" id="renew">' + esc(x.folderRenew) + "</button>";
      h += '<button class="btn ' + (ready || prompt ? "sec" : "pri") + ' big" id="pick">' + esc(OE.fmt(ready || prompt ? x.folderChange : x.folderPick, { s: F.shareName() })) + "</button>";
      if (F.line() !== "ESA" && !(F._dirs && F._dirs.ESA)) h += '<button class="btn sec big" id="pickOther">' + esc(OE.fmt(x.folderOther, { s: C.SHARES.ESA })) + "</button>";
      if (ready) h += '<div class="btns"><button class="btn pri" id="wizNext">' + esc(x.wizNext) + "</button></div>";
      h += batLink() + '<div id="err"></div><div class="btns"><button class="btn sec" id="wizBack">‹ ' + esc(x.back) + "</button></div>";
      $("card").innerHTML = wizFrame(4, 4, h);
      function fail(e) { OE.pickerFail(e); }
      function afterShare() { if (F.line() === "ESA") finishWizard(); else goStep("docs"); }
      OE.bind("pick", function () { F.pick().then(function (r) { if (r && r.issue) { SC.setup(); return; } afterShare(); }, fail); });
      OE.bind("pickOther", function () { F.pick("ESA").then(function () { SC.setup(); }, fail); });
      OE.bind("renew", function () { F.renewAll().then(function () { if (F.state === "granted") afterShare(); else SC.setup(); }, fail); });
      OE.bind("wizNext", afterShare);
      OE.bind("wizBack", function () { goStep("lang"); });
      return;
    }
    if (step === "docs") {
      var srcBtn = function (key, label, hint) {
        var s = null; (F.sources || []).forEach(function (it) { if (it.key === key) s = it; });
        var okb = s && s.handle;
        return '<div class="wosel"><div><b>' + esc(label) + "</b>" + (hint ? "<small>" + esc(hint) + "</small>" : "") + '</div><button type="button" class="btn ' + (okb ? "ok" : "sec") + '" data-allow="' + esc(key) + '">' + esc(okb ? "✓ " + (s.handle.name || x.srcOk) : x.srcAllow) + "</button></div>";
      };
      var h = '<h2 class="q">' + esc(x.wizDocs) + '</h2><p class="hint">' + esc(x.wizDocsP) + "</p>" +
        srcBtn("docs", "Public Documents", srcHint("docs")) +
        '<p class="hint">' + esc(x.srcH) + "</p>" +
        srcBtn("eeps", "EEPS", srcHint("eeps")) +
        srcBtn("downloads", x.srcDown, srcHint("downloads")) +
        (F.issue && F.issue.code !== "share" ? '<div class="err" id="pickWarn">' + esc(issueText(F.issue)) + "</div>" : "") +
        batLink() + '<div id="err"></div><div class="btns"><button class="btn sec" id="wizBack">‹ ' + esc(x.back) + '</button><button class="btn pri" id="wizDone">' + esc(x.wizDone) + "</button></div>";
      $("card").innerHTML = wizFrame(4, 4, h);
      [].forEach.call($("card").querySelectorAll("[data-allow]"), function (b) {
        b.onclick = function () { F.allowSource(b.getAttribute("data-allow")).then(function () { SC.setup(); }, OE.pickerFail); };
      });
      OE.bind("wizBack", function () { goStep("share"); });
      OE.bind("wizDone", finishWizard);
      return;
    }
  };

  /* ---------- folder setup / renew ---------- */
  SC.folder = function () {
    var x = OE.t(), F = OE.fs, st = F.state, h = "";
    if (st === "unsupported") {
      h = '<div class="narrow"><h2 class="q">⚠️ ' + x.unsupH + '</h2><div class="err" id="unsup">' + esc(x.unsupP) + "</div></div>";
      $("card").innerHTML = h; return;
    }
    var other = F.line() === "ESA" ? "ESC" : "ESA", pName = F.paramDirName();
    h = '<div class="narrow"><h2 class="q">' + x.folderH + '</h2><p class="hint" id="shareNow" style="margin-top:-8px">' + esc(OE.fmt(x.shareNow, { s: F.shareName(), p: pName })) + '</p><p class="hint" id="shareHint">' + esc(OE.fmt(x.hintShare, { s: F.shareName() })) + "</p><p class=\"hint\">" + esc(OE.fmt(x.folderP, { s: F.shareName(), p: pName })) + "</p>";
    if (F.issue && F.issue.code === "share") h += '<div class="err" id="pickWarn">' + esc(issueText(F.issue)) + "</div>";
    if (F.picked) h += '<div class="wosel"><div><small>' + x.folderNow + '</small><b id="fname">📁 ' + esc(F.picked.name) + "</b>" +
      (st === "granted" ? "<small>→ " + esc(F.label()) + "</small>" : "") + "</div></div>";
    if (st === "prompt") h += '<p class="hint">' + x.folderRenewP + '</p><button class="btn pri big" id="renew">' + x.folderRenew + "</button>";
    if (st === "granted") h += '<button class="btn ok big" id="cont">' + x.folderOk + " ›</button>";
    h += '<button class="btn ' + (st === "none" ? "pri" : "sec") + ' big" id="pick">' + esc(OE.fmt(F.picked ? x.folderChange : x.folderPick, { s: F.shareName() })) + "</button>";
    if (!(F._dirs && F._dirs[other])) h += '<button class="btn sec big" id="pickOther">' + esc(OE.fmt(x.folderOther, { s: C.SHARES[other] })) + "</button>";
    h += '<div id="err"></div></div>';
    $("card").innerHTML = h;
    function fail(e) { OE.pickerFail(e); }
    OE.bind("pick", function () { F.pick().then(function (r) { if (r && r.issue) { SC.folder(); return; } OE.go("form"); }, fail); });
    OE.bind("pickOther", function () { F.pick(other).then(function () { SC.folder(); }, fail); });
    OE.bind("renew", function () { F.renewAll().then(function () { if (F.state === "granted") OE.go("form"); else SC.folder(); }, fail); });
    OE.bind("cont", function () { OE.go("form"); });
  };

  /* ---------- settings ---------- */
  SC.settings = function () {
    var x = OE.t(), S = OE.S;
    $("card").innerHTML = '<div class="narrow"><h2 class="q">' + x.setH + "</h2>" + setupBanner() + '<ul class="list">' +
      "<li><span><b>" + x.setName + "</b>" + esc(S.tech.first + " " + S.tech.last) + '</span><button class="edit" id="eName">' + x.edit + "</button></li>" +
      "<li><span><b>" + x.setFolder + "</b>" + esc(OE.fs.label() || x.none) + '</span><button class="edit" id="eDir">' + x.edit + "</button></li>" +
      "<li><span><b>" + x.setLang + "</b>" + (S.lang === "fr" ? "Français" : "Nederlands") + '</span><button class="edit" id="eLang">' + x.edit + "</button></li>" +
      "<li><span><b>" + x.wizRedo + "</b></span><button class=\"edit\" id=\"reSetup\">" + x.wizRedo + "</button></li></ul>" +
      '<div class="btns"><button class="btn pri" id="bk">‹ ' + x.back + "</button></div></div>";
    OE.bind("eName", function () { OE.go("tech"); });
    OE.bind("eDir", function () { OE.go("folder"); });
    OE.bind("eLang", function () { S.lang = S.lang === "fr" ? "nl" : "fr"; OE.save(); OE.render(1); });
    OE.bind("reSetup", function () { OE.redoSetup(); });
    OE.bind("bk", function () { OE.go("form", -1); });
  };

  /* ---------- main form ---------- */
  function famName(f) { return f.fam === C.OTHER ? f.famOther.trim() : f.fam; }
  function subName(f) { return f.sub === C.OTHER ? f.subOther.trim() : f.sub; }
  function subInfo(f) { var l = (OE.catalog()[f.fam]) || []; for (var i = 0; i < l.length; i++) if (l[i].id === f.sub) return l[i]; return null; }
  function esa() { return OE.S.line === "ESA"; }
  function INFO(x) { return '<button type="button" class="info" aria-label="' + esc(x.numInfo) + '" aria-haspopup="true" aria-expanded="false">ⓘ</button>'; }
  /* Popover with the two example photos (serial = red, order = blue). Hover, keyboard focus or click/tap opens it;
     mouse leave, Escape or a click outside closes it. Kept inside the viewport. */
  function numTip() {
    var x = OE.t(), tip = $("numtip"), cur = null, tmr = 0;
    if (!tip) { tip = document.createElement("div"); tip.id = "numtip"; tip.className = "numtip"; tip.setAttribute("role", "tooltip"); tip.hidden = true; document.body.appendChild(tip); }
    tip.innerHTML = '<p class="nt-h">' + esc(x.numInfo) + '</p><div class="nt-g">' +
      '<figure><img src="img/help/example-plate.jpg" alt="' + esc(x.capPlate) + '" title="' + esc(x.enlarge) + '"><figcaption>' + esc(x.capPlate) + "</figcaption></figure>" +
      '<figure><img src="img/help/example-protocol.jpg" alt="' + esc(x.capProto) + '" title="' + esc(x.enlarge) + '"><figcaption>' + esc(x.capProto) + "</figcaption></figure></div>";
    function place() {
      if (!cur || tip.hidden) return;
      var r = cur.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight, m = 8;
      tip.style.maxHeight = (vh - 2 * m) + "px";
      var w = tip.offsetWidth, h = tip.offsetHeight, left = Math.min(Math.max(m, r.left + r.width / 2 - w / 2), vw - w - m);
      var top = r.bottom + 8; if (top + h > vh - m) top = r.top - h - 8; if (top < m) top = Math.max(m, vh - h - m);
      tip.style.left = left + "px"; tip.style.top = top + "px";
    }
    function show(b) { clearTimeout(tmr); if (cur && cur !== b) cur.setAttribute("aria-expanded", "false"); cur = b; tip.hidden = false; b.setAttribute("aria-expanded", "true"); place(); }
    function hide() { clearTimeout(tmr); tip.hidden = true; if (cur) cur.setAttribute("aria-expanded", "false"); cur = null; }
    function later() { clearTimeout(tmr); tmr = setTimeout(hide, 220); }
    OE.hideNumTip = hide;
    [].forEach.call(document.querySelectorAll("#card .info"), function (b) {
      b.onmouseenter = function () { show(b); }; b.onmouseleave = later;
      b.onfocus = function () { show(b); }; b.onblur = function (e) { if (!tip.contains(e.relatedTarget)) later(); };
      b.onclick = function (e) { e.stopPropagation(); if (cur === b && !tip.hidden && b.dataset.clicked) { b.dataset.clicked = ""; hide(); } else { b.dataset.clicked = "1"; show(b); } };
    });
    tip.onmouseenter = function () { clearTimeout(tmr); }; tip.onmouseleave = later;
    [].forEach.call(tip.querySelectorAll("img"), function (im) { im.onclick = function (e) { e.stopPropagation(); hide(); bigImg(im.src, im.alt); }; });
    if (!OE._ntWired) {
      OE._ntWired = true;
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && OE.hideNumTip) OE.hideNumTip(); });
      document.addEventListener("click", function (e) { var t = $("numtip"); if (t && !t.hidden && !t.contains(e.target) && OE.hideNumTip) OE.hideNumTip(); });
      window.addEventListener("resize", function () { if (OE.hideNumTip) OE.hideNumTip(); });
      window.addEventListener("scroll", function () { if (OE.hideNumTip) OE.hideNumTip(); }, true);
    }
  }
  function bigImg(src, cap) {
    var m = $("modal"), x = OE.t(); m.dataset.help = "";
    m.innerHTML = '<div class="card big-img" role="dialog" aria-modal="true"><div class="hh"><span></span><button type="button" class="hx" id="bix" aria-label="' + esc(x.close) + '">×</button></div><img src="' + esc(src) + '" alt=""><p class="cap">' + esc(cap) + "</p></div>";
    m.hidden = false;
    function shut() { m.hidden = true; m.onclick = null; document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") shut(); }
    $("bix").onclick = shut; m.onclick = function (e) { if (e.target === m) shut(); }; document.addEventListener("keydown", key);
  }
  function descOf(m) { var d = m.desc || {}; return typeof d === "string" ? d : (d[OE.S.lang] || d.nl || d.en || ""); }
  function exampleFor(fam) { var l = (OE.catalog()[fam]) || []; for (var i = 0; i < l.length; i++) if (l[i].img && !l[i].example) return l[i].img; return null; }
  function modelSrc(img) { if (!img) return ""; return "img/models/" + img + (/\.(jpe?g|png|webp)$/i.test(img) ? "" : ".jpg"); }

  /* ---------- existing-dossier search (cached scan of the projecten folder) ----------
     Hidden by default: the 🔍 button (#srchT) toggles it, ✕ / Escape closes it. Picking a dossier closes the search
     and shows the selected dossier in #dselBox. The scan itself still runs in the background so opening is instant. */
  function scan(force) {
    if (mem.scanP && !force) return mem.scanP;
    mem.scanErr = null; if (force) mem.dossiers = null;
    var p = mem.scanP = OE.fs.scan().then(function (l) { if (mem.scanP === p) mem.dossiers = l; }, function (e) {
      if (mem.scanP !== p) return; mem.dossiers = []; mem.scanErr = e;
      if (e && (e.name === "NotAllowedError" || e.name === "SecurityError")) OE.fs.state = "prompt";
    }).then(function () { if (mem.scanP === p && OE.S.screen === "form") drawSearch(); });
    return p;
  }
  OE.rescan = function () { mem.scanP = null; return scan(true); };
  function hay(d) { return [d.dossier, d.folder, d.family, d.sub, d.serial, d.order].join(" ").toLowerCase(); }
  function filtered() {
    var q = (mem.dq || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    return (mem.dossiers || []).filter(function (d) { var h = hay(d); return q.every(function (w) { return h.indexOf(w) >= 0; }); });
  }
  function dDate(d) { return d.updated ? OE.human(new Date(d.updated)) : "—"; }
  function setSearch(open) {
    mem.srchOpen = !!open; drawSearch();
    if (open) { var q = $("dq"); if (q) try { q.focus(); } catch (e) {} }
  }
  OE.setSearch = setSearch;
  function drawSearch() {
    var x = OE.t(), el = $("srch"), sb = $("dselBox"), tg = $("srchT"); if (!el) return;
    if (sb) {
      if (mem.sel) {
        var d = mem.sel;
        sb.innerHTML = '<div class="wosel" id="dsel"><span>✓ <b>' + esc(d.dossier) + "</b><small>" + esc(d.family + (d.sub ? " / " + d.sub : "") + (d.serial ? " · " + d.serial : "") + " · " + x.updatedAt + " " + dDate(d)) + "</small></span>" +
          '<button id="newDos" type="button">✚ ' + x.newDos + "</button></div>";
        OE.bind("newDos", resetForm);
      } else sb.innerHTML = "";
    }
    if (tg) { tg.classList.toggle("on", !!mem.srchOpen); tg.setAttribute("aria-expanded", mem.srchOpen ? "true" : "false"); }
    el.hidden = !mem.srchOpen;
    if (!mem.srchOpen) { el.innerHTML = ""; return; }
    var head = '<div class="srow"><label class="lbl" for="dq">🔍 ' + x.srchH + '</label><span class="scount" id="dcount"></span><button class="small" id="drl" type="button">' + x.srchRefresh + "</button>" +
      '<button type="button" class="sx" id="dqx" title="' + esc(x.srchClose) + '" aria-label="' + esc(x.srchClose) + '">✕</button></div>';
    if (OE.fs.state === "prompt") {
      el.innerHTML = head + '<div class="err">' + esc(x.folderRenewP) + '</div><button class="btn pri big" id="srenew">' + x.folderRenew + "</button>";
      OE.bind("srenew", function () { OE.fs.renew().then(function () { OE.rescan(); drawSearch(); }, function () {}); });
      OE.bind("drl", function () { OE.rescan(); drawSearch(); }); OE.bind("dqx", function () { setSearch(false); try { $("srchT").focus(); } catch (e) {} }); return;
    }
    el.innerHTML = head + '<input id="dq" type="search" autocomplete="off" spellcheck="false" role="combobox" aria-controls="dlist" aria-expanded="true" placeholder="' + esc(x.srchPh) + '">' +
      '<div class="wolist dlist" id="dlist" role="listbox"></div>';
    var q = $("dq"); q.value = mem.dq || "";
    q.oninput = function () { mem.dq = q.value; mem.di = 0; drawItems(); };
    q.onkeydown = function (e) {
      var n = $("dlist").querySelectorAll("[data-i]").length;
      if (e.key === "ArrowDown") { e.preventDefault(); mem.di = Math.min(n - 1, (mem.di || 0) + 1); hl(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); mem.di = Math.max(0, (mem.di || 0) - 1); hl(); }
      else if (e.key === "Enter") { e.preventDefault(); var b = $("dlist").querySelectorAll("[data-i]")[mem.di || 0]; if (b) b.click(); }
      else if (e.key === "Escape") { e.preventDefault(); setSearch(false); try { $("srchT").focus(); } catch (x2) {} }
    };
    OE.bind("drl", function () { OE.rescan(); drawSearch(); });
    OE.bind("dqx", function () { setSearch(false); try { $("srchT").focus(); } catch (e) {} });
    drawItems();
  }
  function hl() {
    [].forEach.call($("dlist").querySelectorAll("[data-i]"), function (b, i) { var on = i === (mem.di || 0); b.classList.toggle("on", on); b.setAttribute("aria-selected", on); if (on) b.scrollIntoView({ block: "nearest" }); });
  }
  function drawItems() {
    var x = OE.t(), box = $("dlist"); if (!box) return;
    if (!mem.dossiers) { box.innerHTML = '<div class="load"><div class="spin"></div>' + x.srchLoading + "</div>"; $("dcount").textContent = ""; return; }
    var l = filtered(); $("dcount").textContent = OE.fmt(x.srchCount, { n: l.length + (l.length !== mem.dossiers.length ? "/" + mem.dossiers.length : "") });
    if (mem.scanErr) { box.innerHTML = '<p class="hint wohint">' + esc(x.srchErr) + "</p>"; return; }
    if (!l.length) { box.innerHTML = '<p class="hint wohint">' + (mem.dossiers.length ? x.srchNoHit : x.srchNone) + "</p>"; return; }
    box.innerHTML = l.map(function (d, i) {
      return '<button type="button" role="option" data-i="' + i + '"><span><b>' + esc(d.dossier) + "</b><small>" + esc(d.family + (d.sub ? " / " + d.sub : "")) + (d.serial ? " · S/N " + esc(d.serial) : "") + (d.order ? " · " + esc(d.order) : "") + "</small></span><small>" + esc(dDate(d)) + "</small></button>";
    }).join("");
    [].forEach.call(box.querySelectorAll("[data-i]"), function (b) {
      b.onmousedown = function (e) { e.preventDefault(); };
      b.onclick = function () { pick(l[+b.dataset.i]); };
    });
    hl();
  }
  function pick(d) {
    var f = mem.form, fams = OE.catalog();
    if (fams[d.family]) { f.fam = d.family; f.famOther = ""; } else { f.fam = C.OTHER; f.famOther = d.family; }
    var subs = fams[f.fam] || [];
    if (!d.sub) f.sub = ""; else if (subs.some(function (s) { return s.id === d.sub; })) { f.sub = d.sub; f.subOther = ""; } else { f.sub = C.OTHER; f.subOther = d.sub; }
    f.dossier = OE.safeName(d.dossier) === d.folder ? d.dossier : d.folder;
    f.serial = d.serial; f.order = d.order; mem.sel = d; mem.dq = ""; mem.srchOpen = false;
    SC.form();
    var fi = $("file"); if (fi) try { $("drop").focus(); } catch (e) {}
  }
  function resetForm() { mem.form = blank(); mem.sel = null; mem.dq = ""; SC.form(); try { $("dos").focus(); } catch (e) {} }
  /* Parameter files grouped per extension, newest of each group marked active. */
  function groupedHtml(x, files, bold) {
    return OE.fs.groups(files).map(function (g) {
      return '<div class="xg"><span class="xgh">' + esc(g.ext || x.noExt) + ' <small>(' + g.files.length + "/" + C.KEEP + ')</small></span><ul class="res">' + g.files.map(function (f, i) {
        return "<li>" + (i === 0 ? '<span class="badge g">' + x.active + "</span> " : "") + (bold ? "<b>" + esc(f.name) + "</b>" : esc(f.name)) + "<em>" + OE.stampHuman(f.stamp) + "</em></li>"; }).join("") + "</ul></div>";
    }).join("");
  }
  OE.groupedHtml = groupedHtml;
  function exFilesHtml(x, files) {
    if (!files || !files.length) return "";
    return '<div class="exf" id="exFiles"><b>' + x.exFiles + "</b>" + groupedHtml(x, files) + "</div>";
  }

  SC.form = function () {
    var x = OE.t(), f = mem.form, cat = OE.catalog(), fams = Object.keys(cat), ios = OE.fs.state === "ios";
    if (esa() && f.fam && f.fam !== C.OTHER) f.sub = f.fam;
    var famOpts = '<option value="">' + x.choose + "</option>" + fams.map(function (k) { return '<option value="' + esc(k) + '">' + esc(k) + "</option>"; }).join("") + (esa() ? "" : '<option value="' + C.OTHER + '">' + x.other + "</option>");
    $("card").innerHTML = '<div class="fh"><h2 class="q">' + x.formH + '</h2><button type="button" class="stog" id="srchT" aria-controls="srch" aria-expanded="false" title="' + esc(x.srchH) + '" aria-label="' + esc(x.srchH) + '">🔍<span class="stl">' + esc(x.srchH) + "</span></button></div>" +
      '<p class="who" id="who">👤 ' + esc(x.whoTech) + ': <b id="whoName">' + esc(OE.S.tech.first + " " + OE.S.tech.last) + '</b> <button type="button" class="linkb" id="whoEdit">' + esc(x.whoChange) + '</button></p>' +
      '<p class="hint" id="shareNow">' + esc(OE.fmt(x.shareNow, { s: OE.fs.shareName(), p: OE.fs.paramDirName() })) + "</p>" +
      '<div class="dselbox" id="dselBox"></div><div class="srch" id="srch" hidden></div><div class="grid"><div class="col">' +
      '<label class="lbl" for="fam">' + (esa() ? x.system : x.family) + ' *</label><select id="fam">' + famOpts + '</select><input id="famO" class="oth" placeholder="' + esc(x.otherPh) + '" hidden>' +
      '<div id="subRow"' + (esa() ? " hidden" : "") + '><label class="lbl" for="sub">' + x.sub + ' *</label><select id="sub"></select><input id="subO" class="oth" placeholder="' + esc(x.otherPh) + '" hidden></div>' +
      '<label class="lbl" for="dos">' + x.dossier + ' *</label><input id="dos" autocomplete="off" spellcheck="false" placeholder="' + esc(x.dossierPh) + '"><p class="hint" id="dosN"></p>' +
      '<div id="exist"></div>' +
      (esa() ? "" : '<div class="two" id="numRow"><div><div class="lblrow"><label class="lbl" for="ser">' + x.serial + ' *</label>' + INFO(x) + '</div><input id="ser" autocomplete="off" spellcheck="false"></div>' +
      '<div><div class="lblrow"><label class="lbl" for="ord">' + x.order + ' *</label>' + INFO(x) + '</div><input id="ord" autocomplete="off" spellcheck="false"></div></div>') +
      (mem.sel ? exFilesHtml(x, mem.sel.files) : "") + '<label class="lbl" for="file">' + x.file + ' *</label><label class="drop" id="drop"><input type="file" id="file"' + (ios ? "" : "") + '><span id="fileT"></span></label>' +
      (ios ? '<p class="ioshint" id="iosHint">' + esc(OE.fmt(x.iosHint, { s: OE.fs.shareName() })) + "</p>" : "") +
      '<button type="button" class="btn sec latest" id="latest">' + (ios ? x.iosPick : x.latest) + '</button><div id="latestBox" class="latestbox"></div>' +
      (ios ? "" : '<div class="src" id="srcBox"></div>') +
      '<label class="lbl">' + x.dateNow + '</label><div class="now" id="now"></div>' +
      '</div><div class="col side"><figure class="prod" id="prod"></figure><div class="btns underphoto"><button class="btn pri" id="save">' + x.save + '</button></div><p class="hint" id="pathP"></p></div></div>' +
      '<div id="err"></div>';
    var fam = $("fam"), sub = $("sub");
    function fillSubs() {
      if (esa()) { f.sub = f.fam && f.fam !== C.OTHER ? f.fam : ""; return; }
      var l = cat[f.fam] || [];
      sub.innerHTML = '<option value="">' + x.choose + "</option>" + l.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.id) + "</option>"; }).join("") + '<option value="' + C.OTHER + '">' + x.other + "</option>";
      sub.disabled = !f.fam; if (f.sub && (f.sub === C.OTHER || subInfo(f))) sub.value = f.sub; else { f.sub = ""; sub.value = ""; }
    }
    function upd() {
      $("famO").hidden = f.fam !== C.OTHER; $("subO").hidden = f.sub !== C.OTHER;
      var d = OE.safeName(f.dossier);
      $("dosN").innerHTML = f.dossier ? x.dossierFolder + ": <code>" + esc(d) + "</code>" : "";
      // product image
      var info = subInfo(f), img = info && info.img, ex = info && info.example, cap = "";
      if (!info && f.fam && cat[f.fam] && !esa()) { img = exampleFor(f.fam); ex = true; }
      if (img) cap = (info ? esc(info.id) : esc(f.fam)) + (ex ? ' <em class="ex">' + x.exampleImg + "</em>" : "");
      $("prod").innerHTML = img ? '<img id="prodImg" src="' + esc(modelSrc(img)) + '" alt="' + esc(info ? info.id : f.fam) + '"><figcaption>' + cap + (info && info.desc ? '<small class="desc" id="prodDesc">' + esc(descOf(info)) + "</small>" : "") + "</figcaption>"
        : '<div class="noimg">' + (f.fam ? x.noImg : "") + "</div>";
      var fn = famName(f), sn = subName(f);
      $("pathP").innerHTML = fn && d ? "📁 " + esc(OE.fs.label()) + (sn && f.file ? "<br>📄 " + esc(OE.fs.paramName(fn, sn, f.dossier, new Date(), f.file.name)) : "") : "";
      if ($("file") && OE.fs.extList) $("file").accept = OE.fs.extList(f).join(",");
      $("fileT").innerHTML = f.file ? "📎 <b>" + esc(f.file.name) + "</b> (" + Math.max(1, Math.round(f.file.size / 1024)) + " kB)" : (OE.fs.state === "ios" ? x.iosPick : x.fileDrop);
    }
    function takeFile(file) {
      if (!file) return;
      if (OE.fs.allowedExt && !OE.fs.allowedExt(file.name, f)) {
        if ($("file")) $("file").value = "";
        OE.err(OE.fmt(x.badExt, { e: OE.fs.extList(f).join(", ") }));
        return;
      }
      OE.err("");
      f.file = file;
      upd();
    }
    var chk = 0;
    function checkExisting() {
      var fn = famName(f), k = fn + "\u0000" + OE.safeName(f.dossier);
      if (k === mem.lastCheck && $("exist").innerHTML) return; // same dossier: keep the offer (avoids losing the click on blur)
      mem.lastCheck = k; var my = ++chk; $("exist").innerHTML = "";
      OE.fs.readMeta(fn, f.dossier).then(function (m) {
        if (my !== chk || !m || OE.S.screen !== "form") return;
        $("exist").innerHTML = '<div class="okmsg found" id="found"><b>' + x.existH + "</b><br>" + esc(OE.fmt(x.existP, { f: fn, d: OE.safeName(f.dossier), t: m.updatedHuman || "" })) +
          '<div class="btns"><button class="btn ok" id="load">' + x.existLoad + "</button></div></div>";
        OE.bind("load", function () {
          f.serial = m.serial || ""; f.order = m.order || ""; if ($("ser")) { $("ser").value = f.serial; $("ord").value = f.order; }
          if (m.submodel && !esa()) { var l = cat[f.fam] || []; if (l.some(function (s) { return s.id === m.submodel; })) f.sub = m.submodel; else { f.sub = C.OTHER; f.subOther = m.submodel; $("subO").value = f.subOther; } sub.value = f.sub; }
          $("exist").innerHTML = '<div class="okmsg" id="loaded">✓ ' + x.loaded + "</div>" + exFilesHtml(x, m.files); upd();
        });
      });
    }
    mem.lastCheck = null; fam.value = f.fam; fillSubs();
    $("famO").value = f.famOther; $("subO").value = f.subOther; $("dos").value = f.dossier;
    if ($("ser")) { $("ser").value = f.serial; $("ord").value = f.order; }
    function unsel() { if (mem.sel) { mem.sel = null; var e = $("exFiles"); if (e) e.remove(); drawSearch(); } }
    fam.onchange = function () { unsel(); f.fam = fam.value; f.sub = esa() ? (f.fam || "") : ""; fillSubs(); if (f.file && OE.fs.allowedExt && !OE.fs.allowedExt(f.file.name, f)) { f.file = null; OE.err(OE.fmt(x.badExt, { e: OE.fs.extList(f).join(", ") })); } upd(); checkExisting(); };
    sub.onchange = function () { f.sub = sub.value; upd(); };
    $("famO").oninput = function () { f.famOther = this.value; upd(); };
    $("famO").onchange = checkExisting;
    $("subO").oninput = function () { f.subOther = this.value; upd(); };
    $("dos").oninput = function () { unsel(); f.dossier = this.value; upd(); };
    $("dos").onchange = checkExisting;
    if ($("ser")) $("ser").oninput = function () { f.serial = this.value; };
    if ($("ord")) $("ord").oninput = function () { f.order = this.value; };
    $("file").onchange = function () { if (this.files[0]) takeFile(this.files[0]); };
    var dr = $("drop");
    dr.ondragover = function (e) { e.preventDefault(); dr.classList.add("over"); };
    dr.ondragleave = function () { dr.classList.remove("over"); };
    dr.ondrop = function (e) { e.preventDefault(); dr.classList.remove("over"); var fl = e.dataTransfer.files; if (fl && fl[0]) takeFile(fl[0]); };
    OE.bind("whoEdit", function () { OE._techBack = "form"; OE.go("tech"); });
    OE.bind("latest", function () { if (ios) { try { $("file").click(); } catch (e) {} return; } latestParam(x, function (file) { f.file = file; upd(); }); });
    if (!ios) drawSources(x);
    function tick() { if ($("now")) $("now").textContent = OE.human(new Date()); }
    tick(); clearInterval(mem.tick); mem.tick = setInterval(tick, 15000);
    $("srchT").onclick = function () { setSearch(!mem.srchOpen); };
    upd(); numTip(); drawSearch(); scan(); if (f.dossier && f.fam && !mem.sel) checkExisting();
    if (OE.smxMount) OE.smxMount();
    OE.bind("save", function () { save(x, f); });
    if (mem.autorunLatest) { mem.autorunLatest = false; latestParam(x, function (file) { f.file = file; upd(); }); }
  };

  /* ---------- "Laatste parameterfile ophalen" ---------- */
  function kb(n) { return n < 1024 ? n + " B" : (n / 1024).toFixed(n < 10240 ? 1 : 0) + " KB"; }
  function hm(t) { var d = new Date(t); return OE.pad(d.getHours()) + ":" + OE.pad(d.getMinutes()); }
  function drawSources(x) {
    var box = $("srcBox"), F = OE.fs; if (!box) return;
    var rows = (F.sources || []).map(function (s) {
      var label = s.key === "downloads" ? x.srcDown : (s.label || s.key);
      var hint = srcHint(s.key) || s.hint || "";
      var btn = s.handle
        ? '<button type="button" class="srca ok" data-allow="' + esc(s.key) + '">✓ ' + esc(s.handle.name || x.srcOk) + "</button>"
        : '<button type="button" class="srca" data-allow="' + esc(s.key) + '">' + esc(x.srcAllow) + "</button>";
      var rm = s.custom ? '<button type="button" class="small" data-rm="' + esc(s.key) + '">' + esc(x.srcRemove) + "</button>" : "";
      return "<li><span><b>" + esc(label) + "</b>" + (hint ? "<small>" + esc(hint) + "</small>" : "") + rm + "</span>" + btn + "</li>";
    }).join("");
    var prog = (F.programs || []).map(function (p) {
      return "<li><span><b>" + esc(p.name) + "</b><small>" + esc(p.name + "\\" + p.folder) + "</small></span><span class=\"srca ok\">✓</span></li>";
    }).join("");
    var warn = F.issue && F.issue.code !== "share" ? '<div class="err" id="pickWarn">' + esc(issueText(F.issue)) + "</div>" : "";
    var open = !!OE.S.srcOpen;
    var body = warn + '<ul class="list" id="srcList">' + rows + "</ul>" +
      (prog ? '<div class="lbl">' + esc(x.srcFound) + '</div><ul class="list" id="progList">' + prog + "</ul>" : "") +
      '<button type="button" class="small" id="srcAdd">' + esc(x.srcAdd) + "</button>";
    box.innerHTML = (F._pending ? '<button type="button" class="btn sec" id="renewAll">' + esc(x.folderRenew) + "</button>" : "") +
      '<button type="button" class="stog' + (open ? " on" : "") + '" id="srcTog" aria-expanded="' + (open ? "true" : "false") + '" aria-controls="srcBody">' + esc(x.srcH) + "</button>" +
      '<div id="srcBody"' + (open ? "" : " hidden") + ">" + body + "</div>";
    $("srcTog").onclick = function () { OE.S.srcOpen = !OE.S.srcOpen; OE.save(); drawSources(OE.t()); };
    [].forEach.call(box.querySelectorAll("[data-allow]"), function (b) {
      b.onclick = function () { F.allowSource(b.getAttribute("data-allow")).then(function () { drawSources(OE.t()); }, OE.pickerFail); };
    });
    [].forEach.call(box.querySelectorAll("[data-rm]"), function (b) {
      b.onclick = function () { F.dropSource(b.getAttribute("data-rm")).then(function () { drawSources(OE.t()); }); };
    });
    OE.bind("srcAdd", function () { F.addSource().then(function () { drawSources(OE.t()); }, OE.pickerFail); });
    OE.bind("renewAll", function () { F.renewAll().then(function () { drawSources(OE.t()); }, OE.pickerFail); });
  }
  function pickerTypes(exts) {
    return [{ description: "Parameter", accept: { "application/octet-stream": exts || [] } }];
  }
  function pickManualFile(onFile) {
    if (OE.ios && OE.ios() || typeof window.showOpenFilePicker !== "function") { try { $("file").click(); } catch (e2) {} return; }
    var t = OE.fs.fileTarget ? OE.fs.fileTarget(mem.form) : { id: "file-esc", starts: ["documents"], ext: [] };
    var starts = t.starts && t.starts.length ? t.starts : ["documents"];
    var types = pickerTypes(t.ext || (OE.fs.extList ? OE.fs.extList(mem.form) : []));
    function attempt(i) {
      return window.showOpenFilePicker({ id: t.id, startIn: starts[i], multiple: false, types: types, excludeAcceptAllOption: true }).catch(function (e) {
        var handleFailed = starts[i] && typeof starts[i] !== "string" && (!e || e.name !== "AbortError");
        if (handleFailed && i + 1 < starts.length) return attempt(i + 1);
        throw e;
      });
    }
    attempt(0).then(function (hs) { return hs && hs[0] ? hs[0].getFile() : null; }).then(function (file) {
      if (file && onFile) onFile(file);
    }, function (e) { OE.pickerFail(e); });
  }
  function latestParam(x, use) {
    var F = OE.fs, box = $("latestBox");
    if (!F.picked) { OE.go("folder"); return; }
    var granted = (F.sources || []).some(function (s) { return s.handle; });
    if (!granted) { box.innerHTML = '<p class="hint" id="latestNone">' + esc(x.latestNoSrc) + "</p>"; return; }
    // permission prompt: requestPermission needs this click (user gesture), so ask first
    var ready = F.root && F.state === "granted" ? F.ensure().then(function (ok) { return ok || F.renew().then(function () { return true; }); }) : F.renew().then(function () { return true; });
    box.innerHTML = '<p class="hint">' + esc(x.latestBusy) + "</p>";
    ready.then(function () { return F.newestSource(mem.form); }).then(function (l) {
      if (!l.length) { box.innerHTML = '<p class="hint" id="latestNone">' + esc(OE.fmt(x.latestNone, { e: (F.extList ? F.extList(mem.form) : []).join(", ") })) + "</p>"; pickManualFile(use); return; }
      function row(p, i) { return '<button type="button" data-li="' + i + '"><span><b>' + esc(p.name) + "</b></span><small>" + esc(p.srcLabel || "") + " · " + hm(p.time) + " · " + kb(p.size) + "</small></button>"; }
      function done(p) { if (p.dir && F.rememberSource) F.rememberSource(p.dir); else if (p.dir) F.lastSource = p.dir; box.innerHTML = ""; use(p.file); }
      if (l.length === 1) {
        box.innerHTML = '<div class="latestone"><small>' + esc(x.latestOne) + '</small><div class="wolist" id="latestList">' + row(l[0], 0) + "</div>" +
          '<div class="btns"><button type="button" class="small" id="latestOther">' + esc(x.latestOther) + '</button><button type="button" class="btn ok" id="latestUse">' + esc(x.latestUse) + "</button></div></div>";
        OE.bind("latestUse", function () { done(l[0]); });
      } else {
        box.innerHTML = '<small>' + esc(x.latestMany) + '</small><div class="wolist" id="latestList">' + l.map(row).join("") + '</div><button type="button" class="small" id="latestOther">' + esc(x.latestOther) + "</button>";
      }
      [].forEach.call(box.querySelectorAll("[data-li]"), function (b) { b.onclick = function () { done(l[+b.dataset.li]); }; });
      OE.bind("latestOther", function () { box.innerHTML = ""; pickManualFile(use); });
    }).catch(function (e) {
      if (e && e.message === "denied") { box.innerHTML = '<div class="err">' + esc(x.folderDenied) + "</div>"; return; }
      box.innerHTML = '<div class="err">' + esc(OE.fmt(x.latestErr, { e: (e && e.message) || e })) + "</div>";
    });
  }

  /* ---------- save ---------- */
  function save(x, f) {
    var fn = famName(f), sn = subName(f), F = OE.fs, missing = [];
    if (esa() && fn) sn = fn;
    var req = [[fn, esa() ? x.system : x.family], [sn, esa() ? x.system : x.sub], [OE.safeName(f.dossier), x.dossier]];
    if (!esa()) req.push([f.serial.trim(), x.serial], [f.order.trim(), x.order]);
    req.push([f.file, x.needFile]);
    req.forEach(function (p) { if (!p[0]) missing.push(p[1]); });
    if (missing.length) { OE.err(OE.fmt(x.need, { f: missing.join(", ") })); return; }
    if (f.file && F.allowedExt && !F.allowedExt(f.file.name, f)) { OE.err(OE.fmt(x.badExt, { e: F.extList(f).join(", ") })); return; }
    OE.err("");
    var now = new Date(), pname = F.paramName(fn, sn, f.dossier, now, f.file.name);
    if (F.state === "ios") { doSaveIos(x, f, fn, sn, now, pname); return; }
    F.ensure().then(function (ok) {
      if (!ok) { OE.go("folder"); return; }
      return F.wouldDelete(fn, f.dossier, pname).then(function (del) {
        if (del.length) OE.confirmModal(OE.fmt(x.delConfirm, { n: del.join("\n") }), function () { doSave(x, f, fn, sn, now, pname); });
        else doSave(x, f, fn, sn, now, pname);
      });
    }).catch(function (e) { OE.err(OE.fmt(x.saveErr, { e: e.message || e })); });
  }
  function doSave(x, f, fn, sn, now, pname) {
    var F = OE.fs, b = $("save"), S = OE.S, r = { pname: pname, deleted: [], overwrote: false }, dir;
    b.disabled = true; b.textContent = x.saving; OE.busy = true; // offline.js waits with an update reload while busy
    var info = subInfo(f), img = info && info.img, example = !!(info && info.example);
    if (!info && OE.catalog()[f.fam] && !esa()) { img = exampleFor(f.fam); example = true; }
    F.dossierDir(fn, f.dossier, true).then(function (d) { dir = d; return F.exists(dir, pname); })
      .then(function (ex) { r.overwrote = ex; return F.write(dir, pname, f.file); })
      .then(function () { return F.listParams(dir, fn, f.dossier); })
      .then(function (list) {
        // retention per extension group: only the group of the new file can exceed the limit
        var rt = F.retain(list), old = rt.drop; r.deleted = old.map(function (o) { return o.name; });
        return old.reduce(function (p, o) { return p.then(function () { return dir.removeEntry(o.name); }); }, Promise.resolve()).then(function () { return rt.keep; });
      })
      .then(function (files) {
        r.files = files; r.pdfName = F.pdfName(fn, sn, f.dossier);
        var meta = { app: C.APP, family: fn, submodel: sn, dossier: OE.safeName(f.dossier), dossierInput: f.dossier,
          technician: S.tech.first + " " + S.tech.last, updated: now.toISOString(), updatedHuman: OE.human(now), pdf: r.pdfName, files: files };
        if (!esa()) { meta.serial = f.serial.trim(); meta.order = f.order.trim(); }
        if (mem.smxClient) meta.servicemax = { wo: mem.smxClient.wo, account: mem.smxClient.account, adres: mem.smxClient.adres, contact: mem.smxClient.contact, product: mem.smxClient.product };
        return (img ? OE.loadImage(modelSrc(img)).catch(function () { return null; }) : Promise.resolve(null)).then(function (im) {
          var blob = OE.buildPdf({ family: fn, sub: sn, dossier: OE.safeName(f.dossier), serial: meta.serial || "", order: meta.order || "", noNumbers: esa(), tech: meta.technician, updated: now, files: files, img: im, example: example, smx: meta.servicemax });
          mem.pdfBlob = blob;
          return F.write(dir, r.pdfName, blob).then(function () { return F.write(dir, F.metaName(fn, sn, f.dossier), new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" })); });
        });
      })
      .then(function () { return F.storeParam(pname, f.file); })
      .then(function () { r.paramCopy = pname; })
      .then(function () { OE.busy = false; r.folder = F.label(); mem.result = r; mem.sel = null; mem.dq = ""; OE.rescan(); OE.go("result"); })
      .catch(function (e) { OE.busy = false; b.disabled = false; b.textContent = x.save; OE.err(OE.fmt(x.saveErr, { e: e.message || e })); });
  }
  /* iPhone/iPad: no directory handle. Rename in memory, then share sheet or download into OneDrive. */
  function doSaveIos(x, f, fn, sn, now, pname) {
    var b = $("save"), S = OE.S, info = subInfo(f), img = info && info.img, example = !!(info && info.example);
    b.disabled = true; b.textContent = x.saving; OE.busy = true;
    var files = [{ name: pname, stamp: OE.stamp(now), ext: OE.fs.extKey(pname) }];
    (img ? OE.loadImage(modelSrc(img)).catch(function () { return null; }) : Promise.resolve(null)).then(function (im) {
      var blob = OE.buildPdf({ family: fn, sub: sn, dossier: OE.safeName(f.dossier), serial: esa() ? "" : f.serial.trim(), order: esa() ? "" : f.order.trim(), noNumbers: esa(), tech: S.tech.first + " " + S.tech.last, updated: now, files: files, img: im, example: example, smx: mem.smxClient });
      mem.pdfBlob = blob;
      var pdfName = OE.fs.pdfName(fn, sn, f.dossier);
      mem.shareFiles = [new File([f.file], pname, { type: f.file.type || "application/octet-stream" }), new File([blob], pdfName, { type: "application/pdf" })];
      OE.busy = false;
      mem.result = { pname: pname, pdfName: pdfName, deleted: [], overwrote: false, files: files, ios: true, folder: OE.fs.shareName() + "\\projecten\\" + OE.fs.paramDirName() };
      mem.sel = null; OE.go("result");
    }).catch(function (e) { OE.busy = false; b.disabled = false; b.textContent = x.save; OE.err(OE.fmt(x.saveErr, { e: e.message || e })); });
  }

  /* ---------- result ---------- */
  SC.result = function () {
    var x = OE.t(), r = mem.result;
    if (!r) { OE.go("form"); return; }
    var h = '<div class="check">✓</div><h2 class="q center">' + x.resH + '</h2><ul class="list" id="res">' +
      "<li><span><b>" + x.resFolder + "</b>📁 " + esc(r.folder) + "</span></li>" +
      "<li><span><b>" + x.resFile + '</b><span id="rFile">' + esc(r.pname) + "</span>" + (r.overwrote ? '<em class="hint">' + x.resOver + "</em>" : "") + "</span></li>" +
      "<li><span><b>" + x.resPdf + '</b><span id="rPdf">' + esc(r.pdfName) + "</span></span></li>" +
      "<li><span><b>" + x.resMeta + "</b>" + esc(C.META) + "</span></li>" +
      (r.paramCopy ? "<li><span><b>" + esc(OE.fmt(x.resParam, { p: OE.fs.paramDirName() })) + "</b><span id=\"rParam\">" + esc(r.paramCopy) + "</span></span></li>" : "") +
      (r.ios ? '<li><span><p class="ioshint" id="iosHint">' + esc(OE.fmt(x.iosHint, { s: OE.fs.shareName() })) + "</p></span></li>" : "") +
      (r.deleted.length ? '<li class="del"><span><b>' + x.resDel + '</b><span id="rDel">🗑 ' + r.deleted.map(esc).join("<br>🗑 ") + "</span></span></li>" : "") +
      "</ul><h3 class=\"sub\">" + x.resList + '</h3><div id="rList">' + groupedHtml(x, r.files, true) + "</div>" +
      '<div class="btns"><button class="btn sec" id="newD">' + x.newDev + '</button>' +
      (r.ios ? '<a class="btn sec" id="iosFileDl">' + x.iosDown + '</a><a class="btn sec" id="iosPdfDl">' + x.iosPdf + "</a>" + (navigator.share ? '<button class="btn pri" id="iosShare">' + x.iosShare + "</button>" : "") : "") +
      '<button class="btn pri" id="openP">' + x.openPdf + "</button></div>";
    $("card").innerHTML = h;
    OE.bind("newD", function () { mem.form = blank(); mem.result = null; mem.sel = null; mem.srchOpen = false; OE.go("form", -1); });
    OE.bind("openP", function () { if (!mem.pdfBlob) return; var u = URL.createObjectURL(mem.pdfBlob); window.open(u, "_blank"); setTimeout(function () { URL.revokeObjectURL(u); }, 60000); });
    if (r.ios && mem.shareFiles) {
      function link(id, file) { var a = $(id); if (!a || !file) return; a.href = URL.createObjectURL(file); a.download = file.name; }
      link("iosFileDl", mem.shareFiles[0]); link("iosPdfDl", mem.shareFiles[1]);
      OE.bind("iosShare", function () {
        var files = mem.shareFiles;
        var go = function () { navigator.share({ files: files, title: C.APP }).catch(function () {}); };
        if (navigator.canShare && !navigator.canShare({ files: files })) return;
        go();
      });
    }
  };
})(window.OE);
