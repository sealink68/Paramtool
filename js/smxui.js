/* smxui.js – ServiceMax screenshot button, OCR and review. iPhone/iPad only. */
"use strict";
(function (OE) {
  var mem = OE.mem, $ = OE.$, esc = OE.esc;
  function L() { return ServiceMax.labels[(OE.S && OE.S.lang) || "nl"]; }
  function other() { return ServiceMax.labels[(OE.S && OE.S.lang) === "fr" ? "nl" : "fr"]; }

  function prepImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (!w || !h) { URL.revokeObjectURL(url); rej(new Error("image")); return; }
        var scale = Math.min(1, 2200 / Math.max(w, h)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("image")); };
      img.src = url;
    });
  }
  function loadTess() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (loadTess.p) return loadTess.p;
    loadTess.p = new Promise(function (ok, bad) {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      s.async = true;
      s.onload = function () { window.Tesseract ? ok(window.Tesseract) : bad(new Error("lib")); };
      s.onerror = function () { loadTess.p = null; bad(new Error("cdn")); };
      document.head.appendChild(s);
    });
    return loadTess.p;
  }
  var ocrGen = 0;
  function showBusy(msg) {
    var x = L();
    $("card").innerHTML = '<div class="start"><h2>' + esc(x.reading) + '</h2><p id="ocrstatus">' + esc(msg || x.loading) + '</p><div class="ocrbar"><i id="ocrfill"></i></div><p class="hint">' + esc(x.scanSub) + "</p></div>";
  }
  function showErr(msg) {
    var x = L();
    $("card").innerHTML = '<div class="start"><div class="err">' + esc(msg) + '</div><div class="btns"><button type="button" class="btn sec" id="ocrback">' + esc(x.back) + '</button><button type="button" class="btn pri" id="ocrretry">' + esc(x.scan) + "</button></div></div>";
    $("ocrback").onclick = function () { OE.screens.form(); };
    $("ocrretry").onclick = function () { var inp = $("smxFile"); if (inp) inp.click(); };
  }
  function runOcr(files) {
    var id = ++ocrGen, n = files.length, cur = 0;
    showBusy(L().loading);
    loadTess().then(function (Tess) {
      return Tess.createWorker("nld+fra+eng", 1, { logger: function (m) {
        if (id !== ocrGen) return;
        var p = typeof m.progress === "number" ? m.progress : 0, fill = $("ocrfill");
        if (fill) fill.style.width = Math.round(((cur + Math.min(p, 0.99)) / n) * 100) + "%";
        var st = $("ocrstatus"); if (!st) return;
        st.textContent = m.status === "recognizing text" ? L().reading + (n > 1 ? " (" + (cur + 1) + "/" + n + ")" : "") : L().loading;
      } });
    }).then(function (worker) {
      var texts = [], i = 0;
      function next() {
        if (i >= n) return worker.terminate().then(function () { return texts; });
        var file = files[i]; cur = i; i++;
        return prepImage(file).then(function (canvas) {
          return worker.recognize(canvas).then(function (r) { texts.push(r && r.data && r.data.text || ""); return next(); });
        }, function () { texts.push(""); return next(); });
      }
      return next().catch(function (e) { return worker.terminate().catch(function () {}).then(function () { throw e; }); });
    }).then(function (texts) {
      if (id !== ocrGen) return;
      if (!texts.some(function (t) { return String(t || "").trim(); })) { showErr(L().imgfail); return; }
      OE.smxShowReview(ServiceMax.parse(ServiceMax.merge(texts)));
    }, function () { if (id === ocrGen) showErr(L().fail); });
  }
  OE.smxShowReview = function (draft) {
    var x = L(), y = other(), d = draft || ServiceMax.blank();
    mem.smxDraft = d;
    function field(k) {
      var long = k === "adres" || k === "contact" || k === "product";
      var control = long ? '<textarea id="f-' + k + '" rows="2"></textarea>' : '<input id="f-' + k + '" autocomplete="off">';
      return "<label>" + esc(x[k]) + "<small>" + esc(y[k]) + "</small>" + control + "</label>";
    }
    $("card").innerHTML = '<div class="start" id="smxReview"><h2>' + esc(x.review) + '</h2><p class="hint">' + esc(x.reviewSub) + '</p><div class="smxfields">' +
      field("wo") + field("account") + field("adres") + field("contact") + field("product") +
      '</div><div class="btns"><button type="button" class="btn sec" id="ocrback">' + esc(x.back) + '</button><button type="button" class="btn pri" id="ocrtake">' + esc(x.take) + "</button></div></div>";
    ["wo", "account", "adres", "contact", "product"].forEach(function (k) { var el = $("f-" + k); if (el) el.value = d[k] || ""; });
    $("ocrback").onclick = function () { OE.screens.form(); };
    $("ocrtake").onclick = function () {
      var client = ServiceMax.blank();
      ["wo", "account", "adres", "contact", "product"].forEach(function (k) { var el = $("f-" + k); client[k] = el ? el.value.replace(/\s+/g, " ").trim() : ""; });
      mem.smxClient = client;
      var f = mem.form;
      if (f) f.dossier = ServiceMax.dossierFrom(client);
      OE.screens.form();
    };
  };
  OE.loadTess = loadTess;
  OE.prepOcrImage = prepImage;
  OE.smxMount = function () {
    if (!OE.ios() || $("smxBtn") || !$("dos")) return;
    var x = L(), y = other(), host = document.createElement("div");
    host.className = "smx";
    host.innerHTML = '<button type="button" class="btn scan" id="smxBtn">' + esc(x.scan) + "<small>" + esc(y.scan) + '</small></button><p class="hint scan-hint" id="smxHint">' + esc(x.scanSub) + '</p><input id="smxFile" type="file" accept="image/*" multiple hidden>';
    var box = $("openBox"), hint = $("dosN");
    if (box) box.appendChild(host);
    else (hint || $("dos")).insertAdjacentElement("afterend", host);
    $("smxBtn").onclick = function () { $("smxFile").click(); };
    $("smxFile").addEventListener("change", function () {
      var files = [].slice.call(this.files || []);
      this.value = "";
      if (files.length) runOcr(files);
    });
  };
})(window.OE);
