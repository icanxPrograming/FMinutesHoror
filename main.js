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
import {
  watcherImg,
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
  1: { title: "HAUNTED LIBRARY", subtitle: "STAGE 1" },
  2: { title: "THE FORGOTTEN BASEMENT", subtitle: "STAGE 2" },
  3: { title: "CURSED ALTAR", subtitle: "STAGE 3" },
};

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
  document.getElementById("stage-title-text").innerText = STAGE_NAMES[1].title;
  document.getElementById("stage-subtitle-text").innerText =
    STAGE_NAMES[1].subtitle;
  stageScreen.classList.remove("hidden");
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
    patrolRoute = generatePatrolRoute(currentMap);
    pickNewPatrolTarget(watcher, currentMap, patrolRoute);
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

  const noteIndexes = { 1: 0, 2: 4, 3: 8 };
  const currentNoteIndex = noteIndexes[currentStage];

  QUEST_LIST.forEach((q, index) => {
    if (q.stage === currentStage) {
      // 1. LOGIKA GERBANG: Jika belum baca Note, quest lain disembunyikan
      if (questStep === currentNoteIndex && index > currentNoteIndex) {
        return;
      }

      const div = document.createElement("div");

      // 2. LOGIKA PENGECEKAN STATUS (RIIL)
      // Kita anggap quest selesai jika itemnya sudah tidak ada di map
      let isActuallyDone = false;

      if (index < questStep) {
        // Jika questStep sudah melewati indeks ini (seperti Note)
        isActuallyDone = true;
      } else {
        // Cek fisik di map berdasarkan tipe quest
        if (q.type === "COLLECT") {
          // Cek apakah masih ada spriteIds koleksi di map
          isActuallyDone = !checkItemExistsInMap(q.spriteIds);
        } else if (q.spriteId || q.wallId) {
          // Cek apakah spriteId kunci/pintu tertentu masih ada
          isActuallyDone = !checkItemExistsInMap([q.spriteId || q.wallId]);
        }
      }

      // 3. Tentukan Class CSS
      const isActive = index === questStep && !isActuallyDone;
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

  let targetID = -1;
  let tx = -1,
    ty = -1;

  // 1. CARI ITEM KOLEKSI DULU (Buku S2 atau Artefak S3)
  const collectionIDs =
    currentStage === 2 ? [11, 12, 13, 14, 15, 16, 17] : [21, 22, 23, 24, 25];
  targetID = findNearestID(collectionIDs);

  // 2. JIKA KOLEKSI HABIS, CARI KUNCI
  if (targetID === -1) {
    const keyIDs =
      currentStage === 1 ? [5, 6] : currentStage === 2 ? [18] : [26, 27];
    targetID = findNearestID(keyIDs);
  }

  // 3. JIKA KUNCI HABIS, CARI PINTU (ID 3)
  if (targetID === -1) {
    targetID = 3;
  }

  // Cari koordinat targetID tersebut di currentMap
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

  // Update UI Teks
  if (tx !== -1) {
    let dist = Math.hypot(tx - player.x, ty - player.y);
    let angleToTarget = Math.atan2(ty - player.y, tx - player.x) - player.dir;
    while (angleToTarget < -Math.PI) angleToTarget += Math.PI * 2;
    while (angleToTarget > Math.PI) angleToTarget -= Math.PI * 2;

    let direction = "Depan";
    if (angleToTarget > 0.5) direction = "Kanan";
    if (angleToTarget < -0.5) direction = "Kiri";
    if (Math.abs(angleToTarget) > 2.5) direction = "Belakang";

    navUI.innerText = `Objektif: ${Math.round(dist)}m di arah ${direction}`;
  } else {
    navUI.innerText = "Semua tugas selesai. Cari jalan keluar!";
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

  // 1. UPDATE AI & DAPATKAN JARAK
  let dist = updateAI(
    watcher,
    player,
    currentMap,
    gameTime,
    false,
    pickNewPatrolTarget,
    patrolRoute,
  );

  // 2. LOGIKA PERINGATAN VISUAL & AUDIO (Berdasarkan Jarak 'dist' & Stamina)

  // A. Logika Audio (Heartbeat & Breathing)
  if (dist < 7.0) {
    if (heartbeat.paused) heartbeat.play().catch(() => {});
    heartbeat.volume = Math.max(0, Math.min(1, (7.0 - dist) / 7.0));
  } else {
    heartbeat.volume = 0;
  }

  // Suara napas (Breathing) jika stamina kritis (< 15%)
  if (player.stamina < 15 || (dist < 4 && watcher.state === STATES.CHASE)) {
    if (breathingSound.paused) {
      breathingSound.currentTime = 0;
      breathingSound.play().catch(() => {});
    }

    // Gunakan Math.max dan Math.min agar volume tidak meledak di luar rentang [0, 1]
    let calculatedVolume = (20 - player.stamina) / 20;
    breathingSound.volume = Math.max(0, Math.min(1, calculatedVolume));
  } else if (player.stamina > 50) {
    breathingSound.pause();
  }

  // B. Logika Visual (Blur & Noise Gabungan)
  let finalBlur = 0;
  let finalNoiseOpacity = 0;

  // Hitung intensitas dari hantu
  if (dist < 5.0) {
    finalBlur = Math.min(2.5, (5.0 - dist) * 0.5);
    finalNoiseOpacity = Math.min(0.4, (5.0 - dist) * 0.08);
  }

  // Hitung intensitas dari stamina rendah (Overlay sesak napas)
  if (player.stamina < 20) {
    const staminaStress = Math.max(0, (20 - player.stamina) / 40); // Max 0.5
    finalNoiseOpacity = Math.max(finalNoiseOpacity, staminaStress);
    finalBlur = Math.max(finalBlur, staminaStress * 3); // Mata buram saat lelah
  }

  // TERAPKAN KE DOM (Hanya satu kali pemanggilan agar tidak bentrok)
  if (gameContentElem) {
    gameContentElem.style.filter =
      finalBlur > 0 ? `blur(${finalBlur}px)` : "none";
  }

  if (noiseOverlay) {
    if (finalNoiseOpacity > 0) {
      noiseOverlay.style.display = "block";
      noiseOverlay.style.opacity = finalNoiseOpacity;
    } else {
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
  let targetCell = currentMap[Math.floor(lookY)]
    ? currentMap[Math.floor(lookY)][Math.floor(lookX)]
    : 0;

  // Cek jika objek adalah Item Interaktif (Note, Kunci, Buku, Artefak)
  const isInteractable =
    (targetCell >= 4 && targetCell <= 6) ||
    (targetCell >= 11 && targetCell <= 18) ||
    (targetCell >= 21 && targetCell <= 27);
  if (isInteractable) {
    if (prompt) {
      prompt.style.display = "block";
      prompt.innerText = "[E] PERIKSA";
    }
    if (keys["KeyE"] && !isPaused) {
      const gridX = Math.floor(lookX);
      const gridY = Math.floor(lookY);
      if (targetCell === 4) {
        // Tentukan step awal setiap stage
        const stageStartStep =
          currentStage === 1 ? 0 : currentStage === 2 ? 4 : 8;

        if (questStep === stageStartStep) {
          noteReadSound.currentTime = 0;
          noteReadSound.play();

          let msg = "";
          // Template pesan tambahan untuk semua stage
          const extraWarning =
            "\n\n(Ingat: Segel pintu keluar hanya akan terbuka jika seluruh tugas telah diselesaikan.)";

          if (currentStage === 1) {
            msg =
              "Catatan: 'Cari 2 kunci untuk membuka pintu keluar perpustakaan. Waspadalah, mereka mengawasi dari balik rak buku.'" +
              extraWarning;
          } else if (currentStage === 2) {
            msg =
              "Catatan: 'Kumpulkan 7 catatan sihir kuno yang tersebar di basement ini. Kekuatannya akan memunculkan kunci segel pintu.'" +
              extraWarning;
          } else if (currentStage === 3) {
            msg =
              "Peringatan Terakhir: 'Kumpulkan 5 Artefak Kuno dan temukan 2 kunci segel. Selalu waspada terhadap sekitarmu.'" +
              extraWarning;
          }

          showPaperContent(msg);
          currentMap[gridY][gridX] = 0; // Hilangkan note dari map
          completeQuestStep(questStep); // Naikkan ke step berikutnya (misal 4 jadi 5)
        }
      } else if (
        (targetCell >= 11 && targetCell <= 17) ||
        (targetCell >= 21 && targetCell <= 25)
      ) {
        const hasReadNote =
          (currentStage === 2 && questStep > 4) ||
          (currentStage === 3 && questStep > 8);

        if (hasReadNote || currentStage === 1) {
          itemPickupSound.currentTime = 0;
          itemPickupSound.play();
          currentMap[gridY][gridX] = 0;
          checkCollectionProgress(); // Fungsi ini akan memanggil completeQuestStep jika sudah habis
        }
      } else if ([5, 6, 18, 26, 27].includes(targetCell)) {
        keyPickupSound.currentTime = 0;

        keyPickupSound.play();

        currentMap[gridY][gridX] = 0;

        showGameMessage("Kunci didapatkan!");

        completeQuestStep(questStep);
      }
      keys["KeyE"] = false;
    }
  } else if (targetCell === 3) {
    // PINTU EXIT
    if (prompt) {
      prompt.style.display = "block";
      // Jika sudah ambil semua kunci (questStep >= 3)
      prompt.innerText = isStageCleared() ? "[E] KELUAR" : "PINTU TERKUNCI";
    }

    if (keys["KeyE"] && !isPaused) {
      if (isStageCleared()) {
        openDoorSound.currentTime = 0;
        openDoorSound.play();

        // BERHENTIKAN UPDATE AGAR PLAYER TIDAK JALAN SAAT TRANSISI
        isPaused = true;

        setTimeout(() => {
          // LOGIKA TRANSISI:
          if (currentStage < 3) {
            nextStage(); // Pindah ke stage berikutnya
            // isPaused = false;
          } else {
            endGame("BERHASIL KELUAR"); // Tamat jika sudah stage 3
          }
        }, 500);
      } else {
        // --- KONDISI: PINTU MASIH TERKUNCI ---
        // Mainkan suara gagang pintu yang digoyang (locking)
        lockingDoorSound.currentTime = 0;
        lockingDoorSound.play();

        showGameMessage("Aku belum menyelesaikan semua tugas di sini...");
      }
    }
  } else {
    if (prompt) prompt.style.display = "none";
  }

  // 5. MOVEMENT & COLLISION
  const baseSpeed = 0.02;
  const forwardMove = (keys["KeyW"] ? 1 : 0) - (keys["KeyS"] ? 1 : 0);
  const strafeMove = (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0);
  let moveStep = 0;
  const isMoving = forwardMove !== 0 || strafeMove !== 0;
  const isRunning = keys["ShiftLeft"] && player.stamina > 0 && keys["KeyW"];

  if (isRunning) {
    moveStep = baseSpeed * 1.5;
    player.stamina -= 0.15; // Stamina lebih awet
    targetFOV = Math.PI / 1.8;
    // Suara Running
    if (isMoving) {
      if (runningSound.paused) runningSound.play().catch(() => {});
      walkSound.pause();
    }
  } else {
    if (forwardMove > 0) moveStep = baseSpeed;
    if (forwardMove < 0) moveStep = -baseSpeed * 0.6;
    if (player.stamina < 100) player.stamina += 0.35;
    targetFOV = Math.PI / 2.2;
    // Suara Walk
    if (isMoving) {
      if (walkSound.paused) walkSound.play().catch(() => {});
      runningSound.pause();
    }
  }
  // Matikan suara langkah jika diam
  if (!isMoving || isPaused || isGameOver) {
    walkSound.pause();
    runningSound.pause();
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

  let walkCell = currentMap[Math.floor(ny)]
    ? currentMap[Math.floor(ny)][Math.floor(nx)]
    : 1;
  const solidCells = [1, 3, 10, 20];
  if (!solidCells.includes(walkCell)) {
    // Jika koordinat baru BUKAN benda padat, maka player boleh pindah
    player.x = nx;
    player.y = ny;
  }

  // 6. KONDISI KALAH
  if (player.sanity <= 0) endGame("SANITY HABIS");
  if (gameTime <= 0) endGame("WAKTU HABIS");
  if (dist < 0.3) triggerJumpscare();
}

function isStageCleared() {
  // Stage 1 clear di step 3, Stage 2 di step 7, Stage 3 di step 11
  if (currentStage === 1) return questStep >= 3;
  if (currentStage === 2) return questStep >= 7;
  if (currentStage === 3) return questStep >= 11;
  return false;
}

function checkCollectionProgress() {
  // Menghitung sisa item di map
  let count = 0;
  for (let row of currentMap) {
    for (let cell of row) {
      if (
        (currentStage === 2 && cell >= 11 && cell <= 17) ||
        (currentStage === 3 && cell >= 21 && cell <= 25)
      )
        count++;
    }
  }
  if (count === 0) completeQuestStep(questStep);
}

function nextStage() {
  if (currentStage >= 3) return; // Mencegah error jika mencoba lewat dari stage 3

  console.log("TRANSISI DIMULAI...");
  isPaused = true; // Langsung kunci permainan
  currentStage++;

  // Sinkronisasi questStep global
  if (currentStage === 2) questStep = 4;
  if (currentStage === 3) questStep = 8;

  const stageScreen = document.getElementById("stage-screen");
  const titleText = document.getElementById("stage-title-text");
  const subtitleText = document.getElementById("stage-subtitle-text");

  // 1. Persiapkan Layar Stage
  if (stageScreen) {
    titleText.innerText = STAGE_NAMES[currentStage].title;
    subtitleText.innerText = STAGE_NAMES[currentStage].subtitle;

    // Reset class agar animasi bisa terulang
    stageScreen.classList.remove("hidden", "fade-out-scene", "active");
    stageScreen.style.display = "flex";
    stageScreen.style.opacity = "1";

    // Trigger animasi CSS (Blur -> Sharp) setelah jeda mikro
    setTimeout(() => {
      stageScreen.classList.add("active");
    }, 50);
  }

  // 2. Lepaskan Mouse (Penting agar tidak WrongDocumentError)
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }

  // 3. Update Data Dunia & Reset Player
  player.x = 1.5;
  player.y = 1.5;
  player.dir = 0;
  // gameTime = 900;

  // Ganti Map (Pastikan menggunakan currentMap di seluruh file)
  if (currentStage === 2) currentMap = JSON.parse(JSON.stringify(MAP_STAGE_2));
  if (currentStage === 3) currentMap = JSON.parse(JSON.stringify(MAP_STAGE_3));

  // Reset AI untuk Map baru
  patrolRoute = generatePatrolRoute(currentMap);
  watcher.x = currentMap[0].length - 2;
  watcher.y = currentMap.length - 2;
  watcher.state = STATES.PATROL;
  watcher.path = [];
  pickNewPatrolTarget(watcher, currentMap, patrolRoute);

  // Reset Input Keys (Cegah interaksi otomatis)
  for (let key in keys) {
    keys[key] = false;
  }

  // 4. Eksekusi Transisi Keluar
  setTimeout(() => {
    console.log("Memulai Fade Out...");
    if (stageScreen) stageScreen.classList.add("fade-out-scene");

    setTimeout(() => {
      console.log("Game Aktif Kembali!");

      // Sembunyikan total agar klik bisa tembus ke canvas
      if (stageScreen) {
        stageScreen.classList.add("hidden");
        stageScreen.style.display = "none";
      }

      isPaused = false; // Buka kunci permainan
      updateQuestUI();
      updateNavigation();

      // Minta pointer lock kembali (opsional, karena browser sering blokir otomatis)
      try {
        canvas.requestPointerLock();
      } catch (err) {
        console.warn("User interaction required for pointer lock.");
      }
    }, 1200); // Sesuaikan dengan durasi transition CSS
  }, 4000);
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
      currentMap,
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

    // const minimapCanvas = document.getElementById("minimapCanvas");
    // if (minimapCanvas) {
    //   drawMinimap(minimapCanvas, player, watcher, currentMap, questStep);
    // }
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
