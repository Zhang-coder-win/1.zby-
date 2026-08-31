(()=>{
  const $=id=>document.getElementById(id),MODE_KEY='paper-radar-search-mode-v1';
  const split=s=>String(s||'').split(/[\n,，;；|]/).map(x=>x.trim()).filter(Boolean);
  const uniq=a=>[...new Set(a.filter(Boolean))];
  const q=t=>'"'+String(t).replace(/"/g,'')+'"[Title/Abstract]';
  const grp=a=>a.length?'('+uniq(a).map(q).join(' OR ')+')':'';
  const exgrp=a=>a.length?'('+uniq(a).map(q).join(' OR ')+')':'';
  const get=id=>$(id)?.value||'';
  function install(){
    if(!$('view-directions')||$('dMode'))return setTimeout(install,250);
    const priority=$('dPriority')?.closest('.dir-field');
    const box=document.createElement('div');box.className='dir-field';box.innerHTML='<label>检索模式</label><select id="dMode"><option value="wide">宽检索 · 先保召回</option><option value="balanced">平衡检索 · 推荐</option><option value="precise">精准检索 · 降噪</option></select><div class="dir-help">宽检索用于建库，平衡用于日常更新，精准用于主题很明确时。</div>';
    priority?.insertAdjacentElement('afterend',box);
    $('dMode').value=localStorage.getItem(MODE_KEY)||'balanced';
    $('dMode').onchange=()=>{localStorage.setItem(MODE_KEY,$('dMode').value);update()};
    document.querySelectorAll('#view-directions textarea,#view-directions input,#view-directions select').forEach(el=>el.addEventListener('input',update));
    $('copyPubMed').onclick=()=>navigator.clipboard?.writeText(buildPubMed()).then(()=>typeof window.toast==='function'&&window.toast('PubMed 检索式已复制'));
    $('dirPubMedRun').onclick=()=>window.open('https://pubmed.ncbi.nlm.nih.gov/?term='+encodeURIComponent(buildPubMed()),'_blank','noopener');
    $('dirRun').onclick=()=>{let text=buildInternal();if(!text)return;document.querySelector('.nav-item[data-view="discover"]')?.click();setTimeout(()=>{if($('findQ'))$('findQ').value=text;$('findBtn')?.click()},120)};
    update();
  }
  function arrays(){const obj=split(get('dObjects'));const auxIds=['dSubtopics','dMethods','dMechanisms','dIndicators','dProcessing','dMicrobes','dComponents','dDiseases','dModels','dRegions'];return{obj,groups:auxIds.map(id=>split(get(id))).filter(a=>a.length),exclude:split(get('dExclude'))}}
  function buildPubMed(){let {obj,groups,exclude}=arrays(),mode=$('dMode')?.value||'balanced',parts=[],og=grp(obj);if(mode==='wide'){if(og)parts.push(og);else if(groups.length)parts.push(grp(groups.flat()))}else if(mode==='balanced'){if(og)parts.push(og);if(groups.length)parts.push(grp(groups.flat()))}else{if(og)parts.push(og);groups.forEach(g=>parts.push(grp(g)))}let s=parts.filter(Boolean).join(' AND ')||'(请至少填写对象或子方向)';if(exclude.length)s+=' NOT '+exgrp(exclude);let y1=get('dStartYear'),y2=get('dEndYear');if(y1&&y2)s+=` AND ("${y1}"[Date - Publication] : "${y2}"[Date - Publication])`;if($('dLangEn')?.checked&&!$('dLangZh')?.checked)s+=' AND english[Language]';if($('dTypeReview')?.checked&&!$('dTypeJournal')?.checked)s+=' AND review[Publication Type]';return s}
  function buildInternal(){let {obj,groups}=arrays(),mode=$('dMode')?.value||'balanced';if(mode==='wide')return obj.slice(0,2).join(' ')||groups.flat().slice(0,4).join(' ');if(mode==='precise')return uniq([...obj.slice(0,2),...groups.flat().slice(0,7)]).join(' ');return uniq([...obj.slice(0,2),...groups.flat().slice(0,4)]).join(' ')}
  function update(){if(!$('pubmedQuery'))return;$('pubmedQuery').textContent=buildPubMed();let mode=$('dMode')?.value||'balanced',label=mode==='wide'?'宽检索：适合建立基线库，漏检风险最低但噪音较高。':mode==='precise'?'精准检索：噪音低，但不适合用来证明“没有遗漏”。':'平衡检索：对象词必选，其余子项用 OR 扩展，适合日常监控。';let risk=$('dirRisks');if(risk&&!$('modeQualityLine')){let div=document.createElement('div');div.id='modeQualityLine';div.className='dir-risk ok';risk.prepend(div)}if($('modeQualityLine'))$('modeQualityLine').innerHTML='<span>◎</span><span>'+label+'</span>'}
  install();
})();