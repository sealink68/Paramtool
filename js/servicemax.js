"use strict";
// On-device parsing of ServiceMax Go screenshot text (NL + FR). No network.
(function(root){
var LABELS={
nl:{
 scan:"Screenshot ServiceMax inlezen",
 scanSub:"De foto blijft op je toestel",
 review:"Gegevens controleren",
 reviewSub:"Pas aan indien de herkenning iets verkeerd las",
 take:"Overnemen",
 back:"Terug",
 reading:"Screenshot lezen…",
 loading:"Herkenning laden…",
 fail:"Lezen mislukt. De foto blijft op je toestel. Controleer je verbinding (alleen de herkenningstaal wordt gedownload) en probeer opnieuw.",
 imgfail:"Deze foto kan niet gelezen worden. Kies een gewone afbeelding (JPEG of PNG).",
 took:"Gegevens overgenomen. Kies je taal.",
 head:"Klantgegevens",
 wo:"Werkordernummer",
 account:"Account",
 adres:"Adres",
 contact:"Contact",
 product:"Geïnstalleerd product"},
fr:{
 scan:"Lire capture ServiceMax",
 scanSub:"La photo reste sur votre appareil",
 review:"Vérifier les données",
 reviewSub:"Corrigez si la reconnaissance s'est trompée",
 take:"Reprendre",
 back:"Retour",
 reading:"Lecture de la capture…",
 loading:"Chargement de la reconnaissance…",
 fail:"Lecture impossible. La photo reste sur votre appareil. Vérifiez la connexion (seule la langue de reconnaissance est téléchargée) et réessayez.",
 imgfail:"Cette photo ne peut pas être lue. Choisissez une image classique (JPEG ou PNG).",
 took:"Données reprises. Choisissez votre langue.",
 head:"Données client",
 wo:"Numéro d'ordre de travail",
 account:"Compte",
 adres:"Adresse",
 contact:"Contact",
 product:"Produit installé"}};

function fold(s){
 return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9+]+/g," ").replace(/\s+/g," ").trim()}
function foldLabel(s){return fold(s).replace(/0/g,"o").replace(/1/g,"l")}
function cleanLine(s){
 return String(s||"").replace(/[ \t]+/g," ").replace(/\s*[›>»]+\s*$/,"").trim()}
function linesOf(text){
 return String(text||"").replace(/\r/g,"").split("\n").map(cleanLine).filter(Boolean)}
function blank(){return {wo:"",account:"",adres:"",contact:"",product:""}}

function normWO(s){
 var t=String(s||"");
 var test=t.match(/w[o0]\s*[-–—]?\s*test\s*[-–—]?\s*(\d{3,8})/i);
 if(test) return "WO-TEST"+test[1];
 var m=t.match(/w[o0]\s*[-–—]?\s*(\d{8})/i);
 return m?"WO-"+m[1]:""}
function normProduct(line){
 var s=cleanLine(line);
 if(!s) return "";
 var m=s.match(/^[Il1|]\s*[Pp]\s*[-–—.:]?\s*(\d{5,10})\s*(.*)$/)||s.match(/\b[Il1]\s*[Pp]\s*[-–—.:]?\s*(\d{5,10})\s*(.*)$/);
 if(!m) return s;
 var rest=(m[2]||"").replace(/^[\s.:_\-]+/,"");
 if(rest.charAt(0)==="|"||rest.charAt(0)==="l"||rest.charAt(0)==="1") rest=rest.slice(1).replace(/^[\s.:_\-]+/,"");
 rest=rest.replace(/\s+/g," ").trim();
 return rest?"IP-"+m[1]+"|"+rest:"IP-"+m[1]}
