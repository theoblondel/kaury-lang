import{$ as Be,$a as Pt,A as ke,Aa as st,B as fe,Ba as v,C as ue,Ca as lt,D as ge,Da as dt,E as he,Ea as ct,F as xe,Fa as pt,G as be,Ga as mt,H as ye,Ha as kt,I as we,Ia as ft,J as ve,Ja as ut,K as ze,Ka as gt,L as Ce,La as ht,M as je,Ma as xt,N as $e,Na as bt,O as Re,Oa as yt,P as Se,Pa as wt,Q as Le,Qa as vt,R as Ee,Ra as zt,S as Pe,Sa as Ct,T as Te,Ta as jt,U as Me,Ua as W,V as Oe,Va as $t,W as Ne,Wa as Rt,X as Ae,Xa as N,Y as Ie,Ya as St,Z as Ke,Za as Lt,_ as De,_a as Et,a as D,aa as _e,ab as Tt,b as R,ba as Ye,bb as Mt,c as S,ca as qe,cb as Ot,d as b,da as He,db as Nt,e as te,ea as Xe,eb as z,f as y,fa as We,g as oe,ga as Je,gb as h,h as ne,ha as Ue,hb as At,i as g,ia as T,ib as It,j as L,ja as Fe,jb as Kt,k as w,ka as Ge,kb as Dt,l as re,la as Qe,m as B,ma as Ve,mb as Bt,n as _,na as Ze,nb as _t,o as ae,oa as et,ob as Yt,p as ie,pa as M,pb as qt,q as se,qa as f,qb as Ht,r as E,ra as H,rb as Xt,s as Y,sa as O,sb as Wt,t as P,ta as X,tb as Jt,u as le,ua as tt,v as de,va as ot,w as q,wa as nt,x as ce,xa as rt,y as pe,ya as at,z as me,za as it}from"./chunk-5DOML7UK.js";import{e as p}from"./chunk-MNURLQ2V.js";p();p();var J=Symbol("kaury.items");function Ut(e,n){return typeof n!="object"||n===null?n:new Proxy(n,{get(o,r,t){return r===J?o:(typeof r!="symbol"&&B(e),Reflect.get(o,r,t))}})}function A(e){return(e&&e[J])??L(e)??[]}function I(){return _()}var C=!1;function U(e){let n=C;C=!0;try{return e()}finally{C=n}}function Ft(e,n,o){let r=typeof document<"u"?document.getElementById("k-data-"+e):null;if(r?.textContent)try{return w(JSON.parse(r.textContent))}catch{}let t=w(o?[]:{}),d=!1,l=()=>{d||C||(d=!0,fetch(v(n)).then(i=>i.json()).then(i=>g(()=>{o?t.push(...i):Object.assign(t,i)})).catch(i=>console.error(`Kaury: cannot load the content "${n}".`,i)))};return new Proxy(t,{get(i,a,s){return typeof a!="symbol"&&l(),Reflect.get(i,a,s)},has(i,a){return l(),Reflect.has(i,a)},ownKeys(i){return l(),Reflect.ownKeys(i)}})}p();var K="/api/kaury-mail",F=new Set;function G(e){let n=2166136261,o=e.trim().toLowerCase();for(let r=0;r<o.length;r++)n^=o.charCodeAt(r),n=Math.imul(n,16777619);return(n>>>0).toString(36)}var Gt=Date.now();function Qt(e,n,o,r){if(D(),!f()){let t=String(n()??"");t&&F.add(t.trim().toLowerCase());return}e.addEventListener("submit",async t=>{if(t.preventDefault(),e.getAttribute("aria-busy")==="true")return;let d=(document.documentElement.lang||"en").startsWith("fr");e.querySelector(":scope > .k-form-error")?.remove();let l={};for(let[a,s]of new FormData(e))typeof s=="string"&&a&&(l[a]=l[a]?`${l[a]}, ${s}`:s);for(let a of e.querySelectorAll("input[type=checkbox][name]"))l[a.name]=a.checked?d?"oui":"yes":d?"non":"no";let i=[...e.querySelectorAll("button[type=submit], button:not([type])")];e.setAttribute("aria-busy","true"),i.forEach(a=>a.disabled=!0);try{let a=JSON.stringify({to:G(String(n()??"")),subject:o?String(o()??""):"",page:location.pathname,fields:l,time:Date.now()-Gt}),s=k=>fetch(k,{method:"POST",headers:{"Content-Type":"application/json"},body:a}),m=await s(K);if((m.status===404||m.status===405)&&(m=await s(K+".php")),!m.ok)throw new Error(await m.text());r&&await r(t)}catch(a){console.error("Kaury: the form could not be sent.",a);let s=document.createElement("p");s.className="k-form-error",s.setAttribute("role","alert"),s.textContent=d?"Le message n'a pas pu partir. R\xE9essayez dans un instant.":"The message could not be sent. Please try again in a moment.",e.append(s)}finally{e.removeAttribute("aria-busy"),i.forEach(a=>a.disabled=!1)}})}p();var u=null,x=e=>e.replace(/\/index\.html$/,"/").replace(/(.)\/$/,"$1")||"/";function Q(e){try{return A(e.each())}catch(n){if(!f())throw n;return[]}}function V(e){let n=[];for(let o of e.$pages)if(o.each&&o.pathOf)for(let r of U(()=>Q(o)))n.push(x(o.pathOf(r)));else n.push(o.path);return n}function Z(e,n){let o=x(n);for(let t of e){if(t.each&&t.pathOf){let a=typeof document<"u"&&f()?document.getElementById("k-item"):null;if(a?.textContent&&t.path===a.dataset.kPath){let s=JSON.parse(a.textContent);if(x(t.pathOf(s))===o)return{page:t,params:{},item:s}}for(let s of Q(t))if(x(t.pathOf(s))===o)return{page:t,params:{},item:s};continue}let d=[],i=new RegExp("^"+x(t.path).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/:([\p{L}_][\p{L}\p{N}_-]*)/gu,(a,s)=>(d.push(s),"([^/]+)"))+"$","u").exec(o);if(i){let a={};return d.forEach((s,m)=>a[s]=decodeURIComponent(i[m+1])),{page:t,params:a}}}let r=e.find(t=>t.path==="/404");return r?{page:r,params:{}}:null}function ee(e,n,o,r=!1){Y(e.$site.langs),P(null),W(V(e));let t=Z(e.$pages,n),d=t?.page.lang?.({path:n,params:t.params,item:t.item})??null;E(d??e.$site.lang),P(d),g(()=>{z.path=n,z.params=t?.params??{}}),u?.(),u=null;let l=e.$site.name;if(!t){for(;o.firstChild;)o.removeChild(o.firstChild);let c=document.createElement("main");return c.className="k-page k-not-found",c.innerHTML='<section class="k-section"><h1 class="k-title">Page not found</h1><p class="k-text"><a href="/">Back to the home page</a></p></section>',o.appendChild(c),{title:`Page not found \xB7 ${l??""}`,found:!1,hydrated:!1,dynamic:!1,collections:[]}}let i={path:n,params:t.params,item:t.item};R(),I();let a=!1;if(r&&o.firstChild){o.$kNext=void 0,O(!0);try{let[,c]=b(()=>{t.page.render(i,o),X()});u=c,a=!0}catch(c){u?.(),u=null,c instanceof H?globalThis.__kauryDev&&console.info(`Kaury: the page "${n}" was rebuilt in the browser, its HTML differed from the one made at build time (${c.message}).`):console.error(c)}finally{O(!1)}}if(!a){for(;o.firstChild;)o.removeChild(o.firstChild);let[,c]=b(()=>t.page.render(i,o));u=c}let s=R(),m=I();N(o);let k=t.page.seo?.(i)??{};return{title:k.title?l&&!k.title.includes(l)?`${k.title} \xB7 ${l}`:k.title:l??"Kaury",description:k.description??e.$site.seo?.description,image:k.image??e.$site.seo?.image,lang:t.page.lang?.(i)??void 0,alternates:t.page.alternates?.(i)??void 0,head:t.page.head?.(i)??void 0,found:!0,hydrated:a,dynamic:s,collections:m,item:t.item,pattern:t.page.path}}function Vt(e,n="#app"){let o=document.querySelector(n)??document.body,r=document.documentElement;if(e.$site.transition&&(r.dataset.kTransition=e.$site.transition),r.dataset.kPage==="static")h(),y(),r.dataset.kRender="static";else{let t=r.dataset.kBase,d=t&&location.pathname.startsWith(t)?"/"+location.pathname.slice(t.length):location.pathname,l=o.firstChild!==null;l||(h(),y());let i=ee(e,d,o,l);l&&(h(),y()),r.dataset.kRender=i.hydrated?"hydrated":"rendered",(!o.firstChild||!i.found)&&(document.title=i.title)}M()}function Zt(e){f()&&(location.href=v(q(e)))}function eo(e){f()&&e.title&&(document.title=e.title)}p();var to=`
:root{
  --k-bg:#fcfbf8;--k-text:#16151a;--k-ink:#16151a;--k-muted:#5f5e66;--k-line:rgba(20,20,30,.12);
  --k-accent:#16151a;--k-on-accent:#fff;
  --k-font-fallback:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --k-font:var(--k-font-fallback);--k-font-titles:var(--k-font);
  --k-width:1180px;--k-gutter:clamp(16px,5vw,64px);--k-section:clamp(56px,9vw,128px);
  --k-radius:14px;--k-gap:20px;
  --k-ease:cubic-bezier(.2,.7,.2,1);
  ${oo()}
}
@property --k-shade{syntax:"<number>";inherits:false;initial-value:0}
@property --k-shade-from{syntax:"*";inherits:false}
@property --k-shade-to{syntax:"*";inherits:false}
@property --k-glow{syntax:"*";inherits:false}
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
/* where a narrower element sits (width, max-width): a section in the middle, what is in it on the edge of the content */
@property --k-mi{syntax:"*";inherits:false}
.k-section{--k-mi:auto}
.k-section>*{--k-mi:max(0px,calc((100% - var(--k-width))/2)) 0px}
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
/* \xAB pin \xBB places a child over its parent: every box is that parent */
:where(.k-box,.k-column,.k-row,.k-grid,.k-card){position:relative}
table.k-box{display:table}thead.k-box{display:table-header-group}tbody.k-box{display:table-row-group}tfoot.k-box{display:table-footer-group}tr.k-box,tr.k-row{display:table-row}:is(td,th):is(.k-box,.k-column,.k-text,.k-row){display:table-cell;vertical-align:middle}
.k-row{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:var(--k-gap)}
.k-grid{display:grid;gap:var(--k-gap);grid-template-columns:repeat(var(--k-columns,3),minmax(0,1fr))}
@media (max-width:1024px){.k-grid[class]{grid-template-columns:repeat(min(var(--k-columns,3),2),minmax(0,1fr))}}
@media (max-width:640px){.k-grid[class]{grid-template-columns:minmax(0,1fr)}}
.k-grid>*{min-width:0}.k-markdown{min-width:0}

/* ---- texts ---- */
.k-title,.k-subtitle,h1,h2,h3{font-family:var(--k-font-titles);line-height:1.05;letter-spacing:-.02em;margin:0;text-wrap:balance}
.k-title{font-size:clamp(40px,6vw,76px);font-weight:700}
/* (the level inside :where(): the rule weighs one class, so a named style or a size on the line wins) */
.k-title:where(h2:not(.k-same)),.k-subtitle{font-size:clamp(28px,3.4vw,44px);font-weight:650}
.k-title:where(h3){font-size:clamp(22px,2.2vw,30px)}
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
.k-title,.k-subtitle,.k-text{white-space:var(--k-ws,pre-line)}
.k-logo-text{font-weight:inherit}
.k-details{display:block;border-bottom:1px solid var(--k-line)}
.k-languages{display:flex;gap:2px;align-items:center}
.k-language{padding:6px 9px;border-radius:999px;text-decoration:none;font-size:.85em;font-weight:600;letter-spacing:.04em;opacity:.62;transition:opacity .2s,background .2s}
.k-language:hover{opacity:1}
.k-language[aria-current]{opacity:1;background:var(--k-line)}
.k-dialog{border:0;padding:clamp(40px,5vw,52px) clamp(22px,4vw,40px) clamp(24px,4vw,40px);width:min(560px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;border-radius:var(--k-radius);background:var(--k-bg);color:var(--k-text);box-shadow:0 30px 80px rgba(0,0,0,.28)}
.k-dialog[open]{display:flex;flex-direction:column;gap:var(--k-gap);animation:k-dialog-in .35s var(--k-ease)}
.k-dialog::backdrop{background:rgba(12,12,18,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.k-dialog-close{position:absolute;top:8px;right:8px;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:transparent;cursor:pointer;font-size:28px;line-height:1;display:grid;place-items:center}
.k-dialog-close:hover{background:var(--k-line)}
.k-dialog-title{margin:0;padding-right:32px;font-family:var(--k-font-titles);font-size:clamp(22px,1.6vw + 14px,30px);line-height:1.15}
html:has(.k-dialog[open]){overflow:hidden}
@keyframes k-dialog-in{from{opacity:0;transform:translateY(14px) scale(.98)}}
.k-summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 0;font-weight:700;font-size:1.1em}
.k-summary::-webkit-details-marker{display:none}
.k-summary:after{content:"+";flex:none;width:32px;height:32px;border-radius:50%;border:2px solid currentColor;display:grid;place-items:center;font-weight:400;line-height:1;transition:transform .35s var(--k-ease)}
.k-details[open]>.k-summary:after{transform:rotate(45deg)}
.k-details>:not(summary){margin:0 0 18px}
.k-embed{display:block;width:100%;height:420px;border:0;border-radius:var(--k-radius);background:#fff}
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
.k-button{display:inline-flex;align-items:center;justify-content:center;gap:.5em;width:fit-content;min-height:44px;padding:.85em 1.5em;border:0;border-radius:var(--k-button-radius,999px);background:var(--k-accent);color:var(--k-on-accent);font-weight:600;text-decoration:none;cursor:pointer;transition:transform .3s var(--k-ease),box-shadow .3s,background .3s,opacity .3s;box-shadow:0 8px 20px -10px color-mix(in srgb,var(--k-glow,var(--k-accent)) 70%,transparent)}
.k-button:hover{transform:translateY(-2px);box-shadow:0 14px 28px -12px color-mix(in srgb,var(--k-glow,var(--k-accent)) 75%,transparent)}
.k-button:active{transform:translateY(0) scale(.98)}
.k-button:disabled{opacity:.45;cursor:not-allowed;transform:none}
/* what has a width of its own keeps it, at the edge of the content (in the middle under \xAB center \xBB) */
.k-section>.k-button,.k-section>.k-link,.k-section>.k-icon{width:fit-content;margin-inline:var(--k-mx,var(--k-mi,0px))}
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
.k-field,.k-textarea,.k-select{width:100%;min-height:44px;padding:.8em 1em;border:1.5px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:min(var(--k-button-radius,12px),12px);background:color-mix(in srgb,currentColor 6%,transparent);transition:border-color .2s,box-shadow .2s}
.k-field:where([type=range]){padding:0;border:0;background:none;min-height:32px;accent-color:var(--k-accent);box-shadow:none}
.k-field::placeholder,.k-textarea::placeholder{color:color-mix(in srgb,currentColor 50%,transparent);opacity:1}
.k-select option{color:#111;background:#fff}
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
.k-scene>:not(.k-object):not(canvas):not(.k-bubble):not(.k-sound):not(.k-poster){position:relative;z-index:2}
.k-object{position:relative}
.k-object.k-3d:not(.k-scene>.k-object){width:100%;height:clamp(300px,55vh,640px);touch-action:pan-y}
.k-object>canvas{width:100%!important;height:100%!important;display:block}
.k-object-image{width:100%;height:auto;user-select:none;-webkit-user-drag:none}
.k-object:not(.k-3d){width:calc(var(--k-size,1) * clamp(140px,26vw,320px));margin-inline:auto}
.k-lottie{aspect-ratio:1}
.k-poster{position:absolute;z-index:0;left:50%;top:50%;height:calc(53.7% * var(--k-ps,1));aspect-ratio:1;translate:calc(-50% + var(--k-px,0) * 45.4% / var(--k-ps,1)) calc(-50% - var(--k-py,0) * 45.4% / var(--k-ps,1));border-radius:50%;pointer-events:none;filter:blur(6px);opacity:.92;transition:opacity .7s;background:radial-gradient(circle at 34% 28%,color-mix(in srgb,var(--k-pc) 45%,#fff),var(--k-pc) 55%,color-mix(in srgb,var(--k-pc) 60%,#000))}
.k-object>.k-poster{height:62%}
.k-poster-torus{-webkit-mask:radial-gradient(closest-side,transparent 43%,#000 46%);mask:radial-gradient(closest-side,transparent 43%,#000 46%)}
.k-poster-knot{-webkit-mask:radial-gradient(closest-side,transparent 30%,#000 34%);mask:radial-gradient(closest-side,transparent 30%,#000 34%);scale:.92}
.k-poster-cube{border-radius:14%;scale:.72;rotate:10deg}
.k-poster-gem{border-radius:0;clip-path:polygon(50% 2%,92% 26%,92% 74%,50% 98%,8% 74%,8% 26%)}
.k-poster-pyramid,.k-poster-cone{border-radius:0;clip-path:polygon(50% 6%,95% 92%,5% 92%)}
.k-poster-cylinder{border-radius:24%/12%;scale:.6 .86}
.k-poster-capsule{border-radius:999px;scale:.5 .94}
.k-ready>.k-poster{opacity:0}
.k-no-3d>.k-poster{filter:none;opacity:1}
@media (max-width:640px){.k-scene>.k-poster{height:calc(39.8% * var(--k-ps,1));translate:calc(-50% + var(--k-px,0) * 22.7% / var(--k-ps,1)) calc(-50% - var(--k-py,0) * 45.4% / var(--k-ps,1))}}
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
`;function oo(){return Object.entries({red:"#e5484d",orange:"#f76b15",yellow:"#ffc53d",green:"#30a46c",blue:"#0090ff",purple:"#8e4ec6",pink:"#e93d82",black:"#111111",white:"#ffffff",gray:"#8b8d98",cream:"#fff4e8",beige:"#efe3cf",brown:"#8a5a3b",teal:"#12a594",gold:"#d4a72c",silver:"#c0c4cc",navy:"#14213d",coral:"#ff7f61",mint:"#7fe0c0",lavender:"#b9a6ef",sky:"#7cc4fa",sand:"#e9d8b4",slate:"#3c4454",night:"#0b1020"}).map(([n,o])=>`--k-${n}:${o};`).join("")}function $(e){let n=e instanceof Error?e.message:String(e);if(console.error("Kaury:",e),globalThis.__kauryDev&&typeof document<"u"&&document.body){let r=document.querySelector(".k-dev-error");r||(r=document.createElement("div"),r.className="k-dev-error",r.addEventListener("click",()=>r.remove()),document.body.append(r)),r.innerHTML=`<b>Runtime error</b>
${n.replace(/</g,"&lt;")}

<small>(click to close)</small>`}}S($);T($);function Co(e){S(e??$),T(e??$)}export{to as BASE_STYLE,re as Cell,ae as Derived,K as MAIL_ENDPOINT,ke as NetworkError,Ce as abs,Kt as action,V as allPaths,ce as alternates,at as attr,$t as autoLink,xe as average,Pe as base64,g as batch,bt as bind,wt as bindCheck,yt as bindSelect,At as bodyOf,jt as card,ze as ceil,Pt as classes,Ft as clientCollection,ft as component,Ze as confetti,Xe as copy,_e as delay,se as derived,vt as dialog,kt as each,oe as effect,Te as encodeUrl,Fe as equal,Ye as every,Z as findPage,ve as floor,Ct as form,Ie as formatDate,Ae as formatNumber,rt as frame,Zt as go,tt as h,Ge as has,Et as html,ct as imageSize,dt as img,f as inBrowser,M as installMenus,et as jsonLd,St as languages,qe as later,Se as length,fe as load,Ve as m,Qt as mail,F as mailAddresses,G as mailId,ut as mark,Tt as markdown,ye as max,be as min,Lt as mobileMenu,It as motion,Mt as mouse,_t as namedObject,Le as now,Yt as object,Bt as objects,pt as on,te as onCleanup,Co as onError,zt as options,lt as path,de as perLanguage,He as persist,Re as pick,Jt as playSound,ge as plus,Oe as price,me as print,Qe as prop,st as px,$e as random,De as range,L as raw,A as rawItems,w as reactive,ee as renderPage,$ as report,N as resolveLinks,b as root,ht as rootClass,gt as rootNodes,we as round,z as route,Dt as says,qt as scene,Ht as sceneReady,Nt as screen,Ot as scroll,Je as scrollTo,ue as send,eo as seo,Ut as serverCollection,E as setLocale,ot as setText,Xt as setting,Ue as share,Ke as shuffle,xt as slot,Rt as slug,Wt as sound,je as sqrt,Vt as start,h as startGlobals,ie as state,it as style,he as sum,pe as t,nt as text,Ne as toDate,Be as toList,Me as toNumber,Ee as toText,le as tr,ne as untracked,We as vibrate,mt as when};
