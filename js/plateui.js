/* plateui.js – "Neem foto" for serial and order. iPhone/iPad, ESC only.
   A field is filled only when parsePlate is sure. Otherwise it stays empty,
   the NL/FR message is shown and that field is focused. No line-picking. */
"use strict";
(function (OE) {
  var mem = OE.mem, $ = OE.$, esc = OE.esc;
  function otherLang() { return OE.T[(OE.S && OE.S.lang) === "fr" ? "nl" : "fr"]; }

  OE.plateShow = function (parsed) {
    var x = OE.t(), y = otherLang(), d = parsed || { serial: "", order: "", serialUnsure: true, orderUnsure: true };
    function block(id, label, unsure, msg) {
      return "<label>" + esc(label) + '<input id="' + id + '" autocomplete="off" spellcheck="false">' +
        '<p class="err" id="' + id + 'Msg"' + (unsure ? "" : " hidden") + ">" + (unsure ? esc(msg) : "") + "</p></label>";
    }
    $("card").innerHTML = '<div class="start" id="plateReview"><h2>' + esc(x.plateH) + '</h2><p class="hint">' + esc(x.plateSub) + '</p><div class="smxfields">' +
      block("plateSer", x.serial, d.serialUnsure, x.plateUnsureSer) +
      block("plateOrd", x.order, d.orderUnsure, x.plateUnsureOrd) +
      '</div><div class="btns"><button type="button" class="btn sec" id="plateBack">' + esc(x.plateBack) + '</button><button type="button" class="btn pri" id="plateTake">' + esc(x.plateTake) + "<small>" + esc(y.plateTake) + "</small></button></div></div>";
    $("plateSer").value = d.serialUnsure ? "" : (d.serial || "");
    $("plateOrd").value = d.orderUnsure ? "" : (d.order || "");
    $("plateBack").onclick = function () { OE.screens.form(); };
    $("plateTake").onclick = function () {
      var f = mem.form;
      if (f) {
        f.serial = $("plateSer").value.replace(/\s+/g, " ").trim();
        f.order = $("plateOrd").value.replace(/\s+/g, " ").trim();
      }
      OE.screens.form();
    };
    var focusId = d.serialUnsure ? "plateSer" : (d.orderUnsure ? "plateOrd" : "plateSer");
    var el = $(focusId);
    if (el) { try { el.focus(); } catch (e) {} }
  };

  function showFail() {
    var x = OE.t();
    $("card").innerHTML = '<div class="start"><div class="err">' + esc(x.plateFail) + '</div><div class="btns"><button type="button" class="btn sec" id="plateBack">' + esc(x.plateBack) + '</button></div></div>';
    $("plateBack").onclick = function () { OE.screens.form(); };
  }
  function run(file) {
    var x = OE.t();
    if (!file || !OE.loadTess || !OE.prepOcrImage) { showFail(); return; }
    $("card").innerHTML = '<div class="start"><h2>' + esc(x.plateH) + '</h2><p id="plateStatus">' + esc(x.plateBusy) + '</p><div class="ocrbar"><i id="ocrfill"></i></div></div>';
    OE.loadTess().then(function (Tess) {
      return Tess.createWorker("nld+fra+eng", 1, { logger: function (m) {
        var fill = $("ocrfill");
        if (fill && typeof m.progress === "number") fill.style.width = Math.round(Math.min(m.progress, 0.99) * 100) + "%";
      } });
    }).then(function (worker) {
      return OE.prepOcrImage(file).then(function (canvas) {
        return worker.recognize(canvas).then(function (r) {
          return worker.terminate().then(function () { return r; });
        });
      }).catch(function (e) { return worker.terminate().catch(function () {}).then(function () { throw e; }); });
    }).then(function (r) {
      var data = r && r.data || {};
      OE.plateShow(OE.parsePlate(data.text || "", { confidence: typeof data.confidence === "number" ? data.confidence : null, words: data.words || null }));
    }, showFail);
  }

  OE.plateMount = function () {
    if (!OE.ios() || $("plateBtn") || !$("ser")) return;
    var x = OE.t(), y = otherLang(), host = document.createElement("div");
    host.className = "smx";
    host.innerHTML = '<button type="button" class="btn scan" id="plateBtn">' + esc(x.photo) + "<small>" + esc(y.photo) + '</small></button><p class="hint scan-hint" id="plateHint">' + esc(x.photoSub) + '</p><input id="plateFile" type="file" accept="image/*" capture="environment" hidden>';
    var box = $("openBox"), row = $("numRow");
    if (box) box.appendChild(host);
    else if (row) row.insertAdjacentElement("beforebegin", host);
    else return;
    $("plateBtn").onclick = function () { $("plateFile").click(); };
    $("plateFile").addEventListener("change", function () {
      var file = this.files && this.files[0];
      this.value = "";
      if (file) run(file);
    });
  };
})(window.OE);