function isPhone(line){
 var t=cleanLine(line);
 if(!t) return false;
 var digits=t.replace(/\D/g,"");
 return digits.length>=8&&digits.length<=15&&/^[+0(]/.test(t)&&!/\d[/.-]\d/.test(t)}
function normPhone(line){
 var t=cleanLine(line).replace(/[.\s()\-]/g,"");
 if(t.indexOf("00")===0&&t.length>10) t="+"+t.slice(2);
 return t}
function splitPhone(line){
 var m=cleanLine(line).match(/^(.*?)(\+?\d[\d\s().-]{7,}\d)\s*$/);
 if(!m) return null;
 var digits=m[2].replace(/\D/g,"");
 if(digits.length<8||digits.length>15) return null;
 if(!/^[+0(]/.test(m[2].trim())&&m[1].trim()){
  // phone stuck to a name still counts when enough digits follow a plus or the name
  if(m[2].trim().charAt(0)!=="+"&&!/^0/.test(m[2].trim())) return null}
 return {name:m[1].replace(/[,\-]\s*$/,"").trim(),phone:normPhone(m[2])}}
function isDateLine(line){return /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/.test(line)}

function isRouteLabel(line){
 var k=foldLabel(line);
 if(!/routebeschrij|itineraire/.test(k)) return false;
 return /routebeschrij/.test(k)||/^obtenir\b/.test(k)||/^itineraire\b/.test(k)}
function isWOLabel(line){
 var k=foldLabel(line);
 return /werkorder/.test(k)||/ordre de travail/.test(k)||/work order/.test(k)}
function isProductLabel(line){
 var head=foldLabel(line).slice(0,48);
 if(/^produit\b/.test(head)&&/install/.test(head)) return true;
 if(/^ge/.test(head)&&/nstall/.test(head)&&/\bproduct\b/.test(head)) return true;
 return false}
function squeeze(s){return foldLabel(s).replace(/ /g,"")}
function isBlockedAccount(line){
 var s=squeeze(line);
 return /^(account|compte)/.test(s)&&/blok|bloq|block/.test(s)}
// UI labels are "Account" / "Compte". An all-caps value such as "COMPTE TEST SA" is not a label.
function looksLikeAccountLabelLine(line){
 var m=String(line).trim().match(/^(account|compte)\b/i);
 if(!m) return false;
 return m[1]!==m[1].toUpperCase()}
function isStructuralLabel(line){
 var k=foldLabel(line);
 if(!k) return false;
 if(isRouteLabel(line)||isWOLabel(line)||isProductLabel(line)||isBlockedAccount(line)) return true;
 if(squeeze(line)==="account"||squeeze(line)==="compte") return true;
 if(/^(onderwerp|objet|subject|sujet)$/.test(k)) return true;
 if(/^(locatie|emplacement|lieu|location|site)$/.test(k)) return true;
 if(/^(serviceplan|plan de service)$/.test(k)) return true;
 if((/starttijd|geprefereerde|heure de debut|heure preferee/.test(k))&&k.length<48) return true;
 if(/^(afspraak|rendez vous|agenda|verkennen|meldingen|meer|explorer|notifications|plus)$/.test(k)) return true;
 return false}
function isKnownLabel(line){
 if(isStructuralLabel(line)) return true;
 if(looksLikeAccountLabelLine(line)) return true;
 return false}
function routeRest(line){
 var m=String(line).match(/^(?:routebeschrijving\s+ophalen|obtenir\s+l['’]?\s*itin[eéèê]raire)\s*[:\-]?\s*(.*)$/i);
 return m?(m[1]||"").trim():""}
function productRest(line){
 var m=String(line).match(/^(?:ge[iï]?nstall[a-zà-ÿ]*\s+product|produit\s+install[a-zà-ÿ]*)\s*[:\-]?\s*(.*)$/i);
 return m?(m[1]||"").trim():""}
function takeUntilLabel(lines,start,max){
 var out=[],i;
 for(i=start;i<lines.length&&out.length<max;i++){
  if(isKnownLabel(lines[i])||isPhone(lines[i])||isDateLine(lines[i])) break;
  out.push(lines[i])}
 return out.join(" ").replace(/\s+/g," ").trim()}

function extractWO(lines){
 var i,w,nxt;
 for(i=0;i<lines.length;i++){
  if(!isWOLabel(lines[i])) continue;
  w=normWO(lines[i]);
  nxt=lines[i+1]&&!isKnownLabel(lines[i+1])?normWO(lines[i+1]):"";
  if(nxt||w) return nxt||w}
 for(i=0;i<lines.length;i++){w=normWO(lines[i]);if(w) return w}
 return ""}
function extractAccount(lines){
 var i,k,v,m;
 for(i=0;i<lines.length;i++){
  if(isBlockedAccount(lines[i])) continue;
  k=squeeze(lines[i]);
  if(k==="account"||k==="compte"){
   v=lines[i+1]||"";
   if(v&&!isStructuralLabel(v)&&!isBlockedAccount(v)) return v;
   continue}
  if(!looksLikeAccountLabelLine(lines[i])) continue;
  m=lines[i].match(/^(account|compte)\b\s*[:\-]?\s+(.+)$/i);
  if(m&&!/blok|bloq|block/i.test(m[2])) return cleanLine(m[2])}
 return ""}
function extractAddress(lines){
 var i,rest,more;
 for(i=0;i<lines.length;i++){
  if(!isRouteLabel(lines[i])) continue;
  rest=routeRest(lines[i]);
  more=takeUntilLabel(lines,i+1,rest?2:3);
  return (rest+" "+more).replace(/\s+/g," ").trim()}
 return ""}
function extractProduct(lines){
 var i,rest,raw,idx,nxt;
 for(i=0;i<lines.length;i++){
  if(!isProductLabel(lines[i])) continue;
  rest=productRest(lines[i]);
  if(rest&&rest.length<3&&!/\d/.test(rest)) rest="";
  idx=i;raw=rest;
  if(!raw){
   nxt=lines[i+1]||"";
   if(nxt&&!isKnownLabel(nxt)){raw=nxt;idx=i+1}}
  return {product:normProduct(raw),after:idx+1}}
 return {product:"",after:-1}}
function extractContact(lines,start){
 if(start<0||start>=lines.length) return "";
 if(isKnownLabel(lines[start])||isDateLine(lines[start])) return "";
 var name=lines[start],phone="",sp=splitPhone(name),nxt;
 if(sp){name=sp.name;phone=sp.phone}
 else if(isPhone(name)){phone=normPhone(name);name=""}
 else{
  nxt=lines[start+1]||"";
  if(isPhone(nxt)) phone=normPhone(nxt)}
 name=name.replace(/\s+/g," ").trim();
 if(name&&phone) return name+" "+phone;
 return name||phone}

function parse(text){
 var lines=linesOf(text),out=blank(),prod=extractProduct(lines);
 out.wo=extractWO(lines);
 out.account=extractAccount(lines);
 out.adres=extractAddress(lines);
 out.product=prod.product;
 out.contact=extractContact(lines,prod.after);
 return out}

function lev(a,b){
 if(a===b) return 0;
 if(!a.length) return b.length;
 if(!b.length) return a.length;
 var prev=[],j,i,cur,c;
 for(j=0;j<=b.length;j++) prev[j]=j;
 for(i=1;i<=a.length;i++){
  cur=[i];
  for(j=1;j<=b.length;j++){
   c=a.charCodeAt(i-1)===b.charCodeAt(j-1)?0:1;
   cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+c)}
  prev=cur}
 return prev[b.length]}
function similar(a,b){
 var x=fold(a),y=fold(b),d,m;
 if(!x||!y) return false;
 if(x===y) return true;
 d=lev(x,y);m=Math.max(x.length,y.length);
 return m>0&&(1-d/m)>=0.84}
function merge(texts){
 var acc=[],t,lines,best,max,n,i,ok;
 for(t=0;t<texts.length;t++){
  lines=linesOf(texts[t]);
  if(!acc.length){acc=lines.slice();continue}
  best=0;max=Math.min(acc.length,lines.length);
  for(n=max;n>=1;n--){
   ok=true;
   for(i=0;i<n;i++) if(!similar(acc[acc.length-n+i],lines[i])){ok=false;break}
   if(!ok) continue;
   if(n>=2||fold(lines[0]).length>=14){best=n;break}}
  acc=acc.concat(lines.slice(best))}
 return acc.join("\n")}

var VERSION="v2026.11.04-2";
// Filename / URL-name only. The form, report and clipboard keep the original text.
function fileName(value){
 var s=String(value==null?"":value);
 s=s.replace(/[\u0000-\u001f\u007f]/g,"_");
 s=s.replace(/[|\\/:*?"<>]/g,"_");
 s=s.replace(/_+/g,"_");
 s=s.replace(/^[\s._]+|[\s._]+$/g,"");
 return s}
function isWorkOrder(s){
 return /^WO-(?:TEST\d{3,8}|\d{8})$/i.test(String(s||"").replace(/\s+/g,"").trim())}
// Question 1 is the installed product. A bare work-order number is never a dossier value.
function dossierFrom(client){
 var p=String(client&&client.product||"").replace(/\s+/g," ").trim();
 if(!p||isWorkOrder(p)) return "";
 return p}
// Restore: a stored WO (from the previous auto-fill) yields the product, or stays empty.
// A hand-typed value that is not a work order is kept.
function q1OnLoad(stored,client){
 var cur=String(stored||"").replace(/\s+/g," ").trim();
 var product=dossierFrom(client);
 if(isWorkOrder(cur)||!cur) return product;
 return cur}
function formatBlock(lang,client){
 var L=LABELS[lang]||LABELS.nl,keys=["wo","account","adres","contact","product"],lines=[],i,v;
 for(i=0;i<keys.length;i++){
  v=client&&client[keys[i]];
  if(v&&String(v).trim()) lines.push(L[keys[i]]+": "+String(v).trim())}
 if(!lines.length) return "";
 return L.head+"\n"+lines.join("\n")+"\n\n"}

root.ServiceMax={
 parse:parse,
 merge:merge,
 lines:linesOf,
 blank:blank,
 formatBlock:formatBlock,
 dossierFrom:dossierFrom,
 fileName:fileName,
 q1OnLoad:q1OnLoad,
 isWorkOrder:isWorkOrder,
 version:VERSION,
 labels:LABELS,
 normWO:normWO,
 normProduct:normProduct};
})(typeof window!=="undefined"?window:globalThis);
