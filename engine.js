export function render(
  ctx,
  canvas,
  player,
  watcher,
  map,
  currentFOV,
  cameraBobX,
  cameraBobY,
  questStep,
  isSafeTimerActive,
  safeZoneTime,
  watcherImg,
  gameTime,
) {
  // 1. Gambar Langit-langit & Lantai
  // +2px pada langit-langit untuk memastikan tidak ada celah di garis cakrawala
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2 + 2);
  ctx.fillStyle = "#0a0a07";
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

  const depthBuffer = [];
  ctx.lineWidth = 1.5;
  const yOffset = cameraBobY * (canvas.height / 5);
  const rayStep = 0.02;

  for (let i = 0; i < canvas.width; i++) {
    let rayAngle =
      player.dir - currentFOV / 2 + (i / canvas.width) * currentFOV;
    rayAngle += cameraBobX * 0.1;

    let dist = 0,
      hit = false,
      wallType = 0;
    let dx = Math.cos(rayAngle),
      dy = Math.sin(rayAngle);

    while (!hit && dist < 32) {
      dist += rayStep;
      let tx = Math.floor(player.x + dx * dist);
      let ty = Math.floor(player.y + dy * dist);

      if (ty < 0 || ty >= map.length || tx < 0 || tx >= map[0].length) {
        hit = true;
        dist = 32;
      } else if (map[ty][tx] > 0) {
        if (map[ty][tx] === 3 && questStep < 3) {
          continue;
        }
        hit = true;
        wallType = map[ty][tx];
      }
    }

    let correctedDist =
      dist * Math.cos(rayAngle - (player.dir + cameraBobX * 0.1));

    // PERBAIKAN: Cegah pembagian dengan nol atau angka terlalu kecil yang bikin overflow
    if (correctedDist < 0.05) correctedDist = 0.05;
    depthBuffer[i] = correctedDist;

    let wallH = canvas.height / correctedDist;

    if ([4, 5, 6].includes(wallType)) {
      ctx.lineWidth = 3; // Lebih tebal agar menonjol
      // Sedikit menaikkan wallH agar terlihat lebih tinggi/besar dari tembok biasa
      wallH *= 1.05;
    } else {
      ctx.lineWidth = 1.5;
    }

    // PERBAIKAN: Batasi tinggi maksimal dinding agar tidak muncul kotak pecah di atas layar
    if (wallH > canvas.height * 2.5) wallH = canvas.height * 2.5;

    let shade = Math.min(255, 300 / correctedDist);

    // --- SISTEM PEWARNAAN ---
    if (wallType === 4) {
      ctx.strokeStyle = "#ff0000";

      // Tambahkan efek bayangan cahaya (glow) jika browser mendukung
      ctx.shadowBlur = 10;
      ctx.shadowColor = "red";
    } else if (wallType === 5) {
      ctx.strokeStyle = `rgb(0, ${shade}, 255)`;
    } else if (wallType === 6) {
      ctx.strokeStyle = `rgb(0, 255, ${shade})`;
    } else if (wallType === 3) {
      let glow = Math.sin(Date.now() / 200) * 50 + 200;
      ctx.strokeStyle = `rgb(${glow}, ${glow}, 0)`;
    } else if (wallType === 2) {
      ctx.strokeStyle =
        isSafeTimerActive && safeZoneTime > 0
          ? `rgb(0, ${shade}, 0)`
          : `rgb(${shade / 3}, ${shade / 3}, ${shade / 3})`;
    } else {
      ctx.shadowBlur = 0; // Matikan glow untuk dinding biasa
      let shade = Math.min(255, 300 / correctedDist);
      ctx.strokeStyle = `rgb(${shade * 0.8}, ${shade * 0.7}, ${shade * 0.6})`;
    }

    // GAMBAR GARIS DINDING
    ctx.beginPath();
    // -1 dan +1 pada Y koordinat untuk memastikan garis benar-benar rapat
    ctx.moveTo(i, (canvas.height - wallH) / 2 + yOffset - 1);
    ctx.lineTo(i, (canvas.height + wallH) / 2 + yOffset + 1);
    ctx.stroke();
  }

  renderWatcherSprite(
    ctx,
    canvas,
    player,
    watcher,
    currentFOV,
    depthBuffer,
    yOffset,
    watcherImg,
    gameTime,
  );
}

function renderWatcherSprite(
  ctx,
  canvas,
  player,
  watcher,
  FOV,
  depthBuffer,
  yOffset,
  watcherImg,
  gameTime,
) {
  let spriteDir =
    Math.atan2(watcher.y - player.y, watcher.x - player.x) - player.dir;
  while (spriteDir < -Math.PI) spriteDir += Math.PI * 2;
  while (spriteDir > Math.PI) spriteDir -= Math.PI * 2;

  let sDist = Math.hypot(watcher.x - player.x, watcher.y - player.y);

  if (Math.abs(spriteDir) < FOV / 2 && sDist < 16) {
    let sx = (0.5 * (spriteDir / (FOV / 2)) + 0.5) * canvas.width;
    let sh = canvas.height / sDist;
    let screenIdx = Math.floor(sx);
    if (screenIdx >= 0 && screenIdx < depthBuffer.length) {
      if (depthBuffer[screenIdx] > sDist) {
        ctx.drawImage(
          watcherImg,
          sx - sh / 2,
          (canvas.height - sh) / 2 + yOffset,
          sh,
          sh,
        );
        if (gameTime < 300) {
          ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
          ctx.fillRect(sx - sh / 2, (canvas.height - sh) / 2 + yOffset, sh, sh);
        }
      }
    }
  }
}

// engine.js - Tambahkan fungsi ini di bagian bawah
export function drawMinimap(canvas, player, map, questStep) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const cellSize = size / map.length;

  // Bersihkan background minimap
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, size, size);

  // 1. Gambar Dinding (Map)
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      let cell = map[y][x];
      if (cell === 1) {
        ctx.fillStyle = "#444"; // Dinding biasa
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      } else if (cell === 2) {
        ctx.fillStyle = "rgba(0, 255, 0, 0.2)"; // Safe zone
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }

      // 2. Gambar Lokasi Quest yang Aktif
      let targetID = [4, 5, 6, 3][questStep];
      if (cell === targetID) {
        // Efek berkedip untuk target
        let blink = Math.sin(Date.now() / 150) > 0;
        ctx.fillStyle = blink
          ? cell === 4
            ? "#f00"
            : cell === 3
              ? "#ff0"
              : "#0af"
          : "#222";
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  // 3. Gambar Player (Titik Merah)
  ctx.save();
  ctx.translate(player.x * cellSize, player.y * cellSize);
  ctx.rotate(player.dir);

  // Badan player
  ctx.fillStyle = "#ff0000";
  ctx.beginPath();
  ctx.arc(0, 0, cellSize * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Arah pandang (line)
  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(cellSize, 0);
  ctx.stroke();
  ctx.restore();
}
