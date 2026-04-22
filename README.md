Tentu! Ini adalah versi **README.md** yang telah diperbarui ke **V.2.0**. Versi ini mencerminkan perubahan mekanik terbaru yang telah kita buat: penghilangan minimap untuk atmosfer yang lebih menantang, sistem objektif non-linear yang terkunci oleh catatan (Note-Gated), serta penambahan efek audio pernapasan dan visual stamina yang lebih realistis.

---

# 🕯️ FIFTEEN MINUTES V.2.0: THE SILENT LABYRINTH

**Fifteen Minutes V.2.0** adalah evolusi dari game horor psikologis berbasis web yang menggunakan teknik *Retro Raycasting Engine*. Dalam versi ini, bantuan navigasi visual telah ditarik, memaksa pemain untuk benar-benar merasakan isolasi dan ketakutan di dalam kegelapan yang pekat.

## 🕹️ Fitur Utama (V.2.0)

* **Atmospheric Realism (No Minimap)**: Minimap telah dihapus sepenuhnya. Pemain kini harus mengandalkan insting, hafal lorong, dan teks navigasi jarak untuk bertahan hidup.
* **Adaptive Non-Linear Objectives**: Pemain kini memiliki kebebasan untuk mengambil kunci atau item koleksi (Buku/Artefak) dalam urutan apa pun, selama **Note (Catatan)** di stage tersebut telah dibaca.
* **Physical Exit Logic**: Pintu keluar hanya akan terbuka secara fisik jika seluruh item di dalam peta telah dikumpulkan. Tidak ada jalan pintas.
* **Dynamic Soundscape**:
    * **Footsteps**: Perbedaan suara antara berjalan (`walk.mp3`) dan berlari (`running.mp3`).
    * **Breathing**: Suara napas berat yang muncul saat stamina di bawah 15% atau saat dikejar oleh The Watcher.
* **Stamina & Visual Stress**: Jika stamina habis, pemain otomatis melambat. Stamina rendah juga memicu efek *noise overlay* dan pandangan kabur (*blur*) karena kelelahan.

---

## 🎮 Mekanik Permainan

1.  **Gerbang Catatan (Note-Gated)**: Setiap Stage diawali dengan sebuah catatan wajib. Kamu tidak bisa berinteraksi dengan item lain sebelum membaca catatan ini.
2.  **Eksplorasi Bebas**: Setelah catatan dibaca, kumpulkan seluruh objektif yang tersebar.
3.  **The Watcher**: Semakin dekat dia, detak jantungmu akan mengeras, layar akan mulai bergetar, dan *noise* visual akan menutupi pandanganmu.
4.  **Kontrol**:
    * **W/A/S/D**: Pergerakan (Kecepatan berkurang saat stamina habis).
    * **Shift (Hold)**: Berlari (Mengonsumsi Stamina).
    * **E**: Interaksi (Membaca, Mengambil item, Membuka Pintu).
    * **ESC**: Menutup antarmuka kertas petunjuk.

---

## 🛠️ Arsitektur Kode (Modular)

* `main.js`: Logika transisi stage (V.2.0), manajemen stamina, audio sinkronisasi, dan deteksi interaksi objektif.
* `engine.js`: Render Raycasting 3D yang dioptimalkan untuk FPS tinggi dengan resolusi render internal 50%.
* `ai.js`: Perilaku entitas (Patroli A* & Chase Mode) yang terintegrasi dengan efek peringatan jarak.
* `config.js`: Definisi 3 Stage unik (Library, Basement, Altar) dan database objektif `QUEST_LIST`.
* `assets.js`: Pusat manajemen 12+ aset audio dan sprite tekstur.

---

## 🚀 Instalasi & Jalankan

Game ini menggunakan **ES6 Modules**. Pastikan Anda menjalankan melalui server lokal untuk menghindari isu CORS.

1.  Clone/Download file.
2.  Gunakan **Live Server** di VS Code atau jalankan perintah berikut di terminal:
    ```bash
    # Python 3
    python -m http.server 8000
    ```
3.  Buka `http://localhost:8000` di browser Anda.

---

## 📝 Catatan Versi 2.0 (Developer Notes)

* **Audio Stability**: Perbaikan pada *IndexSizeError* volume suara dengan implementasi `Math.max(0, Math.min(1, vol))` pada seluruh audio dinamis.
* **Navigation Fallback**: Sistem navigasi jarak kini bersifat adaptif; ia akan otomatis mencari item terdekat yang masih tersisa di peta (Buku -> Kunci -> Pintu).
* **Optimasi Visual**: Penggunaan *Noise Overlay* yang lebih halus dan sinkron dengan status stamina pemain untuk meningkatkan imersi horor.

---

## ⚖️ Lisensi & Kredit

Dibuat untuk para pecinta horor retro. Gunakan kode ini untuk membangun mimpi burukmu sendiri.

**"Waktu terus berjalan... dan dia tidak pernah berkedip."**

*Ilustrasi: Tampilan UI minimalis V.2.0 yang lebih bersih dan menakutkan tanpa bantuan radar.*

Apakah README ini sudah cukup merepresentasikan visi terbaru dari game kamu?
