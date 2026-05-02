import {
  MAP as MAP_S1,
  MAP_STAGE_2,
  MAP_STAGE_3,
  QUEST_LIST,
  STATES,
  TEXTURES,
  SPRITE_ASSETS,
  FLOOR_TEXTURES,
} from "./config.js";
import { generateCertificate, openRewardModal } from "./reward.js";
import {
  watcherImg,
  watcherBackImg,
  backsound,
  jumpscareSound,
  heartbeat,
  itemPickupSound,
  keyPickupSound,
  noteReadSound,
  openDoorSound,
  lockingDoorSound,
  walkSound,
  runningSound,
  breathingSound,
} from "./assets.js";
import { pickNewPatrolTarget, updateAI, generatePatrolRoute } from "./ai.js";
import { render } from "./engine.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const STAGE_NAMES = {
  1: { title: "KEHENINGAN PUSTAKA", subtitle: "GERBANG MIMPI BURUK" },
  2: { title: "PENJARA BAWAH TANAH", subtitle: "SIMPANG KELAM" },
  3: { title: "GERBANG KEMATIAN", subtitle: "PENENTU TAKDIR" },
};

// --- TAMBAHKAN VARIABEL BARU DI ATAS ---
const introScreen = document.getElementById("intro-screen");
const introTextElem = document.getElementById("intro-text");
const introScenes = [
  "Kelopak matamu terasa berat, namun jiwamu berteriak ketakutan...",
  "Dalam kegelapan yang tak berujung, 'The Watcher' telah memilihmu.",
  "Mimpi buruk ini bukan lagi sekadar khayalan. Ini adalah penjaramu.",
  "Selamat datang di labirin mimpi buruk. Disinilah kamu menentukan takdirmu.",
  "Kamu hanya punya 15 menit... sebelum mimpi buruk ini menelanmu.",
];
let currentIntroIndex = 0;
const stageIntros = {
  2: "The Watcher menyeretmu ke dalam mimpi yang lebih buruk segeralah bergegas sebelum semuanya terlambat",
  3: "Ini adalah kesempatan terakhirmu, jika kamu bisa menyelesaikannya kamu selamat, jika kamu tidak maka itu adalah akhir bagimu!",
};
const endingScenes = [
  "Cahaya fajar mulai menembus sela-sela kegelapan...",
  "Segel terakhir telah hancur, dan kutukan The Watcher mulai memudar.",
  "Mimpi buruk ini berakhir di sini.",
  "Kamu telah kembali dari mimpi buruk... namun kenangan itu akan selalu menghantuimu.",
];
let currentEndingIndex = 0;

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
  isCrouching: false,
};
let currentStage = 1;
let currentMap = JSON.parse(JSON.stringify(MAP_S1));
let watcher = {
  x: 14,
  y: 14,
  state: STATES.PATROL,
  targetX: 1,
  targetY: 13,
  path: [],
};
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
// --- STATE UNTUK ANIMASI TANGAN ---
let handSway = { x: 0, y: 0 };
let handBobTimer = 0;

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
  if (document.pointerLockElement === canvas && !isGameOver && !isPaused) {
    player.dir += e.movementX * player.sensitivity;

    // Tangan bergerak berlawanan dengan arah mouse sedikit
    handSway.x -= e.movementX * 0.4;
    handSway.x = Math.max(-40, Math.min(40, handSway.x));
  }
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

  // 2. Tampilkan Layar Intro
  const introScreen = document.getElementById("intro-screen");
  introScreen.classList.remove("hidden");
  introScreen.classList.add("fade-in");

  // 3. Muat Aset di latar belakang saat pemain membaca cerita
  await loadAllTextures();

  // 4. Jalankan Scene Pertama
  playNextIntro();
});

function playNextIntro() {
  const introTextElem = document.getElementById("intro-text");
  const introScreen = document.getElementById("intro-screen");

  if (currentIntroIndex < introScenes.length) {
    // Efek Fade teks keluar-masuk
    introTextElem.style.opacity = 0;

    setTimeout(() => {
      introTextElem.innerText = introScenes[currentIntroIndex];
      introTextElem.style.opacity = 1;
      currentIntroIndex++;
    }, 1000);
  } else {
    // Jika scene intro habis, masuk ke transisi Stage 1
    startStageOne();
  }
}

// Perbaikan Listener Klik Intro agar hanya untuk Stage 1
document.getElementById("intro-screen").addEventListener("click", () => {
  if (
    currentStage === 1 &&
    !isGameOver &&
    gameContent.classList.contains("hidden")
  ) {
    playNextIntro();
  }
});

