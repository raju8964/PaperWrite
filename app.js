'use strict';
const $=s=>document.querySelector(s), g=id=>document.getElementById(id);
const FONTS=['Caveat','Kalam','Patrick Hand','Indie Flower'];
const busy=v=>g('busy').hidden=!v;
function toast(m,err){const t=g('toast');t.textContent=m;t.className='show'+(err?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>t.className='',4000)}
function dl(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),4000)}
const debounce=(f,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>f(...a),ms)}};
const loadFont=async f=>{try{await document.fonts.load(`28px "${f}"`)}catch(e){}};
const bytesOf=async url=>new Uint8Array(await (await fetch(url)).arrayBuffer());

/* on-screen diagnostics: shows the real error instead of failing silently */
addEventListener('error',e=>toast('Script error: '+(e.message||'unknown')+(e.lineno?' (app.js line '+e.lineno+')':''),1));
addEventListener('unhandledrejection',e=>toast('Error: '+((e.reason&&e.reason.message)||e.reason),1));
{const miss=['pdfjsLib','PDFLib','fabric'].filter(n=>typeof window[n]==='undefined');
 if(miss.length){const d=document.createElement('div');d.style.cssText='background:#b4232c;color:#fff;padding:10px;text-align:center;font-size:14px';
  d.textContent='Could not load library: '+miss.join(', ')+'. Check your internet connection or disable ad-blockers for this site, then reload.';document.body.prepend(d)}}

/* tabs */
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.mode').forEach(m=>m.hidden=m.id!==b.dataset.t);
  if(b.dataset.t==='editor'&&E.type)fit();
});

/* ================= Handwriting Studio ================= */
const SIZES={A4:[794,1123],A5:[559,794],Letter:[816,1056]};
let pages=[],cur=0,hz=1;
function opts(){return{font:g('hFont').value,size:+g('hSize').value||26,color:g('hInk').value,ls:+g('hLs').value||0,ws:+g('hWs').value||0,
 lh:Math.max(16,+g('hLh').value||36),ps:Math.max(0,Math.round(+g('hPs').value||0)),align:g('hAlign').value,m:+g('hMargin').value||60,paper:g('hPaper').value,
 sz:g('hPage').value,land:g('hLand').value==='1',line:g('hMLine').checked,jit:+g('hJit').value}}
