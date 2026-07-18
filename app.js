const screens = document.querySelectorAll('.screen');
const menu = document.getElementById('menu');
const menuBtn = document.getElementById('menuBtn');

function showScreen(id) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
  menu.classList.add('hidden');
  menuBtn.setAttribute('aria-expanded', 'false');
}

document.querySelectorAll('[data-screen]').forEach(button => {
  button.addEventListener('click', () => showScreen(button.dataset.screen));
});

menuBtn.addEventListener('click', () => {
  const willOpen = menu.classList.contains('hidden');
  menu.classList.toggle('hidden');
  menuBtn.setAttribute('aria-expanded', String(willOpen));
});

let stream = null;
let lastResults = [];
let analysisInProgress = false;
let consultationInProgress = false;

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const photo = document.getElementById('photo');
const startBtn = document.getElementById('startCamera');
const takeBtn = document.getElementById('takePhoto');
const stopBtn = document.getElementById('stopCamera');
const status = document.getElementById('cameraStatus');
const mineralResult = document.getElementById('mineralResult');
const consultationPanel = document.getElementById('consultationPanel');
const consultationChat = document.getElementById('consultationChat');
const consultBtn = document.getElementById('consultGeologist');
const closeConsultationBtn = document.getElementById('closeConsultation');

const minerals = [
  'Cuarzo', 'Calcita', 'Pirita', 'Calcopirita', 'Malaquita',
  'Hematita', 'Magnetita', 'Galena', 'Yeso', 'Feldespato'
];

const geologists = [
  'Dra. Valentina Rojas',
  'Geólogo Martín Salazar',
  'Dra. Camila Fuentes',
  'Geólogo Sebastián Araya',
  'Dra. Fernanda Morales'
];

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function randomDelay(minimum = 700, maximum = 5000) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

async function startCamera() {
  if (stream) return true;

  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'Este navegador no permite acceder a la cámara.';
    return false;
  }

  try {
    status.textContent = 'Solicitando acceso a la cámara…';
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    takeBtn.disabled = false;
    stopBtn.disabled = false;
    startBtn.disabled = true;
    status.textContent = 'Cámara encendida y lista para capturar.';
    return true;
  } catch (error) {
    status.textContent = 'No fue posible acceder a la cámara. Revisa los permisos y usa HTTPS o localhost.';
    return false;
  }
}

function getRandomIdentification() {
  const selected = [...minerals].sort(() => Math.random() - 0.5).slice(0, 3);
  const first = Math.floor(Math.random() * 31) + 50;
  const secondMaximum = Math.max(5, 95 - first);
  const second = Math.floor(Math.random() * (secondMaximum - 4)) + 5;
  const third = 100 - first - second;

  return selected.map((name, index) => ({
    name,
    probability: [first, second, third][index]
  })).sort((a, b) => b.probability - a.probability);
}

function showMineralIdentification(results) {
  const [main] = results;
  lastResults = results;

  mineralResult.innerHTML = `
    <p class="resultLabel">RESULTADO PRELIMINAR SIMULADO</p>
    <h3>El mineral puede ser ${main.name}.</h3>
    <div class="probabilities">
      ${results.map(item => `
        <div class="probabilityRow">
          <div><strong>${item.name}</strong><span>${item.probability}%</span></div>
          <div class="probabilityTrack"><span style="width: ${item.probability}%"></span></div>
        </div>
      `).join('')}
    </div>
    <small>Las probabilidades fueron generadas aleatoriamente y no corresponden a un análisis real.</small>
  `;
  mineralResult.classList.remove('hidden');
  consultBtn.classList.remove('hidden');
  consultationPanel.classList.add('hidden');

  return `El mineral puede ser ${main.name}. Las probabilidades simuladas son ${results
    .map(item => `${item.name}, ${item.probability} por ciento`)
    .join('; ')}.`;
}

async function takePhoto() {
  if (analysisInProgress) return null;
  if (!stream || !video.videoWidth || !video.videoHeight) {
    status.textContent = 'La cámara todavía no está lista.';
    return null;
  }

  analysisInProgress = true;
  takeBtn.disabled = true;
  consultBtn.classList.add('hidden');
  consultationPanel.classList.add('hidden');
  mineralResult.classList.add('hidden');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  photo.src = canvas.toDataURL('image/jpeg', 0.92);
  photo.classList.remove('hidden');

  const delay = randomDelay(700, 5000);
  status.innerHTML = '<span class="spinner" aria-hidden="true"></span> Analizando la muestra…';
  await wait(delay);

  const results = getRandomIdentification();
  const resultText = showMineralIdentification(results);
  status.textContent = 'Fotografía tomada y análisis simulado completado.';
  analysisInProgress = false;
  takeBtn.disabled = false;
  return resultText;
}

