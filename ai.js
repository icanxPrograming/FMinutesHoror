import { STATES } from "./config.js";

const SAFE_ZONE_BUFFER = 5;
const DETECTION_RADIUS = 7;
const CHASE_MAX_RADIUS = 12;

// 1. Raycast LOS tetap sama
export function canSeePlayer(watcher, player, map) {
  const dx = player.x - watcher.x;
  const dy = player.y - watcher.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 10) return false;

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
    if (map[checkY][checkX] === 1) return false;
  }
  return true;
}

export function isPlayerInFront(watcher, player, watcherDir) {
  const angleToPlayer = Math.atan2(player.y - watcher.y, player.x - watcher.x);
  let angleDiff = angleToPlayer - watcherDir;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  return Math.abs(angleDiff) < Math.PI / 1.8;
}

// --- PERBAIKAN PATROL ROUTE (Jangkauan lebih luas) ---
export function generatePatrolRoute(map) {
  const route = [];
  const mapHeight = map.length;
  const mapWidth = map[0].length;

  // Kita ambil titik setiap 3 atau 4 blok agar daftar rute tidak terlalu padat
  // namun tersebar merata di seluruh map
  for (let y = 1; y < mapHeight - 1; y += 2) {
    for (let x = 1; x < mapWidth - 1; x += 2) {
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

// --- PERBAIKAN PICK TARGET (Loncat antar titik jauh) ---
export function pickNewPatrolTarget(watcher, map, patrolRoute = null) {
  if (patrolRoute && patrolRoute.length > 0) {
    // Alih-alih urut +1, kita loncat (misal +5 atau angka acak)
    // supaya Watcher berpindah dari ujung koridor ke ujung lainnya
    const jump = Math.floor(Math.random() * 5) + 3;
    if (watcher.lastPatrolIndex === undefined) watcher.lastPatrolIndex = 0;

    watcher.lastPatrolIndex =
      (watcher.lastPatrolIndex + jump) % patrolRoute.length;
    const target = patrolRoute[watcher.lastPatrolIndex];

    watcher.targetX = target.x;
    watcher.targetY = target.y;
  } else {
    // Fallback random yang lebih agresif mencari koordinat jauh
    let rx, ry;
    let attempts = 0;
    do {
      rx = Math.floor(Math.random() * (map[0].length - 2)) + 1;
      ry = Math.floor(Math.random() * (map.length - 2)) + 1;
      attempts++;
    } while (
      attempts < 100 &&
      (map[ry][rx] !== 0 || Math.hypot(rx - 1.5, ry - 1.5) < SAFE_ZONE_BUFFER)
    );

    watcher.targetX = rx + 0.5;
    watcher.targetY = ry + 0.5;
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
  const inFront = isPlayerInFront(watcher, player, watcher.moveAngle || 0);

  // State Logic
  if (playerIsSafe) {
    if (watcher.state === STATES.CHASE) {
      watcher.state = STATES.PATROL;
      pickTargetFn(watcher, map, patrolRoute);
    }
  } else {
    if (watcher.state === STATES.CHASE) {
      if (dist > CHASE_MAX_RADIUS) {
        watcher.state = STATES.PATROL;
        pickTargetFn(watcher, map, patrolRoute);
      }
    } else if (canSee && inFront) {
      watcher.state = STATES.CHASE;
    }
  }

  let watcherMoveAngle = 0;
  let watcherSpeed = 0;

  if (watcher.state === STATES.CHASE) {
    watcherMoveAngle = Math.atan2(player.y - watcher.y, player.x - watcher.x);
    watcherSpeed = dist < 4 ? 0.025 : dist < DETECTION_RADIUS ? 0.02 : 0.01;
  } else {
    watcherMoveAngle = Math.atan2(
      watcher.targetY - watcher.y,
      watcher.targetX - watcher.x,
    );
    watcherSpeed = 0.012;

    if (
      Math.hypot(watcher.targetX - watcher.x, watcher.targetY - watcher.y) < 0.5
    ) {
      pickTargetFn(watcher, map, patrolRoute);
    }
  }

  watcher.moveAngle = watcherMoveAngle;

  // --- PERBAIKAN COLLISION (Sliding Movement) ---
  // Menggunakan buffer yang lebih dinamis agar Watcher bisa "menggelincir" di tembok
  const cosA = Math.cos(watcherMoveAngle);
  const sinA = Math.sin(watcherMoveAngle);
  const wallBuffer = 0.3; // Jarak aman dari pusat Watcher ke tembok

  // Cek per sumbu secara terpisah untuk memungkinkan sliding
  const nextX = watcher.x + cosA * watcherSpeed;
  const nextY = watcher.y + sinA * watcherSpeed;

  // Cek tabrakan di sumbu X
  const checkX = nextX + (cosA > 0 ? wallBuffer : -wallBuffer);
  if (map[Math.floor(watcher.y)][Math.floor(checkX)] === 0) {
    watcher.x = nextX;
  } else if (watcher.state === STATES.PATROL) {
    // Jika patroli mentok tembok, cari target baru lebih cepat
    pickTargetFn(watcher, map, patrolRoute);
  }

  // Cek tabrakan di sumbu Y
  const checkY = nextY + (sinA > 0 ? wallBuffer : -wallBuffer);
  if (map[Math.floor(checkY)][Math.floor(watcher.x)] === 0) {
    watcher.y = nextY;
  } else if (watcher.state === STATES.PATROL) {
    pickTargetFn(watcher, map, patrolRoute);
  }

  return dist;
}