async function render(){
  const o=opts();await loadFont(o.font);
  let [W,H]=SIZES[o.sz];if(o.land)[W,H]=[H,W];
  const left=o.m+(o.line?28:0),right=W-o.m,top=o.m,bottom=H-o.m,maxW=Math.max(50,right-left),lh=o.lh;
  const mc=document.createElement('canvas').getContext('2d');mc.font=`${o.size}px "${o.font}",cursive`;
  const cw=c=>mc.measureText(c).width+o.ls, ww=w=>[...w].reduce((a,c)=>a+cw(c),0), sp=mc.measureText(' ').width+o.ws;
  const items=[];
  g('hText').value.split('\n').forEach(p=>{
    if(!p.trim()){items.push({blank:1});return}
    let line=[],w=0;
    p.split(/\s+/).filter(Boolean).forEach(word=>{const k=ww(word);
      if(line.length&&w+sp+k>maxW){items.push({words:line,w});line=[];w=0}
      w+=(line.length?sp:0)+k;line.push(word)});
    items.push({words:line,w,last:1});
  });
  const lpp=Math.max(1,Math.floor((bottom-top)/lh)),pg=[[]];let row=0;
  const push=it=>{if(row>=lpp){pg.push([]);row=0}pg[pg.length-1].push({it,row});row++};
  items.forEach(it=>{push(it);if(it.last)for(let i=0;i<o.ps;i++)push({blank:1})});
  while(pg.length>1&&!pg[pg.length-1].some(r=>!r.it.blank))pg.pop();
  pages=pg.map(rows=>{
    const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    x.fillStyle=o.paper==='cream'?'#fdf6e3':'#fff';x.fillRect(0,0,W,H);
    x.strokeStyle='#bcd3ee';x.lineWidth=1;x.beginPath();
    if(o.paper==='ruled')for(let n=1;n<=lpp;n++){x.moveTo(0,top+n*lh+.5);x.lineTo(W,top+n*lh+.5)}
    if(o.paper==='grid'){for(let y=top;y<=H;y+=lh){x.moveTo(0,y+.5);x.lineTo(W,y+.5)}for(let xx=o.m%lh;xx<=W;xx+=lh){x.moveTo(xx+.5,0);x.lineTo(xx+.5,H)}}
    x.stroke();
    if(o.line){x.strokeStyle='#e5737a';x.beginPath();x.moveTo(o.m+10.5,0);x.lineTo(o.m+10.5,H);x.stroke()}
    x.font=mc.font;x.fillStyle=o.color;x.textBaseline='alphabetic';
    let s=7;const rnd=()=>((s=(s*16807)%2147483647)/2147483647)-.5;
    rows.forEach(({it,row})=>{if(it.blank)return;
      const y=top+(row+1)*lh-Math.round(lh*.2);
      let px=o.align==='center'?left+(maxW-it.w)/2:o.align==='right'?left+maxW-it.w:left;
      it.words.forEach(word=>{[...word].forEach(ch=>{
        if(o.jit){x.save();x.translate(px,y+rnd()*o.jit*2);x.rotate(rnd()*o.jit*.02);x.fillText(ch,0,0);x.restore()}else x.fillText(ch,px,y);
        px+=cw(ch)});px+=sp});
    });
    return c});
  cur=Math.min(cur,pages.length-1);show();
}
function show(){
  const v=g('hView');v.replaceChildren(pages[cur]);pages[cur].style.width=pages[cur].width*hz+'px';
  g('hCount').textContent=`Page ${cur+1} / ${pages.length}`;g('hZ').textContent=Math.round(hz*100)+'%';
}
const rd=debounce(()=>render().catch(e=>toast('Preview failed: '+e.message,1)),200);
document.querySelector('#studio .panel').addEventListener('input',rd);
g('hPrev').onclick=()=>{if(cur>0){cur--;show()}};g('hNext').onclick=()=>{if(cur<pages.length-1){cur++;show()}};
g('hZi').onclick=()=>{hz=Math.min(2.5,hz+.15);show()};g('hZo').onclick=()=>{hz=Math.max(.2,hz-.15);show()};
const blobOf=c=>new Promise(r=>c.toBlob(r,'image/png'));
g('hPng').onclick=async()=>dl(await blobOf(pages[cur]),`paperwrite-page-${cur+1}.png`);
g('hPngAll').onclick=async()=>{for(let i=0;i<pages.length;i++){dl(await blobOf(pages[i]),`paperwrite-page-${i+1}.png`);await new Promise(r=>setTimeout(r,350))}};
g('hPdf').onclick=async()=>{busy(1);try{
  const pdf=await PDFLib.PDFDocument.create();
  for(const c of pages){const img=await pdf.embedPng(await bytesOf(c.toDataURL('image/png')));
    const p=pdf.addPage([c.width*.75,c.height*.75]);p.drawImage(img,{x:0,y:0,width:c.width*.75,height:c.height*.75})}
  dl(new Blob([await pdf.save()],{type:'application/pdf'}),'paperwrite-handwriting.pdf');toast('PDF downloaded');
}catch(e){console.error(e);toast('PDF export failed: '+e.message,1)}busy(0)};

/* ================= PDF & Image Editor ================= */
if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc=window.PW_CDN?'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js':'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const E={type:'',pdf:null,bytes:null,imgEl:null,imgUrl:null,imgBytes:null,imgDims:null,n:0,cur:1,objs:{},sizes:{},z:1,tool:'select',hist:[],redo:[],busy:false};
const fc=new fabric.Canvas('ec',{preserveObjectStacking:true,selection:true});
let restoring=false;
const snap=()=>JSON.stringify(fc.getObjects().map(o=>o.toObject()));
const pushH=()=>{if(restoring||!E.type)return;E.hist.push(snap());E.redo=[]};
async function restore(s){restoring=true;fc.getObjects().slice().forEach(o=>fc.remove(o));
  await new Promise(r=>fabric.util.enlivenObjects(JSON.parse(s),os=>{os.forEach(o=>fc.add(o));r()}));
  restoring=false;fc.discardActiveObject();fc.renderAll()}
