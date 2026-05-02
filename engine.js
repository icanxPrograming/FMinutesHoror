// engine.js

/**
 * Fungsi utama untuk merender dunia 3D
 * Ditambahkan parameter watcherBackImg untuk merender tampak belakang
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
  watcherBackImg,
  gameTime,
  textures,
  handSway, // Parameter baru untuk efek ayunan tangan
) {
  const yOffset = cameraBobY * (canvas.height / 5);
  const depthBuffer = [];

  // 1. RENDER LANGIT-LANGIT & LANTAI
  renderBackground(ctx, canvas, player, textures, yOffset);

  // 2. RAYCASTING UNTUK DINDING
  const rayStep = 0.01;
  for (let i = 0; i < canvas.width; i++) {
    let rayAngle =
      player.dir - currentFOV / 2 + (i / canvas.width) * currentFOV;
    rayAngle += cameraBobX * 0.1;

    let dx = Math.cos(rayAngle);
    let dy = Math.sin(rayAngle);

    let dist = 0;
    let hit = false;
    let wallType = 0;

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
        if (
          cell === 1 ||
          cell === 2 ||
          cell === 3 ||
          cell === 10 ||
          cell === 20
        ) {
          let hitX = testX - tx;
          let hitY = testY - ty;
          let localSide = 0;

          if (Math.abs(hitX - 0) < 0.02 || Math.abs(hitX - 1) < 0.02) {
            localSide = 0;
          } else {
            localSide = 1;
          }

          hit = true;
          wallType = cell;

          if (wallType === 3 && localSide === 0) {
            if (map[ty][tx - 1] === 10 || map[ty][tx + 1] === 10) wallType = 10;
            else if (map[ty][tx - 1] === 20 || map[ty][tx + 1] === 20)
              wallType = 20;
            else wallType = 1;
          }

          drawTexturedColumn(
            ctx,
            i,
            canvas,
            dist,
            rayAngle,
            player,
            wallType,
            localSide === 0 ? hitY : hitX,
            localSide,
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

  // 3. RENDER SPRITES (Watcher, Items, etc)
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
    watcherBackImg,
  );

  // 4. RENDER TANGAN PEMAIN (Weapon/Hand Sway)
  // Digambar paling akhir agar selalu di atas semua objek dunia
  drawPlayerHand(ctx, canvas, player, textures, handSway);
}

// --- FUNGSI BARU UNTUK MENGGAMBAR TANGAN ---
// engine.js

function drawPlayerHand(ctx, canvas, player, textures, handSway) {
  const handImg = textures.sprites["hand"];
  if (!handImg) return;

  const aspectRatio = handImg.width / handImg.height;

  // Ukuran tangan (sesuaikan 0.8 jika dirasa terlalu besar/kecil)
  const handHeight = canvas.height * 0.8;
  const handWidth = handHeight * aspectRatio;

  // --- PERBAIKAN POSISI KE TENGAH ---
  // (canvas.width / 2) - (handWidth / 2) membuat gambar tepat di tengah horizontal
  const posX = canvas.width / 2 - handWidth / 2 + (handSway?.x || 0);

  // Posisi Y tetap di bawah, sedikit naik jika ingin lebih terlihat
  const posY =
    canvas.height -
    handHeight * 0.9 +
    (handSway?.y || 0) +
    (player.isCrouching ? 40 : 0);

  ctx.save();
  // Filter agar tangan terlihat gelap dan menyatu dengan suasana horror
  ctx.filter = "brightness(0.6) contrast(1.2)";

  ctx.drawImage(handImg, posX, posY, handWidth, handHeight);
  ctx.restore();
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

  const sourceX = Math.floor(texX * img.width);
  const drawY = (canvas.height - wallH) / 2 + yOffset;

  ctx.drawImage(img, sourceX, 0, 1, img.height, x, drawY, 1, wallH);

  let opacity = Math.min(0.9, dist / 15);
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  ctx.fillRect(x, drawY, 1, wallH);

  if (side === 1) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(x, drawY, 1, wallH);
  }
}

// Fungsi menggambar lantai dan langit-langit
export function renderBackground(ctx, canvas, player, textures, yOffset) {
  const w = canvas.width;
  const h = canvas.height;
  const halfHeight = h / 2 + yOffset;

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, halfHeight);

  const floorImg = textures?.floors?.floor1;
  if (floorImg && floorImg.complete) {
    const quality = 2;
    for (let y = halfHeight; y < h; y += quality) {
      const p = y - halfHeight;
      if (p === 0) continue;
      const straightDist = h / (2.0 * p);
      const floorX = player.x + Math.cos(player.dir) * straightDist;
      const floorY = player.y + Math.sin(player.dir) * straightDist;

      const texSize = 64;
      const shadow = Math.min(1, straightDist / 10);
      ctx.globalAlpha = 1 - shadow;

      ctx.drawImage(floorImg, 0, 0, floorImg.width, 1, 0, y, w, quality);
    }
    ctx.globalAlpha = 1;
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

// MODIFIKASI: Render Watcher dengan logika Directional
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
  watcherBackImg, // Terima parameter baru
) {
  const sprites = [];

  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      let cell = map[y][x];
      if (
        (cell >= 4 && cell <= 7) ||
        (cell >= 11 && cell <= 18) ||
        (cell >= 21 && cell <= 27)
      ) {
        sprites.push({ x: x + 0.5, y: y + 0.5, type: cell });
      }
    }
  }

  // --- LOGIKA SPRITE DIRECTIONAL UNTUK WATCHER ---
  // 1. Hitung sudut antara Watcher ke Player
  const dxW = player.x - watcher.x;
  const dyW = player.y - watcher.y;
  const angleToPlayer = Math.atan2(dyW, dxW);

  // 2. Bandingkan dengan arah hadap Watcher (moveAngle dari AI)
  // watcher.moveAngle adalah arah hantu berjalan
  let viewDiff = watcher.moveAngle - angleToPlayer;

  // Normalisasi sudut ke -PI sampai PI
  while (viewDiff < -Math.PI) viewDiff += Math.PI * 2;
  while (viewDiff > Math.PI) viewDiff -= Math.PI * 2;

  // 3. Jika selisih sudut kecil (kurang dari 90 derajat), berarti hantu membelakangi kita
  const isBackView = Math.abs(viewDiff) > Math.PI / 2;

  sprites.push({
    x: watcher.x,
    y: watcher.y,
    type: "WATCHER",
    img: isBackView ? watcherBackImg : watcherImg, // Pilih gambar sesuai sudut
  });

  sprites.sort((a, b) => {
    let distA = Math.hypot(a.x - player.x, a.y - player.y);
    let distB = Math.hypot(b.x - player.x, b.y - player.y);
    return distB - distA;
  });

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

      const depthBias = 0.2;

      if (
        screenX >= 0 &&
        screenX < canvas.width &&
        depthBuffer[screenX] + depthBias > dist
      ) {
        let img = s.type === "WATCHER" ? s.img : textures.sprites[s.type];

        if (img) {
          let spriteY = (canvas.height - sh) / 2 + yOffset;
          if (s.type === 4) spriteY += sh * 0.1;

          ctx.drawImage(img, sx - sh / 2, spriteY, sh, sh);
        }
      }
    }
  });
}
