# 🕯️ FIFTEEN MINUTES NIGHTMARE (V.3.0)

**Fifteen Minutes Nightmare** adalah evolusi mutakhir dari game horor psikologis berbasis web yang menggunakan teknik *Retro Raycasting Engine*. Dalam versi **NIGHTMARE** ini, seluruh bantuan navigasi visual telah ditarik, memaksa pemain untuk benar-benar merasakan isolasi, keputusasaan, dan ketakutan di dalam kegelapan yang pekat.

> *"Waktu terus berjalan... dan dia tidak pernah berkedip."*

---

## 🕹️ Fitur Utama (V.3.0)

*   **Atmospheric Realism (No Minimap)**: Minimap telah dihapus sepenuhnya. Pemain kini harus mengandalkan insting, memori spasial lorong, dan teks navigasi jarak adaptif untuk bertahan hidup.
*   **Adaptive Non-Linear Objectives**: Kebebasan penuh untuk mengumpulkan item koleksi (Buku/Artefak) dalam urutan apa pun, selama **Gerbang Catatan (Note-Gated)** pada stage tersebut telah terbuka.
*   **Physical Exit Logic**: Pintu keluar hanya akan terbuka secara fisik jika seluruh objektif di dalam peta telah dikumpulkan. Tidak ada jalan pintas menuju keselamatan.
*   **Dynamic Soundscape**:
    *   **Immersive Footsteps**: Perbedaan audio antara berjalan (`walk.mp3`) dan berlari (`running.mp3`).
    *   **Stress Breathing**: Suara napas berat yang muncul saat stamina di bawah 15% atau saat berada dalam radius pengejaran *The Watcher*.
*   **Stamina & Visual Stress**: Jika stamina habis, pemain otomatis melambat. Kondisi fisik yang lelah memicu efek *noise overlay* dan pandangan kabur (*blur*) secara dinamis.
*   **Honorary Reward System**: Sistem klaim sertifikat dinamis bagi penyintas yang berhasil menyelesaikan game.

---

## 🎮 Mekanik Permainan

1.  **Gerbang Catatan**: Setiap Stage diawali dengan sebuah catatan wajib. Kamu tidak bisa berinteraksi dengan item lain sebelum membaca pesan terlarang ini.
2.  **Eksplorasi & Survival**: Setelah catatan dibaca, kumpulkan seluruh objektif yang tersebar sambil menghindari patroli entitas.
3.  **The Watcher**: Semakin dekat dia, detak jantung pemain akan mengeras, layar akan mulai bergetar, dan *visual noise* akan menutupi pandangan sebagai representasi rasa takut.
4.  **Kontrol**:
    *   **W/A/S/D**: Pergerakan (Kecepatan berkurang drastis saat stamina habis).
    *   **Shift (Hold)**: Berlari (Mengonsumsi Stamina).
    *   **C / CTRL**: Jongkok (Mengurangi suara langkah kaki).
    *   **E**: Interaksi (Membaca, Mengambil item, Membuka Pintu).
    *   **ESC**: Menutup antarmuka kertas petunjuk/catatan.

---

## 🛠️ Arsitektur Kode (Modular)

Game ini dibangun dengan struktur modular untuk memudahkan pengembangan:

*   **`main.js`**: Otak permainan; mengelola transisi stage, manajemen stamina, sinkronisasi audio, dan logika interaksi.
*   **`engine.js`**: *Raycasting Engine* 3D yang dioptimalkan untuk FPS tinggi dengan resolusi render internal adaptif.
*   **`ai.js`**: Perilaku entitas (Patroli A* & *Chase Mode*) yang terintegrasi dengan efek peringatan jarak.
*   **`reward.js`**: Logika pembuatan sertifikat **"PENAKLUK MIMPI BURUK"** secara *real-time* menggunakan HTML5 Canvas.
*   **`config.js`**: Database konfigurasi stage (Library, Basement, Altar) dan daftar objektif.
*   **`assets.js`**: Manajemen aset terpusat untuk tekstur sprite dan 12+ audio atmosferik.

---

## 🚀 Instalasi & Jalankan

Game ini menggunakan **ES6 Modules**. Untuk menghindari isu kebijakan CORS pada browser, Anda wajib menjalankannya melalui server lokal.

1.  **Clone/Download** repositori atau file proyek.
2.  Gunakan **Live Server** di VS Code atau jalankan perintah Python di terminal dalam folder proyek:
    ```bash
    # Jika menggunakan Python 3
    python -m http.server 8000
    ```
3.  Akses melalui browser di: `http://localhost:8000`

---

## 📝 Catatan Pengembang

*   **Audio Stability**: Implementasi pengaman volume `Math.max(0, Math.min(1, vol))` pada seluruh audio dinamis untuk mencegah *IndexSizeError*.
*   **Navigation Fallback**: Sistem navigasi jarak kini bersifat adaptif; otomatis mencari item terdekat yang masih tersisa (Catatan -> Item -> Pintu).
*   **Personalized Reward**: Sertifikat yang dihasilkan menyertakan nama pemain, tanggal penyelesaian, dan gelar kehormatan yang dapat diunduh dalam format PNG.

---

## ⚖️ Lisensi & Kredit

Dibuat oleh **FMinutesXdakochan**.
Dikembangkan untuk para pecinta horor retro dan eksperimen teknologi web.

**"Jangan biarkan dia membawamu ke dalam kegelapan."**
