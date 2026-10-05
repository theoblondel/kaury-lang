import{$ as C,A as ae,Aa as v,B as re,Ba as We,C as ie,Ca as Ze,D as se,Da as et,E as le,Ea as tt,F as ce,Fa as u,G as pe,H as de,Ha as w,I as me,Ia as nt,J as ke,Ja as ot,K as fe,Ka as at,L as ue,La as rt,M as ge,N as xe,Na as it,O as he,Oa as st,P as be,Pa as lt,Q as ve,Qa as ct,R as we,Ra as pt,S as ye,Sa as dt,T as ze,Ta as mt,U as L,Ua as kt,V as je,W as $e,X as Le,Y as Ce,Z as Ee,_ as f,a as $,aa as b,b as k,ba as E,c as X,ca as Re,d as H,da as Te,e as N,ea as Ke,f as x,fa as Me,g as _,ga as Pe,h as A,ha as Se,i as B,ia as Ye,j as I,ja as Xe,k as q,ka as He,l as U,la as Ne,m as h,ma as _e,n as D,na as Ae,o as O,oa as Be,p as V,pa as Ie,q as F,qa as qe,r as G,ra as Ue,s as J,sa as De,t as Q,ta as Oe,u as W,ua as Ve,v as Z,va as Fe,w as ee,wa as Ge,x as te,xa as R,y as ne,ya as Je,z as oe,za as Qe}from"./chunk-EYZKK5KP.js";import{c as p}from"./chunk-HJRC34VD.js";p();p();var z=null,y=null,d=null;function g(e,i){let t=i.replace(/\/index\.html$/,"/").replace(/(.)\/$/,"$1")||"/";for(let o of e){let s=o.path.replace(/(.)\/$/,"$1"),a=[],l=new RegExp("^"+s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/:([\p{L}_][\p{L}\p{N}_-]*)/gu,(m,r)=>(a.push(r),"([^/]+)"))+"$","u").exec(t);if(l){let m={};return a.forEach((r,Y)=>m[r]=decodeURIComponent(l[Y+1])),{page:o,params:m}}}let n=e.find(o=>o.path==="/404");return n?{page:n,params:{}}:null}function j(e,i,t,n=!1){R(e.$pages.map(r=>r.path)),h(e.$site.lang);let o=g(e.$pages,i);x(()=>{u.path=i,u.params=o?.params??{}}),d?.(),d=null;let s=e.$site.name;if(!o){for(;t.firstChild;)t.removeChild(t.firstChild);let r=document.createElement("main");return r.className="k-page k-not-found",r.innerHTML='<section class="k-section"><h1 class="k-title">Page not found</h1><p class="k-text"><a href="/">Back to the home page</a></p></section>',t.appendChild(r),{title:`Page not found \xB7 ${s??""}`,found:!1,hydrated:!1}}let a={path:i,params:o.params},c=!1;if(n&&t.firstChild){t.$kNext=void 0,b(!0);try{let[,r]=k(()=>{o.page.render(a,t),E()});d=r,c=!0}catch(r){d?.(),d=null,r instanceof C||console.error(r)}finally{b(!1)}}if(!c){for(;t.firstChild;)t.removeChild(t.firstChild);let[,r]=k(()=>o.page.render(a,t));d=r}v(t);let l=o.page.seo??{};return{title:l.title?s&&l.title!==s?`${l.title} \xB7 ${s}`:l.title:s??"Kaury",description:l.description??e.$site.seo?.description,image:l.image??e.$site.seo?.image,found:!0,hydrated:c}}function ft(e,i="#app"){z=e,y=document.querySelector(i)??document.body,w();let t=j(e,location.pathname,y,!0);document.documentElement.dataset.kRender=t.hydrated?"hydrated":"rendered",document.title=t.title,K(!1),document.addEventListener("click",n=>{let o=n.target?.closest?.("a");if(!o||n.defaultPrevented||n.button!==0||n.metaKey||n.ctrlKey||n.shiftKey||n.altKey)return;let s=o.getAttribute("href");if(!s||o.target==="_blank"||o.hasAttribute("download"))return;let a=new URL(s,location.href);a.origin===location.origin&&(a.pathname===location.pathname&&a.hash||g(e.$pages,a.pathname)&&(n.preventDefault(),M(a.pathname+a.search+a.hash)))}),addEventListener("popstate",()=>P(location.pathname,!1))}function K(e){location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({behavior:e?"smooth":"auto"})}function M(e){if(f()){if(!z){location.href=e;return}history.pushState(null,"",e),P(new URL(e,location.href).pathname,!0)}}function P(e,i){let t=z,o=g(t.$pages,e)?.page.transition??t.$site.transition??"fade",s=()=>{let c=j(t,e,y);document.title=c.title;let l=document.querySelector('meta[name="description"]');l&&c.description&&l.setAttribute("content",c.description),location.hash?K(!1):i&&scrollTo({top:0})},a=document;o!=="none"&&a.startViewTransition&&!matchMedia("(prefers-reduced-motion: reduce)").matches?(document.documentElement.dataset.kTransition=o,a.startViewTransition(s)):s()}function ut(e){f()&&e.title&&(document.title=e.title)}p();var gt=`
:root{
  --k-bg:#fcfbf8;--k-text:#16151a;--k-ink:#16151a;--k-muted:#5f5e66;--k-line:rgba(20,20,30,.12);
  --k-accent:#16151a;--k-on-accent:#fff;
  --k-font-fallback:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --k-font:var(--k-font-fallback);--k-font-titles:var(--k-font);
  --k-width:1180px;--k-gutter:clamp(16px,5vw,64px);--k-section:clamp(56px,9vw,128px);
  --k-radius:14px;--k-gap:20px;
  --k-ease:cubic-bezier(.2,.7,.2,1);
  ${xt()}
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

/* ---- entrances ---- */
.k-enter{transition:opacity .9s var(--k-ease),transform .9s var(--k-ease),filter .9s;will-change:transform,opacity}
.k-enter:not(.k-seen){opacity:0}
.k-enter-left:not(.k-seen){transform:translateX(-60px)}
.k-enter-right:not(.k-seen){transform:translateX(60px)}
.k-enter-bottom:not(.k-seen){transform:translateY(50px)}
.k-enter-top:not(.k-seen){transform:translateY(-50px)}
.k-enter-zoom:not(.k-seen){transform:scale(.85)}
.k-enter-fade:not(.k-seen){filter:blur(6px)}
.k-enter-now{animation:.9s var(--k-ease) both}
.k-enter-now-bottom{animation-name:k-from-bottom}.k-enter-now-top{animation-name:k-from-top}
.k-enter-now-left{animation-name:k-from-left}.k-enter-now-right{animation-name:k-from-right}.k-enter-now-zoom{animation-name:k-from-zoom}
@keyframes k-from-bottom{from{transform:translateY(28px)}}
@keyframes k-from-top{from{transform:translateY(-28px)}}
@keyframes k-from-left{from{transform:translateX(-36px)}}
@keyframes k-from-right{from{transform:translateX(36px)}}
@keyframes k-from-zoom{from{transform:scale(.94)}}
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

/* ---- page transitions ---- */
::view-transition-old(root),::view-transition-new(root){animation-duration:.45s;animation-timing-function:var(--k-ease)}
[data-k-transition=slide]::view-transition-old(root){animation-name:k-out-left}
[data-k-transition=slide]::view-transition-new(root){animation-name:k-in-right}
[data-k-transition=zoom]::view-transition-new(root){animation-name:k-zoom}
[data-k-transition=curtain]::view-transition-new(root){animation-name:k-curtain}
@keyframes k-out-left{to{transform:translateX(-30%);opacity:0}}
@keyframes k-in-right{from{transform:translateX(30%);opacity:0}}
@keyframes k-curtain{from{clip-path:inset(0 0 100% 0)}}

/* ---- errors (development) ---- */
.k-dev-error{position:fixed;inset:auto 16px 16px 16px;z-index:99999;max-height:60vh;overflow:auto;padding:18px 20px;border-radius:14px;background:#1b1020;color:#ffe3ea;font:14px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;box-shadow:0 20px 50px -20px rgba(0,0,0,.6);border:1px solid #ff4f8b}
`;function xt(){return Object.entries({red:"#e5484d",orange:"#f76b15",yellow:"#ffc53d",green:"#30a46c",blue:"#0090ff",purple:"#8e4ec6",pink:"#e93d82",black:"#111111",white:"#ffffff",gray:"#8b8d98",cream:"#fff4e8",beige:"#efe3cf",brown:"#8a5a3b",teal:"#12a594",gold:"#d4a72c",silver:"#c0c4cc",navy:"#14213d",coral:"#ff7f61",mint:"#7fe0c0",lavender:"#b9a6ef",sky:"#7cc4fa",sand:"#e9d8b4",slate:"#3c4454",night:"#0b1020"}).map(([i,t])=>`--k-${i}:${t};`).join("")}function S(e){let i=e instanceof Error?e.message:String(e);if(console.error("Kaury:",e),globalThis.__kauryDev&&typeof document<"u"&&document.body){let n=document.querySelector(".k-dev-error");n||(n=document.createElement("div"),n.className="k-dev-error",n.addEventListener("click",()=>n.remove()),document.body.append(n)),n.innerHTML=`<b>Runtime error</b>
${i.replace(/</g,"&lt;")}

<small>(click to close)</small>`}}$(S);L(S);export{gt as BASE_STYLE,B as Cell,I as Derived,V as NetworkError,oe as abs,at as action,Me as attr,Je as autoLink,Q as average,x as batch,De as bind,Oe as bindCheck,nt as bodyOf,Ge as card,ne as ceil,Ae as component,Ee as confetti,ve as copy,ge as delay,U as derived,_e as each,H as effect,je as equal,xe as every,g as findPage,te as floor,Fe as form,me as formatDate,M as go,Re as h,$e as has,Xe as img,f as inBrowser,he as later,se as length,F as load,Ce as m,Be as mark,Z as max,W as min,We as mobileMenu,ot as motion,Ze as mouse,st as namedObject,le as now,lt as object,it as objects,He as on,X as onCleanup,Ve as options,Ye as path,be as persist,ie as pick,kt as playSound,de as price,O as print,Le as prop,Se as px,re as random,fe as range,_ as raw,A as reactive,j as renderPage,S as report,v as resolveLinks,k as root,qe as rootClass,Ie as rootNodes,ee as round,u as route,rt as says,ct as scene,pt as sceneReady,tt as screen,et as scroll,ye as scrollTo,G as send,ut as seo,h as setLocale,Te as setText,dt as setting,ze as share,ke as shuffle,Ue as slot,Qe as slug,mt as sound,ae as sqrt,ft as start,w as startGlobals,q as state,Pe as style,J as sum,D as t,Ke as text,ue as toList,pe as toNumber,ce as toText,N as untracked,we as vibrate,Ne as when};
