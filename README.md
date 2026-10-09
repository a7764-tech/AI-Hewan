# AI-Hewan

# HEWAN.AI

HEWAN.AI adalah MVP web berbahasa Indonesia untuk konsultasi dan pencocokan hewan. Antarmuka dan mesin reasoning dibuat dengan HTML, CSS, dan JavaScript tanpa framework atau API AI eksternal. Data aplikasi berada pada database lokal browser.

## Menjalankan aplikasi

Buka `index.html` di browser modern. IndexedDB digunakan sebagai database; localStorage menjadi fallback apabila IndexedDB tidak tersedia.

## Fitur

- Chatbot multi-turn untuk rekomendasi, informasi, diet, habitat, perawatan, perilaku, kesejahteraan, klasifikasi, fakta, dan perbandingan.
- Profil 52 hewan pendamping, akuarium, aviari, dan ternak dengan pencarian, filter kategori, foto spesies dari Commons/Wikipedia, dan tautan sumber gambar.
- Knowledge base lokal terstruktur per hewan untuk informasi, makanan, habitat, perawatan, perilaku, kesejahteraan, dan fakta. Tiap profil mencatat tautan sumber rujukan yang sesuai kelompok spesies.
- Materi training tambahan dapat diajarkan dari room chat, otomatis tersimpan lokal, serta dapat diimpor atau diekspor sebagai JSON.
- Materi web yang dikumpulkan dari situs rujukan masuk sebagai kandidat yang menunggu tinjauan sebelum digunakan.
- Histori chat, sumber, dokumen, kandidat, keputusan review, dan feedback disimpan pada database lokal browser.
- Ranking hewan dengan bobot PRD, aturan bonus/penalti yang ditampilkan, confidence input, dan ringkasan langkah penalaran.
- Responsive untuk desktop dan ponsel.

## Database dan batasan

Database lokal memakai object store IndexedDB `animals`, `knowledge`, `user_records`, `feedback`, dan `metadata`. Seed profil berada di `app.js`; materi dasar berada di `database/animal-knowledge.js` dan `database/animal-knowledge-expanded.js`; repository lokal ada di `database/data-access.js`.

Data hanya tersedia di browser dan perangkat tempat aplikasi digunakan. Database browser dapat hilang jika pengguna membersihkan data situs. Ekspor materi training sebelum membersihkan data penting. Tidak ada sinkronisasi antarperangkat atau layanan database eksternal.

Kolektor sumber berjalan dari browser dan tidak dapat melewati CORS. Bila halaman tidak dapat diambil, tempel kutipan sumber di panel kolektor. Kolektor menghasilkan kandidat berbasis aturan dan memerlukan tinjauan manusia; hasilnya bukan ekstraksi fakta otomatis tingkat produksi.

Katalog 52 profil adalah cakupan praktis untuk hewan pendamping, akuarium, aviari, dan ternak yang umum dibahas; katalog ini tidak mencakup semua spesies hewan di dunia. Materi dasar dikurasi dari sumber yang tautannya tercatat per profil. Kedalaman informasi berbeda antarspesies dan bukan diagnosis. Untuk kondisi kesehatan atau kebutuhan habitat/diet spesifik, hubungi dokter hewan yang sesuai (termasuk dokter hewan eksotik, unggas, ternak, atau akuatik).

Fitur Latih AI mengajari knowledge base dan pencocokan heuristik lokal; fitur ini tidak melatih model bahasa atau mengubah bobot rekomendasi secara otomatis. “Penalaran” HEWAN.AI adalah inferensi deterministik yang dapat diperiksa, bukan kesadaran atau pikiran manusia.

## Struktur utama

- `index.html` — halaman beranda, chat, katalog, perbandingan, dan penjelasan AI.
- `app.js` — dataset, deteksi intent, ekstraksi entitas, aturan, scoring, dan interaksi.
- `ui-enhancements.js` — foto, training chat, histori, kolektor, dan review lokal.
- `database/animal-knowledge.js` — materi dasar 28 profil awal beserta tautan sumber.
- `database/animal-knowledge-expanded.js` — materi tujuh topik untuk 24 profil tambahan.
- `database/data-access.js` — repository IndexedDB dengan fallback localStorage.
- `database/SETUP.md` — dokumentasi database lokal.
