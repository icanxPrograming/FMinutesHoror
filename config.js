// config.js
export const CAMERA_SETTINGS = {
  BASE_WIDTH: 1280,
  BASE_HEIGHT: 720,
  FOV: Math.PI / 1.8,
  RESOLUTION: 2,
};

export const STATES = { PATROL: "PATROL", CHASE: "CHASE" };

// 1. DEFINISI TEKSTUR TEMBOK
export const TEXTURES = {
  1: { src: "assets/wall/wall.png", type: "WALL" }, // Tembok Utama
  // Stage 2
  10: { src: "assets/wall/wall2.png", type: "WALL_S2" },
  // Stage 3
  20: { src: "assets/wall/wall3.png", type: "WALL_S3" },
  2: { src: "assets/wall/wallsave.jpg", type: "SAFE" }, // Tembok Save Zone
  3: { src: "assets/sprites/door.png", type: "EXIT" }, // Pintu Keluar (Menggunakan aset door)
};

// 2. DEFINISI LANTAI (Opsional: Bisa dipetakan di renderer nanti)
export const FLOOR_TEXTURES = {
  LIGHT: "assets/floor/floor1.png",
  DARK: "assets/floor/floor2.png",
};

// 3. DEFINISI SPRITE/OBJEK (Objek interaktif)
export const SPRITE_ASSETS = {
  // Universal/Disclaimer
  4: {
    src: "assets/sprites/note.png",
    id: "note_clue",
    name: "Catatan Petunjuk",
  },
  5: { src: "assets/sprites/key.png", id: "key_archive", name: "Kunci Arsip" },
  6: { src: "assets/sprites/key.png", id: "key_main", name: "Kunci Utama" },
  7: {
    src: "assets/sprites/lamp.png",
    id: "decor_lamp",
    name: "Lampu Dinding",
  }, // Tambahan dekorasi

  // Stage 2 (Books 1-7 + Key 2)
  11: { src: "assets/sprites/book1.png", id: "book_1" },
  12: { src: "assets/sprites/book2.png", id: "book_2" },
  13: { src: "assets/sprites/book3.png", id: "book_3" },
  14: { src: "assets/sprites/book4.png", id: "book_4" },
  15: { src: "assets/sprites/book5.png", id: "book_5" },
  16: { src: "assets/sprites/book6.png", id: "book_6" },
  17: { src: "assets/sprites/book7.png", id: "book_7" },
  18: {
    src: "assets/sprites/key2.png",
    id: "key_stage2",
    name: "Kunci Basement",
  },

  // Stage 3 (Artifacts 1-5 + 2 Keys)
  21: { src: "assets/sprites/artifact1.png", id: "art_1" },
  22: { src: "assets/sprites/artifact2.png", id: "art_2" },
  23: { src: "assets/sprites/artifact3.png", id: "art_3" },
  24: { src: "assets/sprites/artifact4.png", id: "art_4" },
  25: { src: "assets/sprites/artifact5.png", id: "art_5" },
  26: { src: "assets/sprites/key.png", id: "key_s3_1" },
  27: { src: "assets/sprites/key2.png", id: "key_s3_2" },
};

