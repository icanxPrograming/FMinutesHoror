import {
  MAP,
  QUEST_LIST,
  STATES,
  TEXTURES,
  SPRITE_ASSETS,
  FLOOR_TEXTURES,
} from "./config.js";
import { watcherImg, backsound, jumpscareSound, heartbeat } from "./assets.js";
import { pickNewPatrolTarget, updateAI, generatePatrolRoute } from "./ai.js";
import { render, drawMinimap } from "./engine.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- SISTEM PEMUATAN ASET BERTEKSTUR ---
const textures = {
  walls: {},
  floors: {},
  sprites: {},
};

async function loadAllTextures() {
  const loadImg = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.error("Gagal memuat aset:", src);
        resolve(null); // Return null agar tidak nge-hang
      };
    });

  // 1. Load Walls
  for (const [id, data] of Object.entries(TEXTURES)) {
    textures.walls[id] = await loadImg(data.src);
  }

  // 2. Load Floors
  textures.floors.floor1 = await loadImg(FLOOR_TEXTURES.LIGHT);
  textures.floors.floor2 = await loadImg(FLOOR_TEXTURES.DARK);

  // 3. Load Sprites Objektif
  for (const [id, data] of Object.entries(SPRITE_ASSETS)) {
    textures.sprites[id] = await loadImg(data.src);
  }

  console.log("Semua aset visual berhasil dimuat.");
}

// Inisialisasi Minimap Canvas
const miniCanvas = document.getElementById("minimapCanvas");
if (miniCanvas) {
  miniCanvas.width = 200;
  miniCanvas.height = 200;
}

function resizeCanvas() {
  // Ukuran tampilan tetap fullscreen
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  // TAPI ukuran render internal dikecilkan (misal 50%)
  // Ini akan menaikkan FPS secara drastis!
  canvas.width = window.innerWidth / 2;
  canvas.height = window.innerHeight / 2;
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
let isPaused = false;
let patrolRoute = [];
const keys = {};

// UI Elements
const menuScene = document.getElementById("main-menu");
const gameContent = document.getElementById("game-content");
const playBtn = document.getElementById("btn-play");
const warningScreen = document.getElementById("warning-screen");
const tutorialScreen = document.getElementById("tutorial-screen");
const btnToTutorial = document.getElementById("btn-to-tutorial");
const btnStartGame = document.getElementById("btn-start-game");
const stageScreen = document.getElementById("stage-screen");

// --- EVENT LISTENERS ---
canvas.addEventListener("click", () => canvas.requestPointerLock());
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === canvas && !isGameOver && !isPaused)
    player.dir += e.movementX * player.sensitivity;
});
window.onkeydown = (e) => {
  keys[e.code] = true;
  if (e.code === "Escape" && isPaused) closePaper();
};
window.onkeyup = (e) => (keys[e.code] = false);

playBtn.addEventListener("click", () => {
  menuScene.classList.add("hidden");
  warningScreen.classList.remove("hidden");
  warningScreen.classList.add("fade-in");
});

// 2. Klik Mengerti di Warning -> Muncul Tutorial
btnToTutorial.addEventListener("click", () => {
  warningScreen.classList.add("hidden");
  tutorialScreen.classList.remove("hidden");
  tutorialScreen.classList.add("fade-in");
});

