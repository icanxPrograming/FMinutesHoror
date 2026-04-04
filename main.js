import { MAP, QUEST_LIST, STATES } from "./config.js";
import { watcherImg, backsound, jumpscareSound, heartbeat } from "./assets.js";
import { pickNewPatrolTarget, updateAI } from "./ai.js";
import { render, drawMinimap } from "./engine.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Inisialisasi Minimap Canvas
const miniCanvas = document.getElementById("minimapCanvas");
if (miniCanvas) {
  miniCanvas.width = 200;
  miniCanvas.height = 200;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Game State
let player = {
  x: 1.5,
  y: 1.5,
  dir: 0,
  speed: 0.05,
  stamina: 100,
  sanity: 100,
  sensitivity: 0.002,
};
let watcher = { x: 14, y: 14, state: STATES.PATROL, targetX: 1, targetY: 13 };
let questStep = 0,
  gameTime = 900,
  isGameOver = false,
  jumpscareActive = false;
let walkCycle = 0,
  currentFOV = Math.PI / 2.2,
  targetFOV = Math.PI / 2.2;
let cameraBobX = 0,
  cameraBobY = 0,
  safeZoneTime = 15,
  isSafeTimerActive = false;
let isPaused = false; // State baru untuk membaca kertas
const keys = {};

// UI Elements
const menuScene = document.getElementById("main-menu");
const gameContent = document.getElementById("game-content");
const playBtn = document.getElementById("btn-play");

// --- EVENT LISTENERS ---
canvas.addEventListener("click", () => canvas.requestPointerLock());
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === canvas && !isGameOver && !isPaused)
    player.dir += e.movementX * player.sensitivity;
});
window.onkeydown = (e) => {
  keys[e.code] = true;
  if (e.code === "Escape" && isPaused) closePaper(); // Tutup kertas
};
window.onkeyup = (e) => (keys[e.code] = false);

playBtn.addEventListener("click", () => {
  menuScene.classList.add("hidden");
  gameContent.classList.remove("hidden");
  backsound.play().catch(() => console.log("Audio blocked"));
  canvas.requestPointerLock();
  pickNewPatrolTarget(watcher, MAP);
  updateQuestUI(); // Inisialisasi daftar quest
  gameLoop();
});

// --- QUEST FUNCTIONS ---
function completeQuestStep(index) {
  if (questStep === index) {
    questStep++;
    updateQuestUI();
  }
}

function updateQuestUI() {
  const container = document.getElementById("quest-list-container");
  if (!container) return;
  container.innerHTML = "";

  QUEST_LIST.forEach((q, index) => {
    // Tampilkan quest yang sedang aktif atau sudah selesai
    if (index <= questStep) {
      const div = document.createElement("div");
      div.className = `quest-item ${index === questStep ? "active" : "done"}`;
      div.innerHTML = `
        <span class="check-mark">${index < questStep ? "✔" : "○"}</span>
        <span>${q.text}</span>
      `;
      container.appendChild(div);
    }
  });
}

// --- FUNGSI NAVIGASI JARAK ---
function updateNavigation() {
  // Tentukan ID target berdasarkan langkah quest (4, 5, 6, atau 3)
  const targets = [4, 5, 6, 3];
  const targetID = targets[questStep] || 3;
  let tx = -1,
    ty = -1;

  // Cari koordinat target di MAP
  for (let y = 0; y < MAP.length; y++) {
    for (let x = 0; x < MAP[y].length; x++) {
      if (MAP[y][x] === targetID) {
        tx = x + 0.5;
        ty = y + 0.5;
        break;
      }
    }
  }

  const navUI = document.getElementById("status-msg");
  if (navUI && tx !== -1) {
    let dist = Math.hypot(tx - player.x, ty - player.y);
    let angleToTarget = Math.atan2(ty - player.y, tx - player.x) - player.dir;

    while (angleToTarget < -Math.PI) angleToTarget += Math.PI * 2;
    while (angleToTarget > Math.PI) angleToTarget -= Math.PI * 2;

    let direction = "Depan";
    if (angleToTarget > 0.5) direction = "Kanan";
    if (angleToTarget < -0.5) direction = "Kiri";
    if (Math.abs(angleToTarget) > 2.5) direction = "Belakang";

    navUI.innerText = `Objektif: ${Math.round(dist)}m di arah ${direction}`;
  }
}

// main.js

function showPaperContent(text) {
  const paper = document.getElementById("paper-ui");
  if (!paper) return;

  isPaused = true; // Hentikan pergerakan & waktu
  paper.style.display = "flex"; // Munculkan kertas

  paper.innerHTML = `
    <div class="paper-text">${text}</div>
    <div class="paper-footer">[Tekan ESC untuk menutup]</div>
  `;

  document.exitPointerLock(); // Lepas kursor agar mouse terlihat
}

