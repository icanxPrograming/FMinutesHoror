import { STATES } from "./config.js";

const SAFE_ZONE_BUFFER = 5;
const DETECTION_RADIUS = 5; // Jarak pandang maksimal
const CHASE_MAX_RADIUS = 10; // Jarak lepas (saat hantu menyerah)
const MAX_SIGHT_DIST = 12;

// Jarak Pendengaran
const SOUND_RUN_RADIUS = 4.5; // Jarak dengar jika player Lari
const SOUND_WALK_RADIUS = 1.8; // Jarak dengar jika player Jalan biasa
const WALL_HEARING_BLOCK = 0.5;

function isSolid(cell) {
  return cell === 1 || cell === 3 || cell === 10 || cell === 20;
}

// --- FUNGSI HELPER A* (Tetap Sama) ---
function heuristic(a, b) {
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
        isSolid(map[neighbor.y][neighbor.x]) ||
        closedList.has(`${neighbor.x},${neighbor.y}`)
      )
        continue;
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
  return [];
}

// --- LOGIKA PANDANGAN (LOS) ---
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
    if (isSolid(map[checkY][checkX])) return false;
  }
  return true;
}

// --- LOGIKA KERUCUT PENGLIHATAN (FOV) ---
export function isPlayerInFront(watcher, player) {
  // Arah hadap hantu (watcher.moveAngle ditentukan saat bergerak)
  const angleToPlayer = Math.atan2(player.y - watcher.y, player.x - watcher.x);
  let angleDiff = angleToPlayer - (watcher.moveAngle || 0);

  // Normalisasi sudut
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  // Sudut pandang hantu sebesar ~100 derajat (PI / 1.8)
  return Math.abs(angleDiff) < Math.PI / 1.8;
}

