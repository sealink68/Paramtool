/* plate.js – type-plate / protocol OCR for serial and order. Confident matches only.
   Example photos (img/help): a new plate labels the serial "S/N" (15 digits) and leaves the
   order unlabeled next to the date; an older Kaba protocol labels "Fabrik-Nr." (serial)
   and "Auftrags-Nr." (order). A second S/N on that protocol is not the circled serial.
   Unlabeled numbers are never guessed. */
"use strict";
(function (root) {
  var OE = root.OE = root.OE || {};
  var MIN = 70;
  var FABRIK = /fabri(?:k|c)(?:ations)?(?:[\s.\-]*(?:nr|nummer|no|nummero))?/gi;
  var SN = /(?:^|[^a-z0-9])(s\s*\/\s*n|s\s*\.\s*n|\bsn\b|seriennummer|serien[\s.\-]*nr|serial(?:[\s.\-]*(?:no|number|nr)\.?)?)/gi;
  var ORDER = /(?:auftrags?(?:[\s.\-]*(?:nr|nummer|no))?|bestellnummer|bestell(?:[\s.\-]*(?:nr|nummer|no))?|order(?:[\s.\-]*(?:no|number|nr)\.?)?|commande)/gi;

  function linesOf(text) {
    return String(text || "").replace(/\r/g, "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
  }
  function hasLabel(line) {
    var s = String(line || "");
    return new RegExp(FABRIK.source, "i").test(s) || new RegExp(SN.source, "i").test(s) || new RegExp(ORDER.source, "i").test(s);
  }
  /* First token only. A date is not a number. Spaces are kept when OCR splits one digit run. */
  function valueAfter(src) {
    var chunk = String(src || "").replace(/^[\s:.;,\-]+/, "");
    if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(chunk)) return { date: true, digits: "" };
    var one = chunk.match(/^(\d{6,18})(?!\d)/);
    if (one) return { date: false, digits: one[1] };
    var spaced = chunk.match(/^(\d{3,6}(?: \d{3,6}){1,4})/);
    if (spaced) {
      var d = spaced[1].replace(/ /g, "");
      if (d.length >= 6 && d.length <= 18) return { date: false, digits: d };
    }
    return { date: false, digits: "" };
  }
  function collect(line, next, kind, re) {
    var hits = [], m, start, val, src;
    re = new RegExp(re.source, "gi");
    while ((m = re.exec(line))) {
      start = m.index + m[0].length;
      val = valueAfter(line.slice(start));
      src = line;
      if (!val.digits && !val.date && next && !hasLabel(next)) {
        val = valueAfter(next);
        src = line + " " + next;
      }
      hits.push({ kind: kind, digits: val.digits, date: val.date, line: src });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return hits;
  }
  function uniq(list) {
    var seen = {}, out = [];
    list.forEach(function (h) {
      if (!h.digits || seen[h.digits]) return;
      seen[h.digits] = 1;
      out.push(h);
    });
    return out;
  }
  function mean(hit, words, overall) {
    if (words && words.length && hit && hit.line) {
      var line = hit.line.toLowerCase().replace(/[^a-z0-9]/g, "");
      var nums = [];
      words.forEach(function (w) {
        var t = String(w.text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (t && line.indexOf(t) >= 0 && typeof w.confidence === "number") nums.push(w.confidence);
      });
      if (nums.length) {
        var s = 0;
        nums.forEach(function (n) { s += n; });
        return s / nums.length;
      }
    }
    return typeof overall === "number" ? overall : 100;
  }
  function sure(hit, words, overall) {
    return !!hit && mean(hit, words, overall) >= MIN;
  }

  OE.parsePlate = function (text, opt) {
    opt = opt || {};
    var words = opt.words || null;
    var overall = typeof opt.confidence === "number" ? opt.confidence : null;
    var lines = linesOf(text), hits = [], i, next;
    for (i = 0; i < lines.length; i++) {
      next = lines[i + 1] || "";
      hits = hits.concat(collect(lines[i], next, "fabrik", FABRIK));
      hits = hits.concat(collect(lines[i], next, "sn", SN));
      hits = hits.concat(collect(lines[i], next, "order", ORDER));
    }
    var fabrikAll = hits.filter(function (h) { return h.kind === "fabrik"; });
    var fabrikGood = uniq(fabrikAll.filter(function (h) { return h.digits.length >= 12 && h.digits.length <= 18; }));
    var snGood = uniq(hits.filter(function (h) { return h.kind === "sn" && h.digits.length >= 12 && h.digits.length <= 18; }));
    var orderGood = uniq(hits.filter(function (h) { return h.kind === "order" && !h.date && h.digits.length >= 6 && h.digits.length <= 8; }));
    var orderAll = hits.filter(function (h) { return h.kind === "order"; });
    var serial = "", order = "", serialUnsure = true, orderUnsure = true, pick;

    if (fabrikAll.length) {
      if (fabrikGood.length === 1 && sure(fabrikGood[0], words, overall)) {
        serial = fabrikGood[0].digits; serialUnsure = false;
      }
    } else if (snGood.length === 1 && sure(snGood[0], words, overall)) {
      serial = snGood[0].digits; serialUnsure = false;
    }

    if (orderAll.length && orderGood.length === 1) {
      pick = orderGood[0];
      if (sure(pick, words, overall)) { order = pick.digits; orderUnsure = false; }
    }
    return { serial: serial, order: order, serialUnsure: serialUnsure, orderUnsure: orderUnsure };
  };
  OE.PLATE_MIN_CONF = MIN;
})(typeof window !== "undefined" ? window : globalThis);
