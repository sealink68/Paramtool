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
  /* ESA for the office page only. OE.CFG.ESA (the field app) is not changed. */
  function local(id, img, nl, fr) { return { id: id, img: img, local: true, desc: { nl: nl, fr: fr } }; }
  function esaLight() {
    var o = OE.catalog();
    o.KTV = [
      local("KTV 3", "ktv-3-4.jpg", "Karusselltür met 3 vleugels", "Porte tambour à 3 vantaux"),
      local("KTV 4", "ktv-3-4.jpg", "Karusselltür met 4 vleugels", "Porte tambour à 4 vantaux"),
      local("KTV ATRIUM FLEX", "ktv-atrium-flex.jpg", "Volglazen karusselltür ATRIUM FLEX", "Porte tambour tout verre ATRIUM FLEX")
    ];
    o.KTC = [
      local("KTC 2", "ktc-2.jpg", "Grote karusselltür met geïntegreerde schuifdeur", "Porte tambour grande capacité avec porte coulissante intégrée")
    ];
    o.CS = [
      local("CS 80 MAGNEO", "cs-80-magneo.jpg", "Magneetschuifdeuraandrijving CS 80 MAGNEO", "Opérateur coulissant magnétique CS 80 MAGNEO")
    ];
    o.BST = [
      local("BST", "bst-fbst.jpg", "Bogenschuifdeur", "Porte coulissante cintrée"),
      local("FBST", "bst-fbst.jpg", "Vouw-bogenschuifdeur", "Porte coulissante cintrée pliante")
    ];
    return o;
  }
  var FAM = {
    KTV: { nl: "KTV · Karusselltür", fr: "KTV · Porte tambour" },
    KTC: { nl: "KTC · Karusselltür", fr: "KTC · Porte tambour" },
    CS: { nl: "CS · Schuifdeuraandrijving", fr: "CS · Opérateur coulissant" },
    BST: { nl: "BST · Bogenschuifdeur", fr: "BST · Porte coulissante cintrée" }
  };
  function famText(key) { var L = FAM[key]; return L ? (L[lang] || L.nl) : key; }
  function catalog() {
    OE.S = { lang: lang, line: line === "ESA" ? "ESA" : "ESC" };
    if (line === "ESA") return esaLight();
    if (line === "ESC") return OE.catalog();
    return {};
  }
  function modelSrc(m) {
    if (!m || !m.img) return "";
    if (m.local) return "img/" + m.img;
    return "../img/models/" + m.img + (/\.(jpe?g|png|webp)$/i.test(m.img) ? "" : ".jpg");
  }
  function descOf(m) {
    var d = (m && m.desc) || {};
    return typeof d === "string" ? d : (d[lang] || d.nl || d.en || "");
  }
  function exampleImg(fam) {
    var list = catalog()[fam] || [], i;
    for (i = 0; i < list.length; i++) if (list[i].img && !list[i].example) return list[i];
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
      return '<option value="' + esc(k) + '">' + esc(famText(k)) + "</option>";
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
    var shown = info && info.img ? info : null, example = !!(shown && shown.example);
    if (!shown && fam.value && fam.value !== OTHER) { shown = exampleImg(fam.value); example = !!shown; }
    var cap = shown ? esc(info && info.img ? info.id : famText(fam.value)) : "";
    $("prod").innerHTML = shown
      ? '<img id="prodImg" src="' + esc(modelSrc(shown)) + '" alt="' + cap + '"><figcaption>' + cap + (example ? ' <em class="ex">' + esc(L.example) + "</em>" : "") + (info && info.img && descOf(info) ? '<small class="desc" id="prodDesc">' + esc(descOf(info)) + "</small>" : "") + "</figcaption>"
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
