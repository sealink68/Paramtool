import assert from "assert";
import worker from "../worker/src/index.js";

function kvStore() {
  const data = new Map();
  const puts = [];
  return {
    puts,
    OPEN: {
      async put(k, v, opt) { data.set(k, v); puts.push({ k, v, opt }); },
      async get(k) { return data.has(k) ? data.get(k) : null; },
      async delete(k) { data.delete(k); },
      async list({ prefix }) {
        return { keys: [...data.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) };
      }
    }
  };
}
const env = kvStore();
const ORIGIN = "https://sealink68.github.io";
function call(method, path, { body, code = "AB23CD45", origin = ORIGIN, ip = "203.0.113.5" } = {}) {
  const headers = { Origin: origin, "CF-Connecting-IP": ip };
  if (code) headers["X-Paramtool-Code"] = code;
  if (body) headers["Content-Type"] = "application/json";
  return worker.fetch(new Request("https://paramtool-api.sealink68.workers.dev" + path, { method, headers, body }), env);
}

const health = await call("GET", "/", { code: "" });
assert.strictEqual(health.status, 200);

const evil = await call("POST", "/dossiers", { origin: "https://evil.example", body: "{}" });
assert.strictEqual(evil.status, 403);

const badCode = await call("GET", "/dossiers", { code: "OOOOOOOO" });
assert.strictEqual(badCode.status, 401);

const noWo = await call("POST", "/dossiers", { body: JSON.stringify({ dossier: "x" }) });
assert.strictEqual(noWo.status, 400);

const saved = await call("POST", "/dossiers", {
  body: JSON.stringify({
    wo: "WO-TEST145839", dossier: "IP-00000001|TESTDEUR", account: "TEST ACCOUNT NV",
    line: "ESC", serial: "190000000000001", order: "1000001", file: "secret.bin", image: "nope"
  })
});
assert.strictEqual(saved.status, 200);
const stored = JSON.parse(env.puts[0].v);
assert.strictEqual(stored.wo, "WO-TEST145839");
assert.strictEqual(stored.serial, "190000000000001");
assert.strictEqual(stored.file, undefined);
assert.strictEqual(env.puts[0].opt.expirationTtl, 1209600);
assert.ok(env.puts[0].k.indexOf("t:AB23CD45:") === 0);

const other = kvStore();
await worker.fetch(new Request("https://paramtool-api.sealink68.workers.dev/dossiers", {
  method: "POST",
  headers: { Origin: ORIGIN, "X-Paramtool-Code": "ZZ99ZZ99", "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.9" },
  body: JSON.stringify({ wo: "WO-TEST999999", dossier: "other" })
}), other);

const list = await call("GET", "/dossiers");
const listed = await list.json();
assert.strictEqual(listed.dossiers.length, 1);
assert.strictEqual(listed.dossiers[0].wo, "WO-TEST145839");
assert.ok(!listed.dossiers.some((d) => d.wo === "WO-TEST999999"));

const gone = await call("DELETE", "/dossiers/" + encodeURIComponent("WO-TEST145839"));
assert.strictEqual(gone.status, 200);
const after = await (await call("GET", "/dossiers")).json();
assert.strictEqual(after.dossiers.length, 0);

let blocked = 0;
for (let i = 0; i < 41; i++) {
  const r = await call("GET", "/dossiers", { ip: "203.0.113.50" });
  if (r.status === 429) blocked++;
}
assert.ok(blocked >= 1);
console.log("worker tests ok");
