import{$ as j,A as re,Aa as Ze,B as se,Ba as et,C as le,Ca as $,D as ce,Da as tt,E as pe,Ea as nt,F as de,Fa as ot,G as me,Ga as at,H as ke,Ha as it,I as fe,Ia as b,J as ue,K as ge,Ka as R,L as xe,La as rt,M as he,Ma as st,N as be,Na as lt,O as ve,Oa as ct,P as we,Q as ye,Qa as pt,R as ze,Ra as dt,S as je,Sa as mt,T as Ce,Ta as kt,U as $e,Ua as ft,V as M,Va as ut,W as Re,Wa as gt,X as Se,Xa as xt,Y as Ee,Z as Le,_ as Pe,a as w,aa as u,b as P,ba as O,c as x,ca as C,d as B,da as K,e as H,ea as Me,f as q,fa as Oe,g as f,ga as Ke,h as y,ha as Te,i as h,ia as Ie,j as A,ja as Ne,k as D,ka as Ye,l as J,la as Xe,m as U,ma as _e,n as z,na as Be,o as F,oa as He,p as G,pa as qe,q as W,qa as Ae,r as Q,ra as De,s as V,sa as Je,t as Z,ta as Ue,u as ee,ua as Fe,v as te,va as Ge,w as ne,wa as We,x as oe,xa as Qe,y as ae,ya as Ve,z as ie,za as T}from"./chunk-56UMDBPN.js";import{e as p}from"./chunk-MNURLQ2V.js";p();p();var S=new Set,I=Symbol("kaury.items");function ht(e,a){return typeof a!="object"||a===null?a:new Proxy(a,{get(t,o,n){return o===I?t:(typeof o!="symbol"&&S.add(e),Reflect.get(t,o,n))}})}function v(e){return(e&&e[I])??y(e)??[]}function L(){let e=[...S];return S.clear(),e}function bt(e,a,t){let o=typeof document<"u"?document.getElementById("k-data-"+e):null;if(o?.textContent)try{return h(JSON.parse(o.textContent))}catch{}let n=h(t?[]:{});return fetch(a).then(i=>i.json()).then(i=>f(()=>{t?n.push(...i):Object.assign(n,i)})).catch(i=>console.error(`Kaury: cannot load the content "${a}".`,i)),n}p();var m=null,g=e=>e.replace(/\/index\.html$/,"/").replace(/(.)\/$/,"$1")||"/";function N(e){let a=[];for(let t of e.$pages)if(t.each&&t.pathOf)for(let o of v(t.each()))a.push(g(t.pathOf(o)));else a.push(t.path);return a}function Y(e,a){let t=g(a);for(let n of e){if(n.each&&n.pathOf){let l=typeof document<"u"&&u()?document.getElementById("k-item"):null;if(l?.textContent&&n.path===l.dataset.kPath){let r=JSON.parse(l.textContent);if(g(n.pathOf(r))===t)return{page:n,params:{},item:r}}for(let r of v(n.each()))if(g(n.pathOf(r))===t)return{page:n,params:{},item:r};continue}let i=[],d=new RegExp("^"+g(n.path).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/:([\p{L}_][\p{L}\p{N}_-]*)/gu,(l,r)=>(i.push(r),"([^/]+)"))+"$","u").exec(t);if(d){let l={};return i.forEach((r,c)=>l[r]=decodeURIComponent(d[c+1])),{page:n,params:l}}}let o=e.find(n=>n.path==="/404");return o?{page:o,params:{}}:null}function X(e,a,t,o=!1){T(N(e)),z(e.$site.lang);let n=Y(e.$pages,a);f(()=>{b.path=a,b.params=n?.params??{}}),m?.(),m=null;let i=e.$site.name;if(!n){for(;t.firstChild;)t.removeChild(t.firstChild);let s=document.createElement("main");return s.className="k-page k-not-found",s.innerHTML='<section class="k-section"><h1 class="k-title">Page not found</h1><p class="k-text"><a href="/">Back to the home page</a></p></section>',t.appendChild(s),{title:`Page not found \xB7 ${i??""}`,found:!1,hydrated:!1,dynamic:!1,collections:[]}}let k={path:a,params:n.params,item:n.item};w(),L();let d=!1;if(o&&t.firstChild){t.$kNext=void 0,C(!0);try{let[,s]=x(()=>{n.page.render(k,t),K()});m=s,d=!0}catch(s){m?.(),m=null,s instanceof O||console.error(s)}finally{C(!1)}}if(!d){for(;t.firstChild;)t.removeChild(t.firstChild);let[,s]=x(()=>n.page.render(k,t));m=s}let l=w(),r=L();$(t);let c=n.page.seo?.(k)??{};return{title:c.title?i&&c.title!==i?`${c.title} \xB7 ${i}`:c.title:i??"Kaury",description:c.description??e.$site.seo?.description,image:c.image??e.$site.seo?.image,lang:n.page.lang?.(k)??void 0,found:!0,hydrated:d,dynamic:l,collections:r,item:n.item,pattern:n.page.path}}function vt(e,a="#app"){let t=document.querySelector(a)??document.body,o=document.documentElement;if(e.$site.transition&&(o.dataset.kTransition=e.$site.transition),R(),o.dataset.kPage==="static")o.dataset.kRender="static";else{let n=X(e,location.pathname,t,t.firstChild!==null);o.dataset.kRender=n.hydrated?"hydrated":"rendered",(!t.firstChild||!n.found)&&(document.title=n.title)}j()}function wt(e){u()&&(location.href=e)}function yt(e){u()&&e.title&&(document.title=e.title)}p();var zt=`
:root{
  --k-bg:#fcfbf8;--k-text:#16151a;--k-ink:#16151a;--k-muted:#5f5e66;--k-line:rgba(20,20,30,.12);
  --k-accent:#16151a;--k-on-accent:#fff;
  --k-font-fallback:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --k-font:var(--k-font-fallback);--k-font-titles:var(--k-font);
  --k-width:1180px;--k-gutter:clamp(16px,5vw,64px);--k-section:clamp(56px,9vw,128px);
  --k-radius:14px;--k-gap:20px;
  --k-ease:cubic-bezier(.2,.7,.2,1);
  ${jt()}
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
body{margin:0;background:var(--k-bg);color:var(--k-text);font-family:var(--k-font);font-size:clamp(16px,1.05vw + 12px,18px);line-height:1.6;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
img,video,canvas,svg{max-width:100%;display:block}
img{height:auto}
a{color:inherit}
button,input,select,textarea{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--k-accent);outline-offset:3px;border-radius:4px}
#app{min-height:100svh}

/* ---- page and sections ---- */
.k-page{display:flex;flex-direction:column;min-height:100svh;width:100%}
.k-section{position:relative;display:flex;flex-direction:column;gap:var(--k-gap);padding:var(--k-section) var(--k-gutter);width:100%}
.k-section>*:not(.k-full){width:100%;max-width:var(--k-width);margin-inline:auto}
.k-section.k-section-header,header.k-header{flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;padding-block:16px;gap:16px 28px;max-width:none}
.k-section.k-section-header>*,header.k-header>*{width:auto;max-width:none;margin:0}
.k-section.k-section-header>.k-links,header.k-header>.k-links{margin-left:auto}
.k-header,.k-footer,.k-nav{display:flex;gap:var(--k-gap);padding:18px var(--k-gutter);align-items:center;flex-wrap:wrap;position:relative}
.k-footer{padding-block:40px;color:var(--k-muted);font-size:.92em;border-top:1px solid var(--k-line);justify-content:space-between}
.k-box,.k-column{display:flex;flex-direction:column;gap:var(--k-gap)}
.k-row{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:var(--k-gap)}
.k-grid{display:grid;gap:var(--k-gap);grid-template-columns:repeat(var(--k-columns,3),minmax(0,1fr))}
@media (max-width:1024px){.k-grid[class]{grid-template-columns:repeat(min(var(--k-columns,3),2),minmax(0,1fr))}}
@media (max-width:640px){.k-grid[class]{grid-template-columns:1fr}}

/* ---- texts ---- */
.k-title,.k-subtitle,h1,h2,h3{font-family:var(--k-font-titles);line-height:1.05;letter-spacing:-.02em;margin:0;text-wrap:balance}
.k-title{font-size:clamp(40px,6vw,76px);font-weight:700}
h2.k-title,.k-subtitle{font-size:clamp(28px,3.4vw,44px);font-weight:650}
h3.k-title{font-size:clamp(22px,2.2vw,30px)}
.k-text{margin:0;max-width:68ch;text-wrap:pretty}
.k-section>.k-text{margin-inline:auto}
.k-icon{font-size:1.6em;line-height:1}
.k-list{margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:.4em}
.k-divider{border:0;border-top:1px solid var(--k-line);margin:8px 0;width:100%}

/* ---- rich text (markdown) ---- */
.k-markdown{max-width:72ch;display:flex;flex-direction:column;gap:.9em}
.k-section>.k-markdown{margin-inline:auto}
.k-markdown>*{margin:0}
.k-markdown h2{font-size:clamp(24px,2.6vw,34px);margin-top:.8em}
.k-markdown h3{font-size:clamp(20px,2vw,26px);margin-top:.6em}
.k-markdown a{text-decoration:underline;text-underline-offset:.2em}
.k-markdown ul,.k-markdown ol{padding-left:1.3em;display:flex;flex-direction:column;gap:.35em}
.k-markdown blockquote{border-left:3px solid var(--k-accent);padding-left:1em;color:var(--k-muted)}
.k-markdown img{border-radius:var(--k-radius)}
.k-markdown table{border-collapse:collapse;width:100%;font-size:.95em}
.k-markdown th,.k-markdown td{border-bottom:1px solid var(--k-line);padding:.5em .6em;text-align:left}
.k-markdown code{font-family:ui-monospace,Consolas,monospace;font-size:.9em;background:color-mix(in srgb,var(--k-text) 8%,transparent);padding:.1em .35em;border-radius:6px}

/* ---- links and menu ---- */
.k-link{text-decoration:underline;text-underline-offset:.2em;text-decoration-thickness:1px}
.k-links{display:flex;gap:clamp(14px,2.5vw,32px);flex-wrap:wrap;align-items:center}
.k-nav-link{text-decoration:none;font-weight:500;position:relative;padding:4px 0}
.k-nav-link::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .35s var(--k-ease)}
.k-nav-link:hover::after{transform:scaleX(1)}
.k-logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;font-weight:700;font-size:1.25em;letter-spacing:-.02em}
.k-logo-image{height:40px;width:auto}
.k-burger.k-burger{display:none;flex:none;width:44px;height:44px;padding:0;border:0;border-radius:12px;background:transparent;color:inherit;cursor:pointer;position:relative;margin-left:auto}
.k-burger span{position:absolute;left:12px;right:12px;height:2px;border-radius:2px;background:currentColor;transition:transform .35s var(--k-ease),opacity .2s}
.k-burger span:nth-child(1){top:15px}.k-burger span:nth-child(2){top:21px}.k-burger span:nth-child(3){top:27px}
.k-burger-open span:nth-child(1){transform:translateY(6px) rotate(45deg)}
.k-burger-open span:nth-child(2){opacity:0}
.k-burger-open span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
@media (max-width:640px){
  .k-links{gap:14px;font-size:.95em}
  html.k-js .k-burger.k-burger{display:block}
  html.k-js .k-menu{display:none;position:absolute;left:12px;right:12px;top:100%;z-index:60;flex-direction:column;align-items:stretch;gap:4px;padding:10px;border-radius:18px;background:var(--k-bg);box-shadow:0 20px 50px -20px rgba(0,0,0,.45);border:1px solid var(--k-line)}
  html.k-js .k-menu.k-menu-open{display:flex;animation:k-lift .3s var(--k-ease)}
  html.k-js .k-menu .k-nav-link{padding:12px 14px;border-radius:12px;font-size:1.05em}
  html.k-js .k-menu .k-nav-link::after{display:none}
  .k-section.k-section-header{flex-wrap:nowrap;gap:10px}
  .k-section.k-section-header .k-logo-image{height:28px;max-width:40vw;object-fit:contain;object-position:left}
  .k-section.k-section-header>.k-logo{min-width:0;flex:0 1 auto}
  .k-section.k-section-header>.k-button{flex:none}
}

/* ---- buttons ---- */
.k-button{display:inline-flex;align-items:center;justify-content:center;gap:.5em;width:fit-content;min-height:44px;padding:.85em 1.5em;border:0;border-radius:999px;background:var(--k-accent);color:var(--k-on-accent);font-weight:600;text-decoration:none;cursor:pointer;transition:transform .3s var(--k-ease),box-shadow .3s,background .3s,opacity .3s;box-shadow:0 8px 20px -10px color-mix(in srgb,var(--k-accent) 70%,transparent)}
.k-button:hover{transform:translateY(-2px);box-shadow:0 14px 28px -12px color-mix(in srgb,var(--k-accent) 75%,transparent)}
.k-button:active{transform:translateY(0) scale(.98)}
.k-button:disabled{opacity:.45;cursor:not-allowed;transform:none}
.k-section>.k-button{margin-inline:0}
.k-outline{background:transparent;color:inherit;box-shadow:inset 0 0 0 1.5px currentColor}
.k-ghost{background:transparent;color:inherit;box-shadow:none;padding-inline:.6em}
.k-large{font-size:1.15em;padding:1em 1.9em}
.k-small{font-size:.88em;padding:.55em 1.1em;min-height:40px}
.k-clickable{cursor:pointer}

/* ---- cards, images ---- */
.k-card{display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:var(--k-radius);background:color-mix(in srgb,var(--k-bg) 70%,#fff);border:1px solid var(--k-line);transition:transform .4s var(--k-ease),box-shadow .4s}
.k-card-image{width:calc(100% + 36px);margin:-18px -18px 4px;aspect-ratio:4/3;object-fit:cover;max-width:none}
.k-card-title{font-size:1.2em;font-weight:650}
.k-card-text{margin:0;color:var(--k-muted)}
.k-image{border-radius:calc(var(--k-radius) * .6)}
.k-cover{width:100%;height:100%;object-fit:cover}
.k-video{width:100%;border-radius:var(--k-radius)}

/* ---- forms ---- */
.k-form{display:flex;flex-direction:column;gap:14px;max-width:560px}
.k-field,.k-textarea,.k-select{width:100%;min-height:44px;padding:.8em 1em;border:1.5px solid var(--k-line);border-radius:12px;background:color-mix(in srgb,var(--k-bg) 60%,#fff);transition:border-color .2s,box-shadow .2s}
.k-field:focus,.k-textarea:focus,.k-select:focus{outline:none;border-color:var(--k-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--k-accent) 18%,transparent)}
.k-validated .k-field:invalid,.k-validated .k-textarea:invalid{border-color:#e5484d}
.k-textarea{min-height:120px;resize:vertical}
.k-label{display:flex;flex-direction:column;gap:6px;font-weight:550;font-size:.95em}
.k-label-check{flex-direction:row;align-items:center;gap:10px;font-weight:450;cursor:pointer}
.k-checkbox{width:20px;height:20px;accent-color:var(--k-accent)}

/* ---- screens ---- */
.k-only-mobile,.k-only-tablet{display:none}
@media (max-width:640px){.k-only-mobile{display:contents}.k-only-desktop{display:none}}
@media (min-width:641px) and (max-width:1024px){.k-only-tablet{display:contents}}
@media (max-width:1024px){.k-only-desktop{display:none}}

/* ---- entrances: pure CSS (scroll-driven), visible without JavaScript and in browsers without support ---- */
@supports (animation-timeline: view()){
  @media (prefers-reduced-motion:no-preference){
    .k-enter{animation:k-from-bottom linear both;animation-timeline:view();animation-range:entry 0% entry 55%}
    .k-enter-left{animation-name:k-from-left}.k-enter-right{animation-name:k-from-right}.k-enter-top{animation-name:k-from-top}
    .k-enter-zoom{animation-name:k-from-zoom}.k-enter-fade{animation-name:k-from-fade}
  }
}
@keyframes k-from-bottom{from{opacity:0;transform:translateY(40px)}}
@keyframes k-from-top{from{opacity:0;transform:translateY(-40px)}}
@keyframes k-from-left{from{opacity:0;transform:translateX(-50px)}}
@keyframes k-from-right{from{opacity:0;transform:translateX(50px)}}
@keyframes k-from-zoom{from{opacity:0;transform:scale(.9)}}
@keyframes k-from-fade{from{opacity:0}}
@keyframes k-fade{from{opacity:0}}
@keyframes k-lift{from{opacity:0;transform:translateY(30px)}}
@keyframes k-zoom{from{opacity:0;transform:scale(.9)}}
@keyframes k-left{from{opacity:0;transform:translateX(-40px)}}
@keyframes k-right{from{opacity:0;transform:translateX(40px)}}

/* ---- immersion ---- */
.k-scene{position:relative;width:100%;min-height:clamp(320px,60vh,720px);overflow:hidden;border-radius:inherit;isolation:isolate;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--k-gap);padding:var(--k-gutter);text-align:center}
.k-section>.k-scene{max-width:none}
.k-scene>.k-title,.k-scene>.k-text,.k-scene>.k-subtitle{pointer-events:none}
.k-scene>canvas.k-canvas{position:absolute;inset:0;width:100%!important;height:100%!important;z-index:0}
.k-scene>.k-object:not(.k-3d){position:absolute;z-index:1;left:50%;top:50%;translate:-50% -50%;width:calc(var(--k-size,1) * clamp(120px,22vw,280px))}
.k-scene>.k-object.k-3d{position:absolute;inset:0;pointer-events:none;width:0;height:0}
.k-scene>:not(.k-object):not(canvas):not(.k-bubble):not(.k-sound){position:relative;z-index:2}
.k-object{position:relative}
.k-object.k-3d:not(.k-scene>.k-object){width:100%;height:clamp(300px,55vh,640px);touch-action:pan-y}
.k-object>canvas{width:100%!important;height:100%!important;display:block}
.k-object-image{width:100%;height:auto;user-select:none;-webkit-user-drag:none}
.k-object:not(.k-3d){width:calc(var(--k-size,1) * clamp(140px,26vw,320px));margin-inline:auto}
.k-lottie{aspect-ratio:1}
.k-fallback{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transition:opacity .6s}
.k-object.k-ready>.k-fallback{opacity:0}
.k-placed{position:absolute!important;translate:-50% -50%}
.k-bubble{position:absolute;left:50%;bottom:100%;translate:-50% -10px;z-index:20;max-width:min(280px,80vw);width:max-content;padding:10px 16px;border-radius:18px;background:#fff;color:#16151a;font-weight:550;font-size:15px;line-height:1.35;box-shadow:0 12px 30px -12px rgba(0,0,0,.35);opacity:0;scale:.85;transform-origin:50% 100%;transition:opacity .25s,scale .35s var(--k-ease);pointer-events:none}
.k-bubble::after{content:"";position:absolute;left:50%;top:100%;margin-left:-8px;border:8px solid transparent;border-top-color:#fff}
.k-bubble-visible{opacity:1;scale:1}
.k-bubble.k-bubble-3d{left:0;top:0;bottom:auto;translate:-50% calc(-100% - 14px)}
.k-mute{position:fixed;right:18px;bottom:18px;z-index:100;width:44px;height:44px;border-radius:50%;border:0;background:color-mix(in srgb,var(--k-bg) 80%,transparent);backdrop-filter:blur(10px);box-shadow:0 6px 20px -8px rgba(0,0,0,.4);cursor:pointer;font-size:18px}

/* ---- page transitions: native, between real pages (no JavaScript) ---- */
@view-transition{navigation:auto}
::view-transition-old(root),::view-transition-new(root){animation-duration:.4s;animation-timing-function:var(--k-ease)}
html[data-k-transition=none]{view-transition-name:none}
html[data-k-transition=slide]::view-transition-old(root){animation-name:k-out-left}
html[data-k-transition=slide]::view-transition-new(root){animation-name:k-in-right}
html[data-k-transition=zoom]::view-transition-new(root){animation-name:k-zoom}
html[data-k-transition=curtain]::view-transition-new(root){animation-name:k-curtain}
@keyframes k-out-left{to{transform:translateX(-30%);opacity:0}}
@keyframes k-in-right{from{transform:translateX(30%);opacity:0}}
@keyframes k-curtain{from{clip-path:inset(0 0 100% 0)}}

/* ---- errors (development) ---- */
.k-dev-error{position:fixed;inset:auto 16px 16px 16px;z-index:99999;max-height:60vh;overflow:auto;padding:18px 20px;border-radius:14px;background:#1b1020;color:#ffe3ea;font:14px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;box-shadow:0 20px 50px -20px rgba(0,0,0,.6);border:1px solid #ff4f8b}
`;function jt(){return Object.entries({red:"#e5484d",orange:"#f76b15",yellow:"#ffc53d",green:"#30a46c",blue:"#0090ff",purple:"#8e4ec6",pink:"#e93d82",black:"#111111",white:"#ffffff",gray:"#8b8d98",cream:"#fff4e8",beige:"#efe3cf",brown:"#8a5a3b",teal:"#12a594",gold:"#d4a72c",silver:"#c0c4cc",navy:"#14213d",coral:"#ff7f61",mint:"#7fe0c0",lavender:"#b9a6ef",sky:"#7cc4fa",sand:"#e9d8b4",slate:"#3c4454",night:"#0b1020"}).map(([a,t])=>`--k-${a}:${t};`).join("")}function _(e){let a=e instanceof Error?e.message:String(e);if(console.error("Kaury:",e),globalThis.__kauryDev&&typeof document<"u"&&document.body){let o=document.querySelector(".k-dev-error");o||(o=document.createElement("div"),o.className="k-dev-error",o.addEventListener("click",()=>o.remove()),document.body.append(o)),o.innerHTML=`<b>Runtime error</b>
${a.replace(/</g,"&lt;")}

<small>(click to close)</small>`}}P(_);M(_);export{zt as BASE_STYLE,A as Cell,D as Derived,W as NetworkError,re as abs,lt as action,N as allPaths,Te as attr,Ze as autoLink,ee as average,f as batch,Fe as bind,Ge as bindCheck,rt as bodyOf,Ve as card,ie as ceil,bt as clientCollection,qe as component,Pe as confetti,ze as copy,be as delay,U as derived,He as each,H as effect,Re as equal,ve as every,Y as findPage,ae as floor,Qe as form,ue as formatDate,wt as go,Me as h,Se as has,Xe as img,u as inBrowser,j as installMenus,we as later,pe as length,Q as load,Le as m,Ae as mark,nt as markdown,ne as max,te as min,tt as mobileMenu,st as motion,ot as mouse,dt as namedObject,de as now,mt as object,pt as objects,_e as on,B as onCleanup,We as options,Ye as path,ye as persist,ce as pick,xt as playSound,fe as price,G as print,Ee as prop,Ne as px,le as random,xe as range,y as raw,v as rawItems,h as reactive,X as renderPage,_ as report,$ as resolveLinks,x as root,Je as rootClass,De as rootNodes,oe as round,b as route,ct as says,kt as scene,ft as sceneReady,it as screen,at as scroll,Ce as scrollTo,V as send,yt as seo,ht as serverCollection,z as setLocale,Oe as setText,ut as setting,$e as share,ge as shuffle,Ue as slot,et as slug,gt as sound,se as sqrt,vt as start,R as startGlobals,J as state,Ie as style,Z as sum,F as t,Ke as text,he as toList,ke as toNumber,me as toText,q as untracked,je as vibrate,Be as when};