function startStageOne() {
  const introScreen = document.getElementById("intro-screen");
  const stageScreen = document.getElementById("stage-screen");

  // PROTEKSI: Jika gameContent sudah muncul, jangan jalankan fungsi ini lagi
  if (!gameContent.classList.contains("hidden")) return;

  introScreen.classList.add("fade-out-scene");

  setTimeout(() => {
    introScreen.classList.add("hidden");
    introScreen.style.display = "none"; // Matikan display agar tidak menghalangi klik
    introScreen.classList.remove("fade-out-scene");

    // Tampilkan Judul Stage 1
    document.getElementById("stage-title-text").innerText =
      STAGE_NAMES[1].title;
    document.getElementById("stage-subtitle-text").innerText =
      STAGE_NAMES[1].subtitle;

    stageScreen.classList.remove("hidden", "fade-out-scene");
    stageScreen.style.display = "flex";
    stageScreen.style.opacity = "1";

    setTimeout(() => {
      stageScreen.classList.add("active");
    }, 50);

    // INISIALISASI DATA MAP STAGE 1
    currentStage = 1; // Pastikan stage diset ke 1
    questStep = 0; // Reset quest step ke awal
    currentMap = JSON.parse(JSON.stringify(MAP_S1)).map((row) =>
      row.map((cell) => (cell > 4 ? 0 : cell)),
    );

    setTimeout(() => {
      stageScreen.classList.add("fade-out-scene");

      setTimeout(() => {
        stageScreen.classList.add("hidden");
        stageScreen.style.display = "none";

        // MUNCULKAN KONTEN GAME
        gameContent.classList.remove("hidden");

        if (backsound.paused) {
          backsound.play().catch(() => console.log("Audio blocked"));
        }

        canvas.requestPointerLock();

        // Setup AI & Quest
        patrolRoute = generatePatrolRoute(currentMap);
        pickNewPatrolTarget(watcher, currentMap, patrolRoute);
        updateQuestUI();

        // Jalankan Loop Utama (HANYA SEKALI)
        if (!isGameOver) gameLoop();
      }, 1200);
    }, 4000);
  }, 1000);
}

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

  const noteIndexes = { 1: 0, 2: 4, 3: 8 };
  const currentNoteIndex = noteIndexes[currentStage];

  QUEST_LIST.forEach((q, index) => {
    if (q.stage === currentStage) {
      // 1. LOGIKA GERBANG: Sembunyikan quest masa depan jika Note belum dibaca
      if (questStep === currentNoteIndex && index > currentNoteIndex) {
        return;
      }

      const div = document.createElement("div");

      // 2. LOGIKA PENGECEKAN STATUS (DIPERBAIKI)
      // Quest dianggap selesai HANYA jika questStep sudah melewati index quest tersebut
      let isActuallyDone = index < questStep;

      // 3. Tentukan Class CSS
      const isActive = index === questStep;
      div.className = `quest-item ${isActuallyDone ? "done" : isActive ? "active" : ""}`;

      div.innerHTML = `
        <span class="check-mark">${isActuallyDone ? "✔" : "○"}</span>
        <span class="${isActuallyDone ? "strikethrough" : ""}">${q.text}</span>
      `;
      container.appendChild(div);
    }
  });
}

// Fungsi Helper untuk mengecek keberadaan item di map
function checkItemExistsInMap(ids) {
  for (let y = 0; y < currentMap.length; y++) {
    for (let x = 0; x < currentMap[y].length; x++) {
      if (ids.includes(currentMap[y][x])) return true;
    }
  }
  return false;
}

function updateNavigation() {
  const navUI = document.getElementById("status-msg");
  if (!navUI || isPaused) return;

  // 1. Ambil data quest yang sedang aktif dari config
  const currentQuest = QUEST_LIST[questStep];

  // Jika quest habis atau stage tidak cocok, target default adalah PINTU KELUAR (ID 3)
  let targetIDs = [3];

  if (currentQuest && currentQuest.stage === currentStage) {
    // Tentukan ID mana yang dicari berdasarkan tipe quest aktif
    if (currentQuest.type === "COLLECT") {
      targetIDs = currentQuest.spriteIds; // Daftar buku atau artefak
    } else {
      targetIDs = [currentQuest.spriteId || currentQuest.wallId]; // Note atau Kunci spesifik
    }
  }

  // 2. Gunakan fungsi findNearestID untuk mencari target terdekat di map
  let targetID = findNearestID(targetIDs);

  let tx = -1,
    ty = -1;

  // 3. Jika target ditemukan, cari koordinat pastinya untuk menghitung arah
  if (targetID !== -1) {
    for (let y = 0; y < currentMap.length; y++) {
      for (let x = 0; x < currentMap[y].length; x++) {
        if (currentMap[y][x] === targetID) {
          tx = x + 0.5;
          ty = y + 0.5;
          break;
        }
      }
      if (tx !== -1) break;
    }
  }

  // 4. Update UI Teks Navigasi
  if (tx !== -1) {
    let dist = Math.hypot(tx - player.x, ty - player.y);
    let angleToTarget = Math.atan2(ty - player.y, tx - player.x) - player.dir;

    // Normalisasi sudut agar selalu di antara -PI dan PI
    while (angleToTarget < -Math.PI) angleToTarget += Math.PI * 2;
    while (angleToTarget > Math.PI) angleToTarget -= Math.PI * 2;

    let direction = "Depan";
    if (angleToTarget > 0.5) direction = "Kanan";
    if (angleToTarget < -0.5) direction = "Kiri";
    if (Math.abs(angleToTarget) > 2.5) direction = "Belakang";

    navUI.innerText = `Objektif: ${Math.round(dist)}m di arah ${direction}`;
  } else {
    // Jika benar-benar tidak ada target di map (semua item ID > 4 dan ID 3 hilang)
    navUI.innerText = "Cari jalan keluar!";
  }
}