['object:modified','object:removed','text:changed','path:created'].forEach(ev=>fc.on(ev,pushH));
fc.on('object:added',e=>{const o=e.target;if(!restoring){o.selectable=E.tool==='select';o.evented=E.tool==='select'||E.tool==='erase'}if(o.type==='path')pushH()});
g('eUndo').onclick=async()=>{if(E.hist.length>1){E.redo.push(E.hist.pop());await restore(E.hist[E.hist.length-1])}};
g('eRedo').onclick=async()=>{const s=E.redo.pop();if(s){E.hist.push(s);await restore(s)}};

function setTool(t){E.tool=t;
  document.querySelectorAll('.tl').forEach(b=>b.classList.toggle('on',b.dataset.tool===t));
  fc.isDrawingMode=t==='pen'||t==='hl';fc.selection=t==='select';
  if(fc.isDrawingMode){const b=new fabric.PencilBrush(fc);b.width=t==='hl'?18:3;b.color=t==='hl'?'rgba(255,230,0,.4)':g('eColor').value;fc.freeDrawingBrush=b}
  fc.forEachObject(o=>{o.selectable=t==='select';o.evented=t==='select'||t==='erase'});
  fc.discardActiveObject();fc.defaultCursor=t==='select'?'default':'crosshair';fc.renderAll()}
document.querySelectorAll('.tl').forEach(b=>b.onclick=()=>{if(!E.type)return toast('Upload a document first',1);setTool(b.dataset.tool)});
let drag=null;
fc.on('mouse:down',e=>{
  if(E.tool==='erase'&&e.target){fc.remove(e.target);return}
  if(!['line','rect','circle'].includes(E.tool))return;
  const p=fc.getPointer(e.e),st={stroke:g('eColor').value,strokeWidth:3,fill:'transparent',selectable:false,evented:false,strokeUniform:true};
  const s=E.tool==='line'?new fabric.Line([p.x,p.y,p.x,p.y],st):E.tool==='rect'?new fabric.Rect({...st,left:p.x,top:p.y,width:1,height:1}):new fabric.Ellipse({...st,left:p.x,top:p.y,rx:1,ry:1});
  restoring=true;fc.add(s);restoring=false;drag={s,x:p.x,y:p.y}});
fc.on('mouse:move',e=>{if(!drag)return;const p=fc.getPointer(e.e),{s,x,y}=drag;
  if(s.type==='line')s.set({x2:p.x,y2:p.y});
  else if(s.type==='rect')s.set({left:Math.min(x,p.x),top:Math.min(y,p.y),width:Math.abs(p.x-x),height:Math.abs(p.y-y)});
  else s.set({left:Math.min(x,p.x),top:Math.min(y,p.y),rx:Math.abs(p.x-x)/2,ry:Math.abs(p.y-y)/2});
  fc.renderAll()});
fc.on('mouse:up',()=>{if(drag){drag.s.setCoords();drag=null;pushH()}});

g('eText').onclick=async()=>{
  if(!E.type)return toast('Upload a document first',1);setTool('select');
  const f=g('eFont').value;await loadFont(f);
  const t=new fabric.Textbox('Double-click to edit',{left:40,top:40,width:Math.min(300,E.base[0]-80),fontSize:+g('eSize').value||28,fill:g('eColor').value,fontFamily:f,
    textAlign:g('eAlign').value,opacity:+g('eOp').value,cornerColor:'#4f6df5',borderColor:'#4f6df5',cornerStyle:'circle',transparentCorners:false,padding:4});
  fc.add(t);fc.setActiveObject(t);fc.renderAll();toast('Text added — drag, resize or rotate it')};
