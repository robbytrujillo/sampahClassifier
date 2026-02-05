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
const detectBtn = document.getElementById("detectBtn");
const cameraBtn = document.getElementById("cameraBtn");
const result = document.getElementById("result");

const uploadMode = document.getElementById("uploadMode");
const cameraMode = document.getElementById("cameraMode");

/************************************************
 * STATE
 ***********************************************/
let model;
let imageReady = false;
let cameraActive = false;
let stream;

/************************************************
 * LOAD MODEL
 ***********************************************/
async function loadModel() {
  result.innerHTML = "⏳ Memuat model AI...";
  model = await tmImage.load(
    MODEL_URL + "model.json",
    MODEL_URL + "metadata.json",
  );
  result.innerHTML = "✅ Model AI siap";
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
 * DETEKSI GAMBAR
 ***********************************************/
detectBtn.addEventListener("click", async () => {
  if (!model || !imageReady) {
    result.innerHTML = "⚠️ Upload gambar dulu";
    return;
  }

  const predictions = await model.predict(preview);
  showResult(predictions);
});

/************************************************
 * KAMERA REALTIME
 ***********************************************/
cameraBtn.addEventListener("click", async () => {
  if (cameraActive) {
    stopCamera();
    cameraBtn.innerText = "📷 Kamera Realtime";
    uploadMode.classList.remove("hidden");
    cameraMode.classList.add("hidden");
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
  cameraBtn.innerText = "⛔ Stop Kamera";

  loopCamera();
});

async function loopCamera() {
  if (!cameraActive) return;

  const predictions = await model.predict(webcam);
  showResult(predictions);

  requestAnimationFrame(loopCamera);
}

function stopCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  cameraActive = false;
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
function showResult(predictions) {
  predictions.sort((a, b) => b.probability - a.probability);

  const top = predictions[0];
  const confidence = (top.probability * 100).toFixed(2);
  const hc = calculateHashingCoefficient(predictions);

  let html = `
    🏷️ <b>${top.className}</b><br>
    🎯 Confidence: ${confidence}%<br>
    🔐 Hashing Coefficient: ${hc}%<hr>
  `;

  predictions.forEach((p) => {
    html += `${p.className}: ${(p.probability * 100).toFixed(2)}%<br>`;
  });

  result.innerHTML = html;

  sendToSheet(top.className, confidence, hc);
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