// Fungsi pembantu untuk mencari ID terdekat dari daftar array
function findNearestID(ids) {
  let nearestID = -1;
  let minDist = Infinity;
  for (let y = 0; y < currentMap.length; y++) {
    for (let x = 0; x < currentMap[y].length; x++) {
      if (ids.includes(currentMap[y][x])) {
        let d = Math.hypot(x - player.x, y - player.y);
        if (d < minDist) {
          minDist = d;
          nearestID = currentMap[y][x];
        }
      }
    }
  }
  return nearestID;
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
  if (paper) paper.style.display = "none";

  // Hentikan suara langkah saat pause
  walkSound.pause();
  runningSound.pause();

  // Memberikan nafas pada browser sebelum meminta lock lagi
  setTimeout(() => {
    canvas.requestPointerLock();
  }, 100);
}

function showGameMessage(text) {
  const statusMsg = document.getElementById("status-msg");
  if (statusMsg) {
    statusMsg.innerText = text;

    // Opsional: Hilangkan pesan setelah 3 detik agar bersih kembali
    setTimeout(() => {
      if (statusMsg.innerText === text) {
        statusMsg.innerText = "";
      }
    }, 3000);
  } else {
    // Jika elemen status-msg tidak ada, kita log ke console agar tidak error
    console.log("Game Message: " + text);
  }
}

