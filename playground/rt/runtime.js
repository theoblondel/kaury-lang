import{$ as Ie,$a as Ct,A as de,Aa as rt,B as pe,Ba as at,C as me,Ca as it,D as ke,Da as K,E as fe,Ea as st,F as ue,Fa as lt,G as ge,Ga as S,H as he,Ha as ct,I as xe,Ia as dt,J as be,Ja as pt,K as we,Ka as mt,L as ye,La as kt,M as ve,Ma as ft,N as ze,Na as ut,O as je,Oa as b,P as Ce,Q as $e,Qa as R,R as Se,Ra as gt,S as Re,Sa as ht,T as Ee,Ta as xt,U as Le,Ua as bt,V as Pe,W as A,Wa as wt,X as Me,Xa as yt,Y as Oe,Ya as vt,Z as Te,Za as zt,_ as Ae,_a as jt,a as O,aa as Ne,ab as $t,b as v,ba as C,bb as St,c as T,ca as k,d as h,da as I,e as J,ea as $,f as W,fa as N,g as F,ga as Ke,h as u,ha as De,i as z,ia as _e,j as x,ja as Be,k as U,ka as Ye,l as G,la as qe,m as Q,ma as Xe,n as V,na as He,o as j,oa as Je,p as Z,pa as We,q as ee,qa as Fe,r as te,ra as Ue,s as ne,sa as Ge,t as oe,ta as Qe,u as re,ua as Ve,v as ae,va as Ze,w as ie,wa as et,x as se,xa as tt,y as le,ya as nt,z as ce,za as ot}from"./chunk-22FFYOBK.js";import{e as p}from"./chunk-MNURLQ2V.js";p();p();var E=new Set,D=Symbol("kaury.items");function Rt(e,r){return typeof r!="object"||r===null?r:new Proxy(r,{get(t,o,n){return o===D?t:(typeof o!="symbol"&&E.add(e),Reflect.get(t,o,n))}})}function y(e){return(e&&e[D])??z(e)??[]}function L(){let e=[...E];return E.clear(),e}function Et(e,r,t){let o=typeof document<"u"?document.getElementById("k-data-"+e):null;if(o?.textContent)try{return x(JSON.parse(o.textContent))}catch{}let n=x(t?[]:{});return fetch(r).then(s=>s.json()).then(s=>u(()=>{t?n.push(...s):Object.assign(n,s)})).catch(s=>console.error(`Kaury: cannot load the content "${r}".`,s)),n}p();var P="/api/kaury-mail",_=new Set;function B(e){let r=2166136261,t=e.trim().toLowerCase();for(let o=0;o<t.length;o++)r^=t.charCodeAt(o),r=Math.imul(r,16777619);return(r>>>0).toString(36)}var Lt=Date.now();function Pt(e,r,t,o){if(O(),!k()){let n=String(r()??"");n&&_.add(n.trim().toLowerCase());return}e.addEventListener("submit",async n=>{if(n.preventDefault(),e.getAttribute("aria-busy")==="true")return;let s=(document.documentElement.lang||"en").startsWith("fr");e.querySelector(":scope > .k-form-error")?.remove();let c={};for(let[a,i]of new FormData(e))typeof i=="string"&&a&&(c[a]=c[a]?`${c[a]}, ${i}`:i);for(let a of e.querySelectorAll("input[type=checkbox][name]"))c[a.name]=a.checked?s?"oui":"yes":s?"non":"no";let m=[...e.querySelectorAll("button[type=submit], button:not([type])")];e.setAttribute("aria-busy","true"),m.forEach(a=>a.disabled=!0);try{let a=JSON.stringify({to:B(String(r()??"")),subject:t?String(t()??""):"",page:location.pathname,fields:c,time:Date.now()-Lt}),i=M=>fetch(M,{method:"POST",headers:{"Content-Type":"application/json"},body:a}),l=await i(P);if((l.status===404||l.status===405)&&(l=await i(P+".php")),!l.ok)throw new Error(await l.text());o&&await o(n)}catch(a){console.error("Kaury: the form could not be sent.",a);let i=document.createElement("p");i.className="k-form-error",i.setAttribute("role","alert"),i.textContent=s?"Le message n'a pas pu partir. R\xE9essayez dans un instant.":"The message could not be sent. Please try again in a moment.",e.append(i)}finally{e.removeAttribute("aria-busy"),m.forEach(a=>a.disabled=!1)}})}p();var f=null,g=e=>e.replace(/\/index\.html$/,"/").replace(/(.)\/$/,"$1")||"/";function Y(e){let r=[];for(let t of e.$pages)if(t.each&&t.pathOf)for(let o of y(t.each()))r.push(g(t.pathOf(o)));else r.push(t.path);return r}function q(e,r){let t=g(r);for(let n of e){if(n.each&&n.pathOf){let a=typeof document<"u"&&k()?document.getElementById("k-item"):null;if(a?.textContent&&n.path===a.dataset.kPath){let i=JSON.parse(a.textContent);if(g(n.pathOf(i))===t)return{page:n,params:{},item:i}}for(let i of y(n.each()))if(g(n.pathOf(i))===t)return{page:n,params:{},item:i};continue}let s=[],m=new RegExp("^"+g(n.path).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/:([\p{L}_][\p{L}\p{N}_-]*)/gu,(a,i)=>(s.push(i),"([^/]+)"))+"$","u").exec(t);if(m){let a={};return s.forEach((i,l)=>a[i]=decodeURIComponent(m[l+1])),{page:n,params:a}}}let o=e.find(n=>n.path==="/404");return o?{page:o,params:{}}:null}function X(e,r,t,o=!1){K(Y(e)),j(e.$site.lang);let n=q(e.$pages,r);u(()=>{b.path=r,b.params=n?.params??{}}),f?.(),f=null;let s=e.$site.name;if(!n){for(;t.firstChild;)t.removeChild(t.firstChild);let d=document.createElement("main");return d.className="k-page k-not-found",d.innerHTML='<section class="k-section"><h1 class="k-title">Page not found</h1><p class="k-text"><a href="/">Back to the home page</a></p></section>',t.appendChild(d),{title:`Page not found \xB7 ${s??""}`,found:!1,hydrated:!1,dynamic:!1,collections:[]}}let c={path:r,params:n.params,item:n.item};v(),L();let m=!1;if(o&&t.firstChild){t.$kNext=void 0,$(!0);try{let[,d]=h(()=>{n.page.render(c,t),N()});f=d,m=!0}catch(d){f?.(),f=null,d instanceof I||console.error(d)}finally{$(!1)}}if(!m){for(;t.firstChild;)t.removeChild(t.firstChild);let[,d]=h(()=>n.page.render(c,t));f=d}let a=v(),i=L();S(t);let l=n.page.seo?.(c)??{};return{title:l.title?s&&!l.title.includes(s)?`${l.title} \xB7 ${s}`:l.title:s??"Kaury",description:l.description??e.$site.seo?.description,image:l.image??e.$site.seo?.image,lang:n.page.lang?.(c)??void 0,alternates:n.page.alternates?.(c)??void 0,head:n.page.head?.(c)??void 0,found:!0,hydrated:m,dynamic:a,collections:i,item:n.item,pattern:n.page.path}}function Mt(e,r="#app"){let t=document.querySelector(r)??document.body,o=document.documentElement;if(e.$site.transition&&(o.dataset.kTransition=e.$site.transition),R(),o.dataset.kPage==="static")o.dataset.kRender="static";else{let n=X(e,location.pathname,t,t.firstChild!==null);o.dataset.kRender=n.hydrated?"hydrated":"rendered",(!t.firstChild||!n.found)&&(document.title=n.title)}C()}function Ot(e){k()&&(location.href=e)}function Tt(e){k()&&e.title&&(document.title=e.title)}p();var At=`
:root{
  --k-bg:#fcfbf8;--k-text:#16151a;--k-ink:#16151a;--k-muted:#5f5e66;--k-line:rgba(20,20,30,.12);
  --k-accent:#16151a;--k-on-accent:#fff;
  --k-font-fallback:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --k-font:var(--k-font-fallback);--k-font-titles:var(--k-font);
  --k-width:1180px;--k-gutter:clamp(16px,5vw,64px);--k-section:clamp(56px,9vw,128px);
  --k-radius:14px;--k-gap:20px;
  --k-ease:cubic-bezier(.2,.7,.2,1);
  ${It()}
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
.k-section>*:not(.k-full,.k-column,.k-box,.k-grid,.k-row){width:100%;max-width:var(--k-width);margin-inline:auto}
/* layout boxes: a named style can make them narrower (max-width 640) */
.k-section>:where(.k-column,.k-box,.k-grid,.k-row):where(:not(.k-full)){width:100%;max-width:var(--k-width);margin-inline:auto}
.k-section.k-section-header,header.k-header{flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;padding-block:16px;gap:16px 28px;max-width:none}
.k-section.k-section-header>*,header.k-header>*{width:auto;max-width:none;margin:0}
.k-section.k-section-header>.k-links,header.k-header>.k-links{margin-left:auto}
.k-header,.k-footer,.k-nav{display:flex;gap:var(--k-gap);padding:18px var(--k-gutter);align-items:center;flex-wrap:wrap;position:relative}
.k-footer{padding-block:40px;color:var(--k-muted);font-size:.92em;border-top:1px solid var(--k-line);justify-content:space-between}
.k-box,.k-column{display:flex;flex-direction:column;gap:var(--k-gap)}
.k-row{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:var(--k-gap)}
.k-grid{display:grid;gap:var(--k-gap);grid-template-columns:repeat(var(--k-columns,3),minmax(0,1fr))}
@media (max-width:1024px){.k-grid[class]{grid-template-columns:repeat(min(var(--k-columns,3),2),minmax(0,1fr))}}
@media (max-width:640px){.k-grid[class]{grid-template-columns:minmax(0,1fr)}}
.k-grid>*{min-width:0}.k-markdown{min-width:0}

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
[hidden]{display:none!important}
.k-title,.k-subtitle,.k-text{white-space:pre-line}
.k-logo-text{font-weight:inherit}
.k-details{display:block;border-bottom:1px solid var(--k-line)}
.k-summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 0;font-weight:700;font-size:1.1em}
.k-summary::-webkit-details-marker{display:none}
.k-summary:after{content:"+";flex:none;width:32px;height:32px;border-radius:50%;border:2px solid currentColor;display:grid;place-items:center;font-weight:400;line-height:1;transition:transform .35s var(--k-ease)}
.k-details[open]>.k-summary:after{transform:rotate(45deg)}
.k-details>:not(summary){margin:0 0 18px}
.k-embed{display:block;width:100%;min-height:420px;border:0;border-radius:var(--k-radius);background:#fff}
.k-markdown h2,.k-markdown h3{position:relative;scroll-margin-top:96px}
.k-anchor{position:absolute;right:100%;padding-right:.3em;opacity:0;text-decoration:none!important;color:var(--k-muted)}
.k-markdown h2:hover .k-anchor,.k-markdown h3:hover .k-anchor{opacity:1}
.k-code{margin:0;overflow-x:auto;padding:1.1em 1.3em;border-radius:var(--k-radius);background:var(--k-code-bg,#0d0b14);color:var(--k-code-text,#ece7f5);font:14px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;tab-size:2}
.k-markdown .k-code code{background:none;color:inherit;padding:0;font-size:inherit;border-radius:0}
.k-c{color:var(--k-code-comment,#7d7590);font-style:italic}.k-s{color:var(--k-code-string,#a5e8a0)}.k-i{color:var(--k-code-interp,#ffd479)}
.k-n,.k-v{color:var(--k-code-number,#ffb38a)}.k-k{color:var(--k-code-keyword,#ff7ab0)}.k-e{color:var(--k-code-element,#8fc7ff)}
.k-o{color:var(--k-code-option,#c9b3ff)}.k-f{color:var(--k-code-component,#7ff0d8)}.k-p{color:var(--k-code-keyword,#ff7ab0)}

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
.k-form-error{margin:0;color:#c2331b;font-weight:500}
.k-form[aria-busy=true]{opacity:.7;cursor:progress}
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
`;function It(){return Object.entries({red:"#e5484d",orange:"#f76b15",yellow:"#ffc53d",green:"#30a46c",blue:"#0090ff",purple:"#8e4ec6",pink:"#e93d82",black:"#111111",white:"#ffffff",gray:"#8b8d98",cream:"#fff4e8",beige:"#efe3cf",brown:"#8a5a3b",teal:"#12a594",gold:"#d4a72c",silver:"#c0c4cc",navy:"#14213d",coral:"#ff7f61",mint:"#7fe0c0",lavender:"#b9a6ef",sky:"#7cc4fa",sand:"#e9d8b4",slate:"#3c4454",night:"#0b1020"}).map(([r,t])=>`--k-${r}:${t};`).join("")}function H(e){let r=e instanceof Error?e.message:String(e);if(console.error("Kaury:",e),globalThis.__kauryDev&&typeof document<"u"&&document.body){let o=document.querySelector(".k-dev-error");o||(o=document.createElement("div"),o.className="k-dev-error",o.addEventListener("click",()=>o.remove()),document.body.append(o)),o.innerHTML=`<b>Runtime error</b>
${r.replace(/</g,"&lt;")}

<small>(click to close)</small>`}}T(H);A(H);export{At as BASE_STYLE,U as Cell,G as Derived,P as MAIL_ENDPOINT,te as NetworkError,pe as abs,xt as action,Y as allPaths,Ye as attr,st as autoLink,ae as average,u as batch,nt as bind,ot as bindCheck,gt as bodyOf,it as card,de as ceil,pt as classes,Et as clientCollection,Qe as component,Ie as confetti,Re as copy,je as delay,V as derived,Ge as each,W as effect,Me as equal,Ce as every,q as findPage,ce as floor,at as form,we as formatDate,Be as frame,Ot as go,Ke as h,Oe as has,dt as html,We as imageSize,Je as img,k as inBrowser,C as installMenus,Ne as jsonLd,$e as later,ue as length,ne as load,Ae as m,Pt as mail,_ as mailAddresses,B as mailId,Ve as mark,mt as markdown,se as max,ie as min,ct as mobileMenu,ht as motion,kt as mouse,yt as namedObject,ge as now,vt as object,wt as objects,Fe as on,J as onCleanup,rt as options,He as path,Se as persist,fe as pick,St as playSound,be as price,ee as print,Te as prop,Xe as px,ke as random,ve as range,z as raw,y as rawItems,x as reactive,X as renderPage,H as report,S as resolveLinks,h as root,et as rootClass,Ze as rootNodes,le as round,b as route,bt as says,zt as scene,jt as sceneReady,ut as screen,ft as scroll,Le as scrollTo,oe as send,Tt as seo,Rt as serverCollection,j as setLocale,De as setText,Ct as setting,Pe as share,ye as shuffle,tt as slot,lt as slug,$t as sound,me as sqrt,Mt as start,R as startGlobals,Q as state,qe as style,re as sum,Z as t,_e as text,ze as toList,xe as toNumber,he as toText,F as untracked,Ee as vibrate,Ue as when};
