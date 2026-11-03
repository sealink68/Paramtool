/* paramtool-api — open dossiers for one pairing code. Fields only, 14-day TTL. */
var ORIGIN = "https://sealink68.github.io";
var CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
var TTL = 1209600;
var LIMIT = 40;
var WINDOW = 60000;
var FIELDS = ["wo", "dossier", "account", "adres", "contact", "product", "fam", "famOther", "sub", "subOther", "line", "serial", "order", "tech", "updated"];
var hits = new Map();

function clip(v, n) {
  v = v == null ? "" : String(v).replace(/\s+/g, " ").trim();
  return v.length > n ? v.slice(0, n) : v;
}
function clean(src) {
  var out = {}, i, k, n, v;
  src = src || {};
  for (i = 0; i < FIELDS.length; i++) {
    k = FIELDS[i];
    n = (k === "wo" || k === "serial" || k === "order" || k === "line" || k === "updated") ? 40 : (k === "fam" || k === "sub" || k === "famOther" || k === "subOther" || k === "tech" ? 120 : 400);
    v = clip(src[k], n);
    if (k === "line") v = v === "ESA" ? "ESA" : (v === "ESC" ? "ESC" : "");
    out[k] = v;
  }
  return out;
}
function woKey(wo) {
  return clip(wo, 40).replace(/[^A-Za-z0-9._-]/g, "_");
}
function tooFast(ip) {
  var now = Date.now(), b = hits.get(ip);
  if (hits.size > 5000) hits.clear();
  if (!b || now - b.start > WINDOW) { hits.set(ip, { start: now, n: 1 }); return false; }
  b.n += 1;
  return b.n > LIMIT;
}
function corsHeaders(req) {
  var o = req.headers.get("Origin") || "";
  if (!o) return {};
  if (o !== ORIGIN) return null;
  return {
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Paramtool-Code",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
function json(req, status, body) {
  var cors = corsHeaders(req);
  if (cors === null) cors = {};
  var headers = Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, cors);
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}
function codeOf(req) {
  var c = String(req.headers.get("X-Paramtool-Code") || "").trim().toUpperCase();
  return CODE.test(c) ? c : "";
}

async function handle(req, env) {
  var url = new URL(req.url);
  var path = url.pathname.replace(/\/+$/, "") || "/";
  var cors = corsHeaders(req);
  if (cors === null) return json(req, 403, { error: "origin" });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (path === "/" && req.method === "GET") return json(req, 200, { ok: true, name: "paramtool-api" });
  var ip = req.headers.get("CF-Connecting-IP") || "local";
  if (tooFast(ip)) return json(req, 429, { error: "rate" });
  var code = codeOf(req);
  if (!code) return json(req, 401, { error: "code" });
  if (!env || !env.OPEN) return json(req, 500, { error: "kv" });

  if (path === "/dossiers" && req.method === "GET") {
    var listed = await env.OPEN.list({ prefix: "t:" + code + ":", limit: 100 });
    var dossiers = [];
    var keys = listed && listed.keys || [];
    for (var i = 0; i < keys.length; i++) {
      var raw = await env.OPEN.get(keys[i].name);
      if (!raw) continue;
      try { dossiers.push(clean(JSON.parse(raw))); } catch (e) {}
    }
    return json(req, 200, { dossiers: dossiers });
  }

  if (path === "/dossiers" && req.method === "POST") {
    var text;
    try { text = await req.text(); } catch (e) { return json(req, 400, { error: "json" }); }
    if (text.length > 12000) return json(req, 413, { error: "size" });
    var body;
    try { body = JSON.parse(text); } catch (e2) { return json(req, 400, { error: "json" }); }
    var rec = clean(body);
    if (!rec.wo) return json(req, 400, { error: "wo" });
    var key = "t:" + code + ":" + woKey(rec.wo);
    await env.OPEN.put(key, JSON.stringify(rec), { expirationTtl: TTL });
    return json(req, 200, { ok: true, dossier: rec });
  }

  if (req.method === "DELETE" && path.indexOf("/dossiers/") === 0) {
    var wo = "";
    try { wo = decodeURIComponent(path.slice("/dossiers/".length)); } catch (e3) { wo = ""; }
    if (!woKey(wo)) return json(req, 400, { error: "wo" });
    await env.OPEN.delete("t:" + code + ":" + woKey(wo));
    return json(req, 200, { ok: true });
  }
  return json(req, 404, { error: "nope" });
}

export default { fetch: handle };
