var x=Object.defineProperty;var S=(s,t,e)=>t in s?x(s,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):s[t]=e;var d=(s,t,e)=>S(s,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const i of r.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function e(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(n){if(n.ep)return;n.ep=!0;const r=e(n);fetch(n.href,r)}})();const $=(s,t)=>s.kind===t.kind&&(s.kind!=="scene"&&s.kind!=="panorama"?!0:t.kind===s.kind&&t.sceneId===s.sceneId),E=s=>[{kind:"cover"},{kind:"scroll"},...s.scenes.flatMap(t=>[{kind:"scene",sceneId:t.id},{kind:"panorama",sceneId:t.id}]),{kind:"summary"}],l="https://tuxiaoling-glb-2026.oss-cn-shenzhen.aliyuncs.com/programs/menghui",f={title:"梦回繁华",eyebrow:"八年级语文 · 长卷探微",subtitle:"从一幅画，走进一座城",description:"沿《清明上河图》由郊野入汴京，在五幕观察中理解散点透视、市井百态与北宋城市生活。",cover:`${l}/04_bridge.webp`,fullScroll:`${l}/00_full_scroll.webp`,scrollRod:`${l}/right_rod.webp`,scenes:[{id:"suburb",order:1,act:"第一幕",title:"郊野春景",image:`${l}/02_suburb.webp`,thumbnail:`${l}/btn_suburb.webp`,panorama:`${l}/360/1.webp`,question:"画面中哪些细节表现了春天和生活气息？",tags:["田野","村舍","行旅","柳树"],hotspots:[{x:35.2,y:70.8,title:"行旅小路",text:"小路上的行人、驴马和车队，使画卷从宁静的郊野生活开始展开。",question:"为什么画家不直接从最热闹的街市开始画？"},{x:79.1,y:16.5,title:"远处城郭",text:"远处若隐若现的城郭，暗示画面即将从郊外进入城市。",question:"这种由远及近的安排有什么好处？"}]},{id:"river",order:2,act:"第二幕",title:"汴河运输",image:`${l}/03_river.webp`,thumbnail:`${l}/btn_river.webp`,panorama:`${l}/360/2.webp`,question:"从汴河运输中，你能看出北宋城市经济的哪些特点？",tags:["船只","码头","货物","商旅"],hotspots:[{x:30.5,y:35.3,title:"汴河船只",text:"河道上的船只表现出水路运输的繁忙，也让画面开始变得热闹。",question:"城市繁华为什么离不开河流和运输？"},{x:62.3,y:75.2,title:"岸边搬运",text:"岸边搬运货物的人物细节，表现出城市商业背后的劳动场景。",question:"这些劳动者为什么也是“繁华”的一部分？"}]},{id:"bridge",order:3,act:"第三幕",title:"虹桥高潮",image:`${l}/04_bridge.webp`,thumbnail:`${l}/btn_bridge.webp`,panorama:`${l}/360/3.webp`,question:"为什么虹桥部分常被认为是全卷的高潮？",tags:["虹桥","船桥相遇","围观者","人流"],hotspots:[{x:49.8,y:30.9,title:"虹桥",text:"虹桥是水陆交通交汇的视觉中心，桥上行人密集，桥下船只穿行。",question:"为什么虹桥最能体现画面的繁华？"},{x:49.7,y:51,title:"桥下船只",text:"船只通过桥洞时形成紧张场面，增强了画面的动感和戏剧性。",question:"这个细节为什么会吸引岸边人群围观？"},{x:28.7,y:49.7,title:"桥头人群",text:"桥头聚集的人群、商贩和行旅，让画面呈现出高度密集的市井气息。",question:"从这些人物中，你能看到哪些社会生活内容？"}]},{id:"gate",order:4,act:"第四幕",title:"城门内外",image:`${l}/05_gate.webp`,thumbnail:`${l}/btn_gate.webp`,panorama:`${l}/360/4.webp`,question:"城门在长卷中起到了什么连接作用？",tags:["城门","车马","行人","空间过渡"],hotspots:[{x:52.8,y:44.8,title:"城门楼",text:"城门楼连接城外与城内，是画卷空间转换的重要标志。",question:"城门为什么能成为画卷中的过渡节点？"},{x:57,y:63,title:"进出人流",text:"进城和出城的人群、车马在这里汇聚，形成繁忙的城市入口。",question:"这里的人流和虹桥的人流有什么不同？"}]},{id:"market",order:5,act:"第五幕",title:"街市繁华",image:`${l}/06_market.webp`,thumbnail:`${l}/btn_market.webp`,panorama:`${l}/360/5.webp`,question:"哪些细节最能表现“繁华”？",tags:["店铺","招牌","摊贩","市井生活"],hotspots:[{x:32.4,y:30,title:"店铺招牌",text:"街市中的店铺、招牌和顾客表现出商业生活的繁盛。",question:"你能从画面中找出哪些行业或职业？"},{x:64.2,y:57,title:"车马行人",text:"密集的车马行人让街市充满动感，体现都城生活的复杂与热闹。",question:"“繁华”除了人多，还体现在哪些方面？"}]}],summary:[{marker:"卷",title:"画卷三段 · 布局之妙",points:["开卷郊野：疏林薄雾、茅檐行旅，一派早春乡间气象。","中段汴河：漕船云集、虹桥险情，叙事进入高潮。","后段街市：城门、酒楼与商旅共同铺陈城市生活。"],takeaway:"由静到动，再由动归静，如一部纸上交响。"},{marker:"市",title:"市井万象 · 内容之丰",points:["人物 814 位：农夫、船工、商贩、轿夫与说书人。","牲畜 83 匹、船只 29 艘，水陆交通一应俱全。","酒楼、茶坊、药铺与摊贩构成繁盛商业网络。"],takeaway:"它不仅是画，也是北宋城市生活的全景档案。"},{marker:"艺",title:"艺术成就 · 技法之精",points:["散点透视让观者移步换景，可行、可望、可游、可居。","人物精工，树木房屋写意，工而不板、放而不乱。","水墨为主、薄施淡彩，设色古朴而含蓄。"],takeaway:"中国画“以大观小”的典范。"},{marker:"史",title:"传世价值 · 意义之重",points:["建筑、服饰与风俗，是研究宋代社会的重要视觉史料。","张择端传世真迹，留下千年前汴京的城市切片。","一幅长卷连接艺术史、城市史与普通人的生活史。"],takeaway:"穿越千年的文化密码，一座永不落幕的纸上京城。"}],reflection:"为什么说《清明上河图》不仅是一幅画，也是一部北宋城市生活的百科全书？哪些细节让你感受到了宋朝人的“烟火气”？"};class L{async preload(t,e=()=>{}){const a=[...new Set(t)];let n=0;const r=[];return await Promise.all(a.map(i=>new Promise(o=>{const u=new Image,b=c=>{n+=1,c||r.push(i),e(n,a.length),o()};u.onload=()=>b(!0),u.onerror=()=>b(!1),u.src=i}))),{loaded:a.length-r.length,failed:r}}}const I="modulepreload",P=function(s,t){return new URL(s,t).href},_={},R=function(t,e,a){let n=Promise.resolve();if(e&&e.length>0){let i=function(c){return Promise.all(c.map(m=>Promise.resolve(m).then(v=>({status:"fulfilled",value:v}),v=>({status:"rejected",reason:v}))))};const o=document.getElementsByTagName("link"),u=document.querySelector("meta[property=csp-nonce]"),b=(u==null?void 0:u.nonce)||(u==null?void 0:u.getAttribute("nonce"));n=i(e.map(c=>{if(c=P(c,a),c in _)return;_[c]=!0;const m=c.endsWith(".css"),v=m?'[rel="stylesheet"]':"";if(!!a)for(let g=o.length-1;g>=0;g--){const w=o[g];if(w.href===c&&(!m||w.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${c}"]${v}`))return;const h=document.createElement("link");if(h.rel=m?"stylesheet":I,m||(h.as="script"),h.crossOrigin="",h.href=c,b&&h.setAttribute("nonce",b),document.head.appendChild(h),m)return new Promise((g,w)=>{h.addEventListener("load",g),h.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${c}`)))})}))}function r(i){const o=new Event("vite:preloadError",{cancelable:!0});if(o.payload=i,window.dispatchEvent(o),!o.defaultPrevented)throw i}return n.then(i=>{for(const o of i||[])o.status==="rejected"&&r(o.reason);return t().catch(r)})};class H{constructor(){d(this,"delegate");d(this,"disposed",!1)}async mount(t){this.disposed=!1;const{ThreePanoramaViewer:e}=await R(async()=>{const{ThreePanoramaViewer:a}=await import("./panorama-JIewwR1D.js");return{ThreePanoramaViewer:a}},[],import.meta.url);this.disposed||(this.delegate=new e,await this.delegate.mount(t))}dispose(){var t;this.disposed=!0,(t=this.delegate)==null||t.dispose(),this.delegate=void 0}}const y=s=>s.kind==="scene"||s.kind==="panorama"?`#/${s.kind}/${s.sceneId}`:`#/${s.kind}`,A=s=>s.replace(/^#\/?/,"").split("/").filter(Boolean);class N{constructor(t){d(this,"listeners",new Set);d(this,"currentRoute");d(this,"syncFromHash",()=>{const t=A(window.location.hash),e=this.parse(t);if(!e){const a=this.sequence[0];window.history.replaceState(null,"",y(a)),this.update(a);return}this.update(e)});if(this.sequence=t,t.length===0)throw new Error("Navigation sequence cannot be empty.");this.currentRoute=t[0]}get current(){return this.currentRoute}get index(){return this.sequence.findIndex(t=>$(t,this.currentRoute))}get total(){return this.sequence.length}start(){window.addEventListener("hashchange",this.syncFromHash),this.syncFromHash()}navigate(t){const e=this.sequence.find(n=>$(n,t));if(!e)return;const a=y(e);if(window.location.hash===a){this.update(e);return}window.location.hash=a}next(){const t=this.sequence[Math.min(this.index+1,this.sequence.length-1)];t&&this.navigate(t)}previous(){const t=this.sequence[Math.max(this.index-1,0)];t&&this.navigate(t)}subscribe(t){return this.listeners.add(t),()=>this.listeners.delete(t)}parse(t){const[e,a]=t,n=e==="cover"||e==="scroll"||e==="summary"?{kind:e}:(e==="scene"||e==="panorama")&&a?{kind:e,sceneId:a}:void 0;return n?this.sequence.find(r=>$(r,n)):void 0}update(t){this.currentRoute=t,this.listeners.forEach(e=>e(t))}}const C=s=>y({kind:"scene",sceneId:s}),F=s=>y({kind:"panorama",sceneId:s}),p=(s,t,e="button")=>`<button class="${e}" type="button" data-route="${y(t)}">${s}</button>`,V=(s,t,e,a)=>{const n=t.kind==="cover"||t.kind==="panorama",r=t.kind==="scene"||t.kind==="panorama"?s.scenes.find(o=>o.id===t.sceneId):void 0,i=r?`${r.act} · ${r.title}`:t.kind==="scroll"?"长卷总览":t.kind==="summary"?"课堂总结":s.eyebrow;return`
    <header class="app-header ${n?"app-header--overlay":""}">
      <button class="brand" type="button" data-route="#/cover" aria-label="回到封面">
        <span class="brand__seal" aria-hidden="true">宋</span>
        <span class="brand__copy"><strong>${s.title}</strong><small>${i}</small></span>
      </button>
      <div class="lesson-progress" aria-label="课程进度 ${e+1}/${a}">
        <span style="width:${(e+1)/a*100}%"></span>
      </div>
      <nav class="app-nav" aria-label="课程导航">
        <button type="button" data-route="#/scroll">长卷</button>
        <button type="button" data-route="#/summary">总结</button>
        <button type="button" data-action="fullscreen" aria-label="进入全屏">全屏</button>
      </nav>
    </header>`},T=s=>{var t;return`
  <main class="cover view-enter">
    <img class="cover__image" src="${s.cover}" alt="《清明上河图》汴京街市局部" />
    <div class="cover__wash" aria-hidden="true"></div>
    <div class="cover__content">
      <p class="eyebrow">${s.eyebrow}</p>
      <h1>${s.title}</h1>
      <p class="cover__subtitle">${s.subtitle}</p>
      <p class="cover__description">${s.description}</p>
      <div class="cover__actions">
        ${p("开始展卷",{kind:"scroll"},"button button--primary")}
        ${p("直接进入五幕",{kind:"scene",sceneId:((t=s.scenes[0])==null?void 0:t.id)??""},"button button--quiet")}
      </div>
    </div>
    <div class="cover__index" aria-hidden="true">
      <span>北宋</span><strong>汴京</strong><span>十二世纪</span>
    </div>
    <p class="key-guide">按 → 开始 · 支持触屏与键盘</p>
  </main>`},D=s=>`
  <main class="scroll-view view-enter">
    <div class="scroll-view__intro">
      <div>
        <p class="eyebrow">全卷路径</p>
        <h1>由郊野，入汴京</h1>
      </div>
      <p>横向拖动长卷，观察叙事如何从安静走向繁华。点击下方题签进入局部赏析。</p>
    </div>
    <div class="scroll-stage" data-scroll-stage tabindex="0" aria-label="可横向拖动的《清明上河图》长卷">
      <div class="scroll-canvas">
        <img class="scroll-canvas__image" src="${s.fullScroll}" alt="《清明上河图》长卷全景" draggable="false" />
        <img class="scroll-canvas__rod" src="${s.scrollRod}" alt="" aria-hidden="true" />
      </div>
    </div>
    <nav class="scene-rail" aria-label="五幕场景">
      ${s.scenes.map(t=>`
            <button type="button" data-route="${C(t.id)}" style="--thumb:url('${t.thumbnail}')">
              <span>0${t.order}</span><strong>${t.title}</strong>
            </button>`).join("")}
    </nav>
  </main>`,O=s=>s.hotspots.map((t,e)=>`
        <button
          class="hotspot"
          type="button"
          style="left:${t.x}%;top:${t.y}%"
          data-hotspot="${e}"
          aria-label="观察点：${t.title}"
        ><span>${e+1}</span></button>`).join(""),j=(s,t)=>{const e=s.scenes.findIndex(r=>r.id===t.id),a=s.scenes[e-1],n=s.scenes[e+1];return`
    <main class="scene-view view-enter" data-scene-id="${t.id}">
      <section class="scene-art" aria-label="${t.title}画面">
        <div class="scene-artboard">
          <img src="${t.image}" alt="${t.title}" draggable="false" />
          ${O(t)}
        </div>
        <div class="scene-art__caption"><span>${t.act}</span><strong>${t.title}</strong></div>
      </section>
      <aside class="scene-inspector">
        <p class="eyebrow">局部赏析 · 0${t.order}</p>
        <h1>${t.title}</h1>
        <p class="scene-question"><span>观察任务</span>${t.question}</p>
        <ul class="tag-list">${t.tags.map(r=>`<li>${r}</li>`).join("")}</ul>
        <div class="scene-tools">
          <button class="text-action" type="button" data-action="toggle-hotspots">显示观察点</button>
          <button class="text-action text-action--accent" type="button" data-route="${F(t.id)}">进入 360° 场景</button>
        </div>
        <div class="scene-pagination">
          ${a?p("← 上一幕",{kind:"scene",sceneId:a.id},"button button--quiet"):p("← 长卷",{kind:"scroll"},"button button--quiet")}
          ${n?p("下一幕 →",{kind:"scene",sceneId:n.id},"button button--primary"):p("课堂总结 →",{kind:"summary"},"button button--primary")}
        </div>
      </aside>
      <aside class="note-drawer" data-note aria-hidden="true">
        <button type="button" class="note-drawer__close" data-action="close-note" aria-label="关闭观察点">×</button>
        <p class="eyebrow">画中有话</p>
        <h2 data-note-title></h2>
        <p data-note-text></p>
        <blockquote data-note-question></blockquote>
      </aside>
    </main>`},U=s=>`
  <main class="panorama-view view-enter">
    <div class="panorama-canvas" data-panorama aria-label="${s.title} 360度观察"></div>
    <div class="panorama-tint" aria-hidden="true"></div>
    <div class="panorama-status" data-panorama-status>
      <span class="spinner" aria-hidden="true"></span>
      <strong>正在进入 ${s.title}</strong>
      <small>读取 360° 场景</small>
    </div>
    <div class="panorama-copy">
      <p class="eyebrow">360° 沉浸观察</p>
      <h1>${s.title}</h1>
      <p>拖拽旋转 · 滚轮或双指缩放</p>
    </div>
    <div class="panorama-actions">
      ${p("← 返回局部赏析",{kind:"scene",sceneId:s.id},"button button--glass")}
      <button class="button button--glass" type="button" data-action="fullscreen">全屏观察</button>
    </div>
  </main>`,B=s=>`
  <main class="summary-view view-enter">
    <header class="summary-view__head">
      <p class="eyebrow">课堂总结</p>
      <h1>从一幅画，看见一座城</h1>
      <p>《清明上河图》不只记录繁华，也记录繁华如何被劳动、交通与日常生活共同创造。</p>
    </header>
    <div class="summary-grid">
      ${s.summary.map(t=>`
            <section class="summary-column">
              <span class="summary-column__marker" aria-hidden="true">${t.marker}</span>
              <h2>${t.title}</h2>
              <ul>${t.points.map(e=>`<li>${e}</li>`).join("")}</ul>
              <strong class="summary-column__takeaway">${t.takeaway}</strong>
            </section>`).join("")}
    </div>
    <footer class="summary-reflection">
      <div><span>课堂思考</span><p>${s.reflection}</p></div>
      <div class="summary-reflection__actions">
        ${p("再次展卷",{kind:"scroll"},"button button--quiet")}
        ${p("回到封面",{kind:"cover"},"button button--primary")}
      </div>
    </footer>
  </main>`;class M{constructor(t,e,a,n){d(this,"panorama");d(this,"currentScene");d(this,"hotspotsVisible",!1);d(this,"handleClick",t=>{const e=t.target instanceof Element?t.target:void 0;if(!e)return;const a=e.closest("[data-route]");if(a!=null&&a.dataset.route){t.preventDefault();const i=this.routeFromHash(a.dataset.route);i&&this.navigation.navigate(i);return}const n=e.closest("[data-hotspot]");if(n&&this.currentScene){const i=Number(n.dataset.hotspot),o=this.currentScene.hotspots[i];o&&this.openNote(o.title,o.text,o.question);return}const r=e.closest("[data-action]");switch(r==null?void 0:r.dataset.action){case"toggle-hotspots":this.toggleHotspots(r);break;case"close-note":this.closeNote();break;case"fullscreen":this.requestFullscreen();break}});d(this,"handleKeydown",t=>{var a;const e=(a=t.target)==null?void 0:a.tagName;e==="INPUT"||e==="TEXTAREA"||e==="SELECT"||((t.key==="ArrowRight"||t.key==="PageDown")&&(t.preventDefault(),this.navigation.next()),(t.key==="ArrowLeft"||t.key==="PageUp")&&(t.preventDefault(),this.navigation.previous()),t.key==="Escape"&&this.closeNote())});this.root=t,this.lesson=e,this.navigation=a,this.panoramaFactory=n,this.root.addEventListener("click",this.handleClick),document.addEventListener("keydown",this.handleKeydown)}render(t){var a;(a=this.panorama)==null||a.dispose(),this.panorama=void 0,this.currentScene=this.resolveScene(t),this.hotspotsVisible=!1;const e=this.renderView(t);this.root.innerHTML=`
      <div class="app-shell app-shell--${t.kind}">
        ${V(this.lesson,t,this.navigation.index,this.navigation.total)}
        ${e}
        <div class="edge-grain" aria-hidden="true"></div>
      </div>`,document.body.dataset.view=t.kind,this.hydrate(t)}renderView(t){switch(t.kind){case"cover":return T(this.lesson);case"scroll":return D(this.lesson);case"scene":return this.currentScene?j(this.lesson,this.currentScene):"";case"panorama":return this.currentScene?U(this.currentScene):"";case"summary":return B(this.lesson)}}hydrate(t){t.kind==="scroll"&&this.enableScrollDrag(),t.kind==="panorama"&&this.currentScene&&this.mountPanorama(this.currentScene)}resolveScene(t){if(!(t.kind!=="scene"&&t.kind!=="panorama"))return this.lesson.scenes.find(e=>e.id===t.sceneId)}routeFromHash(t){const[e,a]=t.replace(/^#\/?/,"").split("/");if(e==="cover"||e==="scroll"||e==="summary")return{kind:e};if((e==="scene"||e==="panorama")&&a)return{kind:e,sceneId:a}}toggleHotspots(t){this.hotspotsVisible=!this.hotspotsVisible;const e=this.root.querySelector(".scene-view");e==null||e.classList.toggle("scene-view--hotspots",this.hotspotsVisible),t.textContent=this.hotspotsVisible?"隐藏观察点":"显示观察点"}openNote(t,e,a){const n=this.root.querySelector("[data-note]");if(!n)return;const r=n.querySelector("[data-note-title]"),i=n.querySelector("[data-note-text]"),o=n.querySelector("[data-note-question]");r&&(r.textContent=t),i&&(i.textContent=e),o&&(o.textContent=a),n.classList.add("note-drawer--open"),n.setAttribute("aria-hidden","false")}closeNote(){const t=this.root.querySelector("[data-note]");t==null||t.classList.remove("note-drawer--open"),t==null||t.setAttribute("aria-hidden","true")}enableScrollDrag(){const t=this.root.querySelector("[data-scroll-stage]");if(!t)return;let e,a=0,n=0;t.addEventListener("pointerdown",i=>{e=i.pointerId,a=i.clientX,n=t.scrollLeft,t.setPointerCapture(i.pointerId),t.classList.add("scroll-stage--dragging")}),t.addEventListener("pointermove",i=>{e===i.pointerId&&(t.scrollLeft=n-(i.clientX-a)*1.25)});const r=i=>{e===i.pointerId&&(e=void 0,t.classList.remove("scroll-stage--dragging"))};t.addEventListener("pointerup",r),t.addEventListener("pointercancel",r),t.addEventListener("wheel",i=>{Math.abs(i.deltaY)>Math.abs(i.deltaX)&&(i.preventDefault(),t.scrollLeft+=i.deltaY)},{passive:!1})}async mountPanorama(t){const e=this.root.querySelector("[data-panorama]"),a=this.root.querySelector("[data-panorama-status]");e&&(this.panorama=this.panoramaFactory(),await this.panorama.mount({container:e,imageUrl:t.panorama,onReady:()=>a==null?void 0:a.classList.add("panorama-status--ready"),onError:()=>{a&&(a.classList.add("panorama-status--error"),a.innerHTML="<strong>360° 场景暂时无法加载</strong><small>可返回局部赏析继续课堂</small>")}}))}async requestFullscreen(){if(document.fullscreenElement){await document.exitFullscreen();return}await document.documentElement.requestFullscreen()}}const q=document.querySelector("#app");if(!q)throw new Error("App root was not found.");const k=new N(E(f)),X=new M(q,f,k,()=>new H);k.subscribe(s=>X.render(s));k.start();const z=new L;z.preload([f.cover,f.fullScroll,...f.scenes.map(s=>s.thumbnail)]);
