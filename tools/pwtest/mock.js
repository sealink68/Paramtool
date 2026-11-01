(function(){
  var cfg = JSON.parse(sessionStorage.getItem("mockcfg") || "{}");
  var perm = sessionStorage.getItem("perm") || "granted";
  window.__log = [];
  function Dir(name){ this.kind="directory"; this.name=name; this.c={}; }
  function Fil(name, data, mt){ this.kind="file"; this.name=name; this.data=data; this.mt=mt; }
  Dir.prototype.getDirectoryHandle=function(n,o){ var e=this.c[n]; if(!e){ if(!(o&&o.create)) return Promise.reject(Object.assign(new Error("nf"),{name:"NotFoundError"})); e=this.c[n]=new Dir(n); window.__log.push("mkdir "+n);} return Promise.resolve(e); };
  Dir.prototype.getFileHandle=function(n,o){ var e=this.c[n]; if(!e){ if(!(o&&o.create)) return Promise.reject(Object.assign(new Error("nf"),{name:"NotFoundError"})); e=this.c[n]=new Fil(n,"",Date.now());} return Promise.resolve(e); };
  Dir.prototype.removeEntry=function(n){ delete this.c[n]; window.__log.push("rm "+n); return Promise.resolve(); };
  Dir.prototype.values=async function*(){ for (var k in this.c) yield this.c[k]; };
  Dir.prototype.queryPermission=function(){ return Promise.resolve(perm); };
  Dir.prototype.requestPermission=function(){ window.__log.push("request"); perm="granted"; sessionStorage.setItem("perm","granted"); return Promise.resolve("granted"); };
  Fil.prototype.getFile=function(){ return Promise.resolve(new File([this.data], this.name, {lastModified:this.mt})); };
  Fil.prototype.createWritable=function(){ var s=this; return Promise.resolve({ write:function(d){ s.data=d; s.mt=Date.now(); return Promise.resolve(); }, close:function(){ return Promise.resolve(); } }); };
  function addFile(dir, path, ageMin, size) {
    var parts = String(path).split("/"); var d = dir;
    for (var i = 0; i < parts.length - 1; i++) { if (!d.c[parts[i]]) d.c[parts[i]] = new Dir(parts[i]); d = d.c[parts[i]]; }
    var name = parts[parts.length - 1];
    d.c[name] = new Fil(name, "x".repeat(size || 10), Date.now() - (ageMin || 0) * 60000);
  }
  var root = new Dir("ESC_Share");
  var esa = new Dir("ESA_Share");
  if (cfg.params) { var p=root.c.projecten=new Dir("projecten"); var e=p.c["ESC-param"]=new Dir("ESC-param");
    cfg.params.forEach(function(f){ e.c[f[0]]=new Fil(f[0], "x".repeat(f[2]||10), Date.now()-f[1]*60000); }); }
  if (cfg.sub && root.c.projecten && root.c.projecten.c["ESC-param"]) { root.c.projecten.c["ESC-param"].c.sub = new Dir("sub"); root.c.projecten.c["ESC-param"].c.sub.c["in.xml"]=new Fil("in.xml","a",Date.now()); }
  var srcDirs = {};
  var docs = new Dir("Documents");
  function seed(key, files) { var d = srcDirs[key] || new Dir(key); srcDirs[key] = d; (files||[]).forEach(function(f){ addFile(d, f[0], f[1], f[2]); }); return d; }
  function placeProgram(program, folderName, files) {
    if (!docs.c[program]) docs.c[program] = new Dir(program);
    if (!docs.c[program].c[folderName]) docs.c[program].c[folderName] = new Dir(folderName);
    (files||[]).forEach(function(f){ addFile(docs.c[program].c[folderName], f[0], f[1], f[2]); });
  }
  if (cfg.params) placeProgram("Pavis3", "projects", cfg.params);
  if (cfg.sources) {
    if (cfg.sources.pavis3) placeProgram("Pavis3", "projects", cfg.sources.pavis3);
    if (cfg.sources.pavis96) placeProgram("Pavis96NG", "Projects", cfg.sources.pavis96);
    if (cfg.sources.downloads) seed("downloads", cfg.sources.downloads);
    if (cfg.sources.eeps) seed("eeps", cfg.sources.eeps);
  }
  if (cfg.docsPaths) cfg.docsPaths.forEach(function(f){ addFile(docs, f[0], f[1], f[2]); });
  if (cfg.params || (cfg.sources && (cfg.sources.pavis3 || cfg.sources.pavis96)) || cfg.docsPaths) srcDirs.docs = docs;
  window.__root = root; window.__roots = { ESC: root, ESA: esa }; window.__sources = srcDirs;
  window.showDirectoryPicker = function(opts){
    var id = (opts && opts.id) || "";
    if (id.indexOf("src-") === 0) { window.__log.push("picker:" + id); var key = id.slice(4); if (!srcDirs[key]) srcDirs[key] = new Dir(key); return Promise.resolve(srcDirs[key]); }
    window.__log.push("picker");
    if (id === "esa-share") return Promise.resolve(esa);
    return Promise.resolve(root);
  };
  var store = {}; if (sessionStorage.getItem("dirPicked")) store.dir = root;
  var saved = [];
  Object.keys(srcDirs).forEach(function(k){ saved.push({ key: k, label: k === "downloads" ? "" : (k === "docs" ? "Public Documents" : k), hint: "", handle: srcDirs[k] }); });
  if (saved.length) store.sources = saved;
  var OE = {}; Object.defineProperty(window, "OE", { value: OE, writable: true });
  Object.defineProperty(OE, "idbGet", { get:function(){ return function(k){ return Promise.resolve(store[k]); }; }, set:function(){} });
  Object.defineProperty(OE, "idbSet", { get:function(){ return function(k,v){ store[k]=v; if(k==="dir"||k==="dirs") sessionStorage.setItem("dirPicked","1"); return Promise.resolve(); }; }, set:function(){} });
  HTMLInputElement.prototype.click = function(){ window.__log.push("filepicker"); };
})();
