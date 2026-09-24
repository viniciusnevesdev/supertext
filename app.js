(() => {
  'use strict';

  const q = s => document.querySelector(s);
  const E = {
    file:q('#fileInput'), camera:q('#cameraInput'), work:q('#workspace'), canvas:q('#previewCanvas'), overlay:q('#overlay'),
    mode:q('#modeSelect'), lang:q('#languageSelect'), extra:q('#extraPrecision'), vocab:q('#customVocabulary'), analyze:q('#analyzeButton'),
    prog:q('#progressPanel'), label:q('#progressLabel'), pct:q('#progressPercent'), bar:q('#progressBar'), detail:q('#progressDetail'),
    result:q('#resultSection'), text:q('#resultText'), score:q('#overallScore'), high:q('#highCount'), med:q('#mediumCount'), low:q('#lowCount'),
    copy:q('#copyButton'), toggle:q('#toggleOverlayButton'), unsure:q('#uncertainPanel'), unsureList:q('#uncertainList'), passes:q('#passesList'), toast:q('#toast')
  };
  const S = { base:null, worker:null, workerLang:null, running:false, passes:[], words:[], overlay:true, pass:0, passCount:3 };
  const PSM = { general:'3', document:'6', interface:'11', ingredients:'6' };
  const INCI = ['aqua','water','glycerin','parfum','fragrance','phenoxyethanol','ethylhexylglycerin','hydroxyethylcellulose','carbomer','tocopherol','citric acid','sodium benzoate','potassium sorbate','benzyl alcohol','limonene','linalool','citral','geraniol','citronellol','coumarin','cetearyl alcohol','cetyl alcohol','stearyl alcohol','dimethicone','amodimethicone','behentrimonium chloride','cetrimonium chloride','panthenol','niacinamide','sodium hyaluronate','hyaluronic acid','urea','propylene glycol','butylene glycol','disodium edta','sodium hydroxide','methylisothiazolinone','methylchloroisothiazolinone','salicylic acid','glycolic acid','lactic acid','ascorbic acid'];

  function toast(t){ E.toast.textContent=t; E.toast.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>E.toast.classList.remove('show'),1600); }
  function progress(n,l,d){ n=Math.max(0,Math.min(100,Math.round(n))); E.prog.classList.remove('hidden'); E.bar.style.width=n+'%'; E.pct.textContent=n+'%'; if(l)E.label.textContent=l; if(d)E.detail.textContent=d; }
  function norm(t){ return (t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[|]/g,'I').replace(/[^\p{L}\p{N}%+\-./:@#'&]/gu,'').toLowerCase(); }
  function dist(a,b){ a=norm(a); b=norm(b); const m=Array.from({length:b.length+1},(_,i)=>i); for(let i=1;i<=a.length;i++){ let prev=m[0]; m[0]=i; for(let j=1;j<=b.length;j++){ const old=m[j]; m[j]=Math.min(m[j]+1,m[j-1]+1,prev+(a[i-1]===b[j-1]?0:1)); prev=old; } } return m[b.length]; }
  function sim(a,b){ const n=Math.max(norm(a).length,norm(b).length); return n?1-dist(a,b)/n:1; }
  function vocabulary(){ const v=E.vocab.value.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean); return E.mode.value==='ingredients' ? [...new Set(v.concat(INCI))] : [...new Set(v)]; }
  function vocabFix(text, list){ if(norm(text).length<4)return null; let best=null,score=0; for(const v of list){ if(Math.abs(norm(v).length-norm(text).length)>2)continue; const s=sim(text,v); if(s>score){score=s;best=v;} } return score>=.9?{text:best,score}:null; }

  async function load(file){
    if(!file || !file.type.startsWith('image/')) return toast('Escolha uma imagem válida.');
    const url=URL.createObjectURL(file), img=new Image(); img.src=url; await img.decode();
    const max=Math.max(img.naturalWidth,img.naturalHeight), target=Math.min(2400,Math.max(1500,max<1600?Math.round(max*1.5):max)), scale=Math.min(2,target/max);
    const w=Math.round(img.naturalWidth*scale), h=Math.round(img.naturalHeight*scale), c=document.createElement('canvas'); c.width=w;c.height=h;
    const x=c.getContext('2d',{willReadFrequently:true}); x.imageSmoothingQuality='high'; x.drawImage(img,0,0,w,h); URL.revokeObjectURL(url);
    S.base=c; S.passes=[]; S.words=[]; E.canvas.width=w;E.canvas.height=h;E.canvas.getContext('2d').drawImage(c,0,0); E.overlay.setAttribute('viewBox','0 0 '+w+' '+h); E.overlay.innerHTML='';
    E.work.classList.remove('hidden');E.result.classList.add('hidden');E.prog.classList.add('hidden');E.file.value='';E.camera.value='';E.work.scrollIntoView({behavior:'smooth'});
  }

  function variant(kind){
    const c=document.createElement('canvas'); c.width=S.base.width;c.height=S.base.height; const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(S.base,0,0); if(kind==='original')return c;
    const im=x.getImageData(0,0,c.width,c.height),d=im.data,g=new Uint8ClampedArray(c.width*c.height); let sum=0;
    for(let i=0,p=0;i<d.length;i+=4,p++){ const v=Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114);g[p]=v;sum+=v; }
    let th=sum/g.length;if(kind!=='contrast')th=otsu(g)+(kind==='strong'?8:0);
    for(let i=0,p=0;i<d.length;i+=4,p++){ let v=g[p]; if(kind==='contrast')v=Math.max(0,Math.min(255,(v-128)*1.7+128)); else v=v>=th?255:0; d[i]=d[i+1]=d[i+2]=v; }
    x.putImageData(im,0,0); return c;
  }
  function otsu(g){ const h=new Uint32Array(256);for(const v of g)h[v]++;let total=g.length,sum=0;for(let i=0;i<256;i++)sum+=i*h[i];let wb=0,sb=0,best=0,t0=127;for(let t=0;t<256;t++){wb+=h[t];if(!wb)continue;const wf=total-wb;if(!wf)break;sb+=t*h[t];const mb=sb/wb,mf=(sum-sb)/wf,v=wb*wf*(mb-mf)*(mb-mf);if(v>best){best=v;t0=t;}}return t0;}

  function parseTSV(tsv,pass){ const out=[];(tsv||'').split(/\r?\n/).slice(1).forEach(r=>{const c=r.split('\t');if(c.length<12||c[0]!=='5')return;const text=c.slice(11).join('\t').trim(),conf=+c[10],l=+c[6],t=+c[7],w=+c[8],h=+c[9];if(text&&isFinite(conf)&&w>0&&h>0)out.push({text,conf:Math.max(0,Math.min(100,conf)),box:{x0:l,y0:t,x1:l+w,y1:t+h},pass});});return out; }
  async function worker(lang){
    if(!window.Tesseract)throw Error('O motor OCR não carregou. Verifique a internet.');
    if(S.worker&&S.workerLang===lang)return S.worker;if(S.worker){try{await S.worker.terminate();}catch(e){}}
    S.workerLang=lang;progress(3,'Carregando OCR…','O primeiro uso baixa o motor e os idiomas.');
    S.worker=await Tesseract.createWorker(lang,1,{logger:m=>{if(S.running&&typeof m.progress==='number'){const n=8+((S.pass+m.progress)/S.passCount)*84;progress(n,'Leitura '+(S.pass+1)+' de '+S.passCount,m.status==='recognizing text'?'Reconhecendo letras…':'Processando localmente…');}}});
    await S.worker.setParameters({preserve_interword_spaces:'1',user_defined_dpi:'300'});return S.worker;
  }
  async function run(w,kind,i){ S.pass=i;const c=variant(kind);await w.setParameters({tessedit_pageseg_mode:PSM[E.mode.value]});const r=await w.recognize(c,{}, {text:true,tsv:true});const words=parseTSV(r.data.tsv,i);c.width=c.height=1;return {kind,text:(r.data.text||'').trim(),words,avg:words.length?words.reduce((a,b)=>a+b.conf,0)/words.length:0}; }

  function center(b){return{x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2};}
  function sameBox(a,b){const A=center(a),B=center(b),aw=a.x1-a.x0,ah=a.y1-a.y0,bw=b.x1-b.x0,bh=b.y1-b.y0;return Math.abs(A.y-B.y)<=Math.max(ah,bh)*.65+8&&Math.abs(A.x-B.x)<=Math.max(aw,bw)*.65+12;}
  function mergeBox(items){return items.reduce((a,w)=>({x0:Math.min(a.x0,w.box.x0),y0:Math.min(a.y0,w.box.y0),x1:Math.max(a.x1,w.box.x1),y1:Math.max(a.y1,w.box.y1)}),{x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity});}
  function consensus(passes){
    const clusters=[];for(const w of passes.flatMap(p=>p.words)){let best=null,bd=Infinity;for(const c of clusters){if(c.items.some(x=>x.pass===w.pass)||!sameBox(c.box,w.box))continue;const A=center(c.box),B=center(w.box),d=Math.hypot(A.x-B.x,A.y-B.y);if(d<bd){bd=d;best=c;}}if(best){best.items.push(w);best.box=mergeBox(best.items);}else clusters.push({items:[w],box:{...w.box}});}
    const list=vocabulary();return clusters.map(c=>{const groups=[];for(const w of c.items){let g=groups.find(x=>sim(x.text,w.text)>=.88);if(!g){g={text:w.text,items:[]};groups.push(g);}g.items.push(w);const top=g.items.reduce((a,b)=>a.conf>=b.conf?a:b);g.text=top.text;}
      groups.forEach(g=>{g.avg=g.items.reduce((s,x)=>s+x.conf,0)/g.items.length;g.weight=g.items.reduce((s,x)=>s+Math.max(15,x.conf),0);g.score=Math.min(100,g.avg*.62+(g.items.length/passes.length)*38);});groups.sort((a,b)=>b.weight-a.weight||b.avg-a.avg);if(!groups.length)return null;let win=groups[0],score=win.score;const vf=vocabFix(win.text,list),existing=vf&&groups.find(g=>norm(g.text)===norm(vf.text));if(existing&&existing.score+8>=score)win=existing;else if(vf&&score<76)win={...win,text:vf.text,score:Math.min(88,score+5)};score=win.score;if(new Set(c.items.map(x=>x.pass)).size===1)score=Math.min(score,54);if(groups[1]&&Math.abs(win.weight-groups[1].weight)<22)score-=8;return {id:Math.random().toString(36).slice(2),text:win.text,confidence:Math.max(0,Math.min(100,score)),box:c.box,alts:groups.slice(0,4).map(g=>({text:g.text,confidence:Math.round(g.score)}))};}).filter(Boolean);
  }

  function lines(words){const arr=[...words].sort((a,b)=>a.box.y0-b.box.y0||a.box.x0-b.box.x0),ls=[];for(const w of arr){const cy=(w.box.y0+w.box.y1)/2,h=w.box.y1-w.box.y0;let l=ls.find(x=>Math.abs(x.cy-cy)<=Math.max(x.h,h)*.65);if(!l){l={cy,h,words:[]};ls.push(l);}l.words.push(w);l.cy=(l.cy*(l.words.length-1)+cy)/l.words.length;l.h=Math.max(l.h,h);}ls.sort((a,b)=>a.cy-b.cy);ls.forEach(l=>l.words.sort((a,b)=>a.box.x0-b.box.x0));return ls;}
  function textFrom(words){return lines(words).map(l=>l.words.map(w=>w.text).join(' ').replace(/\s+([,.;:!?%\])}])/g,'$1')).join('\n').trim();}
  function cls(n){return n>=82?'high':n>=62?'medium':'low';}
  function render(){
    E.text.value=textFrom(S.words);E.overlay.innerHTML='';const ns='http://www.w3.org/2000/svg';S.words.forEach(w=>{const r=document.createElementNS(ns,'rect');r.setAttribute('x',w.box.x0-2);r.setAttribute('y',w.box.y0-2);r.setAttribute('width',w.box.x1-w.box.x0+4);r.setAttribute('height',w.box.y1-w.box.y0+4);r.setAttribute('class',cls(w.confidence));E.overlay.appendChild(r);});
    const hi=S.words.filter(w=>w.confidence>=82).length,me=S.words.filter(w=>w.confidence>=62&&w.confidence<82).length,lo=S.words.length-hi-me,avg=S.words.length?Math.round(S.words.reduce((s,w)=>s+w.confidence,0)/S.words.length):0;E.high.textContent=hi;E.med.textContent=me;E.low.textContent=lo;E.score.textContent=avg+'% confiança';E.score.style.color=avg>=82?'var(--green)':avg>=62?'var(--yellow)':'var(--red)';
    const unsure=S.words.filter(w=>w.confidence<82||w.alts.length>1).sort((a,b)=>a.confidence-b.confidence).slice(0,25);E.unsureList.innerHTML='';E.unsure.classList.toggle('hidden',!unsure.length);unsure.forEach(w=>{const c=document.createElement('div');c.className='uncertain-card';const title=document.createElement('div');title.className='uncertain-top';title.textContent=w.text+'  ·  '+Math.round(w.confidence)+'%';const row=document.createElement('div');row.className='option-row';w.alts.forEach(a=>{const b=document.createElement('button');b.className='option-chip'+(norm(a.text)===norm(w.text)?' selected':'');b.textContent=a.text;b.onclick=()=>{w.text=a.text;w.confidence=Math.max(w.confidence,a.confidence);render();toast('Trecho atualizado.');};row.appendChild(b);});c.append(title,row);E.unsureList.appendChild(c);});
    E.passes.innerHTML='';S.passes.forEach(p=>{const d=document.createElement('div');d.className='pass-card';const pre=document.createElement('pre');pre.textContent=p.text||'(nenhum texto)';const h=document.createElement('strong');h.textContent=p.kind+' · '+Math.round(p.avg)+'% OCR';d.append(h,pre);E.passes.appendChild(d);});E.result.classList.remove('hidden');E.result.scrollIntoView({behavior:'smooth'});
  }

  async function analyze(){if(S.running||!S.base)return;S.running=true;E.analyze.disabled=true;E.result.classList.add('hidden');try{const kinds=['original','contrast','threshold'];if(E.extra.checked)kinds.push('strong');S.passCount=kinds.length;S.passes=[];const w=await worker(E.lang.value);for(let i=0;i<kinds.length;i++){progress(8+i/kinds.length*84,'Leitura '+(i+1)+' de '+kinds.length,'Comparando versões da mesma imagem.');S.passes.push(await run(w,kinds[i],i));}progress(95,'Comparando leituras…','Criando consenso palavra por palavra.');S.words=consensus(S.passes);progress(100,'Concluído','Verde = alta confiança; amarelo/vermelho = confira.');render();}catch(e){console.error(e);progress(0,'Não foi possível concluir',e.message||'Erro inesperado.');toast('Falha no OCR.');}finally{S.running=false;E.analyze.disabled=false;}}

  E.file.onchange=e=>load(e.target.files&&e.target.files[0]);E.camera.onchange=e=>load(e.target.files&&e.target.files[0]);E.analyze.onclick=analyze;
  E.copy.onclick=async()=>{if(!E.text.value.trim())return;try{await navigator.clipboard.writeText(E.text.value);toast('Texto copiado.');}catch(e){E.text.select();document.execCommand('copy');toast('Texto copiado.');}};
  E.toggle.onclick=()=>{S.overlay=!S.overlay;E.overlay.style.display=S.overlay?'':'none';E.toggle.textContent=S.overlay?'Ocultar marcações':'Mostrar marcações';};
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
})();
