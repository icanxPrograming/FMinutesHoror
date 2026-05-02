// reward.js

export function generateCertificate(playerName) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Ukuran Landscape
  canvas.width = 800;
  canvas.height = 600;

  // 1. Background & Border
  ctx.fillStyle = "#1a1a1a"; // Tema Gelap
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#bc955c"; // Border Emas
  ctx.lineWidth = 15;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  // 2. Header Utama
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 35px serif";
  ctx.fillText("SERTIFIKAT PENGHARGAAN", canvas.width / 2, 90);

  // 3. Nama Player
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px serif";
  ctx.fillText("Diberikan kepada penyintas:", canvas.width / 2, 280);

  ctx.font = "bold 55px sans-serif";
  ctx.fillText(playerName.toUpperCase(), canvas.width / 2, 350);

  // 4. Gelar Kehormatan
  ctx.fillStyle = "#bc955c";
  ctx.font = "italic 22px serif";
  ctx.fillText("Gelar:", canvas.width / 2, 140);

  ctx.font = "bold 45px serif";
  ctx.fillText("PENAKLUK MIMPI BURUK", canvas.width / 2, 200);

  // 5. Waktu Penyelesaian
  const date = new Date().toLocaleDateString("id-ID");
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#888";
  ctx.fillText(`Waktu Penyelesaian: ${date}`, canvas.width / 2, 430);

  // 6. Pemberi Sertifikat (Tanda Tangan)
  ctx.fillStyle = "#bc955c";
  ctx.font = "italic 20px serif";
  ctx.fillText("Diberikan oleh: ", canvas.width / 2, 510);

  // Gunakan font cursive/serif untuk kesan tanda tangan
  ctx.font = "bold 28px serif";
  ctx.fillText("FMinutesXdakochan", canvas.width / 2, 550);

  return canvas;
}

export function openRewardModal(onSuccess) {
  const modal = document.getElementById("reward-modal");
  const input = document.getElementById("player-name-input");
  const btn = document.getElementById("btn-submit-name");

  modal.classList.remove("hidden");
  input.value = ""; // Reset input setiap kali dibuka
  input.focus();

  btn.onclick = () => {
    const name = input.value.trim();
    if (name) {
      modal.classList.add("hidden");
      onSuccess(name);
    } else {
      input.style.borderColor = "#ff4444";
      input.placeholder = "Nama tidak boleh kosong!";
    }
  };
}
