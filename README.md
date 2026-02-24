Tentu, ini adalah draf `README.md` yang profesional dan lengkap, disesuaikan dengan fitur-fitur yang baru saja kita bangun (Raycasting, AI, Quest System, dan Minimap).

---

# FIFTEEN MINUTES REMAINING 🕯️

**Fifteen Minutes Remaining** adalah sebuah game horor psikologis berbasis web yang menggunakan teknik *Retro Raycasting Engine* (seperti Wolfenstein 3D). Pemain terjebak dalam labirin gelap yang bergeser, dikejar oleh entitas misterius bernama **The Watcher**, dan hanya memiliki waktu terbatas untuk melarikan diri.

## 🕹️ Fitur Utama

* **Retro Raycasting Engine**: Grafis 3D klasik yang dirender secara *real-time* menggunakan HTML5 Canvas.
* **Dynamic AI (The Watcher)**: Entitas yang berpatroli dan akan mengejar pemain jika terlihat. Semakin lama waktu berjalan, entitas akan menjadi lebih agresif.
* **Quest Berantai**: Sistem objektif yang mengharuskan pemain menemukan petunjuk (Clues) dan kunci secara berurutan.
* **Minimap & Navigasi**: Sistem radar di pojok layar dan kompas jarak untuk membantu pemain bernavigasi di kegelapan.
* **Mekanik Sanity & Stamina**: Penglihatan pemain akan kabur dan suara detak jantung akan mengeras jika terlalu dekat dengan musuh.

---

## 🎮 Cara Bermain

1. **Tujuan Utama**: Temukan 3 kunci/petunjuk tersembunyi untuk membuka **Pintu Keluar Utama** sebelum waktu 15 menit habis.
2. **Kontrol**:
* **W/A/S/D**: Bergerak dan Berjalan.
* **Mouse**: Melihat sekeliling (Pointer Lock).
* **Shift**: Berlari (Mengonsumsi Stamina).
* **E**: Berinteraksi dengan objek (Kertas/Kunci/Pintu).
* **ESC**: Menutup kertas petunjuk atau keluar dari game.


3. **Safe Zone**: Cari lantai berwarna hijau untuk bersembunyi. The Watcher tidak bisa masuk ke area ini selama *Safe Timer* aktif.

---

## 🛠️ Arsitektur Kode

Game ini dibangun secara modular menggunakan ES6 Modules:

* `index.html`: Struktur UI, bar stamina, sanity, dan container minimap.
* `style.css`: Atmosfer horor, filter *noise*, efek *vignette*, dan animasi *jumpscare*.
* `main.js`: *Game Loop* utama, logika pergerakan pemain, dan manajemen quest.
* `engine.js`: Mesin render 3D (Raycasting), sprite rendering, dan visual minimap.
* `ai.js`: Logika perilaku musuh (Patroli, Chase, dan Collision).
* `config.js`: Pengaturan variabel game, daftar quest, dan desain `MAP` 2D.
* `assets.js`: Manajemen suara (Backsound, Heartbeat) dan gambar sprite.

---

## 🚀 Instalasi & Penggunaan

Karena game ini menggunakan **ES6 Modules**, Anda tidak bisa membukanya langsung via `file://`. Anda perlu menggunakan *Local Server*.

1. Clone atau unduh repository ini.
2. Gunakan **Live Server** di VS Code atau jalankan perintah python di folder project:

## 📝 Catatan Pengembangan

* **Penyelesaian Masalah Visual**: Engine ini menggunakan *clamping* pada tinggi dinding untuk mencegah *overflow* visual saat pemain sangat dekat dengan objek.
* **X-Ray Objective**: Khusus untuk Pintu Keluar, engine akan merender pilar cahaya kuning tembus pandang setelah pemain mengumpulkan seluruh kunci.

---

## ⚖️ Lisensi

Proyek ini dibuat untuk tujuan pembelajaran dan hiburan. Silakan modifikasi kode ini untuk membuat labirin horor Anda sendiri!