function closePaper() {
  isPaused = false;
  const paper = document.getElementById("paper-ui");
  paper.style.display = "none"; // Sembunyikan kembali

  canvas.requestPointerLock(); // Masuk kembali ke mode kontrol game
}

// --- MAIN UPDATE LOOP ---
function update() {
  if (isGameOver || isPaused) return; // Stop update jika paused/mati
  gameTime -= 1 / 60;

  // --- LOGIKA HEARTBEAT & SANITY ---
  const gameContentElem = document.getElementById("game-content");
  if (player.sanity < 50) {
    if (heartbeat.paused) heartbeat.play().catch(() => {});
    heartbeat.volume = Math.min(1, (50 - player.sanity) / 50);
    const blurVal = (50 - player.sanity) / 10;
    if (gameContentElem)
      gameContentElem.style.filter = `blur(${blurVal}px) contrast(${1 + (50 - player.sanity) / 50})`;
  } else {
    heartbeat.volume = 0;
    if (gameContentElem) gameContentElem.style.filter = "none";
  }

  // --- LOGIKA SAFE ZONE ---
  let pX = Math.floor(player.x),
    pY = Math.floor(player.y);
  let standingOnSafe = MAP[pY] && MAP[pY][pX] === 2;
  let inSafeZone = false;
  const szDisplay = document.getElementById("safe-zone-timer");

  if (standingOnSafe) {
    if (!isSafeTimerActive) {
      isSafeTimerActive = true;
      safeZoneTime = 15;
    }
    if (safeZoneTime > 0) {
      safeZoneTime -= 1 / 60;
      inSafeZone = true;
      if (szDisplay) {
        szDisplay.style.display = "block";
        szDisplay.innerText = `AREA AMAN: ${Math.ceil(safeZoneTime)}s`;
        szDisplay.style.color = safeZoneTime < 5 ? "#ff0000" : "#44ff44";
      }
    }
  } else {
    isSafeTimerActive = false;
    if (szDisplay) szDisplay.style.display = "none";
  }

  // --- DETEKSI INTERAKSI "MELIHAT KE DINDING" ---
  // Menembakkan sinar pendek (1.2 unit) ke depan untuk cek interaksi dinding/objek
  let interactDist = 1.5;
  let lookX = player.x + Math.cos(player.dir) * interactDist;
  let lookY = player.y + Math.sin(player.dir) * interactDist;
  let targetCell = MAP[Math.floor(lookY)]
    ? MAP[Math.floor(lookY)][Math.floor(lookX)]
    : 0;
  const prompt = document.getElementById("interaction-prompt");

  if ([4, 5, 6].includes(targetCell)) {
    if (prompt) {
      prompt.style.display = "block";
      prompt.innerText = "[E] PERIKSA";
    }

    if (keys["KeyE"]) {
      // Logika Quest Berantai dengan Checklist
      if (targetCell === 4 && questStep === 0) {
        showPaperContent(
          "Ada catatan merah: 'Kunci pertama disembunyikan di dekat pilar tengah...'",
        );
        completeQuestStep(0); // Centang Quest 1
      } else if (targetCell === 5 && questStep === 1) {
        completeQuestStep(1); // Centang Quest 2
        document.getElementById("status-msg").innerText =
          "Kunci Biru didapatkan!";
      } else if (targetCell === 6 && questStep === 2) {
        completeQuestStep(2); // Centang Quest 3
        document.getElementById("status-msg").innerText =
          "Kunci Utama ditemukan! CARI PINTU KELUAR!";
      }
    }
  } else {
    if (prompt) prompt.style.display = "none";
  }

  // Logika Pintu Keluar (Cell 3)
  if (targetCell === 3) {
    if (prompt) prompt.style.display = "block";
    if (questStep >= 3) {
      if (prompt) prompt.innerText = "[E] KELUAR";
      if (keys["KeyE"]) endGame("BERHASIL KELUAR");
    } else {
      if (prompt) prompt.innerText = "PINTU TERKUNCI";
    }
  }

  // --- PERGERAKAN & COLLISION ---
  const baseSpeed = 0.02;
  const forwardMove = (keys["KeyW"] ? 1 : 0) - (keys["KeyS"] ? 1 : 0);
  const strafeMove = (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0);
  let moveStep = 0;
  const isRunning = keys["ShiftLeft"] && player.stamina > 0 && keys["KeyW"];

  if (isRunning) {
    moveStep = baseSpeed * 1.5;
    player.stamina -= 0.6;
    targetFOV = Math.PI / 1.8;
  } else {
    if (forwardMove > 0) moveStep = baseSpeed;
    if (forwardMove < 0) moveStep = -baseSpeed * 0.6;
    if (player.stamina < 100) player.stamina += 0.25;
    targetFOV = Math.PI / 2.2;
  }
  currentFOV += (targetFOV - currentFOV) * 0.1;

  // Head Bobbing
  if (moveStep !== 0 || strafeMove !== 0) {
    walkCycle += isRunning ? 0.25 : 0.15;
    cameraBobX = Math.cos(walkCycle) * (isRunning ? 0.15 : 0.08);
    cameraBobY = Math.sin(walkCycle * 2) * (isRunning ? 0.1 : 0.05);
  } else {
    cameraBobX *= 0.9;
    cameraBobY *= 0.9;
  }

  const strafeStep = baseSpeed;
  let nx =
    player.x +
    Math.cos(player.dir + cameraBobX) * moveStep +
    Math.cos(player.dir + Math.PI / 2 + cameraBobX) * strafeStep * strafeMove;
  let ny =
    player.y +
    Math.sin(player.dir + cameraBobX) * moveStep +
    Math.sin(player.dir + Math.PI / 2 + cameraBobX) * strafeStep * strafeMove;
  let walkCell = MAP[Math.floor(ny)] ? MAP[Math.floor(ny)][Math.floor(nx)] : 1;

  // Player hanya bisa lewat jika lantai (0) atau safe zone (2)
  if (walkCell === 0 || walkCell === 2) {
    player.x = nx;
    player.y = ny;
  }

  // --- AI & SANITY ---
  let dist = updateAI(
    watcher,
    player,
    MAP,
    gameTime,
    inSafeZone,
    pickNewPatrolTarget,
  );

  const noiseOverlay = document.getElementById("noise-overlay");
  if (watcher.state === STATES.CHASE && noiseOverlay) {
    noiseOverlay.style.opacity = 0.15 + Math.max(0, (5 - dist) / 5) * 0.4;
  }

  const gameContainer = document.getElementById("game-container");
  if (dist < 3 && watcher.state === STATES.CHASE && !inSafeZone) {
    player.sanity -= 0.15;
    if (gameContainer) gameContainer.classList.add("low-sanity");
  } else {
    if (player.sanity < 100) player.sanity += 0.05;
    if (gameContainer) gameContainer.classList.remove("low-sanity");
  }

  if (player.sanity <= 0) endGame("SANITY HABIS");
  if (gameTime <= 0) endGame("WAKTU HABIS");
  if (dist < 0.3 && !inSafeZone) triggerJumpscare();
}

