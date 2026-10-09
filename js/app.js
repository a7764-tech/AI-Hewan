(function () {
  "use strict";
  const root = document.getElementById("page-root");
  const notice = document.getElementById("app-notice");
  let state;
  let currentPage = "home";
  let animalFilter = "Semua";
  let animalQuery = "";
  let editingAnimalId = null;
  let editingExampleId = null;
  let activeChatResults = [];

  const pageLabels = {
    home: "Beranda", chat: "Tanya AI", matching: "Tes kecocokan", animals: "Jelajahi hewan",
    compare: "Bandingkan", training: "Latih AI", about: "Tentang AI"
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    })[character]);
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "#";
    } catch (error) {
      return "#";
    }
  }

  function showNotice(message, type) {
    notice.textContent = message;
    notice.className = "notice " + (type || "success");
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => notice.classList.add("hidden"), 5500);
  }

  function persist(message) {
    window.HewanDB.save(state);
    if (message) showNotice(message, "success");
  }

  function route(page) {
    if (!pageLabels[page]) return;
    currentPage = page;
    document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.page === page));
    document.getElementById("page-label").textContent = pageLabels[page];
    document.querySelector(".sidebar").classList.remove("open");
    renderPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderPage() {
    const renderers = {
      home: renderHome, chat: renderChat, matching: renderMatching, animals: renderAnimals,
      compare: renderCompare, training: renderTraining, about: renderAbout
    };
    root.innerHTML = renderers[currentPage]();
    if (currentPage === "chat") scrollChatToBottom();
  }

  function pageIntro(eyebrow, title, description, action) {
    return `<div class="page-intro"><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${action || ""}</div>`;
  }

  function renderHome() {
    const animals = state.animals.slice(0, 4);
    return `
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">TEMAN BAIK DIMULAI DARI PILIHAN YANG TEPAT</div>
          <h1>Temukan teman<br>yang <span>cocok untukmu.</span></h1>
          <p>Kenali kebutuhanmu, pelajari karakter setiap hewan, dan temukan rekomendasi yang punya alasan jelas.</p>
          <div class="button-row">
            <button class="btn btn-primary" data-page="matching">✳ Tes kecocokan</button>
            <button class="btn btn-secondary" data-page="chat">Tanya HEWAN.AI&nbsp; →</button>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="hero-orbit"></div><div class="hero-animal">🐈</div>
          <div class="hero-chip one">✦ Rekomendasi yang transparan</div>
          <div class="hero-chip two">♡ Peduli kesejahteraan hewan</div>
        </div>
      </section>
      <div class="section-heading"><div><div class="eyebrow">MULAI JELAJAHI</div><h2>Temukan cara yang pas untukmu</h2></div></div>
      <section class="feature-grid">
        <article class="feature-card" data-page="matching"><div class="feature-icon">✳</div><h3>Tes kecocokan</h3><p>Cocokkan ruang, anggaran, waktu, dan pengalamanmu dengan kebutuhan hewan.</p></article>
        <article class="feature-card" data-page="chat"><div class="feature-icon">◉</div><h3>Tanya asisten</h3><p>Tanyakan makanan, habitat, atau perawatan berdasarkan basis pengetahuan.</p></article>
        <article class="feature-card" data-page="animals"><div class="feature-icon">♡</div><h3>Kenali para hewan</h3><p>Jelajahi ${state.animals.length} profil dengan kebutuhan hidup yang berbeda-beda.</p></article>
      </section>
      <div class="section-heading"><div><div class="eyebrow">PILIHAN KOMUNITAS</div><h2>Kenalan dengan mereka</h2></div><button class="text-button" data-page="animals">Jelajahi semua&nbsp; →</button></div>
      <section class="animal-grid">${animals.map((animal) => animalCard(animal)).join("")}</section>
      <div class="section-heading"><div><div class="eyebrow">CARA KERJA</div><h2>Rekomendasi dengan alasan</h2></div></div>
      <section class="panel" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div class="feature-icon" style="margin:0">✧</div><p class="muted" style="margin:0;flex:1;min-width:220px;font-size:12px">HEWAN.AI menganalisis preferensimu, memberi skor kecocokan, lalu menjelaskan faktor yang sesuai maupun yang perlu dipertimbangkan. Bukan pilihan otomatis—kesejahteraan hewan tetap yang utama.</p>
        <button class="btn btn-secondary" data-page="about">Pelajari cara kerjanya</button>
      </section>`;
  }

  function animalCard(animal) {
    const saved = (state.favorites || []).includes(animal.id);
    return `<article class="animal-card" data-animal="${escapeHtml(animal.id)}">
      <div class="animal-card-top"><div class="animal-emoji">${escapeHtml(animal.emoji || "🐾")}</div>
      <button class="heart-button ${saved ? "saved" : ""}" data-favorite="${escapeHtml(animal.id)}" aria-label="${saved ? "Hapus favorit" : "Simpan favorit"}">${saved ? "♥" : "♡"}</button></div>
      <h3>${escapeHtml(animal.name)}</h3><div class="scientific">${escapeHtml(animal.scientificName)}</div>
      <div class="animal-tags"><span class="tag">${escapeHtml(animal.category)}</span><span class="tag">${escapeHtml(animal.lifespan)}</span></div>
    </article>`;
  }

  function renderAnimals() {
    const categories = ["Semua", ...new Set(state.animals.map((animal) => animal.category))];
    const filtered = state.animals.filter((animal) => {
      const matchesCategory = animalFilter === "Semua" || animal.category === animalFilter;
      const haystack = HewanAI.normalize([animal.name, animal.scientificName, animal.category, ...(animal.aliases || [])].join(" "));
      return matchesCategory && haystack.includes(HewanAI.normalize(animalQuery));
    });
    const favorites = state.animals.filter((animal) => (state.favorites || []).includes(animal.id)).length;
    return `${pageIntro("KENALI KEBUTUHAN MEREKA", "Jelajahi hewan", "Informasi awal untuk membantumu memahami tanggung jawab merawat setiap hewan.", `<span class="badge">♡ ${favorites} favorit</span>`)}
      <div class="toolbar"><div class="search-box"><span>⌕</span><input id="animal-search" type="search" value="${escapeHtml(animalQuery)}" placeholder="Cari nama, kategori, atau nama ilmiah..." aria-label="Cari hewan"></div><span class="muted small">${filtered.length} hewan</span></div>
      <div class="filters">${categories.map((category) => `<button class="filter-button ${animalFilter === category ? "active" : ""}" data-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}</div>
      <section class="animal-grid" style="margin-top:12px">${filtered.length ? filtered.map(animalCard).join("") : `<div class="empty-state">Belum ada hewan yang cocok dengan pencarian ini.</div>`}</section>
      <p class="muted small" style="margin-top:20px">Kebutuhan hewan bervariasi antar individu. Periksa sumber dan berkonsultasilah dengan dokter hewan sebelum mengambil keputusan.</p>`;
  }

  function chatMessage(message, isUser) {
    return `<div class="message ${isUser ? "user" : "bot"}"><div>${escapeHtml(message.text).replace(/\n/g, "<br>")}</div>${message.confidence != null ? `<div class="message-meta">${escapeHtml(HewanAI.intentNames[message.intent] || message.intent)} · keyakinan ${Math.round(message.confidence * 100)}%</div>` : ""}</div>
      ${!isUser && message.recommendations && message.recommendations.length ? `<div class="chat-recommendations">${message.recommendations.map((result) => recommendationCard(result, "chat")).join("")}</div>` : ""}`;
  }

  function renderChat() {
    const messages = Array.isArray(state.conversations) ? state.conversations.slice(-40) : [];
    const content = messages.length
      ? messages.map((item) => `${chatMessage({ text: item.userMessage }, true)}${chatMessage({ text: item.botResponse, confidence: item.confidence, intent: item.intent, recommendations: item.recommendations }, false)}`).join("")
      : chatMessage({ text: "Halo! Aku HEWAN.AI. Aku bisa membantu mencari hewan yang sesuai, menjawab pertanyaan tentang makanan dan perawatan, atau membandingkan kebutuhan mereka. Apa yang ingin kamu ketahui?" }, false);
    return `${pageIntro("ASISTEN HEWAN", "Ada yang ingin kamu tanyakan?", "Aku menjawab dari basis pengetahuan dan contoh yang diajarkan.")}
      <div class="chat-layout">
        <section class="panel chat-panel">
          <div class="chat-header"><div class="chat-agent"><div class="agent-icon">🐾</div><div>HEWAN.AI<div class="agent-online">● Aktif · Mesin heuristik lokal</div></div></div><span class="badge">Tidak memakai AI eksternal</span></div>
          <div id="chat-body" class="chat-body">${content}</div>
          <div class="chat-prompts"><button class="prompt-chip" data-prompt="Apa makanan kucing yang baik?">Makanan kucing</button><button class="prompt-chip" data-prompt="Bagaimana cara merawat hamster?">Perawatan hamster</button><button class="prompt-chip" data-prompt="Aku pemula, tinggal di kos dan ingin hewan yang tenang">Rekomendasi untuk kos</button></div>
          <form id="chat-form" class="chat-form"><textarea id="chat-input" maxlength="500" aria-label="Pesan" placeholder="Tulis pertanyaanmu..." required></textarea><button class="btn btn-primary" type="submit" aria-label="Kirim pesan">Kirim&nbsp; ➤</button></form>
        </section>
        <aside class="chat-side">
          <div class="panel"><h3>Yang bisa kutahu</h3><div class="tip-list"><div><span>✓</span>Rekomendasi berdasarkan gaya hidup</div><div><span>✓</span>Makanan dan habitat hewan</div><div><span>✓</span>Panduan perawatan awal</div><div><span>✓</span>Perbandingan dua hewan</div></div></div>
          <div class="panel"><h3>Belum tahu? Ajari aku</h3><p class="muted small">Pertanyaan yang belum dikenali dapat kamu tinjau, beri label, dan lengkapi jawabannya dari menu Latih AI.</p><button class="btn btn-secondary" data-page="training">Buka menu Latih AI</button></div>
          <div class="medical-note"><strong>Perhatian kesehatan</strong><br>Asisten ini bukan dokter hewan dan tidak memberikan diagnosis. Untuk gejala atau keadaan darurat, hubungi dokter hewan.</div>
        </aside>
      </div>`;
  }

  function recommendationCard(result, origin) {
    const animal = result.animal;
    const explanation = result.reasons.length ? result.reasons.join(" · ") : "Skor awal; tambahkan preferensi agar pencocokan lebih bermakna.";
    return `<article class="result-card ${result.score >= 75 ? "first" : ""}">
      <div class="result-emoji">${escapeHtml(animal.emoji)}</div>
      <div><h3>${escapeHtml(animal.name)}</h3><p>${escapeHtml(explanation)}</p><div class="progress"><span style="width:${Math.max(5, Math.min(100, result.score))}%"></span></div>
      <div class="result-actions"><button class="btn btn-secondary" data-animal="${escapeHtml(animal.id)}">Lihat profil</button><button class="btn btn-quiet" data-feedback="${escapeHtml(animal.id)}" data-origin="${origin}">Beri masukan</button></div></div>
      <div class="score">${result.score}%<small>kecocokan</small></div>
    </article>`;
  }

  function selectOptions(options, selected) {
    return options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
  }

  function renderMatching() {
    const optionSets = {
      space: [{ value: "", label: "Pilih..." }, { value: "small", label: "Kecil / kos" }, { value: "medium", label: "Sedang" }, { value: "large", label: "Luas" }],
      cost: [{ value: "", label: "Pilih..." }, { value: "low", label: "Terbatas" }, { value: "medium", label: "Sedang" }, { value: "high", label: "Fleksibel" }],
      time: [{ value: "", label: "Pilih..." }, { value: "low", label: "Sedikit" }, { value: "medium", label: "Cukup" }, { value: "high", label: "Banyak" }],
      noise: [{ value: "", label: "Pilih..." }, { value: "low", label: "Suka yang tenang" }, { value: "medium", label: "Sedang" }, { value: "high", label: "Tidak masalah berisik" }],
      difficulty: [{ value: "", label: "Pilih..." }, { value: "beginner", label: "Pemula" }, { value: "experienced", label: "Berpengalaman" }],
      care: [{ value: "", label: "Pilih..." }, { value: "low", label: "Ingin minim perawatan" }, { value: "medium", label: "Bisa merawat rutin" }, { value: "high", label: "Siap perawatan intensif" }]
    };
    return `${pageIntro("ANIMAL MATCHING", "Hewan apa yang cocok untukmu?", "Pilih hal yang paling penting. Sistem akan menjelaskan faktor yang memengaruhi hasil.")}
      <div class="match-layout">
        <form id="matching-form" class="panel form-panel">
          <h3>Tentang kebutuhanmu</h3><p class="muted">Isi satu atau beberapa preferensi. Semua isian boleh dikosongkan.</p>
          ${["space", "cost", "time", "noise", "difficulty", "care"].map((key) => `<div class="field"><label for="pref-${key}">${escapeHtml(({ space: "Ruang tinggal", cost: "Anggaran perawatan", time: "Waktu luang", noise: "Toleransi suara", difficulty: "Pengalaman memelihara", care: "Intensitas perawatan" })[key])}</label><select id="pref-${key}" name="${key}">${selectOptions(optionSets[key], "")}</select></div>`).join("")}
          <div class="medical-note">Skor menunjukkan kecocokan terhadap preferensi yang diisi—bukan penilaian kualitas hewan atau jaminan mudah dirawat.</div>
          <button class="btn btn-primary" type="submit" style="width:100%;margin-top:15px">✳&nbsp; Lihat rekomendasi</button>
        </form>
        <section id="match-results" class="panel results-panel"><div class="results-empty"><div><div class="empty-emoji">🌱</div><h3>Mulai dari kebutuhanmu</h3><p>Isi beberapa pilihan di samping agar aku bisa menghitung skor dan menjelaskan kecocokannya.</p></div></div></section>
      </div>`;
  }

  function renderCompare() {
    const animals = state.animals;
    const options = [{ value: "", label: "Pilih hewan..." }].concat(animals.map((animal) => ({ value: animal.id, label: animal.name })));
    return `${pageIntro("ANIMAL COMPARISON", "Bandingkan kebutuhan mereka", "Lihat perbedaan ruang, biaya, waktu, dan komitmen sebelum memilih.")}
      <div class="compare-selects"><div class="panel"><label for="compare-one">Hewan pertama</label><select id="compare-one">${selectOptions(options, animals[0]?.id || "")}</select></div><div class="panel"><label for="compare-two">Hewan kedua</label><select id="compare-two">${selectOptions(options, animals[1]?.id || animals[0]?.id || "")}</select></div></div>
      <section id="compare-output">${compareOutput(animals[0], animals[1] || animals[0])}</section>`;
  }

  function compareOutput(first, second) {
    if (!first || !second) return `<div class="empty-state">Tambahkan setidaknya dua profil hewan untuk membandingkan.</div>`;
    const rows = [
      ["Kategori", first.category, second.category], ["Ukuran", first.size, second.size],
      ["Perkiraan umur", first.lifespan, second.lifespan], ["Kebutuhan ruang", levelLabel(first.space), levelLabel(second.space)],
      ["Biaya", levelLabel(first.cost), levelLabel(second.cost)], ["Intensitas perawatan", levelLabel(first.care), levelLabel(second.care)],
      ["Kebisingan", levelLabel(first.noise), levelLabel(second.noise)], ["Kesulitan", levelLabel(first.difficulty), levelLabel(second.difficulty)],
      ["Waktu", levelLabel(first.time), levelLabel(second.time)], ["Sosial", first.social === "social" ? "Sosial" : "Cenderung sendiri", second.social === "social" ? "Sosial" : "Cenderung sendiri"]
    ];
    const lowerNeeds = (first.cost === "low" ? 1 : 0) + (first.space === "small" ? 1 : 0) + (first.care === "easy" ? 1 : 0);
    const lowerOther = (second.cost === "low" ? 1 : 0) + (second.space === "small" ? 1 : 0) + (second.care === "easy" ? 1 : 0);
    const verdict = first.id === second.id ? "Pilih dua jenis hewan yang berbeda untuk melihat ringkasan perbandingan."
      : lowerNeeds === lowerOther ? "Tidak ada satu pilihan yang selalu paling cocok. Pertimbangkan kebutuhan spesifik dan kondisi setiap hewan."
        : `${lowerNeeds > lowerOther ? first.name : second.name} memiliki lebih banyak atribut kebutuhan yang tergolong ringan pada parameter ringkas ini. Tetap baca profil lengkapnya.`;
    return `<div class="panel"><div class="table-wrap"><table class="compare-table"><thead><tr><th>Karakteristik</th><th>${escapeHtml(first.emoji)} ${escapeHtml(first.name)}</th><th>${escapeHtml(second.emoji)} ${escapeHtml(second.name)}</th></tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="compare-verdict">${escapeHtml(verdict)}</div><div class="button-row" style="margin-top:13px"><button class="btn btn-secondary" data-animal="${escapeHtml(first.id)}">Profil ${escapeHtml(first.name)}</button><button class="btn btn-secondary" data-animal="${escapeHtml(second.id)}">Profil ${escapeHtml(second.name)}</button></div></div>`;
  }

  function levelLabel(value) {
    const names = { small: "Rendah / kecil", medium: "Sedang", large: "Tinggi / besar", low: "Rendah", high: "Tinggi", easy: "Mudah", hard: "Tinggi", beginner: "Pemula", solitary: "Soliter", social: "Sosial" };
    return names[value] || value || "Belum diisi";
  }

  function renderTraining() {
    const pending = state.trainingExamples.filter((example) => example.status === "pending");
    const trained = state.trainingExamples.filter((example) => example.status === "trained");
    const positive = state.feedback.filter((item) => item.helpful === true).length;
    const weights = { ...HewanAI.defaultWeights, ...(state.settings.weights || {}) };
    const intentChoices = Object.keys(HewanAI.intentNames).filter((intent) => intent !== "unknown");
    const customWeights = Object.keys(HewanAI.parameterNames).map((key) => `<div class="field"><div class="range-row"><label for="weight-${key}">${escapeHtml(HewanAI.parameterNames[key])}</label><strong id="weight-label-${key}">${escapeHtml(weights[key])}%</strong></div><input class="range-control weight-range" type="range" id="weight-${key}" name="${key}" min="0" max="40" value="${escapeHtml(weights[key])}"></div>`).join("");
    return `${pageIntro("PENGELOLAAN KNOWLEDGE BASE", "Latih HEWAN.AI", "Ajarkan contoh tanya-jawab, tinjau pertanyaan yang belum dikenal, dan kelola dataset hewan.")}
      <div class="training-banner"><div><strong>✧ Pembelajaran berbasis contoh &amp; aturan</strong><p>Contoh terverifikasi membantu mengenali intent dan jawaban yang kamu ajarkan. Ini bukan pelatihan model bahasa besar.</p></div><button id="train-button" class="btn btn-primary">Latih dari ${pending.length} contoh tertunda</button></div>
      <div class="stats-grid">
        <div class="stat-card"><span>Data hewan</span><strong>${state.animals.length}</strong></div>
        <div class="stat-card"><span>Contoh terlatih</span><strong>${trained.length}</strong></div>
        <div class="stat-card"><span>Perlu ditinjau</span><strong>${pending.length}</strong></div>
        <div class="stat-card"><span>Feedback positif</span><strong>${state.feedback.length ? Math.round(positive / state.feedback.length * 100) : "—"}${state.feedback.length ? "%" : ""}</strong></div>
      </div>
      <div class="training-grid">
        <section class="panel">
          <div class="panel-title"><h3>${editingExampleId ? "Edit contoh pelatihan" : "Ajarkan contoh baru"}</h3><span class="badge">Pola tanya-jawab</span></div>
          <form id="training-form">
            <div class="field"><label for="training-input">Contoh pertanyaan pengguna</label><textarea id="training-input" maxlength="500" required placeholder="Contoh: Bagaimana memilih kandang untuk kelinci?"></textarea></div>
            <div class="form-grid">
              <div class="field"><label for="training-intent">Label intent</label><select id="training-intent">${intentChoices.map((intent) => `<option value="${intent}">${escapeHtml(HewanAI.intentNames[intent])}</option>`).join("")}</select></div>
              <div class="field"><label for="training-label">Label/tema</label><input id="training-label" maxlength="100" placeholder="contoh: perawatan kandang"></div>
              <div class="field span-all"><label for="training-answer">Jawaban yang diharapkan (opsional)</label><textarea id="training-answer" maxlength="1200" placeholder="Tulis jawaban berbasis sumber yang dapat dipercaya. Jangan masukkan diagnosis medis."></textarea></div>
            </div>
            <div class="button-row"><button class="btn btn-primary" type="submit">${editingExampleId ? "Simpan perubahan" : "Simpan untuk dilatih"}</button>${editingExampleId ? `<button id="cancel-example-edit" class="btn btn-quiet" type="button">Batal</button>` : ""}</div>
          </form>
        </section>
        <section class="panel">
          <div class="panel-title"><h3>Atur bobot pencocokan</h3><span class="badge">Jumlah akhir dinormalisasi</span></div>
          <p class="muted small">Sesuaikan prioritas parameter untuk rekomendasi berikutnya. Skor tetap dihitung dari preferensi yang pengguna isi.</p>
          <form id="weights-form">${customWeights}<button class="btn btn-secondary" type="submit">Simpan bobot</button></form>
        </section>
      </div>
      <section class="panel" style="margin-top:16px"><div class="panel-title"><h3>Pertanyaan / contoh untuk ditinjau</h3><span class="tag">${pending.length} belum dilatih</span></div>
        ${pending.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Pertanyaan</th><th>Masuk dari</th><th>Aksi</th></tr></thead><tbody>${pending.map((example) => `<tr><td>${escapeHtml(example.input)}</td><td>${example.source === "chat" ? "Pertanyaan belum dikenali" : "Ditambahkan manual"}</td><td><button class="icon-button" data-edit-example="${escapeHtml(example.id)}">Beri label / jawab</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">Belum ada pertanyaan tertunda. Pertanyaan baru dari chatbot yang belum dikenali akan muncul di sini.</p>`}
      </section>
      <section class="panel" style="margin-top:16px"><div class="panel-title"><h3>Contoh yang sudah dilatih</h3><span class="tag">${trained.length} contoh</span></div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Contoh pertanyaan</th><th>Intent</th><th>Jawaban khusus</th><th>Aksi</th></tr></thead><tbody>${trained.map((example) => `<tr><td>${escapeHtml(example.input)}</td><td>${escapeHtml(HewanAI.intentNames[example.intent] || example.intent)}</td><td>${example.expectedOutput ? "Ada" : "—"}</td><td><div class="row-actions"><button class="icon-button" data-edit-example="${escapeHtml(example.id)}">Edit</button><button class="icon-button delete" data-delete-example="${escapeHtml(example.id)}" aria-label="Hapus contoh">Hapus</button></div></td></tr>`).join("") || `<tr><td colspan="4">Belum ada contoh yang dilatih.</td></tr>`}</tbody></table></div>
      </section>
      <section class="panel" style="margin-top:16px"><div class="panel-title"><h3>Kelola data hewan</h3><button class="btn btn-secondary" id="new-animal-button">＋ Tambah hewan</button></div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Nama</th><th>Kategori</th><th>Ruang</th><th>Biaya</th><th>Aksi</th></tr></thead><tbody>${state.animals.map((animal) => `<tr><td>${escapeHtml(animal.emoji)} ${escapeHtml(animal.name)}<br><span class="muted">${escapeHtml(animal.scientificName)}</span></td><td>${escapeHtml(animal.category)}</td><td>${escapeHtml(levelLabel(animal.space))}</td><td>${escapeHtml(levelLabel(animal.cost))}</td><td><div class="row-actions"><button class="icon-button" data-edit-animal="${escapeHtml(animal.id)}">Edit</button><button class="icon-button delete" data-delete-animal="${escapeHtml(animal.id)}">Hapus</button></div></td></tr>`).join("")}</tbody></table></div>
      </section>
      <section class="panel" style="margin-top:16px"><div class="panel-title"><h3>Cadangan &amp; database lokal</h3><span class="badge">Local-first</span></div><p class="muted small">Data disimpan di browser pada perangkat ini, bukan database server. Simpan cadangan sebelum menghapus data browser. Impor akan mengganti seluruh database aplikasi ini.</p>
        <div class="button-row"><button id="export-json" class="btn btn-secondary">Ekspor cadangan JSON</button><button id="export-csv" class="btn btn-secondary">Ekspor dataset CSV</button><button id="import-json" class="btn btn-secondary">Impor cadangan JSON</button><button id="reset-data" class="btn btn-danger">Pulihkan data awal</button><input id="import-file" type="file" accept=".json,application/json" class="hidden"></div>
      </section>`;
  }

  function renderAbout() {
    return `${pageIntro("TRANSPARANSI SISTEM", "Tentang HEWAN.AI", "Asisten rekomendasi hewan yang menjalankan reasoning secara lokal tanpa API AI eksternal.")}
      <div class="training-grid">
        <section class="panel"><div class="feature-icon">✧</div><h3>Bagaimana sistem berpikir?</h3><p class="muted">Pesan dinormalisasi, lalu dicocokkan dengan kata kunci dan contoh berlabel. Sistem mengekstrak kebutuhan yang dikenal, menghitung skor berbobot untuk tiap hewan, dan mengurutkan hasil. Profil dan data lokal menjadi knowledge base.</p><div class="tip-list"><div><span>01</span>Deteksi intent dan nama hewan</div><div><span>02</span>Ekstraksi preferensi yang disebut</div><div><span>03</span>Heuristic scoring dan penjelasan</div><div><span>04</span>Feedback dan contoh digunakan untuk evaluasi</div></div></section>
        <section class="panel"><div class="feature-icon">📚</div><h3>Pengetahuan bukan diagnosis</h3><p class="muted">Profil ini merupakan informasi awal dan dapat memiliki kekurangan. Variasi spesies, individu, kondisi medis, dan peraturan lokal perlu diperiksa langsung sebelum memelihara hewan.</p><div class="medical-note">Jika ada gejala penyakit, perubahan perilaku mendadak, atau keadaan darurat, hubungi dokter hewan. Jangan menggunakan jawaban chatbot sebagai pengganti diagnosis atau instruksi pengobatan.</div></section>
      </div>
      <section class="panel" style="margin-top:16px"><div class="panel-title"><h3>Sumber bacaan awal</h3><span class="tag">${window.HewanSeed.references.length} referensi</span></div><p class="muted small">Gunakan sumber organisasi kesejahteraan hewan untuk verifikasi. Referensi umum berikut tidak mencakup semua fakta pada seluruh profil; tinjau sumber khusus tiap spesies dan dokter hewan sebelum menerapkan panduan.</p>
        <div class="source-list">${window.HewanSeed.references.map((reference) => `<div><a class="source-link" href="${escapeHtml(safeUrl(reference.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(reference.title)} ↗</a><div class="muted small">${escapeHtml(reference.scope)}</div></div>`).join("")}</div>
      </section>
      <section class="panel" style="margin-top:16px"><div class="panel-title"><h3>Batasan data &amp; privasi</h3></div><p class="muted small">Daftar hewan dan rentang biaya/umur bersifat perkiraan, bukan data pasar lokal yang diverifikasi. Pertanyaan chat, feedback, perubahan dataset, dan bobot tersimpan di localStorage browser perangkat ini. Tidak ada autentikasi atau sinkronisasi server pada versi ini; jangan menganggapnya sesuai untuk produksi multi-pengguna. Ekspor cadangan dari menu Latih AI dan hapus data melalui tombol pemulihan bila perangkat digunakan bersama.</p></section>`;
  }

  function renderProfile(animal) {
    const factRows = [
      ["Nama ilmiah", animal.scientificName], ["Kategori & ukuran", `${animal.category} · ${animal.size}`],
      ["Perkiraan umur", animal.lifespan], ["Habitat", animal.habitat], ["Suhu / lingkungan", animal.temperature],
      ["Aktivitas", levelLabel(animal.activity)], ["Sifat sosial", animal.social === "social" ? "Sosial; pertimbangkan teman yang kompatibel" : "Cenderung soliter"]
    ];
    return `<div class="modal-backdrop" data-close-modal><section class="modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <div class="modal-head"><div><div class="eyebrow">PROFIL HEWAN</div><h2 id="profile-title">${escapeHtml(animal.name)}</h2></div><button class="close-modal" data-close-modal aria-label="Tutup">×</button></div>
      <div class="detail-layout"><div><div class="detail-art">${escapeHtml(animal.emoji || "🐾")}</div><div class="animal-tags"><span class="tag">Biaya ${escapeHtml(levelLabel(animal.cost))}</span><span class="tag">${escapeHtml(levelLabel(animal.difficulty))}</span></div></div>
      <div><p class="muted small"><i>${escapeHtml(animal.scientificName)}</i> — ${escapeHtml(animal.description)}</p><div class="table-wrap"><table class="compare-table"><tbody>${factRows.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td></tr>`).join("")}</tbody></table></div></div></div>
      <div class="detail-section"><h3>🍽️ Makanan</h3><p>${escapeHtml(animal.food)}</p></div>
      <div class="detail-section"><h3>🧼 Perawatan</h3><p>${escapeHtml(animal.careGuide)}</p></div>
      <div class="detail-layout"><div class="detail-section"><h3>♡ Kelebihan</h3><ul>${(animal.pros || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><div class="detail-section"><h3>⚠ Hal yang perlu dipertimbangkan</h3><ul>${(animal.cons || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div>
      <div class="detail-section"><h3>Cocok untuk</h3><p>${escapeHtml(animal.suitableFor)}</p></div>
      ${(animal.sourceUrls || []).length ? `<div class="detail-section"><h3>Sumber untuk dibaca</h3>${animal.sourceUrls.map((url) => {
        const verifiedUrl = safeUrl(url);
        return `<p><a class="source-link" href="${escapeHtml(verifiedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(verifiedUrl === "#" ? "Sumber tidak valid" : new URL(verifiedUrl).hostname)} ↗</a></p>`;
      }).join("")}</div>` : ""}
      <div class="medical-note">Informasi bersifat umum dan tidak menggantikan saran dokter hewan. Kebutuhan dapat berbeda antar individu dan kondisi lingkungan.</div>
      <div class="modal-footer"><button class="btn btn-secondary" data-compare-add="${escapeHtml(animal.id)}">Bandingkan</button><button class="btn btn-primary" data-close-modal>Tutup profil</button></div>
    </section></div>`;
  }

  function openAnimal(id) {
    const animal = state.animals.find((item) => item.id === id);
    if (!animal) return showNotice("Profil hewan tidak ditemukan. Dataset mungkin telah berubah.", "error");
    document.getElementById("modal-root").innerHTML = renderProfile(animal);
  }

  function closeModal() {
    document.getElementById("modal-root").innerHTML = "";
  }

  function addFeedback(animalId, helpful, reason) {
    state.feedback.push({ id: HewanDB.id("feedback"), animalId: animalId, helpful: helpful, reason: reason || "", createdAt: new Date().toISOString() });
    persist("Terima kasih! Masukanmu tersimpan lokal untuk evaluasi, tidak langsung mengubah bobot AI.");
    closeModal();
  }

  function openFeedback(id) {
    const animal = state.animals.find((item) => item.id === id);
    if (!animal) return;
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-close-modal><section class="modal small-modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>Masukan rekomendasi</h2><button class="close-modal" data-close-modal>×</button></div><p class="muted small">Apakah rekomendasi ${escapeHtml(animal.name)} membantu?</p><div class="field"><label for="feedback-reason">Apa yang bisa diperbaiki? (opsional)</label><textarea id="feedback-reason" maxlength="300" placeholder="Contoh: kebutuhan ruangnya ternyata besar"></textarea></div><div class="modal-footer"><button class="btn btn-quiet" data-feedback-save="false" data-animal-id="${escapeHtml(id)}">👎 Belum sesuai</button><button class="btn btn-primary" data-feedback-save="true" data-animal-id="${escapeHtml(id)}">👍 Membantu</button></div></section></div>`;
  }

  function scrollChatToBottom() {
    const body = document.getElementById("chat-body");
    if (body) body.scrollTop = body.scrollHeight;
  }

  function sendChatMessage(rawMessage) {
    const message = String(rawMessage || "").trim();
    if (!message) return;
    if (message.length > 500) return showNotice("Pesan terlalu panjang. Batasnya 500 karakter.", "warning");
    const answer = HewanAI.buildResponse(message, state);
    activeChatResults = answer.recommendations || [];
    state.conversations.push({
      id: HewanDB.id("chat"),
      userMessage: message,
      botResponse: answer.text,
      confidence: answer.confidence,
      intent: answer.intent,
      recommendations: answer.recommendations,
      createdAt: new Date().toISOString()
    });
    if (answer.pending && !state.trainingExamples.some((example) => example.status === "pending" && HewanAI.similarity(example.input, message) > .85)) {
      state.trainingExamples.unshift({
        id: HewanDB.id("training"),
        input: message,
        intent: "unknown",
        expectedOutput: "",
        label: "Pertanyaan dari chatbot",
        status: "pending",
        source: "chat"
      });
    }
    try {
      persist();
      if (currentPage === "chat") renderPage();
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  function runMatching(form) {
    const formData = new FormData(form);
    const prefs = {};
    ["space", "cost", "time", "noise", "difficulty", "care"].forEach((key) => {
      const value = formData.get(key);
      if (value) prefs[key] = value;
    });
    if (!Object.keys(prefs).length) {
      showNotice("Pilih setidaknya satu preferensi agar perhitungan kecocokan bermakna.", "warning");
      return;
    }
    const results = HewanAI.rankAnimals(state.animals, prefs, state.settings.weights).slice(0, 5);
    const output = document.getElementById("match-results");
    output.innerHTML = `<div class="panel-title"><h3>Hasil pencocokan</h3><span class="badge">${Object.keys(prefs).length} preferensi dianalisis</span></div><p class="muted small">Kecocokan mengacu pada pilihan yang kamu isi. Pastikan kamu dapat memenuhi kebutuhan dasar hewan, termasuk habitat, nutrisi, dan layanan kesehatan.</p><div class="result-list">${results.map((result) => recommendationCard(result, "matching")).join("")}</div>`;
    state.conversations.push({ id: HewanDB.id("match"), userMessage: "Tes kecocokan: " + Object.keys(prefs).map((key) => HewanAI.parameterNames[key] + " " + prefs[key]).join(", "), botResponse: "Hasil kecocokan dihitung untuk " + Object.keys(prefs).length + " preferensi.", confidence: .9, intent: "recommendation", recommendations: results, createdAt: new Date().toISOString() });
    try { persist(); } catch (error) { showNotice(error.message, "error"); }
  }

  function startEditExample(id) {
    const example = state.trainingExamples.find((item) => item.id === id);
    if (!example) return;
    editingExampleId = id;
    renderPage();
    document.getElementById("training-input").value = example.input;
    document.getElementById("training-intent").value = example.intent === "unknown" ? "animal_information" : example.intent;
    document.getElementById("training-label").value = example.label || "";
    document.getElementById("training-answer").value = example.expectedOutput || "";
    document.getElementById("training-input").focus();
  }

  function resetExampleForm() {
    editingExampleId = null;
    renderPage();
  }

  function startEditAnimal(id) {
    const animal = state.animals.find((item) => item.id === id);
    if (!animal) return;
    editingAnimalId = id;
    document.getElementById("modal-root").innerHTML = animalForm(animal);
  }

  function animalForm(animal) {
    const value = (key) => escapeHtml(animal ? animal[key] || "" : "");
    const textarea = (key) => escapeHtml(animal ? animal[key] || "" : "");
    const categoryOptions = ["Mamalia", "Mamalia kecil", "Ikan", "Burung", "Reptil", "Unggas", "Mamalia eksotik", "Krustasea"];
    const levelOptions = (levels, selected) => levels.map((option) => `<option value="${option.value}" ${option.value === selected ? "selected" : ""}>${option.label}</option>`).join("");
    return `<div class="modal-backdrop" data-close-modal><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><div class="eyebrow">DATABASE HEWAN</div><h2>${animal ? "Edit profil hewan" : "Tambah hewan"}</h2></div><button class="close-modal" data-close-modal>×</button></div>
      <form id="animal-form"><div class="form-grid">
      <div class="field"><label for="animal-name">Nama umum *</label><input id="animal-name" required maxlength="80" value="${value("name")}"></div>
      <div class="field"><label for="animal-scientific">Nama ilmiah *</label><input id="animal-scientific" required maxlength="100" value="${value("scientificName")}"></div>
      <div class="field"><label for="animal-category">Kategori</label><select id="animal-category">${levelOptions(categoryOptions.map((item) => ({ value: item, label: item })), value("category"))}</select></div>
      <div class="field"><label for="animal-emoji">Ikon emoji</label><input id="animal-emoji" maxlength="8" value="${value("emoji") || "🐾"}"></div>
      <div class="field"><label for="animal-size">Ukuran *</label><input id="animal-size" required maxlength="50" value="${value("size")}"></div>
      <div class="field"><label for="animal-lifespan">Perkiraan umur *</label><input id="animal-lifespan" required maxlength="50" value="${value("lifespan")}"></div>
      <div class="field"><label for="animal-space">Kebutuhan ruang</label><select id="animal-space">${levelOptions([{ value: "small", label: "Kecil" }, { value: "medium", label: "Sedang" }, { value: "large", label: "Besar" }], value("space"))}</select></div>
      <div class="field"><label for="animal-cost">Biaya</label><select id="animal-cost">${levelOptions([{ value: "low", label: "Rendah" }, { value: "medium", label: "Sedang" }, { value: "high", label: "Tinggi" }], value("cost"))}</select></div>
      <div class="field"><label for="animal-care">Perawatan</label><select id="animal-care">${levelOptions([{ value: "easy", label: "Mudah" }, { value: "medium", label: "Sedang" }, { value: "hard", label: "Intensif" }], value("care"))}</select></div>
      <div class="field"><label for="animal-noise">Kebisingan</label><select id="animal-noise">${levelOptions([{ value: "none", label: "Tidak ada" }, { value: "low", label: "Rendah" }, { value: "medium", label: "Sedang" }, { value: "high", label: "Tinggi" }], value("noise"))}</select></div>
      <div class="field"><label for="animal-difficulty">Kesulitan</label><select id="animal-difficulty">${levelOptions([{ value: "easy", label: "Mudah" }, { value: "medium", label: "Sedang" }, { value: "hard", label: "Sulit" }], value("difficulty"))}</select></div>
      <div class="field"><label for="animal-time">Kebutuhan waktu</label><select id="animal-time">${levelOptions([{ value: "low", label: "Rendah" }, { value: "medium", label: "Sedang" }, { value: "high", label: "Tinggi" }], value("time"))}</select></div>
      <div class="field span-all"><label for="animal-aliases">Nama lain / kata kunci (pisahkan koma)</label><input id="animal-aliases" maxlength="250" value="${escapeHtml(animal ? (animal.aliases || []).join(", ") : "")}"></div>
      <div class="field span-all"><label for="animal-description">Ringkasan profil *</label><textarea id="animal-description" maxlength="600" required>${textarea("description")}</textarea></div>
      <div class="field span-all"><label for="animal-habitat">Habitat dan lingkungan *</label><textarea id="animal-habitat" maxlength="600" required>${textarea("habitat")}</textarea></div>
      <div class="field span-all"><label for="animal-food">Makanan *</label><textarea id="animal-food" maxlength="600" required>${textarea("food")}</textarea></div>
      <div class="field span-all"><label for="animal-care-guide">Panduan perawatan *</label><textarea id="animal-care-guide" maxlength="800" required>${textarea("careGuide")}</textarea></div>
      <div class="field span-all"><label for="animal-suitable">Cocok untuk</label><textarea id="animal-suitable" maxlength="400">${textarea("suitableFor")}</textarea></div>
      </div><div class="medical-note">Pastikan fakta, pakan, peraturan, dan panduan perawatan diverifikasi dengan sumber spesifik atau dokter hewan. Data ini menjadi jawaban yang dilihat pengguna.</div>
      <div class="modal-footer"><button type="button" class="btn btn-quiet" data-close-modal>Batal</button><button type="submit" class="btn btn-primary">${animal ? "Simpan perubahan" : "Tambahkan hewan"}</button></div></form>
    </section></div>`;
  }

  function saveAnimalFromForm(form) {
    const get = (id) => document.getElementById(id).value.trim();
    const name = get("animal-name");
    const scientificName = get("animal-scientific");
    let id = editingAnimalId;
    if (!id) {
      id = HewanAI.normalize(name).replace(/\s+/g, "-");
      if (state.animals.some((animal) => animal.id === id)) return showNotice("Nama hewan tersebut sudah ada di database.", "error");
    }
    const previous = state.animals.find((animal) => animal.id === id);
    const animal = {
      ...(previous || {}),
      id: id, name: name, scientificName: scientificName, category: get("animal-category"),
      emoji: get("animal-emoji") || "🐾", aliases: get("animal-aliases").split(",").map((item) => item.trim()).filter(Boolean),
      size: get("animal-size"), lifespan: get("animal-lifespan"), space: get("animal-space"), cost: get("animal-cost"),
      care: get("animal-care"), noise: get("animal-noise"), difficulty: get("animal-difficulty"), time: get("animal-time"),
      activity: previous?.activity || "medium", social: previous?.social || "social", temperature: previous?.temperature || "Perlu disesuaikan dengan spesies",
      description: get("animal-description"), habitat: get("animal-habitat"), food: get("animal-food"),
      careGuide: get("animal-care-guide"), suitableFor: get("animal-suitable") || "Periksa kebutuhan khusus spesies bersama sumber tepercaya dan dokter hewan.",
      pros: previous?.pros || [], cons: previous?.cons || [], sourceUrls: previous?.sourceUrls || []
    };
    if (previous) state.animals = state.animals.map((item) => item.id === id ? animal : item);
    else state.animals.push(animal);
    editingAnimalId = null;
    closeModal();
    try { persist(previous ? "Profil hewan berhasil diperbarui." : "Profil hewan berhasil ditambahkan."); renderPage(); } catch (error) { showNotice(error.message, "error"); }
  }

  function exportJson() {
    downloadFile("hewan-ai-cadangan-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(state, null, 2), "application/json;charset=utf-8");
  }

  function csvCell(value) {
    return "\"" + String(value == null ? "" : value).replace(/"/g, "\"\"") + "\"";
  }

  function exportCsv() {
    const header = ["input", "intent", "label", "expected_output", "status"];
    const lines = state.trainingExamples.map((example) => [example.input, example.intent, example.label, example.expectedOutput, example.status].map(csvCell).join(","));
    downloadFile("hewan-ai-training-" + new Date().toISOString().slice(0, 10) + ".csv", "\uFEFF" + [header.join(","), ...lines].join("\r\n"), "text/csv;charset=utf-8");
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file) {
    if (!file) return;
    if (file.size > 2_000_000) return showNotice("Berkas lebih besar dari batas 2 MB.", "error");
    const reader = new FileReader();
    reader.onerror = () => showNotice("Berkas cadangan tidak dapat dibaca.", "error");
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !Array.isArray(parsed.animals) || !Array.isArray(parsed.trainingExamples)
          || !parsed.animals.every((animal) => animal && typeof animal.name === "string" && typeof animal.id === "string"
            && typeof animal.scientificName === "string" && typeof animal.category === "string"
            && (animal.aliases == null || Array.isArray(animal.aliases))
            && (animal.pros == null || Array.isArray(animal.pros))
            && (animal.cons == null || Array.isArray(animal.cons))
            && (animal.sourceUrls == null || Array.isArray(animal.sourceUrls)))
          || !parsed.trainingExamples.every((example) => example && typeof example.input === "string" && typeof example.intent === "string"
            && ["pending", "trained"].includes(example.status))) {
          throw new Error("Struktur JSON tidak sesuai format cadangan HEWAN.AI.");
        }
        if (!window.confirm("Impor akan mengganti seluruh data hewan, contoh pelatihan, feedback, dan riwayat saat ini. Lanjutkan?")) return;
        state = {
          schemaVersion: 1, animals: parsed.animals, trainingExamples: parsed.trainingExamples,
          feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
          conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
          settings: parsed.settings || { trainedAt: null, trainingVersion: 0, weights: null },
          favorites: Array.isArray(parsed.favorites) ? parsed.favorites : []
        };
        persist("Cadangan berhasil diimpor.");
        renderPage();
      } catch (error) {
        showNotice(error.message || "JSON tidak valid.", "error");
      }
    };
    reader.readAsText(file);
  }

  function submitTraining(form) {
    const input = document.getElementById("training-input").value.trim();
    const intent = document.getElementById("training-intent").value;
    const label = document.getElementById("training-label").value.trim();
    const expectedOutput = document.getElementById("training-answer").value.trim();
    if (!input) return showNotice("Isi contoh pertanyaan sebelum menyimpan.", "warning");
    if (expectedOutput && intent === "health_safety" && /diagnos|minum obat|dosis/i.test(expectedOutput)) {
      showNotice("Jawaban kesehatan yang mengarahkan diagnosis atau obat harus ditinjau dokter hewan. Simpan panduan untuk mencari bantuan profesional saja.", "warning");
      return;
    }
    if (editingExampleId) {
      state.trainingExamples = state.trainingExamples.map((example) => example.id === editingExampleId
        ? { ...example, input: input, intent: intent, label: label, expectedOutput: expectedOutput, status: "pending" }
        : example);
      editingExampleId = null;
    } else {
      state.trainingExamples.unshift({ id: HewanDB.id("training"), input: input, intent: intent, label: label || "Contoh tambahan", expectedOutput: expectedOutput, status: "pending", source: "manual" });
    }
    try { persist("Contoh tersimpan. Tekan “Latih” untuk memasukkannya ke pencocokan intent."); renderPage(); } catch (error) { showNotice(error.message, "error"); }
  }

  function trainModel() {
    const pending = state.trainingExamples.filter((example) => example.status === "pending");
    if (!pending.length) return showNotice("Semua contoh sudah dilatih. Tambahkan contoh atau tinjau bobot terlebih dahulu.", "warning");
    if (pending.some((example) => !example.input.trim() || !example.intent || example.intent === "unknown")) {
      showNotice("Ada contoh yang belum diberi label. Buka tiap contoh tertunda dan pilih intent sebelum melatih.", "error");
      return;
    }
    pending.forEach((example) => { example.status = "trained"; });
    state.settings.trainingVersion = (state.settings.trainingVersion || 0) + 1;
    state.settings.trainedAt = new Date().toISOString();
    try { persist(pending.length + " contoh dilatih. Mesin pencocokan intent akan memakai contoh tersebut."); renderPage(); } catch (error) { showNotice(error.message, "error"); }
  }

  function saveWeights(form) {
    const formData = new FormData(form);
    const newWeights = {};
    Object.keys(HewanAI.parameterNames).forEach((key) => { newWeights[key] = Number(formData.get(key)); });
    if (Object.values(newWeights).every((weight) => weight === 0)) return showNotice("Setidaknya satu bobot harus lebih besar dari 0.", "warning");
    state.settings.weights = newWeights;
    try { persist("Bobot heuristik disimpan dan digunakan pada pencocokan berikutnya."); renderPage(); } catch (error) { showNotice(error.message, "error"); }
  }

  function handleClick(event) {
    const target = event.target.closest("button, [data-page], .feature-card, .animal-card, [data-close-modal]");
    if (!target) return;
    if (target.dataset.page) return route(target.dataset.page);
    if (target.classList.contains("animal-card")) return openAnimal(target.dataset.animal);
    if (target.dataset.animal && !target.dataset.feedback && !target.dataset.editAnimal && !target.dataset.deleteAnimal) return openAnimal(target.dataset.animal);
    if (target.hasAttribute("data-close-modal")) {
      if (event.target === target || target.classList.contains("close-modal")) closeModal();
      return;
    }
    if (target.dataset.filter) {
      animalFilter = target.dataset.filter;
      renderPage();
      return;
    }
    if (target.dataset.favorite) {
      const favorites = new Set(state.favorites || []);
      favorites.has(target.dataset.favorite) ? favorites.delete(target.dataset.favorite) : favorites.add(target.dataset.favorite);
      state.favorites = Array.from(favorites);
      try { persist(); renderPage(); } catch (error) { showNotice(error.message, "error"); }
      return;
    }
    if (target.dataset.prompt) {
      route("chat");
      sendChatMessage(target.dataset.prompt);
      return;
    }
    if (target.dataset.feedback) return openFeedback(target.dataset.feedback);
    if (target.dataset.feedbackSave) return addFeedback(target.dataset.animalId, target.dataset.feedbackSave === "true", document.getElementById("feedback-reason")?.value.trim());
    if (target.dataset.compareAdd) {
      closeModal();
      route("compare");
      const first = document.getElementById("compare-one");
      if (first) {
        first.value = target.dataset.compareAdd;
        document.getElementById("compare-output").innerHTML = compareOutput(state.animals.find((animal) => animal.id === first.value), state.animals.find((animal) => animal.id === document.getElementById("compare-two").value));
      }
      return;
    }
    if (target.id === "mobile-menu") {
      document.querySelector(".sidebar").classList.toggle("open");
      return;
    }
    if (target.id === "train-button") return trainModel();
    if (target.id === "cancel-example-edit") return resetExampleForm();
    if (target.dataset.editExample) return startEditExample(target.dataset.editExample);
    if (target.dataset.deleteExample) {
      if (!window.confirm("Hapus contoh pelatihan ini?")) return;
      state.trainingExamples = state.trainingExamples.filter((example) => example.id !== target.dataset.deleteExample);
      try { persist("Contoh pelatihan dihapus."); renderPage(); } catch (error) { showNotice(error.message, "error"); }
      return;
    }
    if (target.id === "new-animal-button") {
      editingAnimalId = null;
      document.getElementById("modal-root").innerHTML = animalForm(null);
      return;
    }
    if (target.dataset.editAnimal) return startEditAnimal(target.dataset.editAnimal);
    if (target.dataset.deleteAnimal) {
      const animal = state.animals.find((item) => item.id === target.dataset.deleteAnimal);
      if (!animal || !window.confirm("Hapus " + animal.name + " dari database lokal? Ini tidak dapat dibatalkan.")) return;
      state.animals = state.animals.filter((item) => item.id !== animal.id);
      try { persist("Profil hewan dihapus."); renderPage(); } catch (error) { showNotice(error.message, "error"); }
      return;
    }
    if (target.id === "export-json") return exportJson();
    if (target.id === "export-csv") return exportCsv();
    if (target.id === "import-json") {
      document.getElementById("import-file").click();
      return;
    }
    if (target.id === "reset-data") {
      if (!window.confirm("Pulihkan data awal? Semua perubahan, contoh, feedback, dan riwayat saat ini akan dihapus.")) return;
      state = HewanDB.reset();
      showNotice("Data awal berhasil dipulihkan.", "success");
      renderPage();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (event.target.id === "chat-form") {
      const input = document.getElementById("chat-input");
      const value = input.value.trim();
      input.value = "";
      sendChatMessage(value);
    } else if (event.target.id === "matching-form") {
      runMatching(event.target);
    } else if (event.target.id === "training-form") {
      submitTraining(event.target);
    } else if (event.target.id === "weights-form") {
      saveWeights(event.target);
    } else if (event.target.id === "animal-form") {
      if (!event.target.reportValidity()) return;
      saveAnimalFromForm(event.target);
    }
  }

  function handleChange(event) {
    if (event.target.id === "animal-search") {
      animalQuery = event.target.value;
      const start = event.target.selectionStart;
      renderPage();
      const search = document.getElementById("animal-search");
      search.focus();
      search.setSelectionRange(start, start);
    } else if (event.target.id === "compare-one" || event.target.id === "compare-two") {
      const first = state.animals.find((animal) => animal.id === document.getElementById("compare-one").value);
      const second = state.animals.find((animal) => animal.id === document.getElementById("compare-two").value);
      document.getElementById("compare-output").innerHTML = compareOutput(first, second);
    } else if (event.target.id === "import-file") {
      importJson(event.target.files[0]);
      event.target.value = "";
    } else if (event.target.classList.contains("weight-range")) {
      document.getElementById("weight-label-" + event.target.name).textContent = event.target.value + "%";
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") closeModal();
    if (event.target.id === "chat-input" && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      document.getElementById("chat-form").requestSubmit();
    }
  }

  function boot() {
    try {
      state = HewanDB.read();
      state.favorites = Array.isArray(state.favorites) ? state.favorites : [];
    } catch (error) {
      document.getElementById("app-notice").textContent = error.message;
      document.getElementById("app-notice").className = "notice error";
      root.innerHTML = `<section class="panel"><h2>Database lokal tidak bisa dibuka</h2><p class="muted">${escapeHtml(error.message)}</p><button class="btn btn-danger" id="reset-data">Pulihkan data awal</button></section>`;
      return;
    }
    document.getElementById("today-label").textContent = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short" }).format(new Date());
    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("input", handleChange);
    document.addEventListener("change", handleChange);
    document.addEventListener("keydown", handleKeydown);
    renderPage();
  }

  boot();
}());