export const MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1], // 4 = Note di lantai
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 5, 0, 0, 0, 1, 0, 1], // 5 = Key
  [1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 1, 0, 0, 0, 0, 1], // 6 = Key
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 3, 0, 1], // PINTU EXIT
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// Stage 2: Perpustakaan Labirin (Gunakan Tembok ID 10)
export const MAP_STAGE_2 = [
  [
    10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
    10,
  ],
  [10, 0, 0, 0, 4, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10], // 4: Note Disclaimer
  [10, 0, 10, 10, 10, 10, 10, 10, 0, 10, 0, 10, 10, 10, 10, 10, 10, 10, 0, 10],
  [10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 10, 0, 10], // 11, 12: Books
  [10, 10, 10, 10, 0, 10, 10, 10, 10, 10, 10, 10, 10, 0, 10, 10, 0, 10, 0, 10],
  [10, 0, 0, 0, 0, 13, 0, 0, 0, 0, 0, 0, 14, 0, 0, 0, 0, 10, 0, 10], // 13, 14: Books
  [10, 0, 10, 10, 10, 10, 10, 10, 10, 0, 10, 10, 10, 10, 10, 10, 0, 0, 0, 10],
  [10, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 10, 0, 10], // 15, 16: Books
  [10, 10, 10, 10, 10, 10, 0, 10, 10, 10, 10, 10, 0, 10, 10, 10, 10, 10, 0, 10],
  [10, 0, 0, 0, 0, 0, 0, 17, 0, 0, 0, 18, 0, 0, 0, 0, 0, 0, 0, 10], // 17: Book, 18: Key 2
  [
    10, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 3,
    10,
  ], // 3: Exit
  [
    10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
    10,
  ],
];

// Stage 3: Kuil Artefak (Gunakan Tembok ID 20)
export const MAP_STAGE_3 = [
  [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
  [20, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 20], // 4: Note
  [20, 0, 20, 20, 20, 0, 20, 0, 20, 20, 20, 0, 20, 0, 20],
  [20, 21, 0, 26, 20, 0, 20, 0, 20, 27, 0, 22, 20, 0, 20], // 21, 26, 27, 22: Art & Keys
  [20, 20, 20, 0, 20, 24, 0, 0, 20, 0, 20, 20, 20, 0, 20],
  [20, 0, 0, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 20],
  [20, 0, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 0, 20],
  [20, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 0, 0, 20], // 23, 24, 25: Artifacts
  [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 3, 20], // 3: Exit
  [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
];

// config.js

export const QUEST_LIST = [
  // --- STAGE 1: THE ARCHIVE ---
  {
    id: 1,
    text: "Baca Pesan Tersembunyi",
    type: "CLUE",
    spriteId: 4,
    stage: 1,
  },
  { id: 2, text: "Cari Kunci Cadangan", type: "KEY", spriteId: 5, stage: 1 },
  {
    id: 3,
    text: "Ambil Kunci Pintu Utama",
    type: "KEY",
    spriteId: 6,
    stage: 1,
  },
  { id: 4, text: "Cari Pintu Keluar", type: "EXIT", wallId: 3, stage: 1 },

  // --- STAGE 2: THE LIBRARY (Books 1-7) ---
  { id: 5, text: "Baca Potongan Pesan", type: "CLUE", spriteId: 4, stage: 2 },
  {
    id: 6,
    text: "Kumpulkan 7 Catatan Sihir",
    type: "COLLECT",
    spriteIds: [11, 12, 13, 14, 15, 16, 17],
    stage: 2,
  },
  { id: 7, text: "Ambil Kunci Basement", type: "KEY", spriteId: 18, stage: 2 },
  {
    id: 8,
    text: "Keluar dari Basement",
    type: "EXIT",
    wallId: 3,
    stage: 2,
  },

  // --- STAGE 3: THE TEMPLE (Artifacts 1-5) ---
  // --- STAGE 3: THE TEMPLE ---
  {
    id: 9,
    text: "Baca Peringatan Terakhir",
    type: "CLUE",
    spriteId: 4,
    stage: 3,
  },
  {
    id: 10,
    text: "Kumpulkan 5 Artefak Kuno",
    type: "COLLECT",
    spriteIds: [21, 22, 23, 24, 25],
    stage: 3,
  },
  // Kunci dipisah agar spawn bertahap
  {
    id: 11,
    text: "Cari Kunci Segel Pertama",
    type: "KEY",
    spriteId: 26,
    stage: 3,
  },
  {
    id: 12,
    text: "Cari Kunci Segel Kedua",
    type: "KEY",
    spriteId: 27,
    stage: 3,
  },
  { id: 13, text: "Keluar dari Kuil", type: "EXIT", wallId: 3, stage: 3 },
];