// --- MAIN UPDATE LOOP ---
function update() {
  if (isGameOver || isPaused) return;
  gameTime -= 1 / 60;

  const gameContentElem = document.getElementById("game-content");
  const noiseOverlay = document.getElementById("noise-overlay");
  const prompt = document.getElementById("interaction-prompt");

  // --- 1. LOGIKA STATUS PLAYER ---
  const forwardMove = (keys["KeyW"] ? 1 : 0) - (keys["KeyS"] ? 1 : 0);
  const strafeMove = (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0);
  const isMoving = forwardMove !== 0 || strafeMove !== 0;

  player.isCrouching = keys["KeyC"] || keys["ControlLeft"];
  const hasStamina = player.stamina > 0;

  // Baru gunakan hasStamina di dalam isRunning
  const isRunning =
    keys["ShiftLeft"] && hasStamina && isMoving && !player.isCrouching;

  let playerStatus = {
    isMoving: isMoving,
    isRunning: isRunning,
    isCrouching: player.isCrouching,
  };

  // --- LOGIKA AYUNAN TANGAN (HAND SWAY & BOBBING) ---
  // Kembalikan tangan ke posisi tengah perlahan
  handSway.x *= 0.85;
  handSway.y *= 0.85;

  if (isMoving) {
    const bobSpeed = isRunning ? 0.25 : player.isCrouching ? 0.05 : 0.12;
    const bobAmount = isRunning ? 12 : player.isCrouching ? 2 : 6;

    handBobTimer += bobSpeed;
    handSway.y += Math.sin(handBobTimer * 2) * (bobAmount * 0.5);
    handSway.x += Math.cos(handBobTimer) * (bobAmount * 0.3);
  }

  // UPDATE AI
  let dist = updateAI(
    watcher,
    player,
    currentMap,
    gameTime,
    false,
    pickNewPatrolTarget,
    patrolRoute,
    playerStatus,
  );

  const baseSpeed = 0.02;
  let currentSpeed = baseSpeed;
  let tFOV = Math.PI / 2.2;

  if (player.isCrouching) {
    currentSpeed = baseSpeed * 0.4;
    tFOV = Math.PI / 2.4;
    player.stamina = Math.min(100, player.stamina + 0.45); // Pulih lebih cepat saat jongkok
  } else if (isRunning) {
    currentSpeed = baseSpeed * 1.5;
    player.stamina -= 0.15;
    tFOV = Math.PI / 1.8;
  } else {
    // JIKA SHIFT DITEKAN TAPI STAMINA HABIS (KELELAHAN)
    if (keys["ShiftLeft"] && !hasStamina && isMoving) {
      currentSpeed = baseSpeed * 0.4; // Jalan lebih lambat karena lelah
    } else {
      currentSpeed = baseSpeed;
    }

    tFOV = Math.PI / 2.2;
    player.stamina = Math.min(100, player.stamina + 0.35); // Pemulihan normal
  }

  // Integrasikan targetFOV ke currentFOV untuk transisi smooth
  currentFOV += (tFOV - currentFOV) * 0.1;

  // --- 3. MOVEMENT CALCULATION (Kunci Agar Bisa Gerak) ---
  let moveStep = forwardMove * currentSpeed;
  if (forwardMove < 0) moveStep *= 0.6; // Mundur lebih lambat

  // Hitung posisi baru (Maju/Mundur + Strafe)
  let nx =
    player.x +
    Math.cos(player.dir) * moveStep +
    Math.cos(player.dir + Math.PI / 2) * (strafeMove * currentSpeed);

  let ny =
    player.y +
    Math.sin(player.dir) * moveStep +
    Math.sin(player.dir + Math.PI / 2) * (strafeMove * currentSpeed);

  // Collision Detection
  const solidCells = [1, 3, 10, 20];
  const mapX = Math.floor(nx);
  const mapY = Math.floor(ny);

  // Pastikan koordinat dalam batas map sebelum cek tabrakan
  if (
    mapY >= 0 &&
    mapY < currentMap.length &&
    mapX >= 0 &&
    mapX < currentMap[0].length
  ) {
    const targetCellAtNewPos = currentMap[mapY][mapX];

    if (!solidCells.includes(targetCellAtNewPos)) {
      player.x = nx;
      player.y = ny;
    }
  }

  // --- 4. AUDIO & VISUAL WARNING ---
  if (dist < 7.0) {
    if (heartbeat.paused) heartbeat.play().catch(() => {});
    heartbeat.volume = Math.max(0, Math.min(1, (7.0 - dist) / 7.0));
  } else {
    heartbeat.volume = 0;
  }

  // Pernapasan
  if (player.stamina < 15 || (dist < 4 && watcher.state === STATES.CHASE)) {
    if (breathingSound.paused) {
      breathingSound.currentTime = 0;
      breathingSound.play().catch(() => {});
    }
    let breathingVol = (20 - player.stamina) / 20;
    breathingSound.volume = Math.max(0, Math.min(1, breathingVol));
  } else if (player.stamina > 50) {
    breathingSound.pause();
  }

  // Kamera Bobbing
  if (isMoving) {
    walkCycle += isRunning ? 0.25 : player.isCrouching ? 0.05 : 0.15;
    cameraBobX =
      Math.cos(walkCycle) *
      (isRunning ? 0.15 : player.isCrouching ? 0.04 : 0.08);
    cameraBobY =
      Math.sin(walkCycle * 2) *
      (isRunning ? 0.1 : player.isCrouching ? 0.02 : 0.05);

    // Suara Langkah
    if (!player.isCrouching) {
      if (isRunning) {
        if (runningSound.paused) runningSound.play().catch(() => {});
        walkSound.pause();
      } else {
        if (walkSound.paused) walkSound.play().catch(() => {});
        runningSound.pause();
      }
    } else {
      walkSound.pause();
      runningSound.pause();
    }
  } else {
    cameraBobX *= 0.9;
    cameraBobY *= 0.9;
    walkSound.pause();
    runningSound.pause();
  }

  // Efek Visual (Blur & Noise)
  let fBlur = 0;
  let fNoise = 0;
  if (dist < 6.0) {
    // Kita naikkan base blur agar lebih terasa sampai ke tengah
    // Makin dekat (dist kecil), fBlur makin besar
    fBlur = Math.min(5.0, (6.0 - dist) * 1.2);
    fNoise = Math.min(0.5, (6.0 - dist) * 0.1);
  }
  if (player.stamina < 25) {
    const stressLevel = Math.max(0, (25 - player.stamina) / 25); // Range 0 - 1
    fNoise = Math.max(fNoise, stressLevel * 0.4);
    // Stamina kritis membuat pandangan sangat kabur
    fBlur = Math.max(fBlur, stressLevel * 4);
  }

  if (gameContentElem) {
    // Gunakan filter blur pada container utama
    // Penambahan 'brightness' opsional agar saat blur tidak terlalu gelap
    if (fBlur > 0) {
      gameContentElem.style.filter = `blur(${fBlur}px) brightness(${1 - fBlur * 0.05})`;
    } else {
      gameContentElem.style.filter = "none";
    }
  }
  if (noiseOverlay) {
    if (fNoise > 0) {
      noiseOverlay.style.display = "block";
      noiseOverlay.style.opacity = fNoise;
      // Tambahkan class untuk animasi getar noise
      noiseOverlay.classList.add("active-noise");
    } else {
      noiseOverlay.style.opacity = 0;
      noiseOverlay.style.display = "none";
      noiseOverlay.classList.remove("active-noise");
    }
  }

  // --- 5. LOGIKA SANITY & INTERAKSI ---
  if (dist < 5 && watcher.state === STATES.CHASE) {
    player.sanity -= 0.1;
  } else if (player.sanity < 100) {
    player.sanity += 0.05;
  }

  // Deteksi interaksi di depan mata
  let lookDist = 1.5;
  let lX = player.x + Math.cos(player.dir) * lookDist;
  let lY = player.y + Math.sin(player.dir) * lookDist;
  let tCell = currentMap[Math.floor(lY)]?.[Math.floor(lX)] || 0;

  const canInteract =
    (tCell >= 4 && tCell <= 6) ||
    (tCell >= 11 && tCell <= 18) ||
    (tCell >= 21 && tCell <= 27) ||
    tCell === 3;

  if (canInteract) {
    if (prompt) {
      prompt.style.display = "block";
      prompt.innerText =
        tCell === 3
          ? isStageCleared()
            ? "[E] KELUAR"
            : "PINTU TERKUNCI"
          : "[E] PERIKSA";
    }
    if (keys["KeyE"] && !isPaused) {
      handleInteraction(tCell, Math.floor(lX), Math.floor(lY));
      keys["KeyE"] = false;
    }
  } else if (prompt) {
    prompt.style.display = "none";
  }

  // --- 6. KONDISI AKHIR ---
  if (player.sanity <= 0) endGame("SANITY HABIS");
  if (gameTime <= 0) endGame("WAKTU HABIS");
  if (dist < 0.4) triggerJumpscare();
}

