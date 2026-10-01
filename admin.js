import { REPO, DEFAULT_SITE, parseData, validate, createApi, readRemote, publish, imagePaths } from './admin-core.mjs';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data = null, head = null, baseline = '', tab = 'works', selected = null, dirty = false, busy = false;
let api = createApi(''), connected = false;
const uploads = new Map();
const imageCache = new Map();
const state = (message, kind = '') => { $('status').textContent = message; $('status').className = 'status ' + kind; };
const current = () => tab === 'works' ? data.exhibits.find(w => w.id === selected) : tab === 'rooms' ? data.rooms.find(r => r.id === selected) : null;
const source = src => imageCache.has(src) ? 'data:image/webp;base64,' + imageCache.get(src).base64 : src;
function refreshDirty() {
  dirty = !!data && JSON.stringify(data) !== baseline;
  $('dirty-state').textContent = dirty ? '未公開の変更があります' : '変更はありません';
  $('publish').disabled = !data || !head || !dirty || busy;
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('main button,main input,main textarea,main select,.header button').forEach(el => el.disabled = value);
  refreshDirty();
}
const field = (key, label, value, options = {}) => `<div class="field ${options.full ? 'full' : ''}"><label for="field-${key}">${esc(label)}</label>${options.area ? `<textarea id="field-${key}" data-field="${key}" rows="${options.rows || 4}">${esc(value)}</textarea>` : `<input id="field-${key}" data-field="${key}" type="${options.type || 'text'}" value="${esc(value)}" ${options.type === 'number' ? 'min="0" step="1"' : ''} ${options.readonly ? 'readonly' : ''}>`}${options.hint ? `<span class="hint">${esc(options.hint)}</span>` : ''}</div>`;
const uploader = (key, multiple = false) => `<div class="upload-box"><label for="upload-${key}">${multiple ? '写真を追加' : '画像を差し替える'}</label><input id="upload-${key}" data-upload="${key}" type="file" accept="image/jpeg,image/png,image/webp" ${multiple ? 'multiple' : ''}><p class="hint">JPEG・PNG・WebP（1枚15MBまで）。表示に適した大きさに調整して保存します。</p></div>`;

