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

// --- TAMBAHKAN VARIABEL BARU DI ATAS ---
const introScreen = document.getElementById("intro-screen");
const introTextElem = document.getElementById("intro-text");
const introScenes = [
  "Kelopak matamu terasa berat, namun jiwamu berteriak ketakutan...",
  "Dalam kegelapan yang tak berujung, 'The Watcher' telah memilihmu.",
  "Mimpi buruk ini bukan lagi sekadar khayalan. Ini adalah penjaramu.",
  "Selamat datang di labirin takdir. Kamu punya 15 menit... sebelum semuanya lenyap.",
];
let currentIntroIndex = 0;
const stageIntros = {
  2: "The Watcher menyeretmu ke dalam mimpi yang lebih buruk segeralah bergegas sebelum semuanya terlambat",
  3: "Ini adalah kesempatan terakhirmu, jika kamu bisa menyelesaikannya kamu selamat, jika kamu tidak bisa maka itu adalah akhir bagimu!",
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
      const currentQuest = QUEST_LIST[questStep];

      // Cek apakah item yang dilihat adalah target quest saat ini
      let isTargetValid = false;
      if (currentQuest.type === "COLLECT") {
        isTargetValid = currentQuest.spriteIds.includes(targetCell);
      } else {
        isTargetValid =
          targetCell === (currentQuest.spriteId || currentQuest.wallId);
      }

      if (isTargetValid) {
        if (targetCell === 4) {
          // --- NOTES ---
          noteReadSound.currentTime = 0;
          noteReadSound.play();

          let msg = "";
          const extraWarning =
            "\n\n(Ingat: Segel pintu keluar hanya akan terbuka jika seluruh tugas telah diselesaikan.)";
          if (currentStage === 1)
            msg =
              "Catatan: 'Cari 2 kunci untuk membuka pintu keluar perpustakaan. Waspadalah, mereka mengawasi dari balik rak buku.'" +
              extraWarning;
          else if (currentStage === 2)
            msg =
              "Catatan: 'Kumpulkan 7 catatan sihir kuno yang tersebar di basement ini. Kekuatannya akan memunculkan kunci segel pintu.'" +
              extraWarning;
          else if (currentStage === 3)
            msg =
              "Peringatan Terakhir: 'Kumpulkan 5 Artefak Kuno dan temukan 2 kunci segel. Selalu waspada terhadap sekitarmu.'" +
              extraWarning;

          currentMap[gridY][gridX] = 0;
          completeQuestStep(questStep);
          spawnObjectives(); // Munculkan Kunci 1 atau Buku
          showPaperContent(msg);
        } else if ([5, 6, 18, 26, 27].includes(targetCell)) {
          // --- KUNCI ---
          keyPickupSound.currentTime = 0;
          keyPickupSound.play();
          currentMap[gridY][gridX] = 0;
          showGameMessage("Kunci didapatkan!");
          completeQuestStep(questStep);
          spawnObjectives(); // Munculkan Kunci berikutnya atau arahkan ke Pintu
        } else {
          // --- ITEM KOLEKSI (Buku/Artefak) ---
          itemPickupSound.currentTime = 0;
          itemPickupSound.play();
          currentMap[gridY][gridX] = 0;

          // Cek apakah koleksi tipe ini sudah habis di map
          let remaining = 0;
          currentMap.forEach((row) =>
            row.forEach((cell) => {
              if (currentQuest.spriteIds.includes(cell)) remaining++;
            }),
          );

          if (remaining === 0) {
            completeQuestStep(questStep);
            spawnObjectives(); // Munculkan KUNCI setelah buku/artefak habis
          } else {
            updateQuestUI();
          }
        }
      } else {
        // Jika mencoba mengambil item yang belum waktunya
        lockingDoorSound.currentTime = 0;
        lockingDoorSound.play();
        showGameMessage("Aku belum membutuhkan benda ini sekarang...");
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
  isPaused = true; // Hentikan semua pergerakan
  document.exitPointerLock();
  backsound.pause();

  if (status === "BERHASIL KELUAR") {
    // Jalankan Intro Ending Estetik
    playEndingSequence();
  } else {
    // Jika kalah (Sanity/Waktu habis), langsung munculkan layar kalah
    const screen = document.getElementById("overlay-screen");
    screen.classList.remove("hidden");
    screen.classList.add("lose-screen");
    document.getElementById("screen-title").innerText = "TERTINGGAL";
    document.getElementById("death-reason").innerText =
      status === "SANITY HABIS"
        ? "Jiwamu hancur dalam kegelapan."
        : "Waktu telah habis. Kamu terjebak selamanya.";
  }
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
        document.getElementById("screen-title").innerText = "TERLEPAS";
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
