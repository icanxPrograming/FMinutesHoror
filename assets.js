// assets.js

// --- IMAGE ASSETS ---
export const watcherImg = new Image();
watcherImg.src = "The-Watcher.png";

// --- BACKGROUND & AMBIENT SOUNDS ---
export const backsound = new Audio("Backsound.MP3");
backsound.loop = true;
backsound.volume = 0.5;

export const heartbeat = new Audio("Heartbeat.mp3");
heartbeat.loop = true;
heartbeat.volume = 0;

// --- EFEK PERNAPASAN (BREATHING) ---
export const breathingSound = new Audio("breathing.mp3");
breathingSound.loop = true;
breathingSound.volume = 0; // Mulai dari 0, naikkan saat stamina rendah atau dikejar

// --- EFFECT SOUNDS ---
export const jumpscareSound = new Audio("Jumpscare.mp3");
jumpscareSound.volume = 1.0;

// --- MOVEMENT SOUNDS ---
export const walkSound = new Audio("walk.mp3");
walkSound.loop = true;
walkSound.volume = 0.6;

export const runningSound = new Audio("running.mp3");
runningSound.loop = true;
runningSound.volume = 0.9;

// --- ITEM & OBJECTIVE SOUNDS ---
export const itemPickupSound = new Audio("item_pickup.mp3");
itemPickupSound.volume = 0.8;

export const keyPickupSound = new Audio("key_pickup.mp3");
keyPickupSound.volume = 0.9;

export const noteReadSound = new Audio("note_read.mp3");
noteReadSound.volume = 0.7;

export const openDoorSound = new Audio("open_door.mp3");
openDoorSound.volume = 0.8;

export const lockingDoorSound = new Audio("locking_door.mp3");
lockingDoorSound.volume = 0.7;
