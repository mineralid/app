'use strict';

const CREDENTIALS = { email: 'mvp@mineralid.cl', password: '123' };
const HISTORY_KEY = 'mineralIdHistory';

const minerals = [
  { name:'Calcopirita', type:'Sulfuro de cobre y hierro', symbol:'CuFeS₂', confidence:87, category:'Sulfuro', description:'Mineral de color amarillo latón y brillo metálico, frecuente en yacimientos de cobre.', features:['Color amarillo latón','Brillo metálico','Dureza 3,5–4','Raya verde negruzca'], alternatives:['Pirita 9%','Bornita 4%'] },
  { name:'Pirita', type:'Sulfuro de hierro', symbol:'FeS₂', confidence:82, category:'Sulfuro', description:'Mineral metálico de tonalidad dorada pálida, conocido por su apariencia similar al oro.', features:['Color amarillo pálido','Brillo metálico','Dureza 6–6,5','Cristales cúbicos'], alternatives:['Calcopirita 12%','Marcasita 6%'] },
  { name:'Malaquita', type:'Carbonato de cobre', symbol:'Cu₂CO₃(OH)₂', confidence:91, category:'Carbonato', description:'Mineral secundario de cobre reconocido por su intenso color verde y bandas características.', features:['Color verde intenso','Brillo vítreo a sedoso','Dureza 3,5–4','Raya verde clara'], alternatives:['Crisocola 6%','Azurita 3%'] },
  { name:'Azurita', type:'Carbonato de cobre', symbol:'Cu₃(CO₃)₂(OH)₂', confidence:89, category:'Carbonato', description:'Mineral de cobre de color azul profundo, común en zonas de oxidación.', features:['Color azul intenso','Brillo vítreo','Dureza 3,5–4','Raya azul clara'], alternatives:['Malaquita 8%','Linarita 3%'] },
  { name:'Cuarzo', type:'Óxido de silicio', symbol:'SiO₂', confidence:78, category:'Silicato', description:'Mineral abundante, generalmente transparente o blanco, con elevada dureza.', features:['Color variable','Brillo vítreo','Dureza 7','Fractura concoidea'], alternatives:['Calcita 14%','Feldespato 8%'] },
  { name:'Hematita', type:'Óxido de hierro', symbol:'Fe₂O₃', confidence:85, category:'Óxido', description:'Mineral de hierro de color gris metálico a rojo terroso, con raya rojiza distintiva.', features:['Color gris a rojo','Brillo metálico o terroso','Dureza 5–6','Raya roja'], alternatives:['Magnetita 10%','Goethita 5%'] }
];

const $ = (s, parent=document) => parent.querySelector(s);
const $$ = (s, parent=document) => [...parent.querySelectorAll(s)];

const loginView = $('#loginView');
const appView = $('#appView');
const screens = $$('.screen');
const navLinks = $$('.nav-link');
const titleMap = { inicio:'Panel principal', analizar:'Analizar mineral', historial:'Historial', guia:'Guía de minerales', planes:'Planes empresariales', soporte:'Soporte' };
let selectedImage = '';
let currentResult = null;

function toast(message){
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>el.classList.remove('show'),2600);
}

function showScreen(id){
  screens.forEach(s=>s.classList.toggle('active-screen',s.id===id));
  navLinks.forEach(n=>n.classList.toggle('active',n.dataset.screen===id));
  $('#screenTitle').textContent = titleMap[id] || 'Mineral ID';
  $('.sidebar').classList.remove('open');
  if(id==='historial') renderHistory();
  if(id==='inicio') updateHomeStats();
  window.scrollTo({top:0,behavior:'smooth'});
}

$('#loginForm').addEventListener('submit', e=>{
  e.preventDefault();
  const ok = $('#email').value.trim().toLowerCase()===CREDENTIALS.email && $('#password').value===CREDENTIALS.password;
  $('#loginError').hidden = ok;
  if(!ok) return;
  sessionStorage.setItem('mineralIdSession','active');
  loginView.hidden = true;
  appView.hidden = false;
  showScreen('inicio');
  toast('Sesión demostrativa iniciada');
});

$('#togglePassword').addEventListener('click',()=>{
  const input=$('#password');
  input.type=input.type==='password'?'text':'password';
});

$('#logoutBtn').addEventListener('click',()=>{
  sessionStorage.removeItem('mineralIdSession');
  appView.hidden=true;loginView.hidden=false;
});