const act=()=>fc.getActiveObject();
const isTxt=o=>o&&o.type==='textbox';
function del(){const o=act();if(!o)return toast('Select an object first',1);if(o.isEditing)return;fc.remove(o);fc.discardActiveObject();fc.renderAll()}
g('eDel').onclick=del;
document.addEventListener('keydown',e=>{const tag=(e.target.tagName||'');if(['INPUT','TEXTAREA','SELECT'].includes(tag)||g('editor').hidden)return;
  if((e.key==='Delete'||e.key==='Backspace')&&act())del();
  if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();(e.shiftKey?g('eRedo'):g('eUndo')).click()}});
g('eClear').onclick=()=>{if(!E.type||!fc.getObjects().length)return toast('Nothing to clear on this page',1);
  if(confirm('Remove all annotations on this page?')){fc.getObjects().slice().forEach(o=>fc.remove(o));fc.renderAll()}};
async function applyProps(){const o=act();if(!o)return;
  if(isTxt(o)){await loadFont(g('eFont').value);o.set({fontFamily:g('eFont').value,fontSize:+g('eSize').value||28,fill:g('eColor').value,textAlign:g('eAlign').value,opacity:+g('eOp').value})}
  else{o.set({opacity:+g('eOp').value});if(o.type==='path'&&o.stroke&&!o.stroke.startsWith('rgba'))o.set({stroke:g('eColor').value});else if(o.stroke&&o.stroke!=='transparent'&&o.type!=='path')o.set({stroke:g('eColor').value})}
  fc.renderAll();pushH()}
['eFont','eSize','eColor','eAlign','eOp'].forEach(id=>g(id).addEventListener('input',applyProps));
const sync=()=>{const o=act();if(!isTxt(o))return;g('eFont').value=o.fontFamily;g('eSize').value=Math.round(o.fontSize);g('eAlign').value=o.textAlign;g('eOp').value=o.opacity;if(/^#/.test(o.fill))g('eColor').value=o.fill};
fc.on('selection:created',sync);fc.on('selection:updated',sync);

function setZ(z){E.z=Math.max(.15,Math.min(3,z));if(!E.base)return;fc.setZoom(E.z);fc.setDimensions({width:E.base[0]*E.z,height:E.base[1]*E.z});g('eZ').textContent=Math.round(E.z*100)+'%'}
function fit(){if(E.type)setZ(Math.min(1.5,(g('eView').clientWidth-34)/E.base[0]))}
g('eZi').onclick=()=>setZ(E.z+.15);g('eZo').onclick=()=>setZ(E.z-.15);g('eFit').onclick=fit;

async function showPage(n){
  if(E.busy)return;E.busy=true;busy(1);
  try{
    if(E.type)E.objs[E.cur]=snap();
    let src,nw,nh,bw,bh;
    if(E.type==='pdf'){
      const p=await E.pdf.getPage(n),vp=p.getViewport({scale:1.5});
      src=document.createElement('canvas');src.width=nw=bw=Math.round(vp.width);src.height=nh=bh=Math.round(vp.height);
      await p.render({canvasContext:src.getContext('2d'),viewport:vp}).promise;
    }else{src=E.imgEl;nw=src.naturalWidth;nh=src.naturalHeight;const k=Math.min(1,1100/nw,1400/nh);bw=Math.round(nw*k);bh=Math.round(nh*k)}
    E.cur=n;E.base=[bw,bh];E.sizes[n]=[bw,bh];
    const bg=new fabric.Image(src,{scaleX:bw/nw,scaleY:bh/nh,selectable:false,evented:false});
    fc.setBackgroundImage(bg,()=>{});
    await restore(E.objs[n]||'[]');
    E.hist=[snap()];E.redo=[];
    g('eView').classList.remove('empty');fit();
    g('ePage').textContent=`Page ${n} / ${E.n}`;
  }catch(e){console.error(e);toast('Could not render this page: '+e.message,1)}
  E.busy=false;busy(0)}
g('ePrev').onclick=()=>{if(E.type&&E.cur>1)showPage(E.cur-1)};g('eNext').onclick=()=>{if(E.type&&E.cur<E.n)showPage(E.cur+1)};

const pick=()=>g('eFile').click();g('eUp').onclick=pick;g('eUp2').onclick=pick;
g('eFile').addEventListener('change',async ev=>{
  const f=ev.target.files[0];ev.target.value='';if(!f)return;
  const isPdf=f.type==='application/pdf'||/\.pdf$/i.test(f.name),isImg=/^image\/(png|jpeg|webp)$/.test(f.type);
  if(!isPdf&&!isImg)return toast('Unsupported file. Please choose a PDF, JPG, PNG or WEBP.',1);
  if(f.size>150*1024*1024)return toast('File is too large (limit 150 MB).',1);
  toast('Opening '+f.name+'…');busy(1);
  try{
    const bytes=new Uint8Array(await f.arrayBuffer());
    if(isPdf){
      const doc=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
      reset();E.type='pdf';E.pdf=doc;E.bytes=bytes;E.n=doc.numPages;
    }else{
      const url=URL.createObjectURL(f),img=new Image();
      await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(new Error('Image is corrupted or unreadable'));img.src=url});
      reset();E.type='image';E.imgEl=img;E.imgUrl=url;E.n=1;E.imgBytes={bytes,jpg:f.type==='image/jpeg'};
    }
    busy(0);E.cur=1;await showPage(1);toast(isPdf?`PDF loaded (${E.n} page${E.n>1?'s':''})`:'Image loaded');
  }catch(e){console.error(e);busy(0);
    toast(e.name==='PasswordException'?'This PDF is password-protected.':e.name==='InvalidPDFException'?'This PDF is invalid or corrupted.':'Could not open file: '+e.message,1)}});
