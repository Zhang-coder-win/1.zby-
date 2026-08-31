(()=>{
  const SB_URL='https://braouypqkiuiwujcyaao.supabase.co';
  const SB_KEY='sb_publishable_cTw3hrZD4R3UnZ4fDVI_pw_8Gkzbzfn';
  const LOCAL_KEY='paper-radar-v4', LEGACY_KEY='paper-radar-v3', FAV_KEY='paper-radar-favorites-v1';
  const GROUP_KEY='paper-radar-endnote-groups-v1', MAP_KEY='paper-radar-endnote-map-v1', META_KEY='paper-radar-endnote-meta-v1';
  let papers=[], local=[], cloud=[], groups=[], groupMap={}, meta={}, selected=new Set(), activeGroup='all', current=null;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const ident=p=>(p.doi||'').trim().toLowerCase()||(p.title||'').trim().toLowerCase();
  const uid=()=>crypto.randomUUID?crypto.randomUUID():'g'+Date.now()+Math.random().toString(36).slice(2);
  const toast=s=>typeof window.toast==='function'?window.toast(s):alert(s);
  const download=(name,text,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};
  const norm=(p={})=>({id:p.id||uid(),title:(p.title||'').trim(),authors:(p.authors||'').trim(),year:String(p.year||p.publication_year||'').trim(),journal:(p.journal||'').trim(),doi:(p.doi||'').trim(),url:(p.url||'').trim(),category:(p.category||'未分类').trim()||'未分类',relevance:p.relevance||'中',status:p.status||p.reading_status||'待读',keywords:(p.keywords||'').trim(),notes:(p.notes||'').trim(),origin:p.origin||'local',discoveredAt:p.discoveredAt||p.discovered_at||'',publishedAt:p.publishedAt||p.published_at||''});

  function loadSettings(){
    try{groups=JSON.parse(localStorage.getItem(GROUP_KEY)||'[]')||[]}catch{groups=[]}
    try{groupMap=JSON.parse(localStorage.getItem(MAP_KEY)||'{}')||{}}catch{groupMap={}}
    try{meta=JSON.parse(localStorage.getItem(META_KEY)||'{}')||{}}catch{meta={}}
    if(!groups.length){groups=[{id:'g-reading',name:'重点精读'},{id:'g-review',name:'综述候选'},{id:'g-method',name:'方法学'}];saveSettings()}
  }
  function saveSettings(){localStorage.setItem(GROUP_KEY,JSON.stringify(groups));localStorage.setItem(MAP_KEY,JSON.stringify(groupMap));localStorage.setItem(META_KEY,JSON.stringify(meta))}
  function loadLocal(){try{let raw=localStorage.getItem(LOCAL_KEY)||localStorage.getItem(LEGACY_KEY)||'[]';local=(JSON.parse(raw)||[]).filter(x=>!String(x.id||'').startsWith('cloud-')).map(x=>norm({...x,origin:'local'}))}catch{local=[]}}
  async function loadCloud(){try{const r=await fetch(SB_URL+'/rest/v1/papers?select=*&order=discovered_at.desc&limit=1000',{headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY}});if(!r.ok)throw Error(r.status);const rows=await r.json();cloud=rows.map(x=>norm({id:'cloud-'+x.id,title:x.title,authors:x.authors,year:x.publication_year,journal:x.journal,doi:x.doi,url:x.url,category:x.category,relevance:x.relevance,status:x.reading_status,keywords:x.keywords,notes:x.notes,origin:'cloud',discoveredAt:x.discovered_at,publishedAt:x.published_at}))}catch(e){console.warn(e);cloud=[]}}
  function rebuild(){const seen=new Set();papers=[...cloud,...local].filter(p=>{let k=ident(p);if(!k||seen.has(k))return false;seen.add(k);return true});renderAll()}
  function favSet(){try{return new Set(JSON.parse(localStorage.getItem(FAV_KEY)||'[]')||[])}catch{return new Set()}}
  function dateScore(p){return Date.parse(p.discoveredAt||p.publishedAt||`${p.year||1900}-01-01`)||0}
  function duplicateKeys(){const counts={};papers.forEach(p=>{let t=(p.title||'').trim().toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g,' ');if(t)counts[t]=(counts[t]||0)+1});return new Set(Object.entries(counts).filter(([,v])=>v>1).map(([k])=>k))}
  function inGroup(p,gid){return (groupMap[ident(p)]||[]).includes(gid)}
  function filtered(){
    let q=($('enSearch')?.value||'').trim().toLowerCase(), fav=favSet(), dups=duplicateKeys();
    let arr=papers.filter(p=>{
      if(q && ![p.title,p.authors,p.journal,p.doi,p.keywords,p.category].join(' ').toLowerCase().includes(q))return false;
      if(activeGroup==='all')return true;
      if(activeGroup==='unfiled')return !(groupMap[ident(p)]||[]).length;
      if(activeGroup==='todo')return p.status==='待读';
      if(activeGroup==='fav')return fav.has(ident(p));
      if(activeGroup==='recent')return dateScore(p)>=Date.now()-30*864e5;
      if(activeGroup==='dups'){let t=(p.title||'').trim().toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g,' ');return dups.has(t)}
      return inGroup(p,activeGroup);
    });
    let sort=$('enSort')?.value||'year';
    arr.sort(sort==='author'?(a,b)=>a.authors.localeCompare(b.authors):sort==='title'?(a,b)=>a.title.localeCompare(b.title):sort==='added'?(a,b)=>dateScore(b)-dateScore(a):(a,b)=>(+b.year||0)-(+a.year||0));
    return arr;
  }

  function install(){
    if($('view-endnote'))return;
    const importNav=document.querySelector('.nav-item[data-view="import"]');
    const nav=document.createElement('button');nav.className='nav-item';nav.dataset.view='endnote';nav.innerHTML='<span>▤</span><b>文献管理</b><em id="navEndnoteCount">0</em>';
    importNav?.parentNode.insertBefore(nav,importNav);
    const importView=$('view-import');
    const view=document.createElement('section');view.className='view';view.id='view-endnote';
    view.innerHTML=`
      <div class="page-head endnote-page-head"><div><span class="section-label">REFERENCE MANAGER</span><h1>文献管理</h1><p>EndNote 式三栏工作区：分组、参考文献列表、详细字段和引用导出。</p></div><div class="page-actions"><button class="btn soft" id="enImportRisBtn">导入 RIS</button><input id="enImportRis" type="file" accept=".ris,.txt" hidden><button class="btn soft" id="enExportRis">导出 RIS</button><button class="btn soft" id="enExportBib">导出 BibTeX</button><button class="btn primary" id="enNewGroup">＋ 新建分组</button></div></div>
      <section class="endnote-shell card">
        <aside class="en-groups">
          <div class="en-pane-title"><b>我的文献库</b><span id="enTotalCount">0</span></div>
          <div class="en-tree" id="enSmartGroups"></div>
          <div class="en-tree-head"><span>我的分组</span><button id="enGroupPlus">＋</button></div>
          <div class="en-tree" id="enCustomGroups"></div>
          <div class="en-group-help">拖拽式归组将在后续版本加入；当前可多选后批量加入分组。</div>
        </aside>
        <section class="en-center">
          <div class="en-toolbar"><label class="en-search">⌕<input id="enSearch" placeholder="搜索题目 / 作者 / DOI / 关键词"></label><select id="enSort"><option value="year">年份 ↓</option><option value="added">最近加入</option><option value="author">作者 A-Z</option><option value="title">题目 A-Z</option></select><span id="enResultCount">0 篇</span></div>
          <div class="en-bulk" id="enBulk"><label><input type="checkbox" id="enSelectAll"> 全选</label><span id="enSelectedCount">已选 0</span><select id="enMoveGroup"><option value="">加入分组…</option></select><button id="enApplyGroup">应用</button><button id="enClearSelect">取消选择</button></div>
          <div class="en-list-head"><span></span><span>作者</span><span>年份</span><span>题目</span><span>期刊</span></div>
          <div class="en-list" id="enList"></div>
        </section>
        <aside class="en-detail" id="enDetail"><div class="en-empty-detail"><span>▤</span><b>选择一篇文献</b><p>这里会显示参考文献字段、标签、笔记与引用格式。</p></div></aside>
      </section>`;
    importView?.parentNode.insertBefore(view,importView);
    bind();
    nav.onclick=()=>switchIntoEndnote(nav);
    document.querySelectorAll('.nav-item:not([data-view="endnote"])').forEach(b=>b.addEventListener('click',()=>view.classList.remove('active')));
  }
  function switchIntoEndnote(nav){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('view-endnote').classList.add('active');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));nav.classList.add('active');document.getElementById('sidebar')?.classList.remove('open');refresh()}

  function bind(){
    $('enSearch').oninput=renderList;$('enSort').onchange=renderList;
    $('enNewGroup').onclick=$('enGroupPlus').onclick=createGroup;
    $('enSelectAll').onchange=e=>{if(e.target.checked)filtered().forEach(p=>selected.add(ident(p)));else selected.clear();renderList()};
    $('enClearSelect').onclick=()=>{selected.clear();$('enSelectAll').checked=false;renderList()};
    $('enApplyGroup').onclick=bulkGroup;
    $('enExportRis').onclick=()=>exportRIS(selected.size?papers.filter(p=>selected.has(ident(p))):filtered());
    $('enExportBib').onclick=()=>exportBib(selected.size?papers.filter(p=>selected.has(ident(p))):filtered());
    $('enImportRisBtn').onclick=()=>$('enImportRis').click();$('enImportRis').onchange=importRIS;
  }
  function createGroup(){let name=prompt('新建分组名称：');if(!name?.trim())return;groups.push({id:uid(),name:name.trim()});saveSettings();renderGroups();toast('已创建分组')}
  window.enSelectGroup=id=>{activeGroup=id;selected.clear();renderGroups();renderList()};
  window.enDeleteGroup=id=>{let g=groups.find(x=>x.id===id);if(!g||!confirm(`删除分组“${g.name}”？文献本身不会删除。`))return;groups=groups.filter(x=>x.id!==id);Object.keys(groupMap).forEach(k=>groupMap[k]=(groupMap[k]||[]).filter(x=>x!==id));if(activeGroup===id)activeGroup='all';saveSettings();renderAll()};
  function renderGroups(){
    const fav=favSet(), dups=duplicateKeys();
    const smart=[['all','全部参考文献',papers.length],['unfiled','未归组',papers.filter(p=>!(groupMap[ident(p)]||[]).length).length],['todo','待读',papers.filter(p=>p.status==='待读').length],['fav','收藏',papers.filter(p=>fav.has(ident(p))).length],['recent','近30天新增',papers.filter(p=>dateScore(p)>=Date.now()-30*864e5).length],['dups','疑似重复',papers.filter(p=>dups.has((p.title||'').trim().toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g,' '))).length]];
    $('enSmartGroups').innerHTML=smart.map(([id,n,c])=>`<button class="en-tree-item ${activeGroup===id?'active':''}" onclick="enSelectGroup('${id}')"><span>${id==='fav'?'★':id==='dups'?'⚠':'▤'} ${n}</span><em>${c}</em></button>`).join('');
    $('enCustomGroups').innerHTML=groups.map(g=>`<div class="en-tree-row"><button class="en-tree-item ${activeGroup===g.id?'active':''}" onclick="enSelectGroup('${g.id}')"><span>▰ ${esc(g.name)}</span><em>${papers.filter(p=>inGroup(p,g.id)).length}</em></button><button class="en-del-group" onclick="enDeleteGroup('${g.id}')">×</button></div>`).join('')||'<div class="en-no-group">暂无自定义分组</div>';
    $('enMoveGroup').innerHTML='<option value="">加入分组…</option>'+groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');
  }
  function renderList(){let arr=filtered();$('enResultCount').textContent=arr.length+' 篇';$('enSelectedCount').textContent='已选 '+selected.size;$('enSelectAll').checked=arr.length>0&&arr.every(p=>selected.has(ident(p)));$('enList').innerHTML=arr.map(p=>{let k=ident(p),m=meta[k]||{};return`<div class="en-ref ${current&&ident(current)===k?'active':''}" data-id="${esc(p.id)}"><label onclick="event.stopPropagation()"><input type="checkbox" ${selected.has(k)?'checked':''} onchange="enToggleSelect('${encodeURIComponent(k)}',this.checked)"></label><span class="en-author">${esc(shortAuthor(p.authors))}</span><span>${esc(p.year||'—')}</span><div class="en-title" onclick="enOpenRef('${p.id}')"><b>${esc(p.title)}</b><small>${m.rating?'★'.repeat(m.rating)+' · ':''}${esc(p.doi||p.category)}</small></div><span class="en-journal">${esc(p.journal||'—')}</span></div>`}).join('')||'<div class="en-empty-list">这个分组里还没有文献</div>';}
  function shortAuthor(a){if(!a)return'—';let x=a.split(/[;,]/).map(s=>s.trim()).filter(Boolean);return x.length>2?x[0]+' et al.':x.slice(0,2).join(', ')}
  window.enToggleSelect=(encoded,on)=>{let k=decodeURIComponent(encoded);on?selected.add(k):selected.delete(k);renderList()};
  window.enOpenRef=id=>{current=papers.find(p=>p.id===id);renderList();renderDetail()};
  function renderDetail(){if(!current)return;let p=current,k=ident(p),m=meta[k]||{tags:[],note:'',rating:0};$('enDetail').innerHTML=`<div class="en-detail-scroll"><div class="en-detail-top"><span class="source-badge ${p.origin}">${p.origin==='cloud'?'云端':'本地'}</span><div class="en-rating" id="enRating">${[1,2,3,4,5].map(n=>`<button onclick="enRate(${n})" class="${n<=m.rating?'on':''}">★</button>`).join('')}</div></div><h2 id="enDetailTitle">${esc(p.title)}</h2><button class="en-translate-detail" id="enTranslateDetail">中译标题</button><div id="enDetailZh" class="en-detail-zh"></div><dl class="en-fields"><dt>Author</dt><dd>${esc(p.authors||'—')}</dd><dt>Year</dt><dd>${esc(p.year||'—')}</dd><dt>Journal</dt><dd>${esc(p.journal||'—')}</dd><dt>DOI</dt><dd>${esc(p.doi||'—')}</dd><dt>Category</dt><dd>${esc(p.category||'—')}</dd><dt>Status</dt><dd>${esc(p.status||'—')}</dd></dl><div class="en-section"><label>标签</label><div class="en-tags" id="enTags">${(m.tags||[]).map(t=>`<span>${esc(t)} <button onclick="enRemoveTag('${encodeURIComponent(t)}')">×</button></span>`).join('')}</div><div class="en-add-tag"><input id="enTagInput" placeholder="输入标签"><button id="enTagAdd">添加</button></div></div><div class="en-section"><label>研究笔记</label><textarea id="enNote" placeholder="记录这篇论文的作用、方法和结论…">${esc(m.note||p.notes||'')}</textarea><button class="en-save-note" id="enSaveNote">保存笔记</button></div><div class="en-section"><label>格式化引用</label><div class="en-citation" id="enCitation">${esc(formatAPA(p))}</div><div class="en-cite-actions"><button id="enCopyCite">复制引用</button><button id="enOneRis">RIS</button><button id="enOneBib">BibTeX</button></div></div>${p.url?`<a class="btn primary full" target="_blank" rel="noopener" href="${esc(p.url)}">打开原文</a>`:''}</div>`;
    $('enTagAdd').onclick=()=>{let t=$('enTagInput').value.trim();if(!t)return;m.tags=[...new Set([...(m.tags||[]),t])];meta[k]=m;saveSettings();renderDetail()};
    $('enSaveNote').onclick=()=>{m.note=$('enNote').value;meta[k]=m;saveSettings();toast('笔记已保存')};
    $('enCopyCite').onclick=()=>navigator.clipboard.writeText(formatAPA(p)).then(()=>toast('引用已复制'));
    $('enOneRis').onclick=()=>exportRIS([p]);$('enOneBib').onclick=()=>exportBib([p]);
    $('enTranslateDetail').onclick=async()=>{let api=window.paperRadarTranslation;if(!api){toast('翻译模块尚未加载');return}let out=await api.translateText(p.title);if(out){$('enDetailZh').textContent=out;$('enDetailZh').classList.add('show')}else toast('当前浏览器无法站内翻译')};
  }
  window.enRate=n=>{if(!current)return;let k=ident(current),m=meta[k]||{tags:[],note:'',rating:0};m.rating=m.rating===n?0:n;meta[k]=m;saveSettings();renderDetail();renderList()};
  window.enRemoveTag=enc=>{if(!current)return;let t=decodeURIComponent(enc),k=ident(current),m=meta[k]||{};m.tags=(m.tags||[]).filter(x=>x!==t);meta[k]=m;saveSettings();renderDetail()};
  function bulkGroup(){let gid=$('enMoveGroup').value;if(!gid||!selected.size){toast('先选择文献和目标分组');return}selected.forEach(k=>{groupMap[k]=[...new Set([...(groupMap[k]||[]),gid])]});saveSettings();renderAll();toast(`已将 ${selected.size} 篇加入分组`)}
  function formatAPA(p){let a=p.authors||'Unknown author',y=p.year||'n.d.',t=p.title||'',j=p.journal||'';return `${a} (${y}). ${t}. ${j}${p.doi?'. https://doi.org/'+p.doi:''}`}
  function risOf(p){let out=['TY  - JOUR'];(p.authors||'').split(/[;]+/).filter(Boolean).forEach(a=>out.push('AU  - '+a.trim()));out.push('TI  - '+p.title);if(p.journal)out.push('JO  - '+p.journal);if(p.year)out.push('PY  - '+p.year);if(p.doi)out.push('DO  - '+p.doi);if(p.url)out.push('UR  - '+p.url);if(p.keywords)(p.keywords||'').split(/[,，;；]/).filter(Boolean).forEach(k=>out.push('KW  - '+k.trim()));out.push('ER  - ','');return out.join('\n')}
  function exportRIS(arr){if(!arr.length)return toast('没有可导出的文献');download('paper-radar-references.ris',arr.map(risOf).join('\n'),'application/x-research-info-systems')}
  function bibKey(p,i=0){let a=(p.authors||'ref').split(/[ ,;]/)[0].replace(/\W/g,'')||'ref';return a+(p.year||'nd')+(i||'')}
  function bibOf(p,i){let f=[`title={${p.title}}`];if(p.authors)f.push(`author={${p.authors.replace(/;/g,' and ')}}`);if(p.journal)f.push(`journal={${p.journal}}`);if(p.year)f.push(`year={${p.year}}`);if(p.doi)f.push(`doi={${p.doi}}`);if(p.url)f.push(`url={${p.url}}`);return `@article{${bibKey(p,i)},\n  ${f.join(',\n  ')}\n}`}
  function exportBib(arr){if(!arr.length)return toast('没有可导出的文献');download('paper-radar-references.bib',arr.map(bibOf).join('\n\n'),'application/x-bibtex')}
  function parseRIS(text){let records=[],cur={};for(let line of text.split(/\r?\n/)){let m=line.match(/^([A-Z0-9]{2})\s*-\s*(.*)$/);if(!m)continue;let [_,tag,val]=m;if(tag==='TY'){cur={authors:[]}}else if(tag==='AU')cur.authors.push(val);else if(tag==='TI'||tag==='T1')cur.title=val;else if(tag==='JO'||tag==='JF'||tag==='T2')cur.journal=val;else if(tag==='PY'||tag==='Y1')cur.year=(val.match(/\d{4}/)||[])[0]||val;else if(tag==='DO')cur.doi=val;else if(tag==='UR')cur.url=val;else if(tag==='KW')cur.keywords=(cur.keywords?cur.keywords+', ':'')+val;else if(tag==='N1'||tag==='AB')cur.notes=(cur.notes?cur.notes+'\n':'')+val;else if(tag==='ER'){cur.authors=(cur.authors||[]).join('; ');if(cur.title)records.push(norm(cur));cur={}}}return records}
  async function importRIS(e){let f=e.target.files[0];if(!f)return;let rec=parseRIS(await f.text());if(!rec.length){toast('没有识别到 RIS 文献');return}let existing=new Set(local.map(ident)),add=[];rec.forEach(p=>{let k=ident(p);if(k&&!existing.has(k)){existing.add(k);add.push({...p,origin:'local'})}});local.unshift(...add);localStorage.setItem(LOCAL_KEY,JSON.stringify(local));e.target.value='';await refresh();toast(`RIS 导入 ${add.length} 篇`)}
  function renderAll(){$('navEndnoteCount').textContent=papers.length;$('enTotalCount').textContent=papers.length;renderGroups();renderList();if(current){let fresh=papers.find(x=>ident(x)===ident(current));if(fresh){current=fresh;renderDetail()}}}
  async function refresh(){loadSettings();loadLocal();await loadCloud();rebuild()}
  function injectAssets(){if(!document.querySelector('link[href$="endnote.css"]')){let l=document.createElement('link');l.rel='stylesheet';l.href='./endnote.css';document.head.appendChild(l)}}
  injectAssets();install();refresh();
  window.paperRadarEndnote={refresh};
})();
