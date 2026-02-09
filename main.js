/************************************************
 * KONFIGURASI
 ***********************************************/
const MODEL_URL = "model/";
const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbw_bsD247QG_VAQJj2ChRlXzlHPURq17IEfNbHO31FBwg9bX_D8tyngKMT97eQ-Q6Pp/exec";

/************************************************
 * DOM
 ***********************************************/
const imageInput = document.getElementById("imageInput");
const uploadBtn = document.getElementById("uploadBtn");
const preview = document.getElementById("preview");
const webcam = document.getElementById("webcam");
const snapshot = document.getElementById("snapshot");

const detectBtn = document.getElementById("detectBtn");
const cameraBtn = document.getElementById("cameraBtn");
const freezeBtn = document.getElementById("freezeBtn");
const result = document.getElementById("result");

const uploadMode = document.getElementById("uploadMode");
const cameraMode = document.getElementById("cameraMode");

/************************************************
 * STATE
 ***********************************************/
let model = null;
let imageReady = false;
let cameraActive = false;
let stream = null;

/************************************************
 * CAMERA CONTROL
 ***********************************************/
let lastCameraPrediction = 0;
const CAMERA_INTERVAL = 800;

let confidenceBuffer = [];
const SMOOTHING_WINDOW = 5;

/************************************************
 * LOAD MODEL
 ***********************************************/
async function loadModel() {
  result.innerHTML = "⏳ Memuat model AI...";
  model = await tmImage.load(
    MODEL_URL + "model.json",
    MODEL_URL + "metadata.json",
  );
  result.innerHTML = "✅ Model AI siap digunakan";
}
loadModel();

/************************************************
 * UPLOAD IMAGE
 ***********************************************/
uploadBtn.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", (e) => {
  stopCamera();

  uploadMode.classList.remove("hidden");
  cameraMode.classList.add("hidden");

  const file = e.target.files[0];
  if (!file) return;

  preview.src = URL.createObjectURL(file);
  preview.hidden = false;

  uploadBtn.innerHTML = "✅ Gambar Dipilih";
  uploadBtn.classList.add("uploaded");

  imageReady = true;
  result.innerHTML = "📸 Gambar siap dianalisis";
});

/************************************************
 * DETEKSI UPLOAD
 ***********************************************/
detectBtn.addEventListener("click", async () => {
  if (!model || !imageReady) {
    result.innerHTML = "⚠️ Upload gambar terlebih dahulu";
    return;
  }

  const predictions = await model.predict(preview);
  showResult(predictions, false);
});

/************************************************
 * KAMERA REALTIME
 ***********************************************/
cameraBtn.addEventListener("click", async () => {
  if (cameraActive) {
    stopCamera();
    uploadMode.classList.remove("hidden");
    cameraMode.classList.add("hidden");
    cameraBtn.innerHTML = "📷 Kamera Realtime";
    return;
  }

  uploadMode.classList.add("hidden");
  cameraMode.classList.remove("hidden");

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
    audio: false,
  });

  webcam.srcObject = stream;
  cameraActive = true;
  cameraBtn.innerHTML = "⛔ Stop Kamera";

  loopCamera();
});

/************************************************
 * LOOP KAMERA
 ***********************************************/
async function loopCamera() {
  if (!cameraActive) return;

  const now = Date.now();
  if (now - lastCameraPrediction > CAMERA_INTERVAL) {
    lastCameraPrediction = now;

    const predictions = await model.predict(webcam);
    showResult(predictions, true);
  }

  requestAnimationFrame(loopCamera);
}

/************************************************
 * FREEZE + SCREENSHOT
 ***********************************************/
// freezeBtn.addEventListener("click", async () => {
//   if (!cameraActive) return;

//   snapshot.width = webcam.videoWidth;
//   snapshot.height = webcam.videoHeight;

//   const ctx = snapshot.getContext("2d");
//   ctx.drawImage(webcam, 0, 0);

//   preview.src = snapshot.toDataURL("image/png");
//   preview.hidden = false;

//   stopCamera();

//   uploadMode.classList.remove("hidden");
//   cameraMode.classList.add("hidden");

//   const predictions = await model.predict(preview);
//   showResult(predictions, false);

//   result.innerHTML += "<br>📸 Kamera dibekukan";
// });

freezeBtn.addEventListener("click", async () => {
  if (!cameraActive) return;

  snapshot.width = webcam.videoWidth;
  snapshot.height = webcam.videoHeight;

  const ctx = snapshot.getContext("2d");

  // UN-MIRROR sebelum capture
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(webcam, -snapshot.width, 0, snapshot.width, snapshot.height);
  ctx.restore();

  preview.src = snapshot.toDataURL("image/png");
  preview.hidden = false;

  stopCamera();

  uploadMode.classList.remove("hidden");
  cameraMode.classList.add("hidden");

  const predictions = await model.predict(preview);
  showResult(predictions, false);

  result.innerHTML += "<br>📸 Kamera dibekukan";
});

/************************************************
 * STOP CAMERA
 ***********************************************/
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    webcam.srcObject = null;
  }
  cameraActive = false;
  confidenceBuffer = [];
}

/************************************************
 * HASHING COEFFICIENT
 ***********************************************/
function calculateHashingCoefficient(predictions) {
  const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
  const max = sorted[0].probability;
  const avgOther =
    sorted.slice(1).reduce((s, p) => s + p.probability, 0) /
    (sorted.length - 1);

  return ((max - avgOther) * 100).toFixed(2);
}

/************************************************
 * TAMPILKAN HASIL
 ***********************************************/
function showResult(predictions, fromCamera = false) {
  predictions.sort((a, b) => b.probability - a.probability);

  const top = predictions[0];
  let confidence = top.probability * 100;

  if (fromCamera) {
    confidenceBuffer.push(confidence);
    if (confidenceBuffer.length > SMOOTHING_WINDOW) {
      confidenceBuffer.shift();
    }
    confidence =
      confidenceBuffer.reduce((a, b) => a + b, 0) / confidenceBuffer.length;
  } else {
    confidenceBuffer = [];
  }

  confidence = confidence.toFixed(2);
  const hc = calculateHashingCoefficient(predictions);

  const labelClass = top.className.toLowerCase();

  let html = `
    🏷️ <b>${top.className}</b><br>
    🎯 Confidence: ${confidence}%<br>
    🔐 Hashing Coefficient: ${hc}%

    <div class="progress">
      <div class="progress-bar ${labelClass}" style="width:${confidence}%"></div>
    </div>
    <hr>
  `;

  predictions.forEach((p) => {
    html += `${p.className}: ${(p.probability * 100).toFixed(2)}%<br>`;
  });

  result.innerHTML = html;

  if (!fromCamera) {
    sendToSheet(top.className, confidence, hc);
  }
}

/************************************************
 * GOOGLE SHEET
 ***********************************************/
function sendToSheet(label, confidence, hc) {
  fetch(SHEET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hasil: label,
      confidence,
      hashing_coefficient: hc,
      waktu: new Date().toLocaleString(),
    }),
  }).catch(() => {});
}