function renderSidebar() {
  if (!data) return;
  $('sidebar').hidden = tab === 'site';
  document.querySelector('.workspace').classList.toggle('single', tab === 'site');
  if (tab === 'site') return;
  const query = $('search').value.trim().toLowerCase();
  const items = (tab === 'works' ? data.exhibits : data.rooms).filter(x => x.name.toLowerCase().includes(query));
  const ordered = tab === 'works' ? [...items].sort((a,b) => data.rooms.findIndex(r => r.id === a.roomId) - data.rooms.findIndex(r => r.id === b.roomId) || a.order - b.order) : items;
  $('item-list').innerHTML = ordered.map(x => `<button type="button" class="item ${x.id === selected ? 'active' : ''}" data-select="${esc(x.id)}" aria-pressed="${x.id === selected}"><span class="number">${esc(x.number || x.label)}</span><span>${esc(x.name)}${tab === 'works' ? `<small>${esc(data.rooms.find(r => r.id === x.roomId)?.name)}</small>` : ''}</span></button>`).join('') || '<p class="empty">該当する項目がありません。</p>';
  $('add').textContent = tab === 'works' ? '＋ 作品を追加' : '＋ 展示室を追加';
  document.querySelector('.search-label').textContent = tab === 'works' ? '作品を探す' : '展示室を探す';
  $('search').placeholder = tab === 'works' ? '作品名で検索' : '展示室名で検索';
}
function renderImages(w) {
  return `<div class="full"><div class="image-list">${w.images.map((image, i) => `<div class="photo-row"><div><img src="${esc(source(image.src))}" alt="${esc(image.alt || w.name)}"><p class="hint">${i === 0 ? 'メイン画像' : '追加画像 ' + i}</p><div class="photo-actions"><button type="button" data-image-up="${i}" ${i === 0 ? 'disabled' : ''}>前へ</button><button type="button" data-image-delete="${i}">削除</button></div></div><div><label class="field">画像の説明（代替テキスト）<input data-photo="${i}" data-photo-field="alt" value="${esc(image.alt)}"></label><label class="field">キャプション<input data-photo="${i}" data-photo-field="caption" value="${esc(image.caption)}"></label><p class="hint">${esc(image.src)}</p></div></div>`).join('') || '<p class="empty">写真はまだありません。公開サイトには「作品写真準備中」が表示されます。</p>'}</div>${uploader('work', true)}</div>`;
}
function renderEditor() {
  if (!data) return;
  $('work-count').textContent = data.exhibits.length;
  renderSidebar();
  const x = current();
  if (tab !== 'site' && !x) { $('editor').innerHTML = '<p class="empty">左の一覧から選ぶか、新しい項目を追加してください。</p>'; return; }
  if (tab === 'works') {
    $('editor').innerHTML = `<div class="editor-head"><div><p class="eyebrow">WORK ${esc(x.number)}</p><h2>${esc(x.name)}</h2><p>空欄の説明文は「説明文準備中」と表示されます。</p></div><button type="button" id="preview">プレビュー ↗</button></div><div class="field-grid">${field('name','作品名',x.name,{full:true})}<div class="field"><label for="field-roomId">展示室</label><select id="field-roomId" data-field="roomId">${data.rooms.map(r=>`<option value="${esc(r.id)}" ${x.roomId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>${field('order','展示室内の表示順（小さい順）',x.order,{type:'number'})}${field('number','作品番号',x.number)}${field('slug','作品URL',x.slug,{readonly:true,hint:'既存のリンクを維持するため変更しません。'})}<h3 class="section-label">作品の説明</h3>${field('summary','作品の概要',x.summary,{area:true,full:true})}${field('mechanism','作品の仕組み',x.mechanism,{area:true,full:true})}${field('points','制作のポイント',x.points,{area:true,full:true})}<h3 class="section-label">写真・動画</h3>${renderImages(x)}${field('youtubeId','YouTube動画ID（任意）',x.youtubeId,{full:true,hint:'動画URLの v= の後ろ、または youtu.be/ の後ろにある11文字を入力します。'})}</div><button class="danger" id="delete-item">この作品を削除する</button>`;
  } else if (tab === 'rooms') {
    $('editor').innerHTML = `<div class="editor-head"><div><p class="eyebrow">EXHIBITION ROOM</p><h2>${esc(x.name)}</h2><p>${data.exhibits.filter(w=>w.roomId===x.id).length}作品がこの展示室に所属しています。</p></div></div><div class="field-grid">${field('name','展示室名',x.name,{full:true})}${field('label','英語ラベル',x.label)}${field('id','展示室ID',x.id,{readonly:true})}<h3 class="section-label">展示室の画像</h3><div class="full"><img class="cover-image" src="${esc(source(x.image))}" alt="${esc(x.alt)}">${uploader('room')}</div>${field('alt','画像の説明（代替テキスト）',x.alt,{full:true})}</div><button class="danger" id="delete-item">この展示室を削除する</button>`;
  } else {
    const s = {...DEFAULT_SITE,...data.site};
    $('editor').innerHTML = `<div class="editor-head"><div><p class="eyebrow">HOME & ABOUT</p><h2>サイトの入口を整える。</h2><p>見出しや紹介文、メインビジュアルを変更できます。</p></div></div><div class="field-grid">${field('title','サイト名',s.title)}${field('english','英語名',s.english)}${field('tagline','メインのコピー',s.tagline,{area:true,full:true,rows:2})}${field('intro','画像の下の一言',s.intro,{full:true})}<h3 class="section-label">メインビジュアル</h3><div class="full"><img class="cover-image" src="${esc(source(s.heroImage))}" alt="${esc(s.heroAlt)}">${uploader('hero')}</div>${field('heroAlt','画像の説明（代替テキスト）',s.heroAlt,{full:true})}<h3 class="section-label">展示室・紹介文</h3>${field('roomIntro','展示室への紹介文',s.roomIntro,{area:true,full:true,rows:2})}${field('roomNote','トップページの展示室についての注記',s.roomNote,{full:true,hint:'空欄にすると表示されません。'})}${field('archiveNote','展示室ページの注記',s.archiveNote,{full:true,hint:'写真や説明文が揃ったら空欄にできます。'})}${field('about','部活動の紹介文',s.about,{area:true,full:true,rows:9,hint:'空行で段落を分けられます。'})}</div>`;
  }
}

async function loadLatest() {
  if (dirty && !confirm('未公開の変更を破棄して最新データを読み込みますか？必要なら先に下書きを保存してください。')) return;
  setBusy(true); state('GitHubから最新データを読み込んでいます…');
  try {
    const remote = await readRemote(api);
    data = remote.data; head = remote.head; baseline = JSON.stringify(data); uploads.clear(); imageCache.clear();
    selected = data.exhibits[0]?.id; tab = 'works'; $('search').value = '';
    document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.tab === tab)));
    renderEditor(); state('最新データを読み込みました。編集後に「保存して公開」を押してください。');
  } catch (error) { state(error.message, 'error'); }
  finally { setBusy(false); }
}
function changed() { refreshDirty(); renderSidebar(); }
$('editor').addEventListener('input', e => {
  if (busy) return;
  const el = e.target;
  if (el.dataset.field) {
    if (el.readOnly) return;
    const object = tab === 'site' ? (data.site ||= {...DEFAULT_SITE}) : current();
    object[el.dataset.field] = el.dataset.field === 'order' ? (el.value === '' ? NaN : Number(el.value)) : el.value;
    changed();
  } else if (el.dataset.photoField) {
    current().images[Number(el.dataset.photo)][el.dataset.photoField] = el.value; changed();
  }
});
$('item-list').addEventListener('click', e => {
  const button = e.target.closest('[data-select]');
  if (!button || busy) return;
  selected = button.dataset.select; renderEditor();
});
$('search').addEventListener('input',renderSidebar);
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
  if (!data || busy) return;
  tab = button.dataset.tab; selected = tab === 'works' ? data.exhibits[0]?.id : data.rooms[0]?.id; $('search').value = '';
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b === button)));
  renderEditor();
}));
$('add').addEventListener('click', () => {
  if (!data || busy) return;
  const id = crypto.randomUUID();
  if (tab === 'works') {
    const roomId = data.exhibits.find(w=>w.id===selected)?.roomId || data.rooms[0].id;
    const number = String(Math.max(0,...data.exhibits.map(w=>Number(w.number)||0))+1).padStart(2,'0');
    const work = {id:'work-'+id,slug:'work-'+id,number,name:'新しい作品',roomId,order:Math.max(0,...data.exhibits.filter(w=>w.roomId===roomId).map(w=>w.order))+1,summary:'',mechanism:'',points:'',images:[],youtubeId:''};
    data.exhibits.push(work); selected=work.id;
  } else {
    const room = {id:'room-'+id,name:'新しい展示室',label:'ROOM '+String(data.rooms.length+1).padStart(2,'0'),image:'images/room-01.svg',alt:'展示室の抽象ビジュアル'};
    data.rooms.push(room); selected=room.id;
  }
  $('search').value=''; renderEditor(); changed(); $('field-name').focus(); $('field-name').select();
});
$('editor').addEventListener('click', e => {
  if (busy) return;
  const button = e.target.closest('button'); if (!button) return;
  if (button.id === 'delete-item') {
    const item = current();
    if (tab === 'rooms' && (data.rooms.length === 1 || data.exhibits.some(w=>w.roomId===item.id))) { state('展示室は最低1つ必要です。作品がある場合は、先に別の展示室へ移してください。','error'); return; }
    if (!confirm('「'+item.name+'」を一覧から削除しますか？公開サイトへの反映は保存後です。')) return;
    const collection = tab === 'works' ? 'exhibits':'rooms'; data[collection] = data[collection].filter(x=>x.id!==selected); selected=data[collection][0]?.id; renderEditor(); changed();
  } else if (button.dataset.imageDelete !== undefined) {
    if (!confirm('この写真を作品から外しますか？')) return;
    current().images.splice(Number(button.dataset.imageDelete),1); renderEditor(); changed();
  } else if (button.dataset.imageUp !== undefined) {
    const i=Number(button.dataset.imageUp), images=current().images;
    if(i>0) [images[i-1],images[i]]=[images[i],images[i-1]];
    renderEditor(); changed();
  } else if (button.id === 'preview') {
    const w=current(), r=data.rooms.find(r=>r.id===w.roomId);
    $('preview-content').innerHTML=`<p class="eyebrow">${esc(r?.name)} / WORK ${esc(w.number)}</p><h2 id="preview-title">${esc(w.name)}</h2>${w.images.map(i=>`<img class="preview-image" src="${esc(source(i.src))}" alt="${esc(i.alt||w.name)}"><p>${esc(i.caption)}</p>`).join('')||'<p class="empty">作品写真準備中</p>'}${[['作品の概要',w.summary],['作品の仕組み',w.mechanism],['制作のポイント',w.points]].map(([title,text])=>`<section class="preview-section"><h3>${title}</h3><p class="preview-text">${esc(text||'説明文準備中')}</p></section>`).join('')}${w.youtubeId?`<p>YouTube動画ID：${esc(w.youtubeId)}</p>`:''}`;
    $('preview-dialog').showModal();
  }
});

async function prepareImage(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 15*1024*1024) throw new Error('JPEG・PNG・WebP形式、15MB以下の画像を選んでください。');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1,1920/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.86));
  if(!blob || blob.type!=='image/webp') throw new Error('このブラウザーでは画像変換に対応していません。新しいChromeやSafariでお試しください。');
  const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
  if ([...uploads.values()].reduce((n,v)=>n+v.base64.length,0)+base64.length>24000000) throw new Error('写真が多いため、一度保存してから追加してください。');
  const path='images/uploads/'+crypto.randomUUID()+'.webp';uploads.set(path,{base64});imageCache.set(path,{base64});return path;
}
$('editor').addEventListener('change', async e => {
  const input=e.target;if(!input.dataset.upload || !input.files.length || busy)return;
  const target=current(), type=input.dataset.upload;
  setBusy(true);state('写真を準備しています…');
  try {
    for (const file of input.files) {
      const path=await prepareImage(file);
      if(type==='work')target.images.push({src:path,alt:target.name,caption:''});
      else if(type==='room')target.image=path;
      else {data.site ||= {...DEFAULT_SITE};data.site.heroImage=path;}
    }
    state('写真を追加しました。「保存して公開」で文章と一緒に反映されます。');
  } catch(error){state(error.message,'error');}
  finally{renderEditor();setBusy(false);}
});

$('connection').onclick=()=>{$('connect-dialog').showModal();$('token').focus();};
$('close-connect').onclick=()=>{$('token').value='';$('connect-dialog').close();};
$('connect-dialog').addEventListener('close',()=>{$('token').value='';});
$('close-preview').onclick=()=>$('preview-dialog').close();
$('connect-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const value=$('token').value.trim();$('token').value='';
  if(!value.startsWith('github_pat_')){$('connect-status').textContent='対象リポジトリを限定したFine-grained token（github_pat_で始まるキー）を使用してください。';return;}
  const button=e.submitter;button.disabled=true;$('connect-status').textContent='接続を確認しています…';
  try{
    const candidate=createApi(value);const repository=await candidate('');
    if(!repository.permissions?.push)throw new Error('このアカウントには更新権限がありません。butumu2027のキーとリポジトリ選択を確認してください。');
    api=candidate;connected=true;$('connection').textContent='GitHub 接続済み';$('connect-status').textContent='';$('connect-dialog').close();
    state('GitHubに接続しました。編集後に「保存して公開」を押してください。','success');
    if(!data)await loadLatest();
  }catch(error){$('connect-status').textContent=error.message;}
  finally{button.disabled=false;}
});
$('disconnect').onclick=()=>{api=createApi('');connected=false;$('connection').textContent='GitHubに接続';$('token').value='';$('connect-dialog').close();state('接続を解除しました。編集内容はこの画面に残っています。');};
$('publish').onclick=async()=>{
  if(busy||!data)return;
  try{validate(data);}catch(error){state(error.message,'error');return;}
  if(!connected){$('connect-dialog').showModal();$('token').focus();return;}
  setBusy(true);state('公開の準備をしています…');
  try{
    head=await publish(api,data,uploads,head,message=>state(message));baseline=JSON.stringify(data);uploads.clear();
    state('GitHubに保存しました。公開サイトへの反映には数分かかる場合があります。「公開サイト」から確認できます。','success');
  }catch(error){state(error.message,'error');}
  finally{setBusy(false);}
};
$('reload').onclick=loadLatest;
$('download').onclick=()=>{
  if(!data)return;
  const paths=imagePaths(data);
  const blob=new Blob([JSON.stringify({version:1,repository:REPO,head,data,uploads:[...uploads].filter(([p])=>paths.has(p))},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='butumu-draft-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  state('下書きをファイルに保存しました。認証キーは含まれていません。公開には「保存して公開」を押してください。');
};
$('import').onclick=()=>$('draft-file').click();
$('draft-file').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';if(!file||busy)return;
  try{
    if(file.size>32*1024*1024)throw new Error('下書きファイルは32MB以下にしてください。');
    const draft=JSON.parse(await file.text());
    if(draft.version!==1||draft.repository!==REPO||!Array.isArray(draft.uploads)||!/^[a-f0-9]{40}$/.test(draft.head||''))throw new Error('この編集画面で保存した下書きファイルを選んでください。');
    validate(draft.data);
    for(const entry of draft.uploads){if(!Array.isArray(entry)||entry.length!==2||!/^images\/uploads\/[a-zA-Z0-9-]+\.webp$/.test(entry[0])||typeof entry[1]?.base64!=='string'||!/^[A-Za-z0-9+/]+=*$/.test(entry[1].base64)||entry[1].base64.length>8000000)throw new Error('下書きの写真データが不正です。');}
    if(dirty&&!confirm('現在の編集内容を下書きの内容に置き換えますか？'))return;
    data=draft.data;head=draft.head;uploads.clear();imageCache.clear();draft.uploads.forEach(([p,v])=>{uploads.set(p,v);imageCache.set(p,v);});tab='works';selected=data.exhibits[0]?.id;$('search').value='';
    document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));
    renderEditor();refreshDirty();state('下書きを読み込みました。公開前に最新のGitHubの状態と照合します。');
  }catch(error){state(error.message,'error');}
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('pagehide',()=>{api=createApi('');connected=false;});
window.addEventListener('pageshow',e=>{if(e.persisted){$('connection').textContent='GitHubに接続';state('編集を再開しました。公開する場合はGitHubに接続し直してください。');}});
loadLatest();
