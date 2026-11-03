/* pdf.js – bilingual A4 info sheet (selectable text) with vendored jsPDF. Each value on its own line under its label. */
"use strict";
(function (OE) {
  var WIN = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  function clean(s) { return String(s == null ? "" : s).replace(/[\u00A0\u202F]/g, " ").replace(/[^\n\x20-\x7E\u00A1-\u00FF]/g, function (c) { return WIN.indexOf(c) >= 0 ? c : "?"; }); }
  OE.loadImage = function (src) {
    return fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(function (b) {
      return new Promise(function (ok, ko) {
        var fr = new FileReader(); fr.onload = function () {
          var im = new Image(); im.onload = function () { ok({ data: fr.result, w: im.naturalWidth, h: im.naturalHeight }); }; im.onerror = ko; im.src = fr.result;
        }; fr.onerror = ko; fr.readAsDataURL(b);
      });
    });
  };
  var W = 210, M = 18, C = { tx: [15, 23, 42], mu: [100, 116, 139], red: [229, 0, 40], ok: [6, 95, 70], li: [203, 213, 225] };
  /* d = {family, sub, dossier, serial, order, tech, updated(Date), files:[{name, stamp}], img:{data,w,h}|null, example:bool} */
  OE.buildPdf = function (d) {
    var P = OE.PDFT, doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    function font(st, sz, col) { doc.setFont("helvetica", st); doc.setFontSize(sz); var c = col || C.tx; doc.setTextColor(c[0], c[1], c[2]); }
    doc.setProperties({ title: clean(P.title + " – " + d.dossier), subject: clean(d.family + " " + d.sub), creator: "Paramtool" });
    var y = 22;
    font("bold", 17); doc.text(clean(P.title), M, y);
    doc.setDrawColor(C.red[0], C.red[1], C.red[2]); doc.setLineWidth(0.8); doc.line(M, y + 3, W - M, y + 3);
    y += 13;
    var colW = 100, imgX = M + colW + 8, imgW = W - M - imgX, imgTop = y;
    if (d.img) {
      var maxH = 80, r = d.img.w / d.img.h, iw = imgW, ih = iw / r; if (ih > maxH) { ih = maxH; iw = ih * r; }
      var fmt = /^data:image\/png/i.test(d.img.data) ? "PNG" : /^data:image\/webp/i.test(d.img.data) ? "WEBP" : "JPEG";
      doc.addImage(d.img.data, fmt, imgX + (imgW - iw) / 2, imgTop, iw, ih);
      if (d.example) { font("italic", 8, C.mu); doc.text(doc.splitTextToSize(clean(P.example), imgW), imgX, imgTop + ih + 4); }
    }
    function field(label, value) {
      font("normal", 8.5, C.mu); doc.text(clean(label), M, y); y += 5.2;
      font("bold", 12.5); var ls = doc.splitTextToSize(clean(value || "—"), colW);
      ls.forEach(function (l) { doc.text(l, M, y); y += 5.6; }); y += 3.2;
    }
    field(P.family, d.family); field(P.sub, d.sub); field(P.dossier, d.dossier);
    if (d.smx) {
      [["Werkordernummer / N° d'ordre", d.smx.wo], ["Account / Compte", d.smx.account], ["Adres / Adresse", d.smx.adres], ["Contact", d.smx.contact], ["Geïnstalleerd product / Produit installé", d.smx.product]].forEach(function (row) {
        if (row[1]) field(row[0], row[1]);
      });
    }
    if (!d.noNumbers) { field(P.serial, d.serial); field(P.order, d.order); }
    field(P.tech, d.tech); field(P.updated, OE.human(d.updated));
    y = Math.max(y, imgTop + 95) + 4;
    doc.setDrawColor(C.li[0], C.li[1], C.li[2]); doc.setLineWidth(0.3); doc.line(M, y - 5, W - M, y - 5);
    font("bold", 11.5); doc.text(clean(P.files), M, y); y += 8;
    function need(h) { if (y + h > 278) { doc.addPage(); y = 20; } }
    OE.fs.groups(d.files).forEach(function (g) { // grouped per extension, newest per group = active
      need(14); font("bold", 10.5, C.red); doc.text(clean(P.type + ": " + (g.ext || P.noExt) + "  (" + g.files.length + "/" + OE.CFG.KEEP + ")"), M, y); y += 6.5;
      g.files.forEach(function (f, i) {
        need(18); font("bold", 10.5); doc.splitTextToSize(clean(f.name), W - 2 * M - 4).forEach(function (l) { doc.text(l, M + 4, y); y += 5; });
        font("normal", 9.5, C.mu); doc.text(clean(P.date + ": " + OE.stampHuman(f.stamp)), M + 4, y); y += 5;
        if (i === 0) { font("bold", 9.5, C.ok); doc.text(clean(P.active), M + 4, y); y += 5; }
        y += 2.5;
      });
      y += 2;
    });
    font("normal", 8, C.mu); doc.text(clean(P.footer + " · " + OE.human(d.updated)), M, 287);
    return doc.output("blob");
  };
})(window.OE);
