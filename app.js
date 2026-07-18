'use strict';

const CREDENTIALS = { email: 'mvp@mineralid.cl', password: '123' };
const DB_NAME = 'MineralIDMVP';
const DB_VERSION = 1;
const STORE_NAME = 'history';

const minerals = [
  { name:'Calcopirita', type:'Sulfuro de cobre y hierro', symbol:'CuFeS₂', confidence:87, category:'Sulfuro', description:'Mineral de color amarillo latón y brillo metálico, frecuente en yacimientos de cobre.', features:['Color amarillo latón','Brillo metálico','Dureza 3,5–4','Raya verde negruzca'], alternatives:['Pirita 9%','Bornita 4%'] },
  { name:'Pirita', type:'Sulfuro de hierro', symbol:'FeS₂', confidence:82, category:'Sulfuro', description:'Mineral metálico de tonalidad dorada pálida, conocido por su apariencia similar al oro.', features:['Color amarillo pálido','Brillo metálico','Dureza 6–6,5','Cristales cúbicos'], alternatives:['Calcopirita 12%','Marcasita 6%'] },
  { name:'Malaquita', type:'Carbonato de cobre', symbol:'Cu₂CO₃(OH)₂', confidence:91, category:'Carbonato', description:'Mineral secundario de cobre reconocido por su intenso color verde y bandas características.', features:['Color verde intenso','Brillo vítreo a sedoso','Dureza 3,5–4','Raya verde clara'], alternatives:['Crisocola 6%','Azurita 3%'] },
  { name:'Azurita', type:'Carbonato de cobre', symbol:'Cu₃(CO₃)₂(OH)₂', confidence:89, category:'Carbonato', description:'Mineral de cobre de color azul profundo, común en zonas de oxidación.', features:['Color azul intenso','Brillo vítreo','Dureza 3,5–4','Raya azul clara'], alternatives:['Malaquita 8%','Linarita 3%'] },
  { name:'Cuarzo', type:'Óxido de silicio', symbol:'SiO₂', confidence:78, category:'Silicato', description:'Mineral abundante, generalmente transparente o blanco, con elevada dureza.', features:['Color variable','Brillo vítreo','Dureza 7','Fractura concoidea'], alternatives:['Calcita 14%','Feldespato 8%'] },
  { name:'Hematita', type:'Óxido de hierro', symbol:'Fe₂O₃', confidence:85, category:'Óxido', description:'Mineral de hierro de color gris metálico a rojo terroso, con raya rojiza distintiva.', features:['Color gris a rojo','Brillo metálico o terroso','Dureza 5–6','Raya roja'], alternatives:['Magnetita 10%','Goethita 5%'] }
];

const assistantAnswers = {
  capture: {
    question: '¿Cómo tomar una buena foto?',
    answer: 'Limpia la lente, coloca la muestra sobre un fondo neutro, usa buena iluminación y procura que el mineral ocupe la mayor parte de la imagen sin perder el enfoque.'
  },
  confidence: {
    question: '¿Qué significa la coincidencia?',
    answer: 'Es un porcentaje demostrativo que representa qué tan similar sería la imagen a un mineral de la base de datos. En este MVP el valor es simulado.'
  },
  laboratory: {
    question: '¿Reemplaza al laboratorio?',
    answer: 'No. Mineral ID está planteado como apoyo para una identificación preliminar. Las decisiones críticas deben validarse con un geólogo o un análisis de laboratorio.'
  },
  plans: {
    question: '¿Cómo contratar Mineral ID?',
    answer: 'Las empresas podrían solicitar una demostración desde la sección Planes. El equipo comercial evaluaría usuarios, capacitación, soporte y accesorios necesarios.'
  },
  support: {
    question: 'Necesito soporte',
    answer: 'Para esta demostración puedes escribir a mvp@mineralid.cl. En la versión completa existiría soporte para usuarios y administradores de empresa.'
  }
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const loginView = $('#loginView');
const appView = $('#appView');
const screens = $$('.screen');
const navLinks = $$('.nav-link');
const titleMap = { inicio:'Panel principal', analizar:'Analizar mineral', historial:'Historial', guia:'Guía de minerales', planes:'Planes empresariales', soporte:'Soporte' };
let selectedImage = '';
let currentResult = null;
let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function getHistory() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result || []).sort((a, b) => b.id - a.id));
    request.onerror = () => reject(request.error);
  });
}

