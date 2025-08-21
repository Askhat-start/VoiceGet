const startBtn  = document.getElementById("startBtn");
const stopBtn   = document.getElementById("stopBtn");
const uploadBtn = document.getElementById("uploadBtn");
const player    = document.getElementById("player");
const promptEl  = document.getElementById("prompt");
const nextBtn   = document.getElementById("nextBtn");

const recordingDot  = document.getElementById("recordingDot");
const recordingText = document.getElementById("recordingText");

let mediaRecorder = null;
let mediaStream   = null;
let chunks        = [];
let recordedBlob  = null;

// --- выбираем mimeType ---
function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4"
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

async function startRecording() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    alert("Микрофон недоступен: " + e.message);
    return;
  }

  chunks = [];
  const mimeType = pickMimeType();

  try {
    mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
  } catch (e) {
    alert("Запись не поддерживается: " + e.message);
    return;
  }

  mediaRecorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  mediaRecorder.onstop = () => {
    recordedBlob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
    const url = URL.createObjectURL(recordedBlob);
    player.src = url;
    player.load();

    // 🔴 спрятать индикатор
    recordingDot?.classList.add("hidden");
    recordingText?.classList.add("hidden");
  };

  mediaRecorder.start();

  // 🔴 показать индикатор
  recordingDot?.classList.remove("hidden");
  recordingText?.classList.remove("hidden");

  startBtn.disabled  = true;
  stopBtn.disabled   = false;
  uploadBtn.disabled = true;   // 🚫 блокируем "Жүктеу" пока идёт запись
}

function stopRecording() {
  if (!mediaRecorder) return;
  mediaRecorder.stop();
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  startBtn.disabled  = false;
  stopBtn.disabled   = true;
  uploadBtn.disabled = false;  // ✅ теперь "Жүктеу" доступна
}

async function uploadRecording() {
  if (!recordedBlob) {
    alert("Сначала запиши аудио.");
    return;
  }
  uploadBtn.disabled = true;

  const fd = new FormData();
  fd.append("file", recordedBlob, "recording.webm");
  fd.append("prompt", (promptEl?.innerText || "").trim());

  try {
    const res = await fetch("/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("Uploaded:", data);
    alert("✅ Запись сохранена!");
    recordedBlob = null;
  } catch (e) {
    console.error(e);
    alert("❌ Ошибка загрузки: " + e.message);
    uploadBtn.disabled = false;
  }
}

async function loadNewText() {
  try {
    const res = await fetch("/new_text");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (promptEl) promptEl.innerText = data.prompt;
  } catch (e) {
    console.error(e);
    alert("Ошибка загрузки нового текста: " + e.message);
  }
}

startBtn?.addEventListener("click", startRecording);
stopBtn?.addEventListener("click", stopRecording);
uploadBtn?.addEventListener("click", uploadRecording);
nextBtn?.addEventListener("click", loadNewText);

window.addEventListener("beforeunload", () => {
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
});
