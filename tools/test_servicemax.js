"use strict";
var fs = require("fs"), vm = require("vm"), assert = require("assert"), path = require("path");
var root = path.join(__dirname, "..");
var sandbox = { window: {} };
sandbox.window.OE = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "servicemax.js"), "utf8"), sandbox, { filename: "js/servicemax.js" });
vm.runInContext(fs.readFileSync(path.join(root, "js", "i18n.js"), "utf8"), sandbox, { filename: "js/i18n.js" });
var SM = sandbox.window.ServiceMax, safe = sandbox.window.OE.safeName;
assert.ok(SM && SM.parse);

var dutch = [
  "Werkordernummer",
  "wo-TEST0001",
  "Onderwerp",
  "Nummer: 000000000000000 || testonderwerp niet overnemen",
  "Account",
  "TEST ACCOUNT NV",
  "Account geblokkeerd",
  "Nee",
  "Routebeschrijving ophalen",
  "TESTSTRAAT 1, TESTSTAD 1000, Belgium",
  "Geinstalleerd Product",
  "1P-00000001|TESTDEUR FTS-E02",
  "Test Persoon",
  "+32000000001"
].join("\n");
var got = SM.parse(dutch);
assert.strictEqual(got.wo, "WO-TEST0001");
assert.strictEqual(got.account, "TEST ACCOUNT NV");
assert.strictEqual(got.adres, "TESTSTRAAT 1, TESTSTAD 1000, Belgium");
assert.strictEqual(got.contact, "Test Persoon +32000000001");
assert.strictEqual(got.product, "IP-00000001|TESTDEUR FTS-E02");
assert.ok(JSON.stringify(got).indexOf("niet overnemen") < 0);
assert.strictEqual(SM.dossierFrom(got), "IP-00000001|TESTDEUR FTS-E02");
assert.ok(SM.dossierFrom(got).indexOf("WO-TEST") < 0);
assert.strictEqual(SM.dossierFrom({ wo: "WO-TEST0009", product: "" }), "");
assert.strictEqual(SM.dossierFrom({ wo: "WO-TEST0009", product: "WO-TEST0009" }), "");

var sample = SM.parse([
  "Routebeschrijving ophalen",
  "TESTSTRAAT 7, TESTSTAD 9000, Belgium",
  "Werkordernummer",
  "WO-TEST145839",
  "Geïnstalleerd product",
  "1P-00767007|KENTAUR FTS-E02",
  "Test Persoon",
  "+32000000007"
].join("\n"));
assert.strictEqual(sample.wo, "WO-TEST145839");
assert.strictEqual(sample.product, "IP-00767007|KENTAUR FTS-E02");
assert.strictEqual(SM.dossierFrom(sample), "IP-00767007|KENTAUR FTS-E02");
assert.strictEqual(safe("IP-00767007|KENTAUR FTS-E02"), "IP-00767007_KENTAUR_FTS-E02");
assert.strictEqual(safe("a  b||c"), "a_b_c");
assert.strictEqual(safe("  x. "), "x");
assert.ok(safe("a\u0001b").indexOf("\u0001") < 0);
assert.strictEqual(safe("1|2\\3:4*5?6\"7<8>9"), "1_2_3_4_5_6_7_8_9");
assert.strictEqual(safe("D1."), "D1");
assert.strictEqual(safe("D1 "), "D1");
assert.strictEqual(safe("A/B:C"), "A_B_C");
assert.strictEqual(safe("ES250/130 Proline", true), "ES250_130_Proline");
assert.strictEqual(safe("CON"), "_CON");
assert.strictEqual(SM.version, "v2026.11.04-3");
["index.html", "sw.js", "js/app.js", "js/servicemax.js"].forEach(function (f) {
  var src = fs.readFileSync(path.join(root, f), "utf8");
  assert.ok(src.indexOf("v2026.11.04-3") >= 0, f + " missing version");
});
var sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
assert.ok(sw.indexOf("skipWaiting") >= 0);
assert.ok(sw.indexOf("clients.claim") >= 0);
assert.ok(sw.indexOf("network-first") >= 0);
console.log("servicemax tests ok");
