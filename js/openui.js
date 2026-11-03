/* openui.js – iPhone saves an open dossier; the PC of the same pairing code lists it. */
"use strict";
(function (OE) {
  var mem = OE.mem, $ = OE.$, esc = OE.esc;
  function otherLang() { return OE.T[(OE.S && OE.S.lang) === "fr" ? "nl" : "fr"]; }
  function esa() { return OE.S && OE.S.line === "ESA"; }
  function famName(f) { return f.fam === OE.CFG.OTHER ? f.famOther.trim() : f.fam; }
  function subName(f) { return f.sub === OE.CFG.OTHER ? f.subOther.trim() : f.sub; }

  function payload() {
    var f = mem.form || {}, client = mem.smxClient || {}, fn = famName(f), sn = subName(f);
    if (esa() && fn) sn = fn;
    return OE.openClean({
      wo: client.wo, dossier: f.dossier, account: client.account, adres: client.adres, contact: client.contact,
      product: client.product || f.dossier, fam: f.fam, famOther: f.famOther, sub: esa() ? f.fam : f.sub, subOther: f.subOther,
      line: esa() ? "ESA" : "ESC", serial: esa() ? "" : f.serial, order: esa() ? "" : f.order,
      tech: ((OE.S.tech && OE.S.tech.first) || "") + " " + ((OE.S.tech && OE.S.tech.last) || ""),
      updated: new Date().toISOString()
    });
  }
  function saveOpen() {
    var x = OE.t(), f = mem.form || {}, body, btn, msg;
    if (!String((mem.smxClient && mem.smxClient.wo) || "").trim()) { OE.err(x.openNoWo); return; }
    var fn = famName(f), sn = subName(f), missing = [];
    if (esa() && fn) sn = fn;
    if (!fn) missing.push(esa() ? x.system : x.family);
    if (!sn) missing.push(esa() ? x.system : x.sub);
    if (!OE.safeName(f.dossier)) missing.push(x.dossier);
    if (missing.length) { OE.err(OE.fmt(x.need, { f: missing.join(", ") })); return; }
    body = payload();
    btn = $("openSave"); msg = $("openMsg");
    if (btn) btn.disabled = true;
    OE.err("");
    OE.openSave(body).then(function () {
      if (btn) btn.disabled = false;
      if (msg) { msg.hidden = false; msg.textContent = x.openSaved; }
    }, function () {
      if (btn) btn.disabled = false;
      OE.err(x.openFail);
    });
  }

  OE.openApply = function (rec) {
    var f = mem.form, clean = OE.openClean(rec || {});
    if (!f) return;
    var line = clean.line === "ESA" ? "ESA" : "ESC";
    if ((OE.S.line === "ESA" ? "ESA" : "ESC") !== line) { OE.S.line = line; OE.save(); }
    f.fam = clean.fam; f.famOther = clean.famOther; f.sub = line === "ESA" ? clean.fam : clean.sub; f.subOther = clean.subOther;
    f.dossier = clean.dossier || clean.product;
    f.serial = line === "ESA" ? "" : clean.serial;
    f.order = line === "ESA" ? "" : clean.order;
    f.file = null;
    mem.smxClient = { wo: clean.wo, account: clean.account, adres: clean.adres, contact: clean.contact, product: clean.product || clean.dossier };
    mem.openWo = clean.wo;
    (OE.fs.bindLine ? OE.fs.bindLine() : Promise.resolve()).then(function () { OE.render(1); });
  };

  function rowText(rec) {
    var bits = [rec.wo, rec.dossier || rec.product, rec.account].filter(function (s) { return s && String(s).trim(); });
    return bits.join(" · ");
  }
  function drawList(box) {
    var x = OE.t();
    box.innerHTML = '<h3 id="openH">' + esc(x.openH) + '</h3><p class="hint" id="openPick">' + esc(x.openPick) + '</p><p class="hint" id="openBusy">' + esc(x.openLoading) + '</p><button type="button" class="small" id="openOther">' + esc(x.openOther) + "</button>";
    $("openOther").onclick = function () { OE.openClearCode(); OE.openMount(); };
    OE.openList().then(function (data) {
      if (!$("openBox")) return;
      var list = data && data.dossiers ? data.dossiers : (Array.isArray(data) ? data : []);
      var busy = $("openBusy");
      if (!list.length) { if (busy) busy.textContent = x.openEmpty; return; }
      if (busy) busy.remove();
      var html = '<div class="wolist" id="openList">' + list.map(function (rec, i) {
        return '<button type="button" data-oi="' + i + '"><span><b>' + esc(rowText(rec)) + "</b></span></button>";
      }).join("") + "</div>";
      $("openPick").insertAdjacentHTML("afterend", html);
      [].forEach.call(box.querySelectorAll("[data-oi]"), function (b) {
        b.onclick = function () { OE.openApply(list[+b.getAttribute("data-oi")]); };
      });
    }, function () {
      var busy = $("openBusy");
      if (busy) { busy.className = "err"; busy.textContent = x.openListFail; }
    });
  }
  function drawPair(box) {
    var x = OE.t();
    box.innerHTML = '<h3 id="openH">' + esc(x.openH) + '</h3><p class="hint">' + esc(x.openPairP) + '</p><input id="openPair" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="8" placeholder="AB23CD45"><div class="btns"><button type="button" class="btn sec" id="openPairGo">' + esc(x.openPairGo) + '</button></div><p class="err" id="openErr" hidden></p>';
    $("openPairGo").onclick = function () {
      var c = OE.openSetCode($("openPair").value);
      var err = $("openErr");
      if (!c) { if (err) { err.hidden = false; err.textContent = x.openBadCode; } return; }
      drawList(box);
    };
  }
  function drawIos(box) {
    var x = OE.t(), y = otherLang(), code = OE.openEnsureCode();
    box.innerHTML = '<p class="hint" id="openCode">' + esc(OE.fmt(x.openCode, { c: code })) + '</p>' +
      '<p class="code" id="openCodeVal">' + esc(code) + '</p><button type="button" class="btn scan" id="openSave">' + esc(x.openSave) + "<small>" + esc(y.openSave) + '</small></button><p class="okmsg" id="openMsg" hidden></p>';
    $("openSave").onclick = saveOpen;
  }

  OE.openMount = function () {
    if ($("openBox") || !$("who")) return;
    var box = document.createElement("div");
    box.id = "openBox";
    box.className = "openbox";
    $("who").insertAdjacentElement("afterend", box);
    if (OE.ios()) drawIos(box);
    else if (OE.openCode()) drawList(box);
    else drawPair(box);
  };
})(window.OE);
