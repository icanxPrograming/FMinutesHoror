// engine.js

/**
 * Fungsi utama untuk merender dunia 3D
 * textures: Object berisi { walls: { 1: img, 2: img, 3: img }, floors: { floor1: img, floor2: img }, sprites: { 4: img... } }
 */
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
  textures, // Objek gambar yang sudah dimuat
) {
  const yOffset = cameraBobY * (canvas.height / 5);
  const depthBuffer = [];

  // 1. RENDER LANGIT-LANGIT & LANTAI (Textured)
  // Jika aset lantai belum dimuat, gunakan fallback warna
  renderBackground(ctx, canvas, player, textures, yOffset);

  // 2. RAYCASTING UNTUK DINDING
  const rayStep = 0.01; // Langkah lebih kecil untuk akurasi tekstur

  for (let i = 0; i < canvas.width; i++) {
    let rayAngle =
      player.dir - currentFOV / 2 + (i / canvas.width) * currentFOV;
    rayAngle += cameraBobX * 0.1;

    let dx = Math.cos(rayAngle);
    let dy = Math.sin(rayAngle);

    let dist = 0;
    let hit = false;
    let wallType = 0;
    let side = 0; // 0 untuk vertikal, 1 untuk horizontal (untuk shading)

    // DDA atau Simple Raycast
    while (!hit && dist < 32) {
      dist += rayStep;
      let testX = player.x + dx * dist;
      let testY = player.y + dy * dist;

      let tx = Math.floor(testX);
      let ty = Math.floor(testY);

      if (ty < 0 || ty >= map.length || tx < 0 || tx >= map[0].length) {
        hit = true;
        dist = 32;
      } else {
        let cell = map[ty][tx];
        if (cell > 0 && cell <= 3) {
          // Sembunyikan pintu keluar (3) jika quest belum siap
          if (cell === 3 && questStep < 3) continue;

          // --- LOGIKA ANTI-DUPLIKASI PINTU ---
          let hitX = testX - tx;
          let hitY = testY - ty;
          let texX = 0;
          let localSide = 0;

          // Tentukan sisi mana yang tertabrak
          if (Math.abs(hitX - 0) < 0.02 || Math.abs(hitX - 1) < 0.02) {
            texX = hitY;
            localSide = 0; // Sisi Vertikal (Kiri/Kanan blok)
          } else {
            texX = hitX;
            localSide = 1; // Sisi Horizontal (Depan/Belakang blok)
          }

          hit = true;
          wallType = cell;

          // JIKA ini adalah Pintu (3), tapi ray menabrak sisi samping (localSide === 0),
          // ubah wallType menjadi Tembok Biasa (1)
          if (wallType === 3 && localSide === 0) {
            wallType = 1;
          }

          drawTexturedColumn(
            ctx,
            i,
            canvas,
            dist,
            rayAngle,
            player,
            wallType,
            texX,
            localSide, // gunakan variabel side lokal
            yOffset,
            textures,
          );
        }
      }
    }

    let correctedDist =
      dist * Math.cos(rayAngle - (player.dir + cameraBobX * 0.1));
    depthBuffer[i] = correctedDist;
  }

  // 3. RENDER SPRITES (Kunci, Note, Lampu, Watcher)
  renderSprites(
    ctx,
    canvas,
    player,
    map,
    currentFOV,
    depthBuffer,
    yOffset,
    textures,
    watcher,
    watcherImg,
    gameTime,
  );
}

// Fungsi menggambar kolom dinding dengan tekstur
function drawTexturedColumn(
  ctx,
  x,
  canvas,
  dist,
  rayAngle,
  player,
  wallType,
  texX,
  side,
  yOffset,
  textures,
) {
  let correctedDist = dist * Math.cos(rayAngle - player.dir);
  if (correctedDist < 0.1) correctedDist = 0.1;

  let wallH = canvas.height / correctedDist;
  if (wallH > canvas.height * 3) wallH = canvas.height * 3;

  const img = textures.walls[wallType];
  if (!img) return;

  // Ambil potongan gambar secara vertikal
  const sourceX = Math.floor(texX * img.width);
  const drawY = (canvas.height - wallH) / 2 + yOffset;

  ctx.drawImage(
    img,
    sourceX,
    0,
    1,
    img.height, // Source: ambil 1 pixel lebar
    x,
    drawY,
    1,
    wallH, // Destination
  );

  // DEPTH SHADING: Gelapkan dinding berdasarkan jarak
  let opacity = Math.min(0.9, dist / 15);
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  ctx.fillRect(x, drawY, 1, wallH);

  // SIDE SHADING: Beri bayangan tambahan pada sisi samping agar terlihat 3D
  if (side === 1) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(x, drawY, 1, wallH);
  }
}

// Fungsi menggambar lantai dan langit-langit (Background)
// engine.js