function triggerJumpscare() {
  if (jumpscareActive) return;
  jumpscareActive = true;
  isGameOver = true;
  backsound.pause();
  jumpscareSound.play();
  document.getElementById("game-container").classList.add("low-sanity");
  let startTime = null;
  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    let progress = (timestamp - startTime) / 100;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let shakeX = (Math.random() - 0.5) * 20;
    let jumpscareY = 400 - progress * 400;
    if (jumpscareY < 0) jumpscareY = 0;
    ctx.drawImage(watcherImg, shakeX, jumpscareY, canvas.width, canvas.height);
    if (progress < 1) requestAnimationFrame(animate);
    else {
      setTimeout(() => {
        const screen = document.getElementById("overlay-screen");
        screen.classList.remove("hidden");
        screen.classList.add("lose-screen");
        document.getElementById("screen-title").innerText = "DIMANGSA";
        document.exitPointerLock();
      }, 400);
    }
  }
  requestAnimationFrame(animate);
}

function endGame(status) {
  isGameOver = true;
  document.exitPointerLock();
  const screen = document.getElementById("overlay-screen");
  screen.classList.remove("hidden");
  if (status === "BERHASIL KELUAR") {
    backsound.pause();
    screen.classList.add("win-screen");
    document.getElementById("screen-title").innerText = "TERLEPAS";
    document.getElementById("death-reason").innerText =
      "Kamu selamat hari ini, tapi itu hanya ilusi.";
    document.getElementById("game-content").style.filter =
      "brightness(2) blur(10px)";
  } else {
    backsound.pause();
    screen.classList.add("lose-screen");
    document.getElementById("screen-title").innerText = "TERTINGGAL";
  }
}

function gameLoop() {
  if (!isGameOver) {
    update();
    render(
      ctx,
      canvas,
      player,
      watcher,
      MAP,
      currentFOV,
      cameraBobX,
      cameraBobY,
      questStep,
      isSafeTimerActive,
      safeZoneTime,
      watcherImg,
      gameTime,
    );

    // --- DRAW MINIMAP ---
    if (miniCanvas) {
      drawMinimap(miniCanvas, player, MAP, questStep);
    }

    // --- UPDATE NAVIGASI ---
    updateNavigation();

    // Update HUD
    document.getElementById("stamina-fill").style.width = player.stamina + "%";
    document.getElementById("sanity-fill").style.width = player.sanity + "%";
    let mins = Math.floor(gameTime / 60),
      secs = Math.floor(gameTime % 60);
    document.getElementById("timer").innerText =
      `${mins}:${secs.toString().padStart(2, "0")}`;

    requestAnimationFrame(gameLoop);
  }
}
