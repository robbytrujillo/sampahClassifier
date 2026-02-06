import fetch from "node-fetch";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/$gemini_model:generateContent?key=AIzaSyAxUFQMKynVMdJtBsJQXv6h7NvLyftcZIk";

export async function generateDescription(type) {
  try {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `
Jelaskan secara singkat dan edukatif tentang jenis sampah berikut:
"${type}"

Gunakan bahasa Indonesia.
Maksimal 3 kalimat.
Sertakan tips pengelolaan sampahnya.
                  `,
              },
            ],
          },
        ],
      }),
    });

    const data = await res.json();

    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Deskripsi tidak tersedia."
    );
  } catch (err) {
    console.error("Gemini Error:", err);
    return "Gagal mengambil deskripsi AI.";
  }
}