export function renderBackground(ctx, canvas, player, textures, yOffset) {
  const w = canvas.width;
  const h = canvas.height;
  const halfHeight = h / 2 + yOffset;

  // 1. ATAP (Tetap solid agar hemat performa)
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, halfHeight);

  // 2. LANTAI (Metode Scanline yang Sinkron)
  const floorImg = textures?.floors?.floor1;
  if (floorImg && floorImg.complete) {
    // Kita tidak menggambar per-pixel (berat), tapi per-baris (scanline)
    // Semakin sedikit jumlah baris, semakin ringan
    const quality = 2; // Naikkan ke 4 atau 8 jika masih berat (semakin besar semakin ringan tapi pecah)

    for (let y = halfHeight; y < h; y += quality) {
      // Hitung jarak horizontal dari kamera ke titik di lantai pada baris Y ini
      // Formula: distance = height / (pixel_y - center_y)
      const p = y - halfHeight;
      if (p === 0) continue;

      const straightDist = h / (2.0 * p);

      // Hitung posisi lantai di dunia (World Coordinates)
      const floorX = player.x + Math.cos(player.dir) * straightDist;
      const floorY = player.y + Math.sin(player.dir) * straightDist;

      // Kita gunakan potongan tipis dari tekstur
      // Agar ringan, kita gunakan drawImage untuk "meregangkan" satu baris pattern
      const texSize = 64; // Ukuran ubin
      const tx = (floorX * texSize) % floorImg.width;
      const ty = (floorY * texSize) % floorImg.height;

      // Efek shading: semakin jauh semakin gelap
      const shadow = Math.min(1, straightDist / 10);
      ctx.globalAlpha = 1 - shadow;

      ctx.drawImage(
        floorImg,
        0,
        0,
        floorImg.width,
        1, // Ambil satu baris pixel (dummy logic)
        0,
        y,
        w,
        quality, // Gambar melintangi layar
      );
    }
    ctx.globalAlpha = 1;

    // Tambahkan gradien penutup agar lantai tidak terlihat "belang"
    const grad = ctx.createLinearGradient(0, halfHeight, 0, h);
    grad.addColorStop(0, "black");
    grad.addColorStop(0.5, "rgba(0,0,0,0.5)");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, halfHeight, w, h - halfHeight);
  } else {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, halfHeight, w, h - halfHeight);
  }
}

// Gabungan render Watcher dan Sprite Objektif (Kunci, Note, dll)
function renderSprites(
  ctx,
  canvas,
  player,
  map,
  FOV,
  depthBuffer,
  yOffset,
  textures,
  watcher,
  watcherImg,
  gameTime,
) {
  const sprites = [];

  // 1. Scan map untuk mencari objek (4, 5, 6, 7)
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      let cell = map[y][x];
      if (cell >= 4 && cell <= 7) {
        sprites.push({ x: x + 0.5, y: y + 0.5, type: cell });
      }
    }
  }

  // 2. Tambahkan Watcher ke daftar sprite
  sprites.push({
    x: watcher.x,
    y: watcher.y,
    type: "WATCHER",
    img: watcherImg,
  });

  // 3. Urutkan sprite dari yang terjauh (Penting agar render tidak tumpang tindih)
  sprites.sort((a, b) => {
    let distA = Math.hypot(a.x - player.x, a.y - player.y);
    let distB = Math.hypot(b.x - player.x, b.y - player.y);
    return distB - distA;
  });

  // 4. Gambar Sprite
  // engine.js - Di dalam fungsi renderSprites

  sprites.forEach((s) => {
    let dx = s.x - player.x;
    let dy = s.y - player.y;
    let dist = Math.hypot(dx, dy);

    let spriteAngle = Math.atan2(dy, dx) - player.dir;
    while (spriteAngle < -Math.PI) spriteAngle += Math.PI * 2;
    while (spriteAngle > Math.PI) spriteAngle -= Math.PI * 2;

    if (Math.abs(spriteAngle) < FOV) {
      let sx = (0.5 * (spriteAngle / (FOV / 2)) + 0.5) * canvas.width;
      let sh = canvas.height / dist;
      let screenX = Math.floor(sx);

      // --- PERBAIKAN: DEPTH CHECK DENGAN BIAS ---
      // Kita kurangi jarak sprite sebesar 0.2 unit agar "menang" melawan Z-Buffer tembok
      const depthBias = 0.2;

      if (
        screenX >= 0 &&
        screenX < canvas.width &&
        depthBuffer[screenX] + depthBias > dist
      ) {
        let img = s.type === "WATCHER" ? s.img : textures.sprites[s.type];

        if (img) {
          // Atur posisi Y agar note tidak tenggelam ke lantai
          // yOffset adalah efek bobbing kamera
          let spriteY = (canvas.height - sh) / 2 + yOffset;

          // Jika itu Note (4), kita bisa turunkan sedikit agar terlihat menempel dinding bawah
          if (s.type === 4) spriteY += sh * 0.1;

          ctx.drawImage(img, sx - sh / 2, spriteY, sh, sh);
        }
      }
    }
  });
}

export function drawMinimap(canvas, player, map, questStep) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width; // Biasakan canvas minimap berbentuk square
  const cellSize = size / map.length;

  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      let cell = map[y][x];
      if (cell === 1) {
        ctx.fillStyle = "#333";
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      } else if (cell === 2) {
        ctx.fillStyle = "#1a331a";
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      } else if (cell === 3) {
        ctx.fillStyle = "#440";
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  // Player
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(
    player.x * cellSize,
    player.y * cellSize,
    cellSize * 0.8,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}