function reset(){if(E.imgUrl)URL.revokeObjectURL(E.imgUrl);Object.assign(E,{type:'',pdf:null,bytes:null,imgEl:null,imgUrl:null,imgBytes:null,objs:{},sizes:{},hist:[],redo:[],n:0,cur:1});
  restoring=true;fc.clear();restoring=false;setTool('select')}

g('eExport').onclick=async()=>{
  if(!E.type)return toast('Upload a document first',1);
  busy(1);
  try{
    E.objs[E.cur]=snap();
    let out,pdfPages;
    if(E.type==='pdf'){out=await PDFLib.PDFDocument.load(E.bytes,{ignoreEncryption:true});pdfPages=out.getPages()}
    else{out=await PDFLib.PDFDocument.create();const {bytes,jpg}=E.imgBytes;let emb;
      if(jpg)emb=await out.embedJpg(bytes);else{const c=document.createElement('canvas');c.width=E.imgEl.naturalWidth;c.height=E.imgEl.naturalHeight;c.getContext('2d').drawImage(E.imgEl,0,0);emb=await out.embedPng(await bytesOf(c.toDataURL('image/png')))}
      const p=out.addPage([emb.width,emb.height]);p.drawImage(emb,{x:0,y:0,width:emb.width,height:emb.height});pdfPages=[p]}
    for(let i=1;i<=E.n;i++){
      const s=E.objs[i];if(!s||s==='[]')continue;
      const [bw,bh]=E.sizes[i],sc=new fabric.StaticCanvas(null,{width:bw,height:bh});
      await new Promise(r=>fabric.util.enlivenObjects(JSON.parse(s),os=>{os.forEach(o=>sc.add(o));sc.renderAll();r()}));
      const png=await out.embedPng(await bytesOf(sc.toDataURL({format:'png',multiplier:2})));sc.dispose();
      const pg=pdfPages[i-1],{width,height}=pg.getSize();pg.drawImage(png,{x:0,y:0,width,height}); // transparent overlay above untouched original page
    }
    dl(new Blob([await out.save()],{type:'application/pdf'}),'paperwrite-edited.pdf');toast('Edited PDF downloaded');
  }catch(e){console.error(e);toast('Export failed: '+e.message+' (try a smaller file)',1)}busy(0)};

/* init */
(async()=>{await Promise.all(FONTS.map(loadFont));render()})();
addEventListener('resize',debounce(()=>{if(E.type&&!g('editor').hidden)fit()},200));