// --- LOGIKA PENDENGARAN ---
function canHearPlayer(dist, isRunning, isCrouching, isMoving, canSee) {
  if (!isMoving || isCrouching) return false;

  let effectiveRunRadius = SOUND_RUN_RADIUS;
  let effectiveWalkRadius = SOUND_WALK_RADIUS;

  // Efek Peredam Tembok: Jika hantu TIDAK bisa melihat player, radius pendengaran berkurang drastis
  if (!canSee) {
    effectiveRunRadius *= WALL_HEARING_BLOCK;
    effectiveWalkRadius *= WALL_HEARING_BLOCK;
  }

  if (isRunning && dist <= effectiveRunRadius) return true;
  if (dist <= effectiveWalkRadius) return true;

  return false;
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

export function generatePatrolRoute(map) {
  const route = [];
  for (let y = 1; y < map.length - 1; y += 2) {
    for (let x = 1; x < map[0].length - 1; x += 2) {
      if (map[y][x] === 0) {
        if (Math.hypot(x - 1.5, y - 1.5) > SAFE_ZONE_BUFFER) {
          route.push({ x: x + 0.5, y: y + 0.5 });
        }
      }
    }
  }
  return route;
}

// --- FUNGSI UPDATE AI ---
export function updateAI(
  watcher,
  player,
  map,
  gameTime,
  inSafeZone,
  pickTargetFn,
  patrolRoute = null,
  playerStatus, // Terima status dari main.js { isMoving, isRunning, isCrouching }
) {
  const dist = Math.hypot(watcher.x - player.x, watcher.y - player.y);
  const distToSpawn = Math.hypot(player.x - 1.5, player.y - 1.5);
  const playerIsSafe = inSafeZone || distToSpawn < SAFE_ZONE_BUFFER;

  // Cek Penglihatan dan Pendengaran
  const canSee = canSeePlayer(watcher, player, map);
  const inFOV = isPlayerInFront(watcher, player);
  const canHear = canHearPlayer(
    dist,
    playerStatus.isRunning,
    playerStatus.isCrouching,
    playerStatus.isMoving,
    canSee,
  );

  // 1. STATE SWITCHING
  if (playerIsSafe) {
    if (watcher.state === STATES.CHASE) {
      watcher.state = STATES.PATROL;
      watcher.path = [];
      pickTargetFn(watcher, map, patrolRoute);
    }
  } else {
    if (watcher.state === STATES.CHASE) {
      if (dist > CHASE_MAX_RADIUS) {
        watcher.state = STATES.PATROL;
        watcher.path = [];
        pickTargetFn(watcher, map, patrolRoute);
      }
    } else {
      // Hantu mulai mengejar jika:
      // 1. TERLIHAT (Dalam FOV depan & tidak terhalang tembok)
      // 2. TERDENGAR (Meskipun hantu membelakangi, jika player lari/dekat, hantu akan sadar)
      if ((canSee && inFOV && dist <= DETECTION_RADIUS) || canHear) {
        watcher.state = STATES.CHASE;
      }
    }
  }

  // 2. PATHFINDING
  const targetGrid =
    watcher.state === STATES.CHASE
      ? { x: Math.floor(player.x), y: Math.floor(player.y) }
      : { x: Math.floor(watcher.targetX), y: Math.floor(watcher.targetY) };

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
    watcher.path = getPathAStar(
      { x: Math.floor(watcher.x), y: Math.floor(watcher.y) },
      targetGrid,
      map,
    );
    watcher.lastTargetGrid = targetGrid;
  }

  // 3. MOVEMENT
  let moveX = 0,
    moveY = 0;
  // Kecepatan meningkat saat sangat dekat (dist < 2) untuk efek menerjang
  let watcherSpeed =
    watcher.state === STATES.CHASE ? (dist < 2 ? 0.026 : 0.02) : 0.012;

  if (watcher.path && watcher.path.length > 0) {
    const nextStep = watcher.path[0];
    const angle = Math.atan2(nextStep.y - watcher.y, nextStep.x - watcher.x);
    watcher.moveAngle = angle;

    moveX = Math.cos(angle) * watcherSpeed;
    moveY = Math.sin(angle) * watcherSpeed;

    if (Math.hypot(nextStep.x - watcher.x, nextStep.y - watcher.y) < 0.2) {
      watcher.path.shift();
    }
  } else if (watcher.state === STATES.PATROL) {
    pickTargetFn(watcher, map, patrolRoute);
  }

  // 4. COLLISION & WALL-HUGGING FIX
  // Gunakan buffer tipis (0.05) saat mengejar agar hantu bisa merapat ke tembok tempat player bersandar
  const currentBuffer = watcher.state === STATES.CHASE ? 0.05 : 0.2;

  if (
    !isSolid(
      map[Math.floor(watcher.y)][
        Math.floor(
          watcher.x + moveX + (moveX > 0 ? currentBuffer : -currentBuffer),
        )
      ],
    )
  ) {
    watcher.x += moveX;
  }
  if (
    !isSolid(
      map[
        Math.floor(
          watcher.y + moveY + (moveY > 0 ? currentBuffer : -currentBuffer),
        )
      ][Math.floor(watcher.x)],
    )
  ) {
    watcher.y += moveY;
  }

  // LOGIKA TERJANGAN (LUNGE): Paksa hantu menempel ke player jika sudah sangat dekat
  // Ini memastikan dist di main.js bisa menyentuh angka < 0.6 meskipun player di pojokan
  if (watcher.state === STATES.CHASE && dist < 1.2) {
    const lungeAngle = Math.atan2(player.y - watcher.y, player.x - watcher.x);
    const lungeX = Math.cos(lungeAngle) * 0.01;
    const lungeY = Math.sin(lungeAngle) * 0.01;

    // Geser hantu pelan-pelan langsung ke arah koordinat player selama tidak menembus tembok solid
    if (!isSolid(map[Math.floor(watcher.y)][Math.floor(watcher.x + lungeX)])) {
      watcher.x += lungeX;
    }
    if (!isSolid(map[Math.floor(watcher.y + lungeY)][Math.floor(watcher.x)])) {
      watcher.y += lungeY;
    }
  }

  return dist;
}
