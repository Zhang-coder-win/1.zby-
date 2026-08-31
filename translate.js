(()=>{
  const CACHE_KEY='paper-radar-translations-v1';
  let cache={};let translator=null;
  try{cache=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')||{}}catch{}
  const hasChinese=s=>/[\u3400-\u9fff]/.test(s||'');
  const k=s=>'en-zh:'+String(s||'').trim();
  const save=()=>{try{localStorage.setItem(CACHE_KEY,JSON.stringify(cache))}catch{}};
  function notify(msg){if(typeof window.toast==='function'){window.toast(msg);return}let e=document.getElementById('translationProgress');if(!e){e=document.createElement('div');e.id='translationProgress';e.className='translation-progress';document.body.appendChild(e)}e.textContent=msg;e.classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>e.classList.remove('show'),2200)}
  async function getTranslator(){if(translator)return translator;if(!('Translator' in self))return null;try{const opt={sourceLanguage:'en',targetLanguage:'zh'};const a=await Translator.availability(opt);if(a==='unavailable')return null;translator=await Translator.create({...opt,monitor(m){m.addEventListener('downloadprogress',e=>notify(`翻译语言包 ${Math.round((e.loaded||0)*100)}%`))}});return translator}catch{return null}}
  async function translateText(text){text=String(text||'').trim();if(!text||hasChinese(text))return text;if(cache[k(text)])return cache[k(text)];let tr=await getTranslator();if(!tr)return null;try{let out=await tr.translate(text);if(out){cache[k(text)]=out;save()}return out||null}catch{return null}}
  function google(text){window.open('https://translate.google.com/?sl=auto&tl=zh-CN&op=translate&text='+encodeURIComponent(text),'_blank','noopener')}
  async function translateEl(el,btn){const text=el.dataset.originalTitle||el.textContent.trim();if(!text||hasChinese(text))return;btn.textContent='翻译中…';let out=await translateText(text);btn.textContent=out?'已翻':'中译';if(out){let next=el.parentElement.querySelector(':scope > .translated-title');if(!next){next=document.createElement('div');next.className='translated-title';el.insertAdjacentElement('afterend',next)}next.textContent=out}else{google(text);notify('浏览器不支持站内翻译，已打开翻译页面')}}
  function decorate(el){if(!el||el.dataset.translationReady==='1')return;el.dataset.translationReady='1';el.dataset.originalTitle=el.textContent.trim();if(hasChinese(el.textContent))return;let b=document.createElement('button');b.className='translate-btn';b.type='button';b.textContent=cache[k(el.dataset.originalTitle)]?'已翻':'中译';b.onclick=e=>{e.preventDefault();e.stopPropagation();translateEl(el,b)};el.insertAdjacentElement('afterend',b);if(cache[k(el.dataset.originalTitle)]){let z=document.createElement('div');z.className='translated-title';z.textContent=cache[k(el.dataset.originalTitle)];b.insertAdjacentElement('afterend',z)}}
  function scan(){document.querySelectorAll('#tb .paper-title,#paperGrid .paper-card h3,#results .result-card h3').forEach(decorate)}
  const mo=new MutationObserver(scan);['tb','paperGrid','results'].forEach(id=>{let e=document.getElementById(id);if(e)mo.observe(e,{childList:true,subtree:true})});scan();
  const drawer=document.querySelector('.drawer-actions'),title=document.getElementById('drawerTitle');if(drawer&&title&&!document.getElementById('drawerTranslate')){let b=document.createElement('button');b.className='btn soft';b.id='drawerTranslate';b.textContent='中译标题';b.onclick=async()=>{let out=await translateText(title.textContent);if(out)notify(out);else google(title.textContent)};drawer.insertBefore(b,drawer.firstChild)}
  window.paperRadarTranslation={supported:'Translator' in self,translateText,cache};
  if(!document.querySelector('script[src$="endnote.js"]')){let s=document.createElement('script');s.src='./endnote.js';s.defer=true;document.body.appendChild(s)}
})();