function stopCamera() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  takeBtn.disabled = true;
  stopBtn.disabled = true;
  startBtn.disabled = false;
  status.textContent = 'Cámara apagada.';
}

function addConsultationMessage(text, type, author = '') {
  const wrapper = document.createElement('div');
  wrapper.className = `consultMessage ${type}`;
  if (author) {
    const name = document.createElement('strong');
    name.className = 'consultAuthor';
    name.textContent = author;
    wrapper.appendChild(name);
  }
  const content = document.createElement('p');
  content.textContent = text;
  wrapper.appendChild(content);
  consultationChat.appendChild(wrapper);
  consultationChat.scrollTop = consultationChat.scrollHeight;
}

function buildGeologistReply(results) {
  const [first, second] = results;
  const gap = first.probability - second.probability;

  if (gap <= 8) {
    if (Math.random() < 0.5) {
      const chosen = Math.random() < 0.5 ? first : second;
      const alternative = chosen === first ? second : first;
      return `Las probabilidades están muy próximas. Por los antecedentes disponibles, me inclino de forma tentativa por ${chosen.name}, aunque ${alternative.name} sigue siendo una alternativa razonable. Recomiendo observar brillo, raya y dureza antes de tomar una decisión.`;
    }
    return `Los porcentajes de ${first.name} y ${second.name} están demasiado próximos para emitir una conclusión responsable solo con esta imagen. La muestra debe revisarse en un laboratorio para confirmarla.`;
  }

  if (gap <= 25) {
    return `La opción más consistente es ${first.name}. ${second.name} queda como una posibilidad secundaria cercana al 20%, pero los datos actuales no la respaldan como identificación principal. Sugiero confirmar con una prueba simple de raya o dureza.`;
  }

  return `Doy el visto bueno preliminar a la identificación como ${first.name}. La diferencia frente a ${second.name} es suficientemente amplia para considerarla la alternativa principal en esta simulación. De todos modos, una decisión crítica debe confirmarse con análisis mineralógico.`;
}

async function startGeologistConsultation() {
  if (!lastResults.length || consultationInProgress) return;

  consultationInProgress = true;
  consultBtn.disabled = true;
  consultationPanel.classList.remove('hidden');
  consultationChat.innerHTML = '';

  const [first, second] = lastResults;
  addConsultationMessage(
    `Tengo dudas acerca del resultado. La aplicación indicó ${first.name} con ${first.probability}% y ${second.name} con ${second.probability}%.`,
    'consultUser',
    'Usuario'
  );

  await wait(450);
  addConsultationMessage('En seguida un especialista revisará su caso.', 'consultSystem', 'Mineral ID');

  const typing = document.createElement('div');
  typing.className = 'consultTyping';
  typing.innerHTML = '<span></span><span></span><span></span> Un geólogo está revisando el resultado…';
  consultationChat.appendChild(typing);
  consultationChat.scrollTop = consultationChat.scrollHeight;

  await wait(randomDelay(900, 5000));
  typing.remove();

  const geologist = geologists[Math.floor(Math.random() * geologists.length)];
  addConsultationMessage(buildGeologistReply(lastResults), 'consultGeologist', geologist);
  consultationInProgress = false;
  consultBtn.disabled = false;
}

startBtn.addEventListener('click', startCamera);
takeBtn.addEventListener('click', takePhoto);
stopBtn.addEventListener('click', stopCamera);
consultBtn.addEventListener('click', startGeologistConsultation);
closeConsultationBtn.addEventListener('click', () => consultationPanel.classList.add('hidden'));

const chat = document.getElementById('chat');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceStatus = document.getElementById('voiceStatus');
const voiceBtn = document.getElementById('voiceBtn');

function addChatMessage(text, type) {
  const message = document.createElement('div');
  message.className = type;
  message.textContent = text;
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

function assistantReply(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes('preparo') || normalized.includes('muestra') || normalized.includes('limpio')) {
    return 'Retira el exceso de polvo, observa una superficie fresca y utiliza iluminación uniforme. Evita pruebas peligrosas.';
  }
  if (normalized.includes('preliminar')) {
    return 'Es una estimación inicial que debe confirmarse con un geólogo o laboratorio cuando la decisión sea importante.';
  }
  if (normalized.includes('foto') || normalized.includes('cámara') || normalized.includes('camara')) {
    return 'Di “toma una foto”. Abriré la cámara, capturaré la imagen y esperaré unos segundos mientras genero el análisis simulado.';
  }
  return 'Puedo ayudarte con la cámara, la preparación de la muestra y la identificación preliminar. También puedes decir “toma una foto”.';
}

