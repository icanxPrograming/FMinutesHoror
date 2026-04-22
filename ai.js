import { STATES } from "./config.js";

const SAFE_ZONE_BUFFER = 5;
const DETECTION_RADIUS = 5;
const CHASE_MAX_RADIUS = 8;
const MAX_SIGHT_DIST = 10;

// --- FUNGSI BARU: Pengecekan Benda Padat ---
// Kita buat satu fungsi pusat agar jika ada ID tembok baru, cukup ubah di sini
function isSolid(cell) {
  // 1: Tembok S1, 3: Pintu, 10: Tembok S2, 20: Tembok S3
  return cell === 1 || cell === 3 || cell === 10 || cell === 20;
}

// --- FUNGSI HELPER A* ---

function heuristic(a, b) {
  // Menggunakan Manhattan Distance
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getPathAStar(startGrid, targetGrid, map) {
  const openList = [];
  const closedList = new Set();

  openList.push({
    x: startGrid.x,
    y: startGrid.y,
    g: 0,
    h: heuristic(startGrid, targetGrid),
    f: 0,
    parent: null,
  });

  while (openList.length > 0) {
    let lowIdx = 0;
    for (let i = 0; i < openList.length; i++) {
      if (openList[i].f < openList[lowIdx].f) lowIdx = i;
    }
    let current = openList[lowIdx];

    if (current.x === targetGrid.x && current.y === targetGrid.y) {
      let path = [];
      let curr = current;
      while (curr.parent) {
        path.push({ x: curr.x + 0.5, y: curr.y + 0.5 });
        curr = curr.parent;
      }
      return path.reverse();
    }

    openList.splice(lowIdx, 1);
    closedList.add(`${current.x},${current.y}`);

    // Cek 4 arah (Tetangga)
    const neighbors = [
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 },
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
    ];

    for (let neighbor of neighbors) {
      if (
        neighbor.x < 0 ||
        neighbor.x >= map[0].length ||
        neighbor.y < 0 ||
        neighbor.y >= map.length ||
        isSolid(map[neighbor.y][neighbor.x]) || // PERBAIKAN: Menggunakan isSolid
        closedList.has(`${neighbor.x},${neighbor.y}`)
      ) {
        continue;
      }

      let gScore = current.g + 1;
      let bestG = false;

      let existingNode = openList.find(
        (el) => el.x === neighbor.x && el.y === neighbor.y,
      );

      if (!existingNode) {
        bestG = true;
        neighbor.h = heuristic(neighbor, targetGrid);
        openList.push(neighbor);
      } else if (gScore < existingNode.g) {
        bestG = true;
        neighbor = existingNode;
      }

      if (bestG) {
        neighbor.parent = current;
        neighbor.g = gScore;
        neighbor.f = neighbor.g + neighbor.h;
      }
    }
  }
  return []; // Tidak ditemukan jalan
}

// --- FUNGSI AI UTAMA ---

export function canSeePlayer(watcher, player, map) {
  const dx = player.x - watcher.x;
  const dy = player.y - watcher.y;
  const distance = Math.hypot(dx, dy);
  if (distance > MAX_SIGHT_DIST) return false;

  const steps = Math.ceil(distance * 10);
  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let i = 0; i <= steps; i++) {
    const checkX = Math.floor(watcher.x + stepX * i);
    const checkY = Math.floor(watcher.y + stepY * i);
    if (
      checkY < 0 ||
      checkY >= map.length ||
      checkX < 0 ||
      checkX >= map[0].length
    )
      return false;
    const cell = map[checkY][checkX];
    if (isSolid(map[checkY][checkX])) return false;
  }
  return true;
}

// Tambahkan ini di ai.js agar main.js tidak error
export function generatePatrolRoute(map) {
  const route = [];
  const mapHeight = map.length;
  const mapWidth = map[0].length;
  for (let y = 1; y < mapHeight - 1; y += 2) {
    for (let x = 1; x < mapWidth - 1; x += 2) {
      // PERBAIKAN: Rute patroli hanya di lantai (0), bukan di tembok S2/S3
      if (map[y][x] === 0) {
        const distFromSpawn = Math.hypot(x - 1.5, y - 1.5);
        if (distFromSpawn > SAFE_ZONE_BUFFER) {
          route.push({ x: x + 0.5, y: y + 0.5 });
        }
      }
    }
  }
  return route;
}

export function isPlayerInFront(watcher, player, watcherDir) {
  const angleToPlayer = Math.atan2(player.y - watcher.y, player.x - watcher.x);
  let angleDiff = angleToPlayer - watcherDir;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  return Math.abs(angleDiff) < Math.PI / 1.8;
}