// Fungsi pembantu interaction agar update() tidak terlalu panjang
function handleInteraction(cell, gridX, gridY) {
  if (cell === 3) {
    if (isStageCleared()) {
      openDoorSound.play();
      isPaused = true;
      setTimeout(
        () => (currentStage < 3 ? nextStage() : endGame("BERHASIL KELUAR")),
        500,
      );
    } else {
      lockingDoorSound.play();
      showGameMessage("Aku belum menyelesaikan tugas...");
    }
    return;
  }

  const currentQuest = QUEST_LIST[questStep];
  let isValid =
    currentQuest.type === "COLLECT"
      ? currentQuest.spriteIds.includes(cell)
      : cell === (currentQuest.spriteId || currentQuest.wallId);

  if (isValid) {
    if (cell === 4) {
      noteReadSound.play();
      let msg = "";
      const extraWarning =
        "\n\n(Peringatan: Segel pintu keluar hanya akan terbuka jika seluruh tugas telah diselesaikan.)";
      if (currentStage === 1)
        msg =
          "Catatan: 'Cari 2 kunci untuk membuka pintu keluar perpustakaan. Waspadalah dia mengintaimu dalam kegelapan.'" +
          extraWarning;
      else if (currentStage === 2)
        msg =
          "Catatan: 'Kumpulkan 7 catatan sihir kuno dan kunci basement. Tetap waspada dia berada didekatmu'" +
          extraWarning;
      else if (currentStage === 3)
        msg =
          "Peringatan Terakhir: 'Kumpulkan 5 Artefak Kuno dan 2 kunci segel. Hati hati mimpi buruk ini semakin kuat'" +
          extraWarning;
      currentMap[gridY][gridX] = 0;
      completeQuestStep(questStep);
      spawnObjectives();
      showPaperContent(msg);
    } else if ([5, 6, 18, 26, 27].includes(cell)) {
      keyPickupSound.play();
      currentMap[gridY][gridX] = 0;
      showGameMessage("Kunci didapatkan!");
      completeQuestStep(questStep);
      spawnObjectives();
    } else {
      itemPickupSound.play();
      currentMap[gridY][gridX] = 0;
      // Cek sisa item
      let rem = 0;
      currentMap.forEach((r) =>
        r.forEach((c) => {
          if (currentQuest.spriteIds?.includes(c)) rem++;
        }),
      );
      if (rem === 0) {
        completeQuestStep(questStep);
        spawnObjectives();
      } else updateQuestUI();
    }
  } else {
    lockingDoorSound.play();
    showGameMessage("Belum waktunya...");
  }
}

function isStageCleared() {
  if (currentStage === 1) return questStep >= 3; // Step 0,1,2 selesai -> 3 aktif (Pintu)
  if (currentStage === 2) return questStep >= 7; // Step 4,5,6 selesai -> 7 aktif (Pintu)
  if (currentStage === 3) return questStep >= 12; // Step 8,9,10,11 selesai -> 12 aktif (Pintu)
  return false;
}

