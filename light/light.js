/* param_light – office page: ESC/ESA, system, submodel, picture. No files, no wizard. */
"use strict";
(function () {
  var OE = window.OE;
  var KEY = "param_light_lang";
  var OTHER = OE.CFG.OTHER;
  var T = {
    nl: {
      office: "Kantoor · alleen systeem en foto",
      hint: "Kies ESC of ESA, daarna het systeem en het submodel.",
      family: "Systeem", sub: "Submodel", choose: "— kies —",
      other: "Ander…", otherPh: "Vrije tekst",
      example: "Voorbeeldfoto van de familie", noImg: "Geen afbeelding voor deze keuze"
    },
    fr: {
      office: "Bureau · système et photo seulement",
      hint: "Choisissez ESC ou ESA, puis le système et le sous-modèle.",
      family: "Système", sub: "Sous-modèle", choose: "— choisir —",
      other: "Autre…", otherPh: "Texte libre",
      example: "Photo d'exemple de la famille", noImg: "Pas d'image pour ce choix"
    }
  };
  var lang = "nl", line = "";
  try { if (localStorage.getItem(KEY) === "fr") lang = "fr"; } catch (e) {}
  function x() { return T[lang] || T.nl; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function catalog() {
    OE.S = { lang: lang, line: line === "ESA" ? "ESA" : "ESC" };
    return line === "ESA" || line === "ESC" ? OE.catalog() : {};
  }
  function modelSrc(img) {
    if (!img) return "";
    return "../img/models/" + img + (/\.(jpe?g|png|webp)$/i.test(img) ? "" : ".jpg");
  }
  function descOf(m) {
    var d = (m && m.desc) || {};
    return typeof d === "string" ? d : (d[lang] || d.nl || d.en || "");
  }
  function exampleImg(fam) {
    var list = catalog()[fam] || [], i;
    for (i = 0; i < list.length; i++) if (list[i].img && !list[i].example) return list[i].img;
    return null;
  }
  function subOf(fam, id) {
    var list = catalog()[fam] || [], i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function paint() {
    var L = x(), fam = $("fam"), sub = $("sub"), cat = catalog(), names = Object.keys(cat);
    document.documentElement.lang = lang;
    $("office").innerHTML = esc(L.office) + "<br>" + esc(L.hint);
    $("famLbl").textContent = L.family;
    $("subLbl").textContent = L.sub;
    $("famO").placeholder = L.otherPh;
    $("subO").placeholder = L.otherPh;
    [].forEach.call(document.querySelectorAll("#seg button"), function (b) { b.classList.toggle("on", b.dataset.l === lang); });
    [].forEach.call(document.querySelectorAll("#line button"), function (b) {
      var on = b.dataset.line === line;
      b.classList.toggle("on", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
    var famVal = fam.value, subVal = sub.value;
    var opts = '<option value="">' + esc(L.choose) + "</option>" + names.map(function (k) {
      return '<option value="' + esc(k) + '">' + esc(k) + "</option>";
    }).join("") + (line === "ESC" ? '<option value="' + OTHER + '">' + esc(L.other) + "</option>" : "");
    fam.innerHTML = opts;
    if (famVal && (famVal === OTHER || cat[famVal])) fam.value = famVal; else fam.value = "";
    $("famO").hidden = fam.value !== OTHER;
    var list = cat[fam.value] || [];
    var subOpts = '<option value="">' + esc(L.choose) + "</option>" + list.map(function (m) {
      return '<option value="' + esc(m.id) + '">' + esc(m.id) + "</option>";
    }).join("") + (line === "ESC" && fam.value ? '<option value="' + OTHER + '">' + esc(L.other) + "</option>" : "");
    sub.innerHTML = subOpts;
    sub.disabled = !fam.value;
    if (line === "ESA" && list.length === 1) sub.value = list[0].id;
    else if (subVal && (subVal === OTHER || list.some(function (m) { return m.id === subVal; }))) sub.value = subVal;
    else sub.value = "";
    $("subO").hidden = sub.value !== OTHER;
    var info = fam.value && fam.value !== OTHER ? subOf(fam.value, sub.value) : null;
    var img = info && info.img, example = !!(info && info.example), cap = "";
    if (!img && fam.value && fam.value !== OTHER && line !== "ESA") { img = exampleImg(fam.value); example = !!img; }
    if (img && info) cap = esc(info.id);
    else if (img) cap = esc(fam.value);
    $("prod").innerHTML = img
      ? '<img id="prodImg" src="' + esc(modelSrc(img)) + '" alt="' + cap + '"><figcaption>' + cap + (example ? ' <em class="ex">' + esc(L.example) + "</em>" : "") + (info && descOf(info) ? '<small class="desc" id="prodDesc">' + esc(descOf(info)) + "</small>" : "") + "</figcaption>"
      : '<div class="noimg" id="noImg">' + (fam.value ? esc(L.noImg) : "") + "</div>";
  }
  $("fam").onchange = function () { $("sub").value = ""; paint(); };
  $("sub").onchange = paint;
  $("famO").oninput = paint;
  $("subO").oninput = paint;
  [].forEach.call(document.querySelectorAll("#line button"), function (b) {
    b.onclick = function () { if (line === b.dataset.line) return; line = b.dataset.line; $("fam").value = ""; $("sub").value = ""; $("famO").value = ""; $("subO").value = ""; paint(); };
  });
  [].forEach.call(document.querySelectorAll("#seg button"), function (b) {
    b.onclick = function () { lang = b.dataset.l === "fr" ? "fr" : "nl"; try { localStorage.setItem(KEY, lang); } catch (e) {} paint(); };
  });
  paint();
})();