navLinks.forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.screen)));
$$('[data-go]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.go)));
$('#menuBtn').addEventListener('click',()=>$('.sidebar').classList.toggle('open'));

function initializeMinerals(){
  $('#demoMineral').innerHTML = minerals.map((m,i)=>`<option value="${i}">${m.name}</option>`).join('');
  renderGuide(minerals);
}

$('#imageInput').addEventListener('change', e=>{
  const file=e.target.files?.[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    selectedImage=reader.result;
    $('#imagePreview').src=selectedImage;
    $('#imagePreview').hidden=false;
    $('#uploadPlaceholder').hidden=true;
    $('#analyzeBtn').disabled=false;
    $('#emptyResult').hidden=false;
    $('#analysisResult').hidden=true;
  };
  reader.readAsDataURL(file);
});

$('#analyzeBtn').addEventListener('click',()=>{
  if(!selectedImage) return;
  $('#emptyResult').hidden=true;
  $('#analysisResult').hidden=true;
  $('#loadingResult').hidden=false;
  $('#progressBar').style.width='12%';
  const steps=[['Evaluando calidad de imagen...',35],['Comparando características...',68],['Generando resultado preliminar...',100]];
  let i=0;
  const timer=setInterval(()=>{
    if(i>=steps.length){
      clearInterval(timer);
      setTimeout(showResult,450);
      return;
    }
    $('#loadingText').textContent=steps[i][0];
    $('#progressBar').style.width=steps[i][1]+'%';
    i++;
  },650);
});

function showResult(){
  currentResult={...minerals[Number($('#demoMineral').value)], image:selectedImage, date:new Date().toLocaleString('es-CL')};
  $('#loadingResult').hidden=true;
  $('#analysisResult').hidden=false;
  $('#resultName').textContent=currentResult.name;
  $('#resultType').textContent=`${currentResult.type} · ${currentResult.symbol}`;
  $('#resultConfidence').textContent=currentResult.confidence+'%';
  $('#resultImage').src=currentResult.image;
  $('#resultFeatures').innerHTML=currentResult.features.map(f=>`<li>${f}</li>`).join('');
  $('#resultAlternatives').innerHTML=currentResult.alternatives.map(a=>`<span class="alt-chip">${a}</span>`).join('');
  $('#resultDescription').textContent=currentResult.description;
}

$('#saveResultBtn').addEventListener('click',()=>{
  if(!currentResult) return;
  const history=getHistory();
  history.unshift({...currentResult,id:Date.now()});
  localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(0,12)));
  updateHomeStats();
  toast('Análisis guardado en el historial');
});

function getHistory(){
  try{return JSON.parse(localStorage.getItem(HISTORY_KEY))||[]}catch{return []}
}
function renderHistory(){
  const list=$('#historyList');
  const history=getHistory();
  if(!history.length){list.innerHTML='<div class="empty-list"><h3>No hay análisis guardados</h3><p>Realiza un análisis y guárdalo para verlo aquí.</p></div>';return;}
  list.innerHTML=history.map(item=>`<article class="history-item"><img src="${item.image}" alt="${item.name}"><div><h4>${item.name}</h4><p>${item.type}</p><p>${item.date}</p></div><span class="history-score">${item.confidence}%</span></article>`).join('');
}
$('#clearHistoryBtn').addEventListener('click',()=>{
  localStorage.removeItem(HISTORY_KEY);renderHistory();updateHomeStats();toast('Historial eliminado');
});
function updateHomeStats(){$('#homeHistoryCount').textContent=getHistory().length;}

function renderGuide(data){
  $('#guideGrid').innerHTML=data.map(m=>`<article class="mineral-card"><div class="mineral-visual">${m.symbol}</div><div><span class="mineral-tag">${m.category.toUpperCase()}</span><h4>${m.name}</h4><p><strong>${m.type}</strong></p><p>${m.description}</p></div></article>`).join('');
}
$('#mineralSearch').addEventListener('input',e=>{
  const q=e.target.value.trim().toLowerCase();
  renderGuide(minerals.filter(m=>`${m.name} ${m.type} ${m.category}`.toLowerCase().includes(q)));
});

$$('.request-plan').forEach(btn=>btn.addEventListener('click',()=>{
  $('#contactPlan').value=btn.dataset.plan;
  $('#contactForm').scrollIntoView({behavior:'smooth',block:'center'});
}));
$('#contactForm').addEventListener('submit',e=>{
  e.preventDefault();
  e.currentTarget.reset();
  toast('Solicitud simulada enviada correctamente');
});

initializeMinerals();
updateHomeStats();
if(sessionStorage.getItem('mineralIdSession')==='active'){
  loginView.hidden=true;appView.hidden=false;showScreen('inicio');
}