function checkCollectionProgress() {
  const currentQuest = QUEST_LIST[questStep];
  if (!currentQuest || currentQuest.type !== "COLLECT") return;

  // Menghitung sisa item target koleksi yang ada di map saat ini
  let remainingCount = 0;
  for (let y = 0; y < currentMap.length; y++) {
    for (let x = 0; x < currentMap[y].length; x++) {
      if (currentQuest.spriteIds.includes(currentMap[y][x])) {
        remainingCount++;
      }
    }
  }

  // Jika item koleksi sudah habis (0)
  if (remainingCount === 0) {
    console.log("Koleksi selesai, memunculkan objektif berikutnya...");
    completeQuestStep(questStep); // Naikkan questStep (misal: Artefak -> Kunci 1)
    spawnObjectives(); // Munculkan Kunci 1 secara fisik di map
  } else {
    updateQuestUI(); // Update tampilan centang/jumlah
  }
}

function spawnObjectives() {
  const currentQuest = QUEST_LIST[questStep];
  if (!currentQuest || currentQuest.stage !== currentStage) return;

  let sourceMap;
  if (currentStage === 1) sourceMap = MAP_S1;
  else if (currentStage === 2) sourceMap = MAP_STAGE_2;
  else if (currentStage === 3) sourceMap = MAP_STAGE_3;

  let idsToSpawn = [];
  if (currentQuest.type === "COLLECT") {
    idsToSpawn = currentQuest.spriteIds;
  } else {
    // Pastikan mengambil spriteId atau wallId (untuk pintu/note/kunci tunggal)
    const id = currentQuest.spriteId || currentQuest.wallId;
    if (id) idsToSpawn = [id];
  }

  for (let y = 0; y < sourceMap.length; y++) {
    for (let x = 0; x < sourceMap[y].length; x++) {
      const cellId = sourceMap[y][x];
      if (idsToSpawn.includes(cellId)) {
        currentMap[y][x] = cellId;
      }
    }
  }

  updateQuestUI();
  updateNavigation();
}

function nextStage() {
  if (currentStage >= 3) return;

  console.log("TRANSISI KE STAGE " + (currentStage + 1));
  isPaused = true;
  currentStage++; // Sekarang currentStage adalah 2 (atau 3)

  const introScreen = document.getElementById("intro-screen");
  const introTextElem = document.getElementById("intro-text");
  const stageScreen = document.getElementById("stage-screen");

  // 1. TAMPILKAN NARASI
  introScreen.classList.remove("hidden", "fade-out-scene");
  introScreen.style.display = "flex"; // Pastikan display flex
  introScreen.style.opacity = 1;
  introTextElem.innerText = stageIntros[currentStage];
  introTextElem.style.opacity = 1;

  // 2. LOGIKA MAP BARU (Penting: Pastikan rawMap benar)
  let rawMap = currentStage === 2 ? MAP_STAGE_2 : MAP_STAGE_3;

  // Clone dan bersihkan objektif
  currentMap = JSON.parse(JSON.stringify(rawMap)).map((row) =>
    row.map((cell) => {
      const permanentIDs = [1, 2, 3, 4, 10, 20];
      return permanentIDs.includes(cell) ? cell : 0;
    }),
  );

  // 3. Sinkronisasi Quest Step
  if (currentStage === 2) questStep = 4;
  if (currentStage === 3) questStep = 8;

  if (document.pointerLockElement) document.exitPointerLock();

  // 4. RESET POSISI PLAYER & AI (Sesuai Map Baru)
  player.x = 1.5;
  player.y = 1.5;
  player.dir = 0;

  // Reset AI khusus untuk map baru
  patrolRoute = generatePatrolRoute(currentMap);
  watcher.x = currentMap[0].length - 2;
  watcher.y = currentMap.length - 2;
  watcher.state = STATES.PATROL;
  watcher.path = [];
  pickNewPatrolTarget(watcher, currentMap, patrolRoute);

  for (let key in keys) keys[key] = false;

  // --- SEQUENCE ANIMASI ---
  setTimeout(() => {
    introTextElem.style.opacity = 0;

    setTimeout(() => {
      // Tampilkan Judul Stage
      document.getElementById("stage-title-text").innerText =
        STAGE_NAMES[currentStage].title;
      document.getElementById("stage-subtitle-text").innerText =
        STAGE_NAMES[currentStage].subtitle;

      stageScreen.classList.remove("hidden", "fade-out-scene", "active");
      stageScreen.style.display = "flex";
      stageScreen.style.opacity = "1";
      setTimeout(() => {
        stageScreen.classList.add("active");
      }, 50);

      setTimeout(() => {
        // MASUK GAMEPLAY
        stageScreen.classList.add("fade-out-scene");
        introScreen.classList.add("fade-out-scene");

        setTimeout(() => {
          stageScreen.classList.add("hidden");
          stageScreen.style.display = "none";
          introScreen.classList.add("hidden");
          introScreen.style.display = "none";

          isPaused = false;
          updateQuestUI();
          updateNavigation();

          try {
            canvas.requestPointerLock();
          } catch (err) {}
        }, 1200);
      }, 3500);
    }, 1000);
  }, 4000);
}

