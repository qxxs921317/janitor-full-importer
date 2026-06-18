/** * 🧹 요술 빗자루 (JanitorAI Full Importer v2.0)
 * 백엔드 없이 순수 프론트엔드로 동작 
 * - 브라우저에서 JanitorAI API 직접 fetch 시도 
 * - CORS 차단 시 JSON 파일 업로드 / 붙여넣기 fallback 
 */
(function () {
'use strict';
const EXT = 'janitor-full-importer';
const JAI_API = 'https://janitorai.com/hampter/characters/';

// ── CSS ──────────────────────────────────────────
const CSS = `
#jai-panel { padding:12px 16px; max-width:620px; }
/* 탭 */
.jai-tabs { display:flex; gap:4px; margin-bottom:12px; }
.jai-tab {
    flex:1; padding:6px; border-radius:6px; font-size:0.82em;
    border:1px solid var(--SmartThemeBorderColor);
    background:transparent; color:var(--SmartThemeBodyColor);
    cursor:pointer; text-align:center;
}
.jai-tab.active {
    background:var(--SmartThemeBorderColor);
    font-weight:bold;
}
/* URL 탭 */
.jai-row { display:flex; gap:8px; margin-bottom:8px; }
#jai-url-input {
    flex:1; padding:6px 10px; border-radius:6px; min-width:0;
    border:1px solid var(--SmartThemeBorderColor);
    background:var(--SmartThemeBlurTintColor);
    color:var(--SmartThemeBodyColor); font-size:0.85em;
}
/* JSON 탭 */
#jai-drop-zone {
    border:2px dashed var(--SmartThemeBorderColor);
    border-radius:8px; padding:20px; text-align:center;
    cursor:pointer; margin-bottom:8px; font-size:0.85em;
    transition:background .15s;
}
#jai-drop-zone.drag-over { background:rgba(255,255,255,.07); }
#jai-json-paste {
    width:100%; height:100px; padding:8px; border-radius:6px; resize:vertical;
    border:1px solid var(--SmartThemeBorderColor);
    background:var(--SmartThemeBlurTintColor);
    color:var(--SmartThemeBodyColor); font-size:0.78em; font-family:monospace;
    box-sizing:border-box;
}
/* 상태 */
.jai-status { padding:7px 12px; border-radius:6px; font-size:0.83em; margin:6px 0; }
.jai-status.info    { background:rgba(100,150,255,.15); }
.jai-status.ok      { background:rgba(80,200,120,.15); color:#6fcf97; }
.jai-status.err     { background:rgba(235,87,87,.15);  color:#eb5757; }
.jai-status.warn    { background:rgba(255,180,50,.15); color:#f2c94c; }
/* 미리보기 */
.jai-preview-head { display:flex; gap:12px; margin:10px 0; }
#jai-avatar {
    width:68px; height:68px; object-fit:cover;
    border-radius:6px; border:1px solid var(--SmartThemeBorderColor); flex-shrink:0;
}
.jai-cname { font-size:1em; font-weight:bold; margin-bottom:3px; }
.jai-cmeta { font-size:0.78em; opacity:.7; line-height:1.6; }
.jai-gcnt  { font-size:0.82em; color:#a8d8a8; margin-top:3px; }
.jai-lb-notice {
    font-size:0.82em; padding:5px 10px; margin-bottom:8px;
    background:rgba(255,200,80,.1); border-left:3px solid #f2c94c; border-radius:4px;
}
.jai-actions { display:flex; flex-wrap:wrap; gap:8px; margin:8px 0; }
.jai-actions .menu_button { font-size:0.82em; padding:5px 12px; }
.jai-g-list { margin-top:8px; border-top:1px solid var(--SmartThemeBorderColor); padding-top:8px; }
.jai-g-label { font-size:0.76em; opacity:.55; margin-bottom:5px; }
.jai-g-item {
    font-size:0.77em; padding:4px 8px; margin-bottom:3px;
    background:rgba(255,255,255,.04); border-radius:4px;
    border-left:2px solid var(--SmartThemeBorderColor);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.jai-g-item:hover { background:rgba(255,255,255,.08); white-space:normal; word-break:break-word; }
.jai-g-tag { font-size:.74em; opacity:.55; margin-right:4px; }
`;

// ── HTML ─────────────────────────────────────────
const HTML = `
<div id="jai-panel">
  <div class="jai-tabs">
    <button class="jai-tab active" data-tab="url">🔗 URL로 가져오기</button>
    <button class="jai-tab" data-tab="json">📋 JSON 붙여넣기</button>
  </div>
  <div id="jai-tab-url">
    <div class="jai-row">
      <input id="jai-url-input" type="text"
        placeholder="https://janitorai.com/characters/UUID_character-slug"
        autocomplete="off" spellcheck="false"/>
      <button id="jai-fetch-btn" class="menu_button">가져오기</button>
    </div>
    <div style="font-size:0.76em;opacity:.5;margin-bottom:4px;">
      ※ JanitorAI CORS 정책에 따라 직접 fetch가 차단될 수 있습니다. 차단 시 JSON 탭을 이용하세요.
    </div>
  </div>
  <div id="jai-tab-json" style="display:none;">
    <div id="jai-drop-zone">
      📂 JanitorAI에서 Export한 JSON 파일을 여기에 드래그 &amp; 드롭<br>
      <span style="font-size:.8em;opacity:.6;">또는 아래에 JSON 내용을 직접 붙여넣기</span>
    </div>
    <input type="file" id="jai-file-input" accept=".json" style="display:none"/>
    <textarea id="jai-json-paste" placeholder='{"character": {...}, "character_definition": {...}}'></textarea>
    <div style="margin-top:6px;">
      <button id="jai-parse-btn" class="menu_button" style="font-size:0.82em;">📥 JSON 파싱</button>
    </div>
  </div>
  <div id="jai-status" class="jai-status" style="display:none;"></div>
  <div id="jai-preview" style="display:none;">
    <div class="jai-preview-head">
      <img id="jai-avatar" src="" alt=""/>
      <div>
        <div id="jai-cname" class="jai-cname"></div>
        <div id="jai-cmeta" class="jai-cmeta"></div>
        <div id="jai-gcnt"  class="jai-gcnt"></div>
      </div>
    </div>
    <div id="jai-lb-notice" class="jai-lb-notice" style="display:none;">📚 로어북 포함</div>
    <div class="jai-actions">
      <button id="jai-dl-png"  class="menu_button">🖼️ PNG 다운로드</button>
      <button id="jai-dl-lb"   class="menu_button" style="display:none;">📖 로어북 JSON</button>
      <button id="jai-dl-both" class="menu_button" style="display:none;">💾 둘 다 받기</button>
    </div>
    <div class="jai-g-list">
      <div class="jai-g-label">그리팅 목록:</div>
      <div id="jai-g-items"></div>
    </div>
  </div>
</div>`;

// ── CRC32 ────────────────────────────────────────
const CRC_TBL = (() => {
    const t = new Uint32Array(256);
    for (let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[i]=c;}
    return t;
})();
function crc32(d){let c=0xffffffff;for(let i=0;i<d.length;i++)c=CRC_TBL[(c^d[i])&0xff]^(c>>>8);return(c^0xffffffff)>>>0;}

// ── PNG embed ────────────────────────────────────
function embedPng(pngBytes, card) {
    const b64  = btoa(unescape(encodeURIComponent(JSON.stringify(card))));
    const enc  = new TextEncoder();
    const kw   = enc.encode('chara');
    const val  = enc.encode(b64);
    const data = new Uint8Array(kw.length+1+val.length);
    data.set(kw); data[kw.length]=0; data.set(val,kw.length+1);
    const type = enc.encode('tEXt');
    const ci   = new Uint8Array(type.length+data.length);
    ci.set(type); ci.set(data,type.length);
    const chunk = new Uint8Array(4+4+data.length+4);
    const dv    = new DataView(chunk.buffer);
    dv.setUint32(0,data.length,false); chunk.set(type,4); chunk.set(data,8);
    dv.setUint32(8+data.length,crc32(ci),false);
    let iend=-1;
    for(let i=pngBytes.length-12;i>0;i--){
        if(pngBytes[i]===0x49&&pngBytes[i+1]===0x45&&pngBytes[i+2]===0x4E&&pngBytes[i+3]===0x44){iend=i-4;break;}
    }
    if(iend<0)throw new Error('IEND not found');
    const out=new Uint8Array(pngBytes.length+chunk.length);
    out.set(pngBytes.subarray(0,iend)); out.set(chunk,iend); out.set(pngBytes.subarray(iend),iend+chunk.length);
    return out;
}

// ── JanitorAI → TavernV2 ─────────────────────────
function toCard(raw) {
    const meta = raw.character || raw;
    const def  = raw.character_definition || raw.definition || {};
    const alts = Array.isArray(def.alternate_greetings||meta.alternate_greetings)
        ? (def.alternate_greetings||meta.alternate_greetings).filter(g=>typeof g==='string'&&g.trim())
        : [];
    const lbRaw = def.lorebook || meta.lorebook;
    let cb;
    if(lbRaw?.entries?.length){
        cb={name:lbRaw.name||`${meta.name} Lorebook`,entries:lbRaw.entries.map((e,i)=>({
            uid:i,key:Array.isArray(e.keywords)?e.keywords:[e.key||''].filter(Boolean),
            keysecondary:e.secondary_keywords||[],comment:e.comment||e.name||'',
            content:e.content||'',constant:e.constant||false,selective:e.selective||false,
            order:e.order??i,position:e.position||'before_char',disable:e.disabled||false,
            addMemo:true,displayIndex:i,probability:e.probability??100,useProbability:e.probability!=null,
        }))};
    }
    return {
        spec:'chara_card_v2',spec_version:'2.0',
        data:{
            name:meta.name||'',
            description:def.description||def.personality||'',
            personality:def.personality||'',scenario:def.scenario||'',
            first_mes:def.first_mes||meta.greeting||'',
            mes_example:def.mes_example||def.example_dialogs||'',
            alternate_greetings:alts,
            creator:meta.author_name||meta.creator||'',
            creator_notes:def.creator_notes||meta.description||'',
            tags:Array.isArray(meta.tags)?meta.tags:[],
            system_prompt:def.system_prompt||'',
            post_history_instructions:def.post_history_instructions||'',
            character_book:cb,
            extensions:{janitor_id:meta.id||'',janitor_nsfw:meta.is_nsfw||false,
                janitor_origin:`https://janitorai.com/characters/${meta.id||''}`},
        },
    };
}

// ── 유틸 ─────────────────────────────────────────
function san(s){return(s||'character').replace(/[<>:"/\\|?*\x00-\x1F]/g,'_').trim();}
function dl(blob,name){
    const u=URL.createObjectURL(blob),a=Object.assign(document.createElement('a'),{href:u,download:name});
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);
}
function st(msg,cls='info'){
    const el=document.getElementById('jai-status');if(!el)return;
    el.textContent=msg;el.className='jai-status '+cls;el.style.display=msg?'block':'none';
}

// ── 아바타 fetch ──────────────────────────────────
async function fetchAvatar(url) {
    if (!url) return null;
    try { const r=await fetch(url); if(r.ok)return new Uint8Array(await r.arrayBuffer()); } catch{}
    return null;
}
async function defaultAvatar(name) {
    const c=Object.assign(document.createElement('canvas'),{width:400,height:400});
    const x=c.getContext('2d');
    x.fillStyle='#2a2a3a';x.fillRect(0,0,400,400);
    x.fillStyle='#8888aa';x.font='bold 180px sans-serif';x.textAlign='center';x.textBaseline='middle';
    x.fillText((name||'?')[0].toUpperCase(),200,200);
    return new Promise(r=>c.toBlob(b=>{const fr=new FileReader();fr.onload=()=>r(new Uint8Array(fr.result));fr.readAsArrayBuffer(b);},'image/png'));
}

// ── 상태 저장 ─────────────────────────────────────
let _raw=null, _card=null;

// ── 미리보기 렌더 ──────────────────────────────────
function renderPreview(raw, card) {
    _raw=raw; _card=card;
    const meta=raw.character||raw;
    const alts=card.data.alternate_greetings;
    const grts=[card.data.first_mes,...alts].filter(Boolean);
    const hasLb=!!card.data.character_book?.entries?.length;
    
    document.getElementById('jai-cname').textContent=card.data.name;
    document.getElementById('jai-cmeta').innerHTML=
        `👤 ${card.data.creator||'unknown'}&nbsp;&nbsp;`+
        (meta.chat_count!=null?`💬 ${Number(meta.chat_count).toLocaleString()}회&nbsp;&nbsp;`:'')+
        (meta.is_nsfw?'🔞 NSFW':'✅ SFW');
    document.getElementById('jai-gcnt').textContent=
        `🗣️ 그리팅 ${grts.length}개`+(alts.length?` (기본 1 + 대체 ${alts.length}개)`:'');
        
    const av=meta.profile_pic_url||meta.avatar_url||'';
    if(av) document.getElementById('jai-avatar').src=av;
    
    document.getElementById('jai-lb-notice').style.display=hasLb?'block':'none';
    document.getElementById('jai-dl-lb').style.display=hasLb?'':'none';
    document.getElementById('jai-dl-both').style.display=hasLb?'':'none';
    
    const cont=document.getElementById('jai-g-items');
    cont.innerHTML='';
    grts.forEach((g,i)=>{
        const d=document.createElement('div');
        d.className='jai-g-item';d.title=g;
        d.innerHTML=`<span class="jai-g-tag">${i===0?'기본':`#${i}`}</span>${g.slice(0,110)}${g.length>110?'…':''}`;
        cont.appendChild(d);
    });
    document.getElementById('jai-preview').style.display='block';
}

// ── URL fetch ─────────────────────────────────────
async function fetchByUrl(input) {
    const m=input.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if(!m){st('❌ 유효한 JanitorAI URL 또는 UUID를 입력하세요.','err');return;}
    
    document.getElementById('jai-preview').style.display='none';
    document.getElementById('jai-fetch-btn').disabled=true;
    st('⏳ 직접 fetch 시도 중...','info');
    
    try {
        const resp = await fetch(JAI_API + m[1], {
            headers:{ 'Accept':'application/json', 'Referer':'https://janitorai.com/' }
        });
        if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const raw = await resp.json();
        const card = toCard(raw);
        const alts = card.data.alternate_greetings.length;
        st(`✅ 로드 완료! 그리팅 ${1+alts}개 (대체: ${alts}개)`,'ok');
        renderPreview(raw, card);
    } catch(err) {
        // CORS 차단 판단
        const isCors = err.message.includes('Failed to fetch') || err.message.includes('NetworkError');
        if(isCors){
            st('⚠️ CORS 차단됨 — JSON 탭에서 JanitorAI Export JSON을 붙여넣어 주세요.','warn');
            // 자동으로 JSON 탭 전환
            switchTab('json');
        } else {
            st(`❌ 오류: ${err.message}`,'err');
        }
    } finally {
        document.getElementById('jai-fetch-btn').disabled=false;
    }
}

// ── JSON 파싱 ──────────────────────────────────────
function parseJson(jsonStr) {
    let raw;
    try { raw=JSON.parse(jsonStr.trim()); } catch(e){ st('❌ JSON 파싱 실패: '+e.message,'err'); return; }
    
    // 구조 검증
    const hasChar = raw.character || raw.name || raw.data;
    if(!hasChar){ st('❌ JanitorAI 캐릭터 JSON이 아닌 것 같습니다.','err'); return; }
    
    // TavernAI V2 카드가 그대로 들어온 경우 처리
    if(raw.spec==='chara_card_v2'){
        _raw={character:{name:raw.data?.name||'',profile_pic_url:''}};
        _card=raw;
        st('✅ TavernAI 카드 파싱 완료!','ok');
        renderPreview(_raw,_card);
        return;
    }
    
    const card=toCard(raw);
    const alts=card.data.alternate_greetings.length;
    st(`✅ 파싱 완료! 그리팅 ${1+alts}개 (대체: ${alts}개)`,'ok');
    renderPreview(raw,card);
}

// ── 다운로드 ───────────────────────────────────────
async function dlPng() {
    if(!_card)return;
    const meta=_raw?.character||_raw||{};
    const name=san(meta.name||_card.data.name);
    st('⏳ PNG 생성 중...','info');
    try {
        let bytes=await fetchAvatar(meta.profile_pic_url||meta.avatar_url||'');
        if(!bytes) bytes=await defaultAvatar(_card.data.name);
        dl(new Blob([embedPng(bytes,_card)],{type:'image/png'}),`${name}.png`);
        st('✅ PNG 다운로드 완료!','ok');
    } catch(e){ st('❌ PNG 실패: '+e.message,'err'); }
}
function dlLb() {
    if(!_card?.data?.character_book)return;
    const meta=_raw?.character||_raw||{};
    const name=san(meta.name||_card.data.name);
    const lb=_card.data.character_book;
    dl(new Blob([JSON.stringify({name:lb.name,entries:Object.fromEntries(lb.entries.map((e,i)=>[i,e])),extensions:{}},null,2)],{type:'application/json'}),`${name}_lorebook.json`);
    st('✅ 로어북 다운로드 완료!','ok');
}
async function dlBoth(){ await dlPng(); dlLb(); }

// ── 탭 전환 ───────────────────────────────────────
function switchTab(id) {
    document.querySelectorAll('.jai-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===id));
    document.getElementById('jai-tab-url').style.display  = id==='url'  ? '' : 'none';
    document.getElementById('jai-tab-json').style.display = id==='json' ? '' : 'none';
}

// ── 초기화 ────────────────────────────────────────
function init() {
    const style=document.createElement('style');
    style.textContent=CSS;
    document.head.appendChild(style);
    
    const wrap=document.createElement('div');
    wrap.className='inline-drawer';
    wrap.innerHTML=`
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>🧹요술 빗자루</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">${HTML}</div>`;
        
    const target=document.getElementById('extensions_settings') 
               || document.getElementById('extensions_settings2');
    if(target) target.appendChild(wrap);
    
    // 탭 클릭
    document.addEventListener('click', e=>{
        if(e.target.closest('.jai-tab')) {
            switchTab(e.target.closest('.jai-tab').dataset.tab);
        }
        if(e.target.id==='jai-fetch-btn'){
            const v=document.getElementById('jai-url-input')?.value?.trim();
            if(v) fetchByUrl(v);
        }
        if(e.target.id==='jai-parse-btn'){
            const v=document.getElementById('jai-json-paste')?.value?.trim();
            if(v) parseJson(v);
            else st('❌ JSON을 입력하세요.','err');
        }
        if(e.target.id==='jai-dl-png')  dlPng();
        if(e.target.id==='jai-dl-lb')   dlLb();
        if(e.target.id==='jai-dl-both') dlBoth();
        if(e.target.id==='jai-drop-zone') document.getElementById('jai-file-input').click();
    });
    
    // Enter 키
    document.addEventListener('keydown', e=>{
        if(e.target.id==='jai-url-input'&&e.key==='Enter'){
            const v=e.target.value.trim(); if(v) fetchByUrl(v);
        }
    });
    
    // 파일 업로드
    document.addEventListener('change', e=>{
        if(e.target.id==='jai-file-input'&&e.target.files[0]){
            const fr=new FileReader();
            fr.onload=()=>parseJson(fr.result);
            fr.readAsText(e.target.files[0]);
        }
    });
    
    // 드래그 앤 드롭
    document.addEventListener('dragover', e=>{
        if(e.target.id==='jai-drop-zone'){e.preventDefault();e.target.classList.add('drag-over');}
    });
    document.addEventListener('dragleave', e=>{
        if(e.target.id==='jai-drop-zone') e.target.classList.remove('drag-over');
    });
    document.addEventListener('drop', e=>{
        if(e.target.id==='jai-drop-zone'){
            e.preventDefault();e.target.classList.remove('drag-over');
            const f=e.dataTransfer.files[0];
            if(f){const fr=new FileReader();fr.onload=()=>parseJson(fr.result);fr.readAsText(f);}
        }
    });
    
    console.log('[🧹요술 빗자루 v2] 로드 완료 (백엔드 없음)');
}

if(typeof jQuery!=='undefined') jQuery(init);
else if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();
})();