async function saveHistoryItem(item) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function clearHistory() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => element.classList.remove('show'), 2600);
}

async function showScreen(id) {
  screens.forEach(screen => screen.classList.toggle('active-screen', screen.id === id));
  navLinks.forEach(link => link.classList.toggle('active', link.dataset.screen === id));
  $('#screenTitle').textContent = titleMap[id] || 'Mineral ID';
  $('.sidebar').classList.remove('open');
  if (id === 'historial') await renderHistory();
  if (id === 'inicio') await updateHomeStats();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('#loginForm').addEventListener('submit', event => {
  event.preventDefault();
  const valid = $('#email').value.trim().toLowerCase() === CREDENTIALS.email && $('#password').value === CREDENTIALS.password;
  $('#loginError').hidden = valid;
  if (!valid) return;
  sessionStorage.setItem('mineralIdSession', 'active');
  loginView.hidden = true;
  appView.hidden = false;
  showScreen('inicio');
  toast('Sesión demostrativa iniciada');
});

$('#togglePassword').addEventListener('click', () => {
  const input = $('#password');
  input.type = input.type === 'password' ? 'text' : 'password';
});

$('#logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('mineralIdSession');
  appView.hidden = true;
  loginView.hidden = false;
});

navLinks.forEach(button => button.addEventListener('click', () => showScreen(button.dataset.screen)));
$$('[data-go]').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.go)));
$('#menuBtn').addEventListener('click', () => $('.sidebar').classList.toggle('open'));

function initializeMinerals() {
  renderGuide(minerals);
}

$('#imageInput').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast('Selecciona un archivo de imagen válido');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    selectedImage = reader.result;
    $('#imagePreview').src = selectedImage;
    $('#imagePreview').hidden = false;
    $('#uploadPlaceholder').hidden = true;
    $('#analyzeBtn').disabled = false;
    $('#emptyResult').hidden = false;
    $('#analysisResult').hidden = true;
  };
  reader.onerror = () => toast('No fue posible leer la imagen');
  reader.readAsDataURL(file);
});

$('#analyzeBtn').addEventListener('click', () => {
  if (!selectedImage) return;
  $('#emptyResult').hidden = true;
  $('#analysisResult').hidden = true;
  $('#loadingResult').hidden = false;
  $('#progressBar').style.width = '12%';
  const steps = [
    ['Evaluando calidad de imagen...', 35],
    ['Comparando características...', 68],
    ['Generando resultado preliminar...', 100]
  ];
  let index = 0;
  const timer = setInterval(() => {
    if (index >= steps.length) {
      clearInterval(timer);
      setTimeout(showResult, 450);
      return;
    }
    $('#loadingText').textContent = steps[index][0];
    $('#progressBar').style.width = `${steps[index][1]}%`;
    index += 1;
  }, 650);
});

function showResult() {
  const randomMineral = minerals[Math.floor(Math.random() * minerals.length)];
  currentResult = {
    ...randomMineral,
    confidence: Math.max(72, Math.min(96, randomMineral.confidence + Math.floor(Math.random() * 7) - 3)),
    image: selectedImage,
    date: new Date().toLocaleString('es-CL')
  };
  $('#loadingResult').hidden = true;
  $('#analysisResult').hidden = false;
  $('#resultName').textContent = currentResult.name;
  $('#resultType').textContent = `${currentResult.type} · ${currentResult.symbol}`;
  $('#resultConfidence').textContent = `${currentResult.confidence}%`;
  $('#resultImage').src = currentResult.image;
  $('#resultFeatures').innerHTML = currentResult.features.map(feature => `<li>${feature}</li>`).join('');
  $('#resultAlternatives').innerHTML = currentResult.alternatives.map(item => `<span class="alt-chip">${item}</span>`).join('');
  $('#resultDescription').textContent = currentResult.description;
}