btnStartGame.addEventListener("click", async () => {
  // 1. Sembunyikan tutorial
  tutorialScreen.classList.add("hidden");

  // 2. Tampilkan Stage Screen (Welcome)
  stageScreen.classList.remove("hidden");
  stageScreen.classList.add("fade-in");

  // 3. Muat Aset di latar belakang sambil teks muncul
  await loadAllTextures();

  // 4. Tunggu 3 detik agar pemain bisa membaca teks
  setTimeout(() => {
    // Beri efek fade out pada teks stage
    stageScreen.classList.add("fade-out-scene");

    // 5. Mulai jalankan logika game
    gameContent.classList.remove("hidden");

    // Mulai audio
    if (backsound.paused) {
      backsound.play().catch(() => console.log("Audio blocked"));
    }

    canvas.requestPointerLock();

    // Setup AI & Quest
    patrolRoute = generatePatrolRoute(MAP);
    pickNewPatrolTarget(watcher, MAP, patrolRoute);
    updateQuestUI();

    // Jalankan loop utama
    gameLoop();
  }, 4000); // Teks muncul selama 4 detik sebelum menghilang
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

function updateNavigation() {
  const targets = [4, 5, 6, 3];
  const targetID = targets[questStep] || 3;
  let tx = -1,
    ty = -1;

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

function showPaperContent(text) {
  const paper = document.getElementById("paper-ui");
  if (!paper) return;
  isPaused = true;
  paper.style.display = "flex";
  paper.innerHTML = `
        <div class="paper-text">${text}</div>
        <div class="paper-footer">[Tekan ESC untuk menutup]</div>
    `;
  document.exitPointerLock();
}

function closePaper() {
  isPaused = false;
  const paper = document.getElementById("paper-ui");
  paper.style.display = "none";
  canvas.requestPointerLock();
}

// --- MAIN UPDATE LOOP ---
function update() {
  if (isGameOver || isPaused) return;
  gameTime -= 1 / 60;

  const gameContentElem = document.getElementById("game-content");
  const noiseOverlay = document.getElementById("noise-overlay");
  const prompt = document.getElementById("interaction-prompt");

  // 1. UPDATE AI & DAPATKAN JARAK
  let dist = updateAI(
    watcher,
    player,
    MAP,
    gameTime,
    false,
    pickNewPatrolTarget,
    patrolRoute,
  );

  // 2. LOGIKA PERINGATAN VISUAL & AUDIO (Berdasarkan Jarak 'dist')
  if (dist < 7.0) {
    // A. Heartbeat (Mulai terdengar di jarak 7m)
    if (heartbeat.paused) heartbeat.play().catch(() => {});
    heartbeat.volume = Math.max(0, Math.min(1, (7.0 - dist) / 7.0));

    // B. Blur & Noise (Mulai muncul di jarak 5m)
    if (dist < 5.0) {
      const blurAmount = Math.min(2.5, (5.0 - dist) * 0.5); // Max blur 2.5px agar tidak buta total
      const noiseIntensity = Math.min(0.4, (5.0 - dist) * 0.08);

      if (gameContentElem)
        gameContentElem.style.filter = `blur(${blurAmount}px)`;
      if (noiseOverlay) {
        noiseOverlay.style.display = "block";
        noiseOverlay.style.opacity = noiseIntensity;
      }
    } else {
      // Jarak 5-7m: Suara ada, tapi visual bersih
      if (gameContentElem) gameContentElem.style.filter = "none";
      if (noiseOverlay) noiseOverlay.style.opacity = 0;
    }
  } else {
    // Jauh dari hantu: Matikan semua efek
    heartbeat.volume = 0;
    if (gameContentElem) gameContentElem.style.filter = "none";
    if (noiseOverlay) {
      noiseOverlay.style.opacity = 0;
      noiseOverlay.style.display = "none";
    }
  }

  // 3. LOGIKA SANITY (Pengurangan pelan saat dikejar)
  if (dist < 3 && watcher.state === STATES.CHASE) {
    player.sanity -= 0.05;
  } else {
    if (player.sanity < 100) player.sanity += 0.06;
  }

  // 4. INTERAKSI OBJEK
  let interactDist = 1.5;
  let lookX = player.x + Math.cos(player.dir) * interactDist;
  let lookY = player.y + Math.sin(player.dir) * interactDist;
  let targetCell = MAP[Math.floor(lookY)]
    ? MAP[Math.floor(lookY)][Math.floor(lookX)]
    : 0;

  if ([4, 5, 6].includes(targetCell)) {
    if (prompt) {
      prompt.style.display = "block";
      prompt.innerText = "[E] PERIKSA";
    }
    if (keys["KeyE"]) {
      if (targetCell === 4 && questStep === 0) {
        showPaperContent(
          "Ada catatan: 'Kunci ruang arsip ada di salah satu ceruk gelap...'",
        );
        completeQuestStep(0);
      } else if (targetCell === 5 && questStep === 1) {
        completeQuestStep(1);
        document.getElementById("status-msg").innerText = "Kunci didapatkan!";
      } else if (targetCell === 6 && questStep === 2) {
        completeQuestStep(2);
        document.getElementById("status-msg").innerText =
          "Kunci Utama ditemukan! CARI PINTU!";
      }
    }
  } else if (targetCell === 3) {
    if (prompt) {
      prompt.style.display = "block";
      prompt.innerText = questStep >= 3 ? "[E] KELUAR" : "PINTU TERKUNCI";
    }
    if (keys["KeyE"] && questStep >= 3) endGame("BERHASIL KELUAR");
  } else {
    if (prompt) prompt.style.display = "none";
  }

  // 5. MOVEMENT & COLLISION
  const baseSpeed = 0.02;
  const forwardMove = (keys["KeyW"] ? 1 : 0) - (keys["KeyS"] ? 1 : 0);
  const strafeMove = (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0);
  let moveStep = 0;
  const isRunning = keys["ShiftLeft"] && player.stamina > 0 && keys["KeyW"];

  if (isRunning) {
    moveStep = baseSpeed * 1.5;
    player.stamina -= 0.15; // Stamina lebih awet
    targetFOV = Math.PI / 1.8;
  } else {
    if (forwardMove > 0) moveStep = baseSpeed;
    if (forwardMove < 0) moveStep = -baseSpeed * 0.6;
    if (player.stamina < 100) player.stamina += 0.35;
    targetFOV = Math.PI / 2.2;
  }
  currentFOV += (targetFOV - currentFOV) * 0.1;

  // Camera Bobbing
  if (moveStep !== 0 || strafeMove !== 0) {
    walkCycle += isRunning ? 0.25 : 0.15;
    cameraBobX = Math.cos(walkCycle) * (isRunning ? 0.15 : 0.08);
    cameraBobY = Math.sin(walkCycle * 2) * (isRunning ? 0.1 : 0.05);
  } else {
    cameraBobX *= 0.9;
    cameraBobY *= 0.9;
  }

  let nx =
    player.x +
    Math.cos(player.dir) * moveStep +
    Math.cos(player.dir + Math.PI / 2) * baseSpeed * strafeMove;
  let ny =
    player.y +
    Math.sin(player.dir) * moveStep +
    Math.sin(player.dir + Math.PI / 2) * baseSpeed * strafeMove;

  let walkCell = MAP[Math.floor(ny)] ? MAP[Math.floor(ny)][Math.floor(nx)] : 1;
  if (walkCell !== 1 && walkCell !== 3) {
    player.x = nx;
    player.y = ny;
  }

  // 6. KONDISI KALAH
  if (player.sanity <= 0) endGame("SANITY HABIS");
  if (gameTime <= 0) endGame("WAKTU HABIS");
  if (dist < 0.3) triggerJumpscare();
}

function triggerJumpscare() {
  if (jumpscareActive) return;
  jumpscareActive = true;
  isGameOver = true;
  backsound.pause();
  jumpscareSound.play();
  let startTime = null;
  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    let progress = (timestamp - startTime) / 100;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let shakeX = (Math.random() - 0.5) * 20;
    let jumpscareY = 400 - progress * 400;
    ctx.drawImage(
      watcherImg,
      shakeX,
      Math.max(0, jumpscareY),
      canvas.width,
      canvas.height,
    );
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
  backsound.pause();
  if (status === "BERHASIL KELUAR") {
    screen.classList.add("win-screen");
    document.getElementById("screen-title").innerText = "TERLEPAS";
    document.getElementById("death-reason").innerText =
      "Kamu selamat hari ini.";
  } else {
    screen.classList.add("lose-screen");
    document.getElementById("screen-title").innerText = "TERTINGGAL";
  }
}

function gameLoop() {
  if (!isGameOver) {
    update();
    // KIRIM OBJEK TEXTURES KE ENGINE
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
      textures,
    );

    if (miniCanvas) drawMinimap(miniCanvas, player, MAP, questStep);
    updateNavigation();

    document.getElementById("stamina-fill").style.width = player.stamina + "%";
    document.getElementById("sanity-fill").style.width = player.sanity + "%";
    let mins = Math.floor(gameTime / 60),
      secs = Math.floor(gameTime % 60);
    document.getElementById("timer").innerText =
      `${mins}:${secs.toString().padStart(2, "0")}`;

    requestAnimationFrame(gameLoop);
  }
}
