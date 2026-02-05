const MODEL_URL = "model/";
const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbw_bsD247QG_VAQJj2ChRlXzlHPURq17IEfNbHO31FBwg9bX_D8tyngKMT97eQ-Q6Pp/exec";

let model;
let imageReady = false;

const preview = document.getElementById("preview");
const result = document.getElementById("result");
const imageInput = document.getElementById("imageInput");
const detectBtn = document.getElementById("detectBtn");

// LOAD MODEL
async function loadModel() {
  result.innerHTML = "⏳ Memuat model AI...";
  model = await tmImage.load(
    MODEL_URL + "model.json",
    MODEL_URL + "metadata.json",
  );
  result.innerHTML = "✅ Model siap digunakan";
}

loadModel();

// PREVIEW IMAGE
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  preview.src = URL.createObjectURL(file);
  preview.hidden = false;

  preview.onload = () => {
    imageReady = true;
    result.innerHTML = "📸 Gambar siap dianalisis";
  };
});

// DETEKSI
detectBtn.addEventListener("click", async () => {
  if (!model || !imageReady) {
    result.innerHTML = "⚠️ Model atau gambar belum siap";
    return;
  }

  result.innerHTML = "🔍 Mendeteksi...";

  const prediction = await model.predict(preview);
  prediction.sort((a, b) => b.probability - a.probability);

  let html = "";
  prediction.forEach((p) => {
    html += `<b>${p.className}</b>: ${(p.probability * 100).toFixed(2)}%<br>`;
  });

  result.innerHTML = html;
});