export function pickNewPatrolTarget(watcher, map, patrolRoute = null) {
  if (patrolRoute && patrolRoute.length > 0) {
    const jump = Math.floor(Math.random() * 5) + 3;
    watcher.lastPatrolIndex =
      ((watcher.lastPatrolIndex || 0) + jump) % patrolRoute.length;
    const target = patrolRoute[watcher.lastPatrolIndex];
    watcher.targetX = target.x;
    watcher.targetY = target.y;
  }
}

export function updateAI(
  watcher,
  player,
  map,
  gameTime,
  inSafeZone,
  pickTargetFn,
  patrolRoute = null,
) {
  const dist = Math.hypot(watcher.x - player.x, watcher.y - player.y);
  const distToSpawn = Math.hypot(player.x - 1.5, player.y - 1.5);
  const playerIsSafe = inSafeZone || distToSpawn < SAFE_ZONE_BUFFER;
  const canSee = canSeePlayer(watcher, player, map);

  // 1. STATE SWITCHING
  if (playerIsSafe) {
    if (watcher.state === STATES.CHASE) {
      watcher.state = STATES.PATROL;
      watcher.path = [];
      pickTargetFn(watcher, map, patrolRoute);
    }
  } else {
    if (watcher.state === STATES.CHASE) {
      // Berhenti mengejar jika terlalu jauh (Radius Lepas)
      if (dist > CHASE_MAX_RADIUS) {
        watcher.state = STATES.PATROL;
        watcher.path = [];
        pickTargetFn(watcher, map, patrolRoute);
      }
    } else {
      // MULAI MENGEJAR HANYA JIKA:
      // 1. Terlihat (canSee)
      // 2. Berada dalam jarak deteksi (dist <= DETECTION_RADIUS)
      if (canSee && dist <= DETECTION_RADIUS) {
        watcher.state = STATES.CHASE;
      }
    }
  }

  // 2. A* PATHFINDING LOGIC (PERBAIKAN UTAMA)
  const targetGrid =
    watcher.state === STATES.CHASE
      ? { x: Math.floor(player.x), y: Math.floor(player.y) }
      : { x: Math.floor(watcher.targetX), y: Math.floor(watcher.targetY) };

  // Hitung ulang path jika:
  // - Belum punya path
  // - Path sudah habis
  // - Target (Pemain) pindah ke ubin/tile yang berbeda
  // - Secara berkala (setiap 30 frame) untuk sinkronisasi
  const targetMoved =
    !watcher.lastTargetGrid ||
    watcher.lastTargetGrid.x !== targetGrid.x ||
    watcher.lastTargetGrid.y !== targetGrid.y;

  if (
    !watcher.path ||
    watcher.path.length === 0 ||
    targetMoved ||
    Math.floor(gameTime * 60) % 30 === 0
  ) {
    const startGrid = { x: Math.floor(watcher.x), y: Math.floor(watcher.y) };
    watcher.path = getPathAStar(startGrid, targetGrid, map);
    watcher.lastTargetGrid = targetGrid; // Simpan posisi target terakhir
  }

  let moveX = 0;
  let moveY = 0;
  let watcherSpeed =
    watcher.state === STATES.CHASE ? (dist < 4 ? 0.025 : 0.02) : 0.012;

  // 3. MOVEMENT LOGIC (PATH FOLLOWING)
  if (watcher.path && watcher.path.length > 0) {
    const nextStep = watcher.path[0];
    const angle = Math.atan2(nextStep.y - watcher.y, nextStep.x - watcher.x);
    watcher.moveAngle = angle;

    moveX = Math.cos(angle) * watcherSpeed;
    moveY = Math.sin(angle) * watcherSpeed;

    // Toleransi ditingkatkan ke 0.2 agar gerakan lebih smooth dan tidak stuck di waypoint
    if (Math.hypot(nextStep.x - watcher.x, nextStep.y - watcher.y) < 0.2) {
      watcher.path.shift();
    }
  } else if (watcher.state === STATES.PATROL) {
    // Jika path kosong saat patroli, artinya sudah sampai tujuan, ambil target baru
    pickTargetFn(watcher, map, patrolRoute);
  }

  // 4. COLLISION DETECTION (SLIDING) - PERBAIKAN UTAMA
  const buffer = 0.2;
  const checkX = watcher.x + moveX + (moveX > 0 ? buffer : -buffer);
  const checkY = watcher.y + moveY + (moveY > 0 ? buffer : -buffer);

  // Pastikan pengecekan grid map[y][x] tidak menabrak tembok S2/S3
  if (!isSolid(map[Math.floor(watcher.y)][Math.floor(checkX)])) {
    watcher.x += moveX;
  }
  if (!isSolid(map[Math.floor(checkY)][Math.floor(watcher.x)])) {
    watcher.y += moveY;
  }

  return dist;
}
