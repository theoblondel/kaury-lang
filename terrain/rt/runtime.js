import{$ as je,A as Z,Aa as x,B as ee,C as te,Ca as Fe,D as ne,Da as Oe,E as oe,Ea as Je,F as re,Fa as Qe,G as ie,H as ae,Ha as We,I as se,Ia as Ze,J as le,Ja as et,K as ce,Ka as tt,L as pe,La as nt,M as de,Ma as ot,N as me,Na as rt,O as ue,Oa as it,P as fe,Q as ke,R as ge,S as xe,T as y,U as he,V as be,W as ve,X as we,Y as ye,Z as p,_ as ze,a as w,aa as $e,b as f,ba as Ee,c as K,ca as Le,d as R,da as Se,e as T,ea as Ce,f as k,fa as Ke,g as P,ga as Re,h as q,ha as Te,i as M,ia as Pe,j as _,ja as qe,k as N,ka as Me,l as A,la as _e,m as X,ma as Ne,n as D,na as Ae,o as Y,oa as Xe,p as H,pa as De,q as I,qa as Ye,r as U,ra as z,s as B,sa as He,t as V,ta as Ie,u as G,ua as g,v as F,va as Ue,w as O,wa as Be,x as J,xa as Ve,y as Q,ya as Ge,z as W,za as d}from"./morceau-D3KE3N45.js";import"./morceau-3EGN5HYL.js";var b=null,h=null,j=null;function m(e,i){let o=i.replace(/\/index\.html$/,"/").replace(/(.)\/$/,"$1")||"/";for(let r of e){let a=r.chemin.replace(/(.)\/$/,"$1"),n=[],c=new RegExp("^"+a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/:([\p{L}_][\p{L}\p{N}_-]*)/gu,(l,u)=>(n.push(u),"([^/]+)"))+"$","u").exec(o);if(c){let l={};return n.forEach((u,C)=>l[u]=decodeURIComponent(c[C+1])),{page:r,params:l}}}let t=e.find(r=>r.chemin==="/404");return t?{page:t,params:{}}:null}function v(e,i,o){z(e.$pages.map(l=>l.chemin));let t=m(e.$pages,i);for(k(()=>{d.chemin=i,d.params=t?.params??{}}),j?.();o.firstChild;)o.removeChild(o.firstChild);if(!t){let l=document.createElement("main");return l.className="k-page k-introuvable",l.innerHTML=`<section class="k-section"><h1 class="k-titre">Page introuvable</h1><p class="k-texte"><a href="/">Retour \xE0 l'accueil</a></p></section>`,o.appendChild(l),{titre:`Page introuvable \xB7 ${e.$site.nom??""}`,trouvee:!1}}let[r,a]=f(()=>t.page.rendu({chemin:i,params:t.params}));j=a,o.appendChild(r),g(r);let n=t.page.seo??{},s=e.$site.nom;return{titre:n.titre?s&&n.titre!==s?`${n.titre} \xB7 ${s}`:n.titre:s??"Kaury",description:n.description??e.$site.seo?.description,image:n.image??e.$site.seo?.image,trouvee:!0}}function at(e,i="#app"){b=e,h=document.querySelector(i)??document.body,x();let o=v(e,location.pathname,h);document.title=o.titre,$(!1),document.addEventListener("click",t=>{let r=t.target?.closest?.("a");if(!r||t.defaultPrevented||t.button!==0||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey)return;let a=r.getAttribute("href");if(!a||r.target==="_blank"||r.hasAttribute("download"))return;let n=new URL(a,location.href);n.origin===location.origin&&(n.pathname===location.pathname&&n.hash||m(e.$pages,n.pathname)&&(t.preventDefault(),E(n.pathname+n.search+n.hash)))}),addEventListener("popstate",()=>L(location.pathname,!1))}function $(e){if(!location.hash)return;document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({behavior:e?"smooth":"auto"})}function E(e){if(p()){if(!b){location.href=e;return}history.pushState(null,"",e),L(new URL(e,location.href).pathname,!0)}}function L(e,i){let o=b,r=m(o.$pages,e)?.page.transition??o.$site.transition??"fondu",a=()=>{let s=v(o,e,h);document.title=s.titre;let c=document.querySelector('meta[name="description"]');c&&s.description&&c.setAttribute("content",s.description),location.hash?$(!1):i&&scrollTo({top:0})},n=document;r!=="aucune"&&n.startViewTransition&&!matchMedia("(prefers-reduced-motion: reduce)").matches?(document.documentElement.dataset.kTransition=r,n.startViewTransition(a)):a()}function st(e){p()&&e.titre&&(document.title=e.titre)}var lt=`
:root{
  --k-fond:#fcfbf8;--k-texte:#16151a;--k-encre:#16151a;--k-doux:#6b6a73;--k-ligne:rgba(20,20,30,.1);
  --k-accent:#16151a;--k-sur-accent:#fff;
  --k-police-secours:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --k-police:var(--k-police-secours);--k-police-titres:var(--k-police);
  --k-largeur:1180px;--k-marge:clamp(16px,5vw,64px);--k-section:clamp(56px,9vw,128px);
  --k-rayon:14px;--k-espace:20px;
  --k-ressort:cubic-bezier(.2,.7,.2,1);
  ${ct()}
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
body{margin:0;background:var(--k-fond);color:var(--k-texte);font-family:var(--k-police);font-size:clamp(16px,1.05vw + 12px,18px);line-height:1.6;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
img,video,canvas,svg{max-width:100%;display:block}
a{color:inherit}
button,input,select,textarea{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--k-accent);outline-offset:3px;border-radius:4px}
#app{min-height:100svh}

/* ---- page et sections ---- */
.k-page{display:flex;flex-direction:column;min-height:100svh;width:100%}
.k-section{position:relative;display:flex;flex-direction:column;gap:var(--k-espace);padding:var(--k-section) var(--k-marge);width:100%}
.k-section>*:not(.k-pleine){width:100%;max-width:var(--k-largeur);margin-inline:auto}
.k-section.k-section-entete,header.k-entete{flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;padding-block:16px;gap:16px 28px;max-width:none}
.k-section.k-section-entete>*,header.k-entete>*{width:auto;max-width:none;margin:0}
.k-section.k-section-entete>.k-liens{margin-left:auto}
.k-entete,.k-pied,.k-nav{display:flex;gap:var(--k-espace);padding:18px var(--k-marge);align-items:center;flex-wrap:wrap}
.k-pied{padding-block:40px;color:var(--k-doux);font-size:.92em;border-top:1px solid var(--k-ligne);justify-content:space-between}
.k-boite,.k-colonne{display:flex;flex-direction:column;gap:var(--k-espace)}
.k-ligne{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:var(--k-espace)}
.k-grille{display:grid;gap:var(--k-espace);grid-template-columns:repeat(var(--k-colonnes,3),minmax(0,1fr))}
@media (max-width:1024px){.k-grille[class]{grid-template-columns:repeat(min(var(--k-colonnes,3),2),minmax(0,1fr))}}
@media (max-width:640px){.k-grille[class]{grid-template-columns:1fr}}

/* ---- textes ---- */
.k-titre,.k-sous-titre,h1,h2,h3{font-family:var(--k-police-titres);line-height:1.05;letter-spacing:-.02em;margin:0;text-wrap:balance}
.k-titre{font-size:clamp(40px,6vw,76px);font-weight:700}
h2.k-titre,.k-sous-titre{font-size:clamp(28px,3.4vw,44px);font-weight:650}
h3.k-titre{font-size:clamp(22px,2.2vw,30px)}
.k-texte{margin:0;max-width:68ch;text-wrap:pretty}
.k-section>.k-texte{margin-inline:auto}
[style*="text-align:center"]>.k-texte,.k-texte[class*="-"]{max-width:none}
.k-icone{font-size:1.6em;line-height:1}
.k-liste{margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:.4em}
.k-separateur{border:0;border-top:1px solid var(--k-ligne);margin:8px 0;width:100%}

/* ---- liens et menu ---- */
.k-lien{text-decoration:underline;text-underline-offset:.2em;text-decoration-thickness:1px}
.k-liens{display:flex;gap:clamp(14px,2.5vw,32px);flex-wrap:wrap;align-items:center}
.k-lien-nav{text-decoration:none;font-weight:500;position:relative;padding:4px 0}
.k-lien-nav::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .35s var(--k-ressort)}
.k-lien-nav:hover::after{transform:scaleX(1)}
.k-logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;font-weight:700;font-size:1.25em;letter-spacing:-.02em}
.k-logo-image{height:40px;width:auto}
@media (max-width:640px){.k-liens{gap:14px;font-size:.95em}}

/* ---- boutons ---- */
.k-bouton{display:inline-flex;align-items:center;justify-content:center;gap:.5em;width:fit-content;padding:.85em 1.5em;border:0;border-radius:999px;background:var(--k-accent);color:var(--k-sur-accent);font-weight:600;text-decoration:none;cursor:pointer;transition:transform .3s var(--k-ressort),box-shadow .3s,background .3s,opacity .3s;box-shadow:0 8px 20px -10px color-mix(in srgb,var(--k-accent) 70%,transparent)}
.k-bouton:hover{transform:translateY(-2px);box-shadow:0 14px 28px -12px color-mix(in srgb,var(--k-accent) 75%,transparent)}
.k-bouton:active{transform:translateY(0) scale(.98)}
.k-bouton:disabled{opacity:.45;cursor:not-allowed;transform:none}
.k-section>.k-bouton{margin-inline:0}
.k-contour{background:transparent;color:inherit;box-shadow:inset 0 0 0 1.5px currentColor}
.k-discret{background:transparent;color:inherit;box-shadow:none;padding-inline:.4em}
.k-grand{font-size:1.15em;padding:1em 1.9em}
.k-petit{font-size:.88em;padding:.55em 1.1em}
.k-cliquable{cursor:pointer}

/* ---- cartes, images ---- */
.k-carte{display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:var(--k-rayon);background:color-mix(in srgb,var(--k-fond) 70%,#fff);border:1px solid var(--k-ligne);transition:transform .4s var(--k-ressort),box-shadow .4s}
.k-carte-image{width:calc(100% + 36px);margin:-18px -18px 4px;aspect-ratio:4/3;object-fit:cover;max-width:none}
.k-carte-titre{font-size:1.2em;font-weight:650}
.k-carte-texte{margin:0;color:var(--k-doux)}
.k-image{height:auto;border-radius:calc(var(--k-rayon) * .6)}
.k-couvre{width:100%;height:100%;object-fit:cover}
.k-video{width:100%;border-radius:var(--k-rayon)}

/* ---- formulaires ---- */
.k-formulaire{display:flex;flex-direction:column;gap:14px;max-width:560px}
.k-champ,.k-zone,.k-choix{width:100%;padding:.8em 1em;border:1.5px solid var(--k-ligne);border-radius:12px;background:color-mix(in srgb,var(--k-fond) 60%,#fff);transition:border-color .2s,box-shadow .2s}
.k-champ:focus,.k-zone:focus,.k-choix:focus{outline:none;border-color:var(--k-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--k-accent) 18%,transparent)}
.k-verifie .k-champ:invalid,.k-verifie .k-zone:invalid{border-color:#e5484d}
.k-zone{min-height:120px;resize:vertical}
.k-etiquette{display:flex;flex-direction:column;gap:6px;font-weight:550;font-size:.95em}
.k-etiquette-case{flex-direction:row;align-items:center;gap:10px;font-weight:450;cursor:pointer}
.k-case{width:20px;height:20px;accent-color:var(--k-accent)}

/* ---- responsive ---- */
.k-seul-mobile,.k-seul-tablette{display:none}
@media (max-width:640px){.k-seul-mobile{display:contents}.k-seul-ordinateur{display:none}}
@media (min-width:641px) and (max-width:1024px){.k-seul-tablette{display:contents}}@media (max-width:1024px){.k-seul-ordinateur{display:none}}

/* ---- apparitions ---- */
.k-entre{transition:opacity .9s var(--k-ressort),transform .9s var(--k-ressort),filter .9s;will-change:transform,opacity}
.k-entre:not(.k-vu){opacity:0}
.k-entre-gauche:not(.k-vu){transform:translateX(-60px)}
.k-entre-droite:not(.k-vu){transform:translateX(60px)}
.k-entre-bas:not(.k-vu){transform:translateY(50px)}
.k-entre-haut:not(.k-vu){transform:translateY(-50px)}
.k-entre-zoom:not(.k-vu){transform:scale(.85)}
.k-entre-fondu:not(.k-vu){filter:blur(6px)}
@keyframes k-fondu{from{opacity:0}}
@keyframes k-monte{from{opacity:0;transform:translateY(30px)}}
@keyframes k-zoom{from{opacity:0;transform:scale(.9)}}
@keyframes k-gauche{from{opacity:0;transform:translateX(-40px)}}
@keyframes k-droite{from{opacity:0;transform:translateX(40px)}}
html:not(.k-js) .k-entre{opacity:1;transform:none;filter:none}

/* ---- immersion ---- */
.k-scene{position:relative;width:100%;min-height:clamp(320px,60vh,720px);overflow:hidden;border-radius:inherit;isolation:isolate;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--k-espace);padding:var(--k-marge);text-align:center}
.k-scene>.k-titre,.k-scene>.k-texte,.k-scene>.k-sous-titre{pointer-events:none}
.k-section>.k-scene{max-width:none}
.k-scene>canvas.k-toile{position:absolute;inset:0;width:100%!important;height:100%!important;z-index:0}
.k-scene>.k-objet:not(.k-3d){position:absolute;z-index:1;left:50%;top:50%;translate:-50% -50%;width:calc(var(--k-taille,1) * clamp(120px,22vw,280px))}
.k-scene>.k-objet.k-3d{position:absolute;inset:0;pointer-events:none;width:0;height:0}
.k-scene>:not(.k-objet):not(canvas):not(.k-bulle):not(.k-son){position:relative;z-index:2}
.k-objet{position:relative}
.k-objet.k-3d:not(.k-scene>.k-objet){width:100%;height:clamp(300px,55vh,640px);touch-action:pan-y}
.k-objet>canvas{width:100%!important;height:100%!important;display:block}
.k-objet-image{width:100%;height:auto;user-select:none;-webkit-user-drag:none}
.k-objet:not(.k-3d){width:calc(var(--k-taille,1) * clamp(140px,26vw,320px));margin-inline:auto}
.k-section>.k-objet:not(.k-3d){width:calc(var(--k-taille,1) * clamp(140px,26vw,320px))}
.k-lottie{aspect-ratio:1}
.k-secours{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transition:opacity .6s}
.k-objet.k-pret>.k-secours{opacity:0}
.k-objet.k-3d:not(.k-pret)::after{content:"";position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px;border-radius:50%;border:3px solid color-mix(in srgb,var(--k-texte) 15%,transparent);border-top-color:var(--k-accent);animation:k-tourne .9s linear infinite}
.k-objet.k-3d:has(.k-secours):not(.k-pret)::after{display:none}
@keyframes k-tourne{to{transform:rotate(360deg)}}
.k-place{position:absolute!important;translate:-50% -50%}
.k-bulle{position:absolute;left:50%;bottom:100%;translate:-50% -10px;z-index:20;max-width:min(280px,80vw);width:max-content;padding:10px 16px;border-radius:18px;background:#fff;color:#16151a;font-weight:550;font-size:15px;line-height:1.35;box-shadow:0 12px 30px -12px rgba(0,0,0,.35);opacity:0;scale:.85;transform-origin:50% 100%;transition:opacity .25s,scale .35s var(--k-ressort);pointer-events:none}
.k-bulle::after{content:"";position:absolute;left:50%;top:100%;margin-left:-8px;border:8px solid transparent;border-top-color:#fff}
.k-bulle-visible{opacity:1;scale:1}
.k-bulle.k-bulle-3d{left:0;top:0;bottom:auto;translate:-50% calc(-100% - 14px)}
.k-muet{position:fixed;right:18px;bottom:18px;z-index:100;width:44px;height:44px;border-radius:50%;border:0;background:color-mix(in srgb,var(--k-fond) 80%,transparent);backdrop-filter:blur(10px);box-shadow:0 6px 20px -8px rgba(0,0,0,.4);cursor:pointer;font-size:18px}

/* ---- transitions entre pages ---- */
::view-transition-old(root),::view-transition-new(root){animation-duration:.45s;animation-timing-function:var(--k-ressort)}
[data-k-transition=glisse]::view-transition-old(root){animation-name:k-sort-gauche}
[data-k-transition=glisse]::view-transition-new(root){animation-name:k-entre-droite}
[data-k-transition=zoom]::view-transition-new(root){animation-name:k-zoom}
[data-k-transition=rideau]::view-transition-new(root){animation-name:k-rideau}
@keyframes k-sort-gauche{to{transform:translateX(-30%);opacity:0}}
@keyframes k-entre-droite{from{transform:translateX(30%);opacity:0}}
@keyframes k-rideau{from{clip-path:inset(0 0 100% 0)}}

/* ---- erreurs (d\xE9veloppement) ---- */
.k-erreur-dev{position:fixed;inset:auto 16px 16px 16px;z-index:99999;max-height:60vh;overflow:auto;padding:18px 20px;border-radius:14px;background:#1b1020;color:#ffe3ea;font:14px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;box-shadow:0 20px 50px -20px rgba(0,0,0,.6);border:1px solid #ff4f8b}
.k-erreur-dev b{color:#ff8fb3}
`;function ct(){return Object.entries({rouge:"#e5484d",orange:"#f76b15",jaune:"#ffc53d",vert:"#30a46c",bleu:"#0090ff",violet:"#8e4ec6",rose:"#e93d82",noir:"#111111",blanc:"#ffffff",gris:"#8b8d98",creme:"#fff4e8",beige:"#efe3cf",marron:"#8a5a3b",turquoise:"#12a594",or:"#d4a72c",argent:"#c0c4cc",marine:"#14213d",corail:"#ff7f61",menthe:"#7fe0c0",lavande:"#b9a6ef",ciel:"#7cc4fa",sable:"#e9d8b4",ardoise:"#3c4454",nuit:"#0b1020"}).map(([i,o])=>`--k-${i}:${o};`).join("")}function S(e){let i=e instanceof Error?e.message:String(e);if(console.error("Kaury :",e),globalThis.__kauryDev&&typeof document<"u"&&document.body){let t=document.querySelector(".k-erreur-dev");t||(t=document.createElement("div"),t.className="k-erreur-dev",t.addEventListener("click",()=>t.remove()),document.body.append(t)),t.innerHTML=`<b>Erreur pendant l'ex\xE9cution</b>
${i.replace(/</g,"&lt;")}

<small>(clique pour fermer)</small>`}}w(S);y(S);export{M as Cellule,_ as Derive,Y as ErreurReseau,lt as STYLE_DE_BASE,Q as absolu,Je as action,D as affiche,Z as aleatoire,E as aller,F as arrondi,Le as attr,K as auNettoyage,P as brut,Ue as carte,H as charge,Ce as chemin,_e as classeRacine,qe as composant,ye as confettis,Me as contenu,fe as copie,Fe as corpsDe,be as dans,ge as defile,Ve as defilement,pe as delai,at as demarre,x as demarreGlobaux,A as derive,Qe as dit,Ge as ecran,R as effet,he as egal,ce as enListe,re as enNombre,oe as enTexte,I as envoie,p as estNavigateur,N as etat,De as etiquette,ae as formatDate,Ye as formulaire,je as fragment,ze as h,ee as hasard,le as intervalle,it as joueSon,Ne as lie,Ae as lieCase,He as lienAuto,te as longueur,k as lot,we as m,ne as maintenant,G as maximum,se as melange,ue as memorise,V as minimum,Oe as mouvement,B as moyenne,et as objet,Ze as objetNomme,We as objets,Xe as options,xe as partage,J as plafond,O as plancher,me as plusTard,Pe as pour,ie as prix,ve as prop,Ke as px,f as racine,W as racineCarree,q as reactif,ot as reglage,v as rendsPage,de as repete,g as resousLiens,d as route,T as sansSuivi,tt as scene,nt as scenePrete,st as seo,Te as si,S as signale,Ie as slug,U as somme,rt as son,Be as souris,Se as style,Re as sur,X as t,Ee as texte,m as trouvePage,$e as unique,ke as vibre};