function triggerJumpscare() {
  if (jumpscareActive) return;
  jumpscareActive = true;
  isGameOver = true;
  backsound.pause();
  walkSound.pause();
  runningSound.pause();
  breathingSound.pause();
  heartbeat.pause();
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
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // JEDA SEDIKIT SETELAH JUMPSCARE, LALU MASUK KE NARASI KEMATIAN
      setTimeout(() => {
        // Panggil fungsi narasi estetik, kita beri status "TERTANGKAP"
        playDeathSequence("TERTANGKAP");
      }, 1500);
    }
  }
  requestAnimationFrame(animate);
}

function endGame(status) {
  isGameOver = true;
  isPaused = true;
  document.exitPointerLock();

  // Hentikan semua audio
  backsound.pause();
  walkSound.pause();
  runningSound.pause();
  breathingSound.pause();
  heartbeat.pause();

  walkSound.currentTime = 0;
  runningSound.currentTime = 0;

  const screen = document.getElementById("overlay-screen");
  const reloadBtn = document.getElementById("btn-reload");

  if (status === "BERHASIL KELUAR") {
    // 1. Jalankan narasi teks ending
    playEndingSequence();

    // 2. Modifikasi tombol untuk klaim sertifikat
    // Kita beri sedikit delay agar muncul setelah narasi/transisi (opsional)
    setTimeout(() => {
      reloadBtn.innerText = "KLAIM PENGHARGAAN";
      reloadBtn.style.background = "#bc955c"; // Warna emas
      reloadBtn.style.color = "#000";
      reloadBtn.classList.remove("hidden");

      // Logic ketika tombol Klaim diklik
      reloadBtn.onclick = () => {
        openRewardModal((playerName) => {
          // Render sertifikat ke canvas
          const canvas = generateCertificate(playerName);

          // Bersihkan isi overlay untuk menampilkan gambar sertifikat
          screen.innerHTML = "";

          const img = document.createElement("img");
          img.src = canvas.toDataURL("image/png");
          img.className = "cert-preview"; // Style yang sudah kita buat di CSS
          screen.appendChild(img);

          // Buat container tombol Unduh & Main Lagi
          const btnGroup = document.createElement("div");
          btnGroup.className = "modal-buttons";

          const dlBtn = document.createElement("button");
          dlBtn.innerText = "UNDUH PNG";
          dlBtn.onclick = () => {
            const link = document.createElement("a");
            link.download = `Sertifikat_Penakluk_${playerName}.png`;
            link.href = canvas.toDataURL();
            link.click();
          };

          const restartBtn = document.createElement("button");
          restartBtn.innerText = "MAIN LAGI";
          restartBtn.onclick = () => location.reload();

          btnGroup.appendChild(dlBtn);
          btnGroup.appendChild(restartBtn);
          screen.appendChild(btnGroup);
        });
      };
    }, 1000);
  } else {
    // Jika mati/kalah, jalankan sequence kematian seperti biasa
    playDeathSequence(status);

    // Pastikan tombol reload kembali ke fungsi aslinya (refresh game)
    reloadBtn.innerText = "COBA LAGI";
    reloadBtn.style.background = "";
    reloadBtn.style.color = "";
    reloadBtn.onclick = () => location.reload();
  }
}

