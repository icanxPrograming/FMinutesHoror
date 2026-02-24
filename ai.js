import { STATES } from "./config.js";

export function pickNewPatrolTarget(watcher, map) {
  let rx, ry;
  const mapHeight = map.length;
  const mapWidth = map[0].length;
  let attempts = 0;

  do {
    rx = Math.floor(Math.random() * mapWidth);
    ry = Math.floor(Math.random() * mapHeight);
    attempts++;
    // Safety break agar tidak infinite loop jika map penuh
    if (attempts > 100) break;
  } while (map[ry][rx] !== 0);

  watcher.targetX = rx + 0.5;
  watcher.targetY = ry + 0.5;
}

export function updateAI(
  watcher,
  player,
  map,
  gameTime,
  inSafeZone,
  pickTargetFn,
) {
  let dist = Math.hypot(watcher.x - player.x, watcher.y - player.y);

  // --- STATE TRANSITION ---
  if (dist < 5 && !inSafeZone) {
    watcher.state = STATES.CHASE;
  }

  let watcherMoveAngle = 0;
  let watcherSpeed = 0;

  if (watcher.state === STATES.CHASE) {
    watcherMoveAngle = Math.atan2(player.y - watcher.y, player.x - watcher.x);
    // Semakin dikit waktu, semakin cepat pengejaran
    watcherSpeed = gameTime < 300 ? 0.03 : 0.02;

    if (inSafeZone || dist > 8) {
      watcher.state = STATES.PATROL;
      pickTargetFn(watcher, map);
    }
  } else {
    // Mode Patroli
    watcherMoveAngle = Math.atan2(
      watcher.targetY - watcher.y,
      watcher.targetX - watcher.x,
    );
    watcherSpeed = 0.015;

    // Cek apakah sampai ke target patroli
    if (
      Math.hypot(watcher.targetX - watcher.x, watcher.targetY - watcher.y) < 0.3
    ) {
      pickTargetFn(watcher, map);
    }
  }

  // --- SMART COLLISION DETECTION (Mencegah AI Macet) ---
  const nextX = watcher.x + Math.cos(watcherMoveAngle) * watcherSpeed;
  const nextY = watcher.y + Math.sin(watcherMoveAngle) * watcherSpeed;

  // Tambahkan buffer jarak dari dinding (0.2) agar sprite tidak menempel dinding
  const buffer = 0.2;

  // Cek sumbu X
  const canMoveX =
    map[Math.floor(watcher.y)][
      Math.floor(nextX + Math.cos(watcherMoveAngle) * buffer)
    ] === 0;
  // Cek sumbu Y
  const canMoveY =
    map[Math.floor(nextY + Math.sin(watcherMoveAngle) * buffer)][
      Math.floor(watcher.x)
    ] === 0;

  if (canMoveX) {
    watcher.x = nextX;
  } else if (watcher.state === STATES.PATROL) {
    // Jika menabrak dinding saat patroli, langsung cari target baru
    pickTargetFn(watcher, map);
  }

  if (canMoveY) {
    watcher.y = nextY;
  } else if (watcher.state === STATES.PATROL) {
    pickTargetFn(watcher, map);
  }

  return dist;
}
