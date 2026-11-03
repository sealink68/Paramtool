"use strict";
var fs = require("fs"), vm = require("vm"), assert = require("assert"), path = require("path");
var root = path.join(__dirname, "..");
var sandbox = { window: {}, localStorage: { _d: {}, getItem: function (k) { return this._d[k] || null; }, setItem: function (k, v) { this._d[k] = String(v); }, removeItem: function (k) { delete this._d[k]; } } };
sandbox.window = sandbox;
sandbox.crypto = { getRandomValues: function (a) { for (var i = 0; i < a.length; i++) a[i] = (i * 17 + 3) & 255; return a; } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "plate.js"), "utf8"), sandbox, { filename: "js/plate.js" });
vm.runInContext(fs.readFileSync(path.join(root, "js", "open.js"), "utf8"), sandbox, { filename: "js/open.js" });
var parse = sandbox.OE.parsePlate, open = sandbox.OE;

var proto = parse([
  "Fabrik-Nr.: 190000000000001",
  "Auftrags-Nr.: 1000001",
  "S/N: 190000000000002"
].join("\n"), { confidence: 96 });
assert.strictEqual(proto.serial, "190000000000001");
assert.strictEqual(proto.order, "1000001");
assert.strictEqual(proto.serialUnsure, false);
assert.strictEqual(proto.orderUnsure, false);

var plate = parse("S/N: 190000000000001\n03.02.2025\n1000001\nIP54\n24V", { confidence: 95 });
assert.strictEqual(plate.serial, "190000000000001");
assert.strictEqual(plate.order, "");
assert.strictEqual(plate.orderUnsure, true);

var many = parse("S/N: 190000000000001\nS/N: 190000000000002\nAuftrags-Nr.: 1000001", { confidence: 95 });
assert.strictEqual(many.serial, "");
assert.strictEqual(many.serialUnsure, true);
assert.strictEqual(many.order, "1000001");

var orders = parse("Auftrags-Nr.: 1000001\nBestell-Nr.: 1000002", { confidence: 95 });
assert.strictEqual(orders.order, "");
assert.strictEqual(orders.orderUnsure, true);

var low = parse("S/N: 190000000000001\nAuftrags-Nr.: 1000001", { confidence: 40 });
assert.strictEqual(low.serial, "");
assert.strictEqual(low.order, "");
assert.strictEqual(low.serialUnsure, true);
assert.strictEqual(low.orderUnsure, true);

var words = parse("S/N: 190000000000001\nAuftrags-Nr.: 1000001", {
  confidence: 99,
  words: [{ text: "S/N:", confidence: 42 }, { text: "190000000000001", confidence: 40 }, { text: "Auftrags-Nr.:", confidence: 96 }, { text: "1000001", confidence: 95 }]
});
assert.strictEqual(words.serial, "");
assert.strictEqual(words.serialUnsure, true);
assert.strictEqual(words.order, "1000001");
assert.strictEqual(words.orderUnsure, false);

var bad = parse("S/N: ABC\nAuftrags-Nr.: 03.02.2025", { confidence: 99 });
assert.strictEqual(bad.serial, "");
assert.strictEqual(bad.order, "");
assert.strictEqual(bad.serialUnsure, true);
assert.strictEqual(bad.orderUnsure, true);

var spaced = parse("Seriennummer: 1900 0000 0000 001", { confidence: 90 });
assert.strictEqual(spaced.serial, "190000000000001");
assert.strictEqual(spaced.order, "");

var empty = parse("", { confidence: 99 });
assert.strictEqual(empty.serial, "");
assert.strictEqual(empty.order, "");

var cleaned = open.openClean({ wo: "WO-TEST145839", dossier: "IP-00000001|TEST", file: "secret.bin", image: "nope", serial: "190000000000001", order: "1000001", line: "ESC", extra: "x" });
assert.strictEqual(cleaned.wo, "WO-TEST145839");
assert.strictEqual(cleaned.serial, "190000000000001");
assert.strictEqual(cleaned.file, undefined);
assert.strictEqual(cleaned.image, undefined);
assert.strictEqual(cleaned.extra, undefined);
assert.strictEqual(open.openSetCode("ab23cd45"), "AB23CD45");
assert.strictEqual(open.openSetCode("AB23CD4O"), "");
assert.strictEqual(open.openSetCode("AB23CD40"), "");
assert.strictEqual(open.openCode(), "AB23CD45");
console.log("plate/open tests ok");
