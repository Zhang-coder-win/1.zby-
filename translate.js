(()=>{
  const CACHE_KEY='paper-radar-translations-v1';
  let cache={};
  let translator=null;
  try{cache=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')||{}}catch{cache={}}
  const saveCache=()=>{try{localStorage.setItem(CACHE_KEY,JSON.stringify(cache))}catch{}};
  const hasChinese=s=>/[\u3400-\u9fff]/.test(s||'');
  const keyOf=s=>'en-zh:'+String(s||'').trim();
  const getCached=s=>cache[keyOf(s)]||'';
  const putCached=(s,t)=>{if(s&&t){cache[keyOf(s)]=t;saveCache()}};

  function notify(msg){
    if(typeof window.toast==='function'){window.toast(msg);return}
    let el=document.getElementById('translationProgress');
    if(!el){el=document.createElement('div');el.id='translationProgress';el.className='translation-progress';document.body.appendChild(el)}
    el.textContent=msg;el.classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>el.classList.remove('show'),2200);
  }

  async function ensureTranslator(){
    if(translator)return translator;
    if(!('Translator' in self))return null;
    const opts={sourceLanguage:'en',targetLanguage:'zh'};
    let status='available';
    try{status=await Translator.availability(opts)}catch{}
    if(status==='unavailable')return null;
    notify(status==='downloadable'?'首次翻译：正在准备中英语言包…':'正在准备翻译…');
    translator=await Translator.create({
      ...opts,
      monitor(m){m.addEventListener('downloadprogress',e=>notify(`翻译语言包 ${Math.round((e.loaded||0)*100)}%`))}
    });
    return translator;
  }

  function fallbackGoogle(text){
    const u='https://translate.google.com/?sl=auto&tl=zh-CN&op=translate&text='+encodeURIComponent(text);
    window.open(u,'_blank','noopener');
  }

  async function translateText(text){
    text=String(text||'').trim();
    if(!text||hasChinese(text))return text;
    const c=getCached(text);if(c)return c;
    try{
      const tr=await ensureTranslator();
      if(!tr)return null;
      const out=await tr.translate(text);
      if(out){putCached(text,out);return out}
    }catch(e){console.warn('Translator API failed',e)}
    return null;
  }

  function addTranslationUnder(titleEl,translation){
    let host=titleEl.parentElement;
    let existing=host.querySelector(':scope > .translated-title');
    if(!existing){existing=document.createElement('div');existing.className='translated-title';titleEl.insertAdjacentElement('afterend',existing)}
    existing.textContent=translation;
  }

  async function translateElement(titleEl,btn){
    const text=(titleEl.dataset.originalTitle||titleEl.textContent||'').trim();
    if(!text)return;
    if(hasChinese(text)){notify('这条标题已经是中文');return}
    const cached=getCached(text);
    if(cached){addTranslationUnder(titleEl,cached);btn.textContent='已翻';return}
    btn.classList.add('loading');btn.textContent='翻译中…';
    const out=await translateText(text);
    btn.classList.remove('loading');
    if(out){addTranslationUnder(titleEl,out);btn.textContent='已翻';notify('标题翻译完成')}
    else{btn.textContent='中译';fallbackGoogle(text);notify('浏览器不支持内置翻译，已打开翻译页面')}
  }

  function decorateTitle(titleEl){
    if(!titleEl||titleEl.dataset.translationReady==='1')return;
    titleEl.dataset.translationReady='1';
    titleEl.dataset.originalTitle=titleEl.textContent.trim();
    if(hasChinese(titleEl.textContent))return;
    const btn=document.createElement('button');
    btn.type='button';btn.className='translate-btn';btn.textContent='中译';btn.title='翻译为中文';
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();translateElement(titleEl,btn)});
    titleEl.insertAdjacentElement('afterend',btn);
    const c=getCached(titleEl.dataset.originalTitle);if(c){addTranslationUnder(titleEl,c);btn.textContent='已翻'}
  }

  function decorateDynamicTitles(){
    document.querySelectorAll('#tb .paper-title, #paperGrid .paper-card h3, #results .result-card h3').forEach(decorateTitle);
  }

  function installLibraryBulk(){
    const head=document.querySelector('#view-library .result-head');
    if(!head||document.getElementById('translateVisible'))return;
    const box=document.createElement('div');box.className='translate-toolbar';
    box.innerHTML='<button class="text-btn" id="translateVisible">译当前标题</button><button class="text-btn" id="clearTranslations">隐藏译文</button><span class="trans-status">Chrome 桌面版优先本机翻译</span>';
    head.appendChild(box);
    document.getElementById('translateVisible').onclick=async()=>{
      const titles=[...document.querySelectorAll('#tableWrap:not([style*="display: none"]) .paper-title, #paperGrid:not([style*="display: none"]) .paper-card h3')].filter(x=>!hasChinese(x.textContent));
      if(!titles.length){notify('当前没有需要翻译的英文标题');return}
      notify(`准备翻译 ${titles.length} 个标题…`);
      let done=0;
      for(const el of titles){
        const text=el.dataset.originalTitle||el.textContent.trim();
        let out=getCached(text)||await translateText(text);
        if(out)addTranslationUnder(el,out);done++;
        if(done%3===0)notify(`正在翻译 ${done}/${titles.length}`);
      }
      decorateDynamicTitles();notify(`已完成 ${done} 个标题`);
    };
    document.getElementById('clearTranslations').onclick=()=>{document.querySelectorAll('#view-library .translated-title').forEach(x=>x.remove());notify('已隐藏当前译文')};
  }

  function installDrawerTranslation(){
    const actions=document.querySelector('.drawer-actions');
    const title=document.getElementById('drawerTitle');
    if(!actions||!title||document.getElementById('drawerTranslate'))return;
    const panel=document.createElement('div');panel.id='drawerTranslation';panel.className='drawer-translation';
    panel.innerHTML='<small>中文翻译</small><h3 id="drawerTitleZh"></h3><p id="drawerBodyZh"></p>';
    title.insertAdjacentElement('afterend',panel);
    const btn=document.createElement('button');btn.type='button';btn.id='drawerTranslate';btn.className='btn soft';btn.textContent='中译内容';
    actions.insertBefore(btn,actions.firstChild);
    btn.onclick=async()=>{
      const srcTitle=title.textContent.trim();
      const notes=document.getElementById('drawerNotes')?.textContent.trim()||'';
      if(hasChinese(srcTitle)&&(!notes||hasChinese(notes))){notify('当前内容主要是中文');return}
      btn.disabled=true;btn.textContent='翻译中…';panel.classList.add('show');
      const titleZh=hasChinese(srcTitle)?srcTitle:(getCached(srcTitle)||await translateText(srcTitle));
      const notesText=notes&&notes!=='暂无备注'&&!hasChinese(notes)?notes:'';
      let bodyZh='';
      if(notesText){bodyZh=getCached(notesText)||await translateText(notesText)||''}
      document.getElementById('drawerTitleZh').textContent=titleZh||'未能在站内翻译标题';
      document.getElementById('drawerBodyZh').textContent=bodyZh||(notesText?'备注翻译未完成':'当前没有可翻译的英文备注');
      btn.disabled=false;btn.textContent='重新中译';
      if(!titleZh){fallbackGoogle(srcTitle);notify('已打开外部翻译页面')}else notify('论文内容已翻译');
    };
    const obs=new MutationObserver(()=>{panel.classList.remove('show');document.getElementById('drawerTitleZh').textContent='';document.getElementById('drawerBodyZh').textContent='';btn.textContent='中译内容'});
    obs.observe(title,{childList:true,characterData:true,subtree:true});
  }

  function installDiscoverHint(){
    const status=document.querySelector('#view-discover .find-status');
    if(status&&!document.getElementById('discoverTranslateHint')){
      const hint=document.createElement('span');hint.id='discoverTranslateHint';hint.className='translation-badge';hint.textContent='中译按钮会自动出现在英文结果旁';status.appendChild(hint);
    }
  }

  const observer=new MutationObserver(()=>decorateDynamicTitles());
  ['tb','paperGrid','results'].forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,subtree:true})});
  decorateDynamicTitles();installLibraryBulk();installDrawerTranslation();installDiscoverHint();
  window.paperRadarTranslation={supported:'Translator' in self,translateText,cache};
})();