function isTakePhotoCommand(text) {
  const normalized = text.toLowerCase();
  return [
    'toma una foto', 'tomar una foto', 'tómame una foto', 'saca una foto',
    'sacar una foto', 'captura una foto', 'haz una foto', 'analiza una foto'
  ].some(command => normalized.includes(command));
}

async function executePhotoCommand() {
  stopVoiceRecognition(false);
  await wait(250);
  addChatMessage('Entendido. Abriré la cámara, tomaré la fotografía y analizaré la muestra.', 'bot');
  showScreen('camera');

  const cameraStarted = await startCamera();
  if (!cameraStarted) {
    addChatMessage('No pude acceder a la cámara. Revisa los permisos del navegador.', 'bot');
    return;
  }

  status.textContent = 'Preparando captura automática…';
  await wait(1400);
  const resultText = await takePhoto();
  if (resultText) addChatMessage(resultText, 'bot');
}

async function sendMessage(text) {
  const cleanText = text.trim();
  if (!cleanText) return;
  addChatMessage(cleanText, 'user');

  if (isTakePhotoCommand(cleanText)) {
    await executePhotoCommand();
  } else {
    addChatMessage(assistantReply(cleanText), 'bot');
  }
}

sendBtn.addEventListener('click', async () => {
  const text = userInput.value;
  userInput.value = '';
  await sendMessage(text);
});

userInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') sendBtn.click();
});

document.querySelectorAll('[data-msg]').forEach(button => {
  button.addEventListener('click', () => sendMessage(button.dataset.msg));
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;
let recognitionTimeout = null;
let recognizedText = '';

function updateVoiceInterface(listening, message) {
  isListening = listening;
  voiceBtn.classList.toggle('listening', listening);
  voiceBtn.setAttribute('aria-pressed', String(listening));
  voiceBtn.setAttribute('aria-label', listening ? 'Detener reconocimiento de voz' : 'Iniciar reconocimiento de voz');
  voiceBtn.title = listening ? 'Detener reconocimiento de voz' : 'Iniciar reconocimiento de voz';
  voiceBtn.textContent = listening ? '■' : '🎤';
  if (message) voiceStatus.textContent = message;
}

function clearRecognitionTimeout() {
  if (recognitionTimeout) clearTimeout(recognitionTimeout);
  recognitionTimeout = null;
}

function stopVoiceRecognition(showMessage = true) {
  clearRecognitionTimeout();
  if (recognition && isListening) {
    try {
      recognition.stop();
    } catch (error) {
      updateVoiceInterface(false);
    }
  }
  if (showMessage && isListening) voiceStatus.textContent = 'Reconocimiento detenido.';
}

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'es-CL';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  voiceBtn.addEventListener('click', () => {
    if (isListening) {
      stopVoiceRecognition();
      return;
    }

    recognizedText = '';
    try {
      recognition.start();
    } catch (error) {
      updateVoiceInterface(false, 'El reconocimiento ya estaba activo. Vuelve a intentarlo.');
    }
  });

  recognition.addEventListener('start', () => {
    updateVoiceInterface(true, 'Escuchando… Di una instrucción. Pulsa ■ para detener.');
    clearRecognitionTimeout();
    recognitionTimeout = setTimeout(() => stopVoiceRecognition(false), 8000);
  });

  recognition.addEventListener('result', event => {
    recognizedText = event.results[event.results.length - 1][0].transcript.trim();
    voiceStatus.textContent = `Escuché: “${recognizedText}”`;
    stopVoiceRecognition(false);
  });

  recognition.addEventListener('end', async () => {
    clearRecognitionTimeout();
    updateVoiceInterface(false);

    if (recognizedText) {
      const textToSend = recognizedText;
      recognizedText = '';
      await sendMessage(textToSend);
    } else if (!voiceStatus.textContent.startsWith('Error') && voiceStatus.textContent.includes('Escuchando')) {
      voiceStatus.textContent = 'No se detectó una instrucción. Inténtalo nuevamente.';
    }
  });

  recognition.addEventListener('error', event => {
    clearRecognitionTimeout();
    recognizedText = '';
    const messages = {
      'not-allowed': 'No se concedió permiso para usar el micrófono.',
      'audio-capture': 'No se encontró un micrófono disponible.',
      'no-speech': 'No se detectó voz. Inténtalo nuevamente.',
      'network': 'El reconocimiento de voz necesita conexión a internet en este navegador.',
      'aborted': 'Reconocimiento detenido.'
    };
    updateVoiceInterface(false, messages[event.error] || 'Error al reconocer la voz. Inténtalo nuevamente.');
  });
} else {
  voiceBtn.disabled = true;
  voiceStatus.textContent = 'Este navegador no admite reconocimiento de voz. Prueba con Chrome en Android o escritorio.';
}

window.addEventListener('beforeunload', () => {
  stopVoiceRecognition(false);
  stopCamera();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(() => {});
}
