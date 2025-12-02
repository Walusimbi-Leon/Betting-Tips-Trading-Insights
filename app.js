// app.js - modular Firebase + app logic
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {
  getDatabase, ref, push, set, onValue, get
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

/* ---------------------------
   Paste your Firebase config here
   (already provided earlier) 
----------------------------*/
const firebaseConfig = {
  apiKey: "AIzaSyBz0AOQbvBKf3oikFGaQSVHKoQmMD6xFi4",
  authDomain: "tradersbettinghub1.firebaseapp.com",
  projectId: "tradersbettinghub1",
  storageBucket: "tradersbettinghub1.firebasestorage.app",
  messagingSenderId: "298690642248",
  appId: "1:298690642248:web:9dac572727df849d49f37d",
  measurementId: "G-7MN8XVBCJ3"
};

const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch(e) {}
const db = getDatabase(app);
window.__TB_DB = db;

// utilities
const ADMIN_KEY_1 = "admin-end.bt";
const ADMIN_KEY_2 = "admin-leon.bt";
const pagesListEl = document.getElementById('pagesList');

function todayKey(){ return new Date().toISOString().slice(0,10); }
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// increment visitor count safely
(async function incrementVisit(){
  try {
    const key = todayKey();
    const r = ref(db, 'visits/' + key);
    const s = await get(r);
    const cur = s.exists() ? (s.val()||0) : 0;
    await set(r, cur + 1);
  } catch(e) { console.warn('visit increment failed', e); }
})();

// ------------------- SEARCH & ADMIN KEYS -------------------
document.getElementById('searchBtn').addEventListener('click', handleSearch);
document.getElementById('searchBar').addEventListener('keydown', (e)=> { if(e.key === 'Enter') handleSearch(); });

async function handleSearch(){
  const q = document.getElementById('searchBar').value.trim();
  if(!q) return;
  if(q === ADMIN_KEY_1){ show('admin-end'); populateAdminEnd(); return; }
  if(q === ADMIN_KEY_2){ show('admin-leon'); await refreshPagesSelect(); return; }
  // otherwise treat as page search query
  await refreshPublicPages(q);
  show('home');
}

function show(sectionId){
  document.getElementById('home').classList.add('hidden');
  document.getElementById('admin-end').classList.add('hidden');
  document.getElementById('admin-leon').classList.add('hidden');
  document.getElementById(sectionId).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ------------------- SUBSCRIBE -------------------
document.getElementById('subscribeBtn').addEventListener('click', async ()=>{
  const email = document.getElementById('subscriberEmail').value.trim();
  const msg = document.getElementById('subscribeMsg');
  msg.textContent = '';
  if(!email){ msg.textContent = 'Enter a valid email'; return; }
  try {
    await set(push(ref(db, 'subscriptions')), { email, createdAt: Date.now() });
    msg.textContent = 'Thanks — subscribed!';
    document.getElementById('subscriberEmail').value = '';
  } catch(err){ msg.textContent = 'Error: ' + (err.message||err); console.error(err); }
});

// ------------------- FEEDBACK -------------------
document.getElementById('sendFeedbackBtn').addEventListener('click', async ()=>{
  const text = document.getElementById('feedbackText').value.trim();
  const name = document.getElementById('feedbackName').value.trim() || 'Anonymous';
  const msg = document.getElementById('feedbackMsg');
  msg.textContent = '';
  if(!text){ msg.textContent = 'Please write feedback'; return; }
  try {
    await set(push(ref(db, 'feedbacks')), { text, name, createdAt: Date.now() });
    msg.textContent = 'Feedback sent — thank you!';
    document.getElementById('feedbackText').value = '';
    document.getElementById('feedbackName').value = '';
  } catch(err){ msg.textContent = 'Error: ' + (err.message||err); console.error(err); }
});

// ------------------- PUBLIC PAGES (list + open) -------------------
function refreshPublicPages(query = '') {
  // live listener
  onValue(ref(db, 'pages'), snap => {
    pagesListEl.innerHTML = '';
    if(!snap.exists()){ pagesListEl.innerHTML = '<div class="muted">No pages yet</div>'; return; }
    snap.forEach(child => {
      const p = child.val();
      const title = p.title || 'Untitled';
      if(query && !title.toLowerCase().includes(query.toLowerCase())) return;
      const card = document.createElement('div'); card.className = 'section';
      card.innerHTML = `<strong>${escapeHtml(title)}</strong><div class="small-muted">${p.sections?Object.keys(p.sections).length:0} section(s)</div>`;
      card.addEventListener('click', ()=> openPublicPage(child.key));
      pagesListEl.appendChild(card);
    });
  });
}
refreshPublicPages();

// open page modal (renders images responsively)
async function openPublicPage(pageId){
  try {
    const snap = await get(ref(db, 'pages/' + pageId));
    if(!snap.exists()) return alert('Page not found');
    const page = snap.val();
    const modal = document.createElement('div');
    Object.assign(modal.style, { position:'fixed', left:0, top:0, width:'100%', height:'100%', background:'rgba(15,23,42,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 });
    const frame = document.createElement('div'); frame.className = 'card';
    Object.assign(frame.style, { width:'94%', maxWidth:'980px', maxHeight:'92%', overflow:'auto', padding:'16px', background:'#fff', color: 'var(--text)' });

    const close = document.createElement('button'); close.textContent = 'Close'; close.style.float='right';
    close.addEventListener('click', ()=> document.body.removeChild(modal));
    frame.appendChild(close);
    frame.appendChild(Object.assign(document.createElement('h2'), { innerText: page.title || 'Untitled' }));

    const container = document.createElement('div'); container.style.marginTop = '12px';
    const secs = page.sections ? Object.values(page.sections).sort((a,b)=> (a.order||0)-(b.order||0)) : [];
    if(secs.length === 0) container.innerHTML = '<div class="muted">No sections</div>';
    secs.forEach(s=>{
      const node = document.createElement('div'); node.style.marginBottom = '12px';
      if(s.type === 'text') node.innerHTML = s.props.html || escapeHtml(s.props.text || '');
      else if(s.type === 'image'){ const img = document.createElement('img'); img.className = 'responsive'; img.src = s.props.src || ''; node.appendChild(img); }
      else if(s.type === 'button'){ const btn = document.createElement('button'); btn.textContent = s.props.label || 'Button'; if(s.props.actionUrl) btn.addEventListener('click', ()=> window.open(s.props.actionUrl,'_blank')); node.appendChild(btn); }
      container.appendChild(node);
    });

    frame.appendChild(container);
    modal.appendChild(frame);
    document.body.appendChild(modal);
  } catch(e){ console.error(e); alert('Unable to open page'); }
}

// ------------------- ADMIN-END: populate subscribers, feedbacks, visits -------------------
function populateAdminEnd(){
  onValue(ref(db, 'subscriptions'), snap => {
    const el = document.getElementById('subsList'); el.innerHTML = '';
    if(!snap.exists()){ el.innerHTML = '<div class="muted">No subscribers yet</div>'; return; }
    snap.forEach(child => {
      const v = child.val();
      const d = document.createElement('div'); d.className='section';
      d.innerHTML = `<strong>${escapeHtml(v.email)}</strong><div class="small-muted">${v.createdAt?new Date(v.createdAt).toLocaleString():''}</div>`;
      el.appendChild(d);
    });
  });

  onValue(ref(db, 'feedbacks'), snap => {
    const el = document.getElementById('feedbacksList'); el.innerHTML = '';
    if(!snap.exists()){ el.innerHTML = '<div class="muted">No feedback yet</div>'; return; }
    snap.forEach(child => {
      const v = child.val();
      const d = document.createElement('div'); d.className='section';
      d.innerHTML = `<strong>${escapeHtml(v.name||'Anon')}</strong><div class="small-muted">${v.createdAt?new Date(v.createdAt).toLocaleString():''}</div><div style="margin-top:6px">${escapeHtml(v.text)}</div>`;
      el.appendChild(d);
    });
  });

  onValue(ref(db, 'visits'), snap => {
    const el = document.getElementById('visitorsCount');
    const data = snap.val() || {};
    let total = 0; Object.keys(data).forEach(k => total += (Number(data[k]) || 0));
    el.textContent = `${(data[todayKey()]||0)} today — ${total} total`;
  });
}

// ------------------- ADMIN-LEON: builder and media -------------------
let currentPage = { id: null, title: 'Untitled', sections: {} };

const pagesSelect = document.getElementById('pagesSelect');
const newPageBtn = document.getElementById('newPageBtn');
const savePageBtn = document.getElementById('savePageBtn');
const deletePageBtn = document.getElementById('deletePageBtn');
const pageTitleEl = document.getElementById('pageTitle');
const sectionTypeEl = document.getElementById('sectionType');
const sectionOptionsEl = document.getElementById('sectionOptions');
const addSectionBtn = document.getElementById('addSectionBtn');
const clearSectionsBtn = document.getElementById('clearSectionsBtn');
const sectionsListEl = document.getElementById('sectionsList');
const pagePreviewEl = document.getElementById('pagePreview');
const fileInput = document.getElementById('fileInput');
const uploadFileBtn = document.getElementById('uploadFileBtn');
const uploadStatus = document.getElementById('uploadStatus');

function renderSectionOptions(){
  const t = sectionTypeEl.value; sectionOptionsEl.innerHTML = '';
  if(t === 'text') sectionOptionsEl.innerHTML = '<label class="small-muted">Text (HTML)</label><textarea id="opt_text" rows="4"></textarea>';
  else if(t === 'image') sectionOptionsEl.innerHTML = '<label class="small-muted">Image source (leave empty to use Upload)</label><input id="opt_img" placeholder="Paste image URL or Data URL" />';
  else if(t === 'button') sectionOptionsEl.innerHTML = '<label class="small-muted">Label</label><input id="opt_btn_label" placeholder="Label"/><label class="small-muted">Action URL</label><input id="opt_btn_url" placeholder="https://..." />';
}
sectionTypeEl.addEventListener('change', renderSectionOptions);
renderSectionOptions();

addSectionBtn.addEventListener('click', ()=>{
  const t = sectionTypeEl.value;
  const id = 's_' + Date.now();
  const props = {};
  if(t === 'text') props.html = document.getElementById('opt_text').value || '';
  if(t === 'image') props.src = document.getElementById('opt_img').value || '';
  if(t === 'button'){ props.label = document.getElementById('opt_btn_label').value || 'Button'; props.actionUrl = document.getElementById('opt_btn_url').value || ''; }
  const order = Object.keys(currentPage.sections).length;
  currentPage.sections[id] = { id, type: t, props, order };
  renderSectionsList(); renderPreview();
});

clearSectionsBtn.addEventListener('click', ()=> { if(confirm('Clear all sections?')){ currentPage.sections = {}; renderSectionsList(); renderPreview(); } });

function renderSectionsList(){
  sectionsListEl.innerHTML = '';
  const secs = Object.values(currentPage.sections).sort((a,b)=> (a.order||0)-(b.order||0));
  secs.forEach(s=>{
    const row = document.createElement('div'); row.className='section';
    row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center';
    row.innerHTML = `<div><strong>${escapeHtml(s.type)}</strong><div class="small-muted">${escapeHtml(JSON.stringify(s.props).slice(0,120))}</div></div>`;
    const controls = document.createElement('div');
    controls.innerHTML = `<button class="btn-edit">Edit</button> <button class="btn-remove danger">Remove</button>`;
    row.appendChild(controls);

    // edit
    controls.querySelector('.btn-edit').addEventListener('click', ()=>{
      if(s.type === 'text'){
        const val = prompt('Edit HTML/Text', s.props.html || '');
        if(val !== null){ s.props.html = val; currentPage.sections[s.id] = s; renderSectionsList(); renderPreview(); }
      } else if(s.type === 'image'){
        const val = prompt('Image source (URL or Data URL)', s.props.src || '');
        if(val !== null){ s.props.src = val; currentPage.sections[s.id] = s; renderSectionsList(); renderPreview(); }
      } else if(s.type === 'button'){
        const lbl = prompt('Label', s.props.label || 'Button');
        if(lbl===null) return;
        const url = prompt('Action URL (optional)', s.props.actionUrl || '');
        s.props.label = lbl; s.props.actionUrl = url || ''; currentPage.sections[s.id] = s; renderSectionsList(); renderPreview();
      }
    });

    // remove
    controls.querySelector('.btn-remove').addEventListener('click', ()=> {
      if(confirm('Remove this section?')){ delete currentPage.sections[s.id]; rebuildOrder(); renderSectionsList(); renderPreview(); }
    });

    // drag reorder
    row.draggable = true;
    row.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', s.id));
    row.addEventListener('dragover', e => e.preventDefault());
    row.addEventListener('drop', e => { e.preventDefault(); const fromId = e.dataTransfer.getData('text/plain'); reorderSections(fromId, s.id); });

    sectionsListEl.appendChild(row);
  });
}

function reorderSections(fromId, toId){
  const secs = Object.values(currentPage.sections).sort((a,b)=>(a.order||0)-(b.order||0));
  const fromIdx = secs.findIndex(x=>x.id===fromId);
  const toIdx = secs.findIndex(x=>x.id===toId);
  if(fromIdx < 0 || toIdx < 0) return;
  const item = secs.splice(fromIdx,1)[0];
  secs.splice(toIdx,0,item);
  secs.forEach((s,i)=> s.order = i);
  currentPage.sections = {}; secs.forEach(s=> currentPage.sections[s.id] = s);
  renderSectionsList(); renderPreview();
}

function rebuildOrder(){
  const secs = Object.values(currentPage.sections);
  secs.forEach((s,i)=> s.order = i);
  const obj = {}; secs.forEach(s=> obj[s.id] = s);
  currentPage.sections = obj;
}

function renderPreview(){
  pagePreviewEl.innerHTML = '';
  const title = document.createElement('h3'); title.textContent = currentPage.title || 'Untitled';
  pagePreviewEl.appendChild(title);
  const secs = Object.values(currentPage.sections).sort((a,b)=> (a.order||0)-(b.order||0));
  secs.forEach(s=>{
    const block = document.createElement('div'); block.className = 'section';
    if(s.type === 'text'){ block.innerHTML = s.props.html || s.props.text || ''; }
    else if(s.type === 'image'){ const img = document.createElement('img'); img.className = 'responsive'; img.src = s.props.src || ''; block.appendChild(img); }
    else if(s.type === 'button'){ const btn = document.createElement('button'); btn.textContent = s.props.label || 'Button'; if(s.props.actionUrl) btn.addEventListener('click', ()=> window.open(s.props.actionUrl,'_blank')); block.appendChild(btn); }
    pagePreviewEl.appendChild(block);
  });
}

// upload image -> store in /media and insert into current page
uploadFileBtn.addEventListener('click', async ()=>{
  uploadStatus.textContent = '';
  const file = fileInput.files && fileInput.files[0];
  if(!file) return uploadStatus.textContent = 'Pick an image file first.';
  if(!file.type.startsWith('image/')) return uploadStatus.textContent = 'Please pick an image.';
  try {
    uploadStatus.textContent = 'Reading...';
    const dataUrl = await readFileAsDataURL(file);
    uploadStatus.textContent = 'Saving...';
    const mRef = push(ref(db, 'media'));
    await set(mRef, { name: file.name, type: file.type, size: file.size, dataUrl, createdAt: Date.now() });
    uploadStatus.textContent = 'Saved. Inserting into page...';
    const id = 's_' + Date.now();
    const order = Object.keys(currentPage.sections).length;
    currentPage.sections[id] = { id, type: 'image', props: { src: dataUrl }, order };
    renderSectionsList(); renderPreview();
    uploadStatus.textContent = 'Done — image inserted into the preview. Save page to persist.';
    fileInput.value = '';
  } catch(e){ console.error(e); uploadStatus.textContent = 'Upload failed: ' + (e.message || e); }
});

function readFileAsDataURL(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// pages select + save + delete
async function refreshPagesSelect(){
  pagesSelect.innerHTML = '<option value="">Load page...</option>';
  const snap = await get(ref(db, 'pages'));
  if(!snap.exists()) return;
  snap.forEach(child => {
    const p = child.val();
    const opt = document.createElement('option'); opt.value = child.key; opt.textContent = p.title || ('Untitled - ' + child.key);
    pagesSelect.appendChild(opt);
  });
}

newPageBtn.addEventListener('click', ()=> {
  currentPage = { id: null, title: 'Untitled', sections: {} };
  pageTitleEl.value = currentPage.title;
  renderSectionsList(); renderPreview();
});

pagesSelect.addEventListener('change', async ()=>{
  if(!pagesSelect.value) return;
  const snap = await get(ref(db, 'pages/' + pagesSelect.value));
  if(!snap.exists()) return alert('Page not found');
  const p = snap.val();
  currentPage = { id: pagesSelect.value, title: p.title || 'Untitled', sections: p.sections || {} };
  pageTitleEl.value = currentPage.title;
  renderSectionsList(); renderPreview();
});

savePageBtn.addEventListener('click', async ()=>{
  try {
    const title = pageTitleEl.value.trim();
    if(!title) return alert('Set a page title first');
    currentPage.title = title;
    currentPage.updatedAt = Date.now();
    if(currentPage.id){
      await set(ref(db, 'pages/' + currentPage.id), currentPage);
      alert('Page updated');
    } else {
      const pRef = push(ref(db, 'pages'));
      currentPage.createdAt = Date.now();
      await set(pRef, currentPage);
      currentPage.id = pRef.key;
      alert('Page created — ID: ' + pRef.key);
      await refreshPagesSelect();
    }
  } catch(e){ console.error(e); alert('Save failed: ' + (e.message || e)); }
});

deletePageBtn.addEventListener('click', async ()=>{
  if(!currentPage.id) return alert('Load a saved page first');
  if(!confirm('Delete this page?')) return;
  try {
    await set(ref(db, 'pages/' + currentPage.id), null);
    currentPage = { id: null, title: 'Untitled', sections: {} };
    pageTitleEl.value = '';
    renderSectionsList(); renderPreview();
    await refreshPagesSelect();
    alert('Deleted');
  } catch(e){ console.error(e); alert('Delete failed: ' + (e.message||e)); }
});

// media pool quick helper: clicking uploadStatus will show available uploaded media (copy dataURL)
uploadStatus.addEventListener('click', async ()=>{
  const snap = await get(ref(db, 'media'));
  if(!snap.exists()){ uploadStatus.textContent = 'No media uploaded yet.'; return; }
  uploadStatus.innerHTML = '<div class="small-muted">Available media (click to copy data URL)</div>';
  const items = snap.val(); const keys = Object.keys(items).reverse();
  keys.forEach(k=>{
    const m = items[k];
    const btn = document.createElement('button'); btn.textContent = m.name || k; btn.style.marginTop='6px';
    btn.addEventListener('click', async ()=>{
      try { await navigator.clipboard.writeText(m.dataUrl); uploadStatus.textContent = 'Copied to clipboard — paste into image source input.'; } catch(e){ uploadStatus.textContent = 'Copy failed; check console.'; console.log(m.dataUrl); }
    });
    uploadStatus.appendChild(btn);
  });
});

// refresh public pages live
onValue(ref(db, 'pages'), ()=> refreshPublicPages());

// expose for debugging
window.TBH = { db, refreshPublicPages, refreshPagesSelect };

// initial state
pageTitleEl.value = currentPage.title;
renderSectionsList(); renderPreview();