function playDeathSequence(reason) {
  const introScreen = document.getElementById("intro-screen");
  const introTextElem = document.getElementById("intro-text");

  introScreen.classList.remove("hidden");
  introScreen.style.display = "flex";
  introScreen.style.backgroundColor = "#000";
  introScreen.style.opacity = "1";
  introTextElem.style.color = "#ff4444";

  let deathMessages = []; // Narasi puitis untuk layar hitam
  let finalTitle = ""; // Judul besar di layar akhir
  let finalReason = ""; // Penjelasan singkat di bawah judul

  if (reason === "TERTANGKAP") {
    finalTitle = "DIMANGSA MIMPI BURUK";
    finalReason = "The Watcher telah menelanmu ke dalam kegelapan abadi.";
    deathMessages = [
      "Langkahmu terhenti oleh dinginnya cengkeraman...",
      "Kehangatan hidupmu mulai memudar.",
      "Kini, kau adalah bagian dari kegelapan ini.",
    ];
  } else if (reason === "SANITY HABIS") {
    finalTitle = "HILANG KEWARASAN";
    finalReason = "Pikiranmu hancur oleh mimpi buruk yang tak tertahankan.";
    deathMessages = [
      "Kesadaranmu mulai retak...",
      "Bisikan itu tak lagi bisa kau tahan.",
      "Duniamu runtuh dalam kehampaan abadi.",
    ];
  } else {
    finalTitle = "WAKTU HABIS";
    finalReason = "Kamu terjebak di mimpi buruk selamanya.";
    deathMessages = [
      "Detik terakhir telah berlalu...",
      "Waktu mengkhianati harapanmu.",
      "Pintu itu telah tertutup untuk selamanya.",
    ];
  }

  let msgIndex = 0;
  function showNextDeathText() {
    if (msgIndex < deathMessages.length) {
      introTextElem.style.opacity = 0;
      setTimeout(() => {
        introTextElem.innerText = deathMessages[msgIndex];
        introTextElem.style.opacity = 1;
        msgIndex++;
        setTimeout(showNextDeathText, 3000);
      }, 1000);
    } else {
      introScreen.classList.add("fade-out-scene");
      setTimeout(() => {
        introScreen.classList.add("hidden");
        const screen = document.getElementById("overlay-screen");

        // Memasukkan data yang sudah dibedakan
        document.getElementById("screen-title").innerText = finalTitle;
        document.getElementById("death-reason").innerText = finalReason;

        screen.classList.remove("hidden");
        screen.classList.add("lose-screen");
      }, 1500);
    }
  }
  showNextDeathText();
}

function playEndingSequence() {
  const introScreen = document.getElementById("intro-screen");
  const introTextElem = document.getElementById("intro-text");

  // Siapkan Layar
  introScreen.classList.remove("hidden", "fade-out-scene");
  introScreen.style.display = "flex";
  introScreen.style.opacity = "1";
  introScreen.style.backgroundColor = "#fff"; // Opsional: Ubah ke putih untuk efek "Bangun dari mimpi"

  introTextElem.style.color = "#000"; // Teks hitam di atas latar putih
  introTextElem.style.textShadow = "none";

  function showNextEndingText() {
    if (currentEndingIndex < endingScenes.length) {
      introTextElem.style.opacity = 0;

      setTimeout(() => {
        introTextElem.innerText = endingScenes[currentEndingIndex];
        introTextElem.style.opacity = 1;
        currentEndingIndex++;

        // Jeda 4 detik per kalimat ending
        setTimeout(showNextEndingText, 4000);
      }, 1000);
    } else {
      // Tampilkan UI Menang Final
      introScreen.classList.add("fade-out-scene");

      setTimeout(() => {
        introScreen.classList.add("hidden");
        const screen = document.getElementById("overlay-screen");
        screen.classList.remove("hidden");
        screen.classList.add("win-screen");
        document.getElementById("screen-title").innerText =
          "SELAMAT DARI MIMPI BURUK";
        document.getElementById("death-reason").innerText =
          "Kamu selamat hari ini. Matahari terasa begitu hangat.";
      }, 1500);
    }
  }

  showNextEndingText();
}

function gameLoop() {
  if (!isGameOver) {
    update();

    // 1. Hitung Offset Kamera untuk Jongkok
    // Kita tambahkan konstanta tinggi pandangan yang lebih rendah saat jongkok
    const crouchCameraHeight = player.isCrouching ? 0.2 : 0;
    const finalCameraBobY = cameraBobY + crouchCameraHeight;

    // 2. KIRIM PARAMETER KE ENGINE
    // Pastikan watcherBackImg sudah diimpor dari assets.js atau textures
    render(
      ctx,
      canvas,
      player,
      watcher,
      currentMap,
      currentFOV,
      cameraBobX,
      finalCameraBobY, // Menggunakan Y yang sudah ditambah offset jongkok
      questStep,
      isSafeTimerActive,
      safeZoneTime,
      watcherImg, // Aset Tampak Depan (sudah ada)
      watcherBackImg, // Aset Tampak Belakang (Baru)
      gameTime,
      textures,
      handSway,
    );

    // 3. Update Navigasi & Minimap
    updateNavigation();

    // Opsional: Jika ingin minimap aktif, buka komentarnya
    // const minimapCanvas = document.getElementById("minimapCanvas");
    // if (minimapCanvas) {
    //   drawMinimap(minimapCanvas, player, watcher, currentMap, questStep);
    // }

    // 4. Update UI Status Bar
    const staminaFill = document.getElementById("stamina-fill");
    const sanityFill = document.getElementById("sanity-fill");

    if (staminaFill) staminaFill.style.width = player.stamina + "%";
    if (sanityFill) sanityFill.style.width = player.sanity + "%";

    // 5. Update Timer
    let mins = Math.floor(gameTime / 60);
    let secs = Math.floor(gameTime % 60);
    const timerElem = document.getElementById("timer");
    if (timerElem) {
      timerElem.innerText = `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    // 6. Loop Animasi
    requestAnimationFrame(gameLoop);
  }
}
