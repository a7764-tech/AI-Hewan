(function () {
  "use strict";
  const KEY = "hewan-ai-local-db-v1";

  function createInitialState() {
    return {
      schemaVersion: 1,
      animals: window.HewanSeed.animals.map((animal) => ({ ...animal })),
      trainingExamples: window.HewanSeed.trainingExamples.map((example) => ({ ...example })),
      feedback: [],
      conversations: [],
      favorites: [],
      settings: { trainedAt: new Date().toISOString(), trainingVersion: 1, weights: null }
    };
  }

  function readState() {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const initial = createInitialState();
      writeState(initial);
      return initial;
    }
    let state;
    try {
      state = JSON.parse(raw);
    } catch (error) {
      throw new Error("Database lokal tidak dapat dibaca. Ekspor data jika tersedia atau pulihkan data dari cadangan.", { cause: error });
    }
    if (!state || state.schemaVersion !== 1 || !Array.isArray(state.animals) || !Array.isArray(state.trainingExamples)) {
      throw new Error("Struktur database lokal tidak valid. Muat cadangan JSON yang valid untuk memulihkan aplikasi.");
    }
    state.feedback = Array.isArray(state.feedback) ? state.feedback : [];
    state.conversations = Array.isArray(state.conversations) ? state.conversations : [];
    state.favorites = Array.isArray(state.favorites) ? state.favorites : [];
    state.settings = state.settings || { trainedAt: null, trainingVersion: 0, weights: null };
    return state;
  }

  function writeState(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (error) {
      if (error && error.name === "QuotaExceededError") {
        throw new Error("Penyimpanan browser penuh. Ekspor cadangan, lalu hapus sebagian riwayat atau data.", { cause: error });
      }
      throw new Error("Gagal menyimpan perubahan ke database lokal browser.", { cause: error });
    }
  }

  function makeId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  window.HewanDB = {
    read: readState,
    save: writeState,
    id: makeId,
    reset: function () {
      const fresh = createInitialState();
      writeState(fresh);
      return fresh;
    }
  };
}());