$('#saveResultBtn').addEventListener('click', async () => {
  if (!currentResult) return;
  const button = $('#saveResultBtn');
  button.disabled = true;
  try {
    await saveHistoryItem({ ...currentResult, id: Date.now() });
    await updateHomeStats();
    toast('Análisis guardado correctamente');
  } catch (error) {
    console.error(error);
    toast('No se pudo guardar el análisis en este navegador');
  } finally {
    button.disabled = false;
  }
});

async function renderHistory() {
  const list = $('#historyList');
  try {
    const history = await getHistory();
    if (!history.length) {
      list.innerHTML = '<div class="empty-list"><h3>No hay análisis guardados</h3><p>Realiza un análisis y guárdalo para verlo aquí.</p></div>';
      return;
    }
    list.innerHTML = history.map(item => `
      <article class="history-item">
        <img src="${item.image}" alt="Imagen del análisis ${item.name}">
        <div><h4>${item.name}</h4><p>${item.type}</p><p>${item.date}</p></div>
        <span class="history-score">${item.confidence}%</span>
      </article>`).join('');
  } catch (error) {
    console.error(error);
    list.innerHTML = '<div class="empty-list"><h3>No fue posible cargar el historial</h3><p>El navegador puede estar bloqueando el almacenamiento local.</p></div>';
  }
}

$('#clearHistoryBtn').addEventListener('click', async () => {
  try {
    await clearHistory();
    await renderHistory();
    await updateHomeStats();
    toast('Historial eliminado');
  } catch (error) {
    console.error(error);
    toast('No fue posible eliminar el historial');
  }
});

async function updateHomeStats() {
  try {
    $('#homeHistoryCount').textContent = (await getHistory()).length;
  } catch {
    $('#homeHistoryCount').textContent = '—';
  }
}

function renderGuide(data) {
  $('#guideGrid').innerHTML = data.map(mineral => `
    <article class="mineral-card">
      <div class="mineral-visual">${mineral.symbol}</div>
      <div><span class="mineral-tag">${mineral.category.toUpperCase()}</span><h4>${mineral.name}</h4><p><strong>${mineral.type}</strong></p><p>${mineral.description}</p></div>
    </article>`).join('');
}

$('#mineralSearch').addEventListener('input', event => {
  const query = event.target.value.trim().toLowerCase();
  renderGuide(minerals.filter(mineral => `${mineral.name} ${mineral.type} ${mineral.category}`.toLowerCase().includes(query)));
});

$$('.request-plan').forEach(button => button.addEventListener('click', () => {
  $('#contactPlan').value = button.dataset.plan;
  $('#contactForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}));

$('#contactForm').addEventListener('submit', event => {
  event.preventDefault();
  event.currentTarget.reset();
  toast('Solicitud simulada enviada correctamente');
});

function addAssistantMessage(text, type) {
  const message = document.createElement('div');
  message.className = `assistant-message ${type}`;
  message.textContent = text;
  $('#assistantMessages').appendChild(message);
  $('#assistantMessages').scrollTop = $('#assistantMessages').scrollHeight;
}

$('#assistantToggle').addEventListener('click', () => {
  $('#assistantPanel').hidden = !$('#assistantPanel').hidden;
});
$('#assistantClose').addEventListener('click', () => {
  $('#assistantPanel').hidden = true;
});
$$('[data-answer]').forEach(button => button.addEventListener('click', () => {
  const response = assistantAnswers[button.dataset.answer];
  addAssistantMessage(response.question, 'user');
  button.disabled = true;
  setTimeout(() => {
    addAssistantMessage(response.answer, 'bot');
    button.disabled = false;
  }, 450);
}));

document.addEventListener('click', event => {
  const panel = $('#assistantPanel');
  const toggle = $('#assistantToggle');
  if (!panel.hidden && !panel.contains(event.target) && !toggle.contains(event.target)) panel.hidden = true;
});

initializeMinerals();
updateHomeStats();
openDatabase().catch(error => console.error('IndexedDB no disponible:', error));
if (sessionStorage.getItem('mineralIdSession') === 'active') {
  loginView.hidden = true;
  appView.hidden = false;
  showScreen('inicio');
}
