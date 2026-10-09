(function () {
  "use strict";
  const DEFAULT_WEIGHTS = { space: 15, cost: 15, care: 20, noise: 10, difficulty: 15, time: 15, activity: 10 };
  const PARAMETER_NAMES = {
    space: "kebutuhan ruang",
    cost: "biaya",
    care: "perawatan",
    noise: "kebisingan",
    difficulty: "pengalaman",
    time: "waktu luang",
    activity: "tingkat aktivitas"
  };
  const INTENT_NAMES = {
    recommendation: "Rekomendasi hewan",
    animal_information: "Informasi hewan",
    animal_care: "Perawatan hewan",
    animal_comparison: "Perbandingan",
    animal_characteristic: "Karakteristik hewan",
    health_safety: "Keamanan kesehatan",
    unknown: "Belum dikenali"
  };

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(text) {
    return normalize(text).split(" ").filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  }

  const STOP_WORDS = new Set(["apa", "yang", "dan", "atau", "dengan", "untuk", "dari", "saya", "aku", "ini", "itu", "nya", "kah", "bisa", "bagaimana", "gimana", "cara", "tolong", "dong", "ya", "kah", "hewan", "peliharaan", "memelihara"]);

  function similarity(left, right) {
    const a = new Set(tokens(left));
    const b = new Set(tokens(right));
    if (!a.size || !b.size) return 0;
    let intersection = 0;
    a.forEach((word) => { if (b.has(word)) intersection += 1; });
    const dice = (2 * intersection) / (a.size + b.size);
    const phraseBonus = normalize(left).includes(normalize(right)) || normalize(right).includes(normalize(left)) ? 0.18 : 0;
    return Math.min(1, dice + phraseBonus);
  }

  function findAnimal(text, animals) {
    const source = normalize(text);
    const terms = animals.flatMap((animal) => [animal.name].concat(animal.aliases || []).map((alias) => ({ animal: animal, alias: normalize(alias) })));
    terms.sort((a, b) => b.alias.length - a.alias.length);
    return terms.find((item) => item.alias && source.includes(item.alias))?.animal || null;
  }

  function findAnimals(text, animals) {
    const source = normalize(text);
    const found = [];
    animals.forEach((animal) => {
      const aliases = [animal.name].concat(animal.aliases || []);
      if (aliases.some((alias) => alias && source.includes(normalize(alias)))) found.push(animal);
    });
    return found;
  }

  function detectIntent(text, examples) {
    const value = normalize(text);
    const scores = {
      health_safety: scoreTerms(value, ["sakit", "muntah", "diare", "luka", "berdarah", "tidak mau makan", "kejang", "sesak", "keracunan", "gejala", "dokter hewan"]),
      animal_comparison: scoreTerms(value, ["bandingkan", "dibanding", "vs", "versus", "lebih cocok", "beda", "perbedaan"]),
      animal_care: scoreTerms(value, ["cara merawat", "perawatan", "mandi", "kandang", "habitat", "vaksin", "grooming", "disiapkan", "persiapan"]),
      animal_information: scoreTerms(value, ["makan", "makanan", "pakan", "minum", "umur", "usia", "lama hidup", "fakta", "informasi", "apa itu", "suhu"]),
      animal_characteristic: scoreTerms(value, ["tidak berisik", "tenang", "kecil", "mudah", "pemula", "aktif", "ramah", "cocok untuk", "karakter"]),
      recommendation: scoreTerms(value, ["rekomendasi", "merekomendasikan", "cocok", "ingin memelihara", "mau pelihara", "anak kos", "ruang kecil", "budget", "anggaran", "waktu saya"])
    };
    let learnedBest = null;
    let learnedScore = 0;
    (examples || []).filter((example) => example.status === "trained").forEach((example) => {
      const score = similarity(value, example.input);
      if (score > learnedScore) {
        learnedBest = example;
        learnedScore = score;
      }
    });
    if (learnedBest && learnedScore >= 0.46) {
      return { intent: learnedBest.intent, confidence: Math.min(.99, .64 + learnedScore * .33), learnedExample: learnedBest, scores: scores };
    }
    const best = Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
    const score = scores[best];
    return score > 0 ? { intent: best, confidence: Math.min(.96, .48 + score * .13), learnedExample: null, scores: scores } : { intent: "unknown", confidence: Math.max(.08, learnedScore * .55), learnedExample: null, scores: scores };
  }

  function scoreTerms(text, phrases) {
    return phrases.reduce((sum, phrase) => sum + (text.includes(normalize(phrase)) ? (phrase.includes(" ") ? 2 : 1) : 0), 0);
  }

  function extractParameters(text) {
    const value = normalize(text);
    const prefs = {};
    const patterns = {
      space: { small: ["kos", "apartemen", "ruang kecil", "sempit", "kecil"], large: ["luas", "halaman", "ruang besar", "besar"] },
      cost: { low: ["murah", "hemat", "budget rendah", "anggaran rendah", "biaya rendah", "terbatas"], high: ["budget tinggi", "anggaran besar", "biaya tinggi", "mahal"] },
      care: { low: ["perawatan sedikit", "minim perawatan", "tidak banyak perawatan"], high: ["perawatan intensif", "siap merawat", "banyak perawatan"] },
      noise: { low: ["tidak berisik", "tidak suka suara", "tenang", "sunyi", "tidak berisik"], high: ["tidak masalah berisik", "suka suara", "tidak keberatan berisik"] },
      difficulty: { beginner: ["pemula", "baru pertama", "belum pernah", "pertama kali"], experienced: ["berpengalaman", "sudah berpengalaman", "ahli"] },
      time: { low: ["sedikit waktu", "jarang di rumah", "waktu terbatas", "sibuk", "tidak banyak waktu"], high: ["banyak waktu", "punya banyak waktu", "waktu luang"] },
      activity: { low: ["tidak aktif", "tenang", "tidak perlu diajak"], high: ["aktif", "suka bermain", "enerjik", "energetik"] }
    };
    Object.keys(patterns).forEach((key) => {
      const levels = patterns[key];
      Object.keys(levels).some((level) => {
        if (levels[level].some((phrase) => value.includes(normalize(phrase)))) {
          prefs[key] = level;
          return true;
        }
        return false;
      });
    });
    return prefs;
  }

  function compatibility(userPrefs, animal, customWeights) {
    const weights = customWeights || DEFAULT_WEIGHTS;
    const entries = Object.keys(userPrefs).filter((key) => Object.prototype.hasOwnProperty.call(weights, key) && Number(weights[key]) > 0);
    if (!entries.length) return { score: 50, reasons: ["Belum ada preferensi yang terdeteksi"], coverage: 0 };
    const dimensionMatches = {
      space: (user, value) => ({ small: { small: 1, medium: .55, large: .15 }, medium: { small: .7, medium: 1, large: .55 }, large: { small: .3, medium: .75, large: 1 } })[user]?.[value] ?? .45,
      cost: (user, value) => ({ low: { low: 1, medium: .52, high: .12 }, medium: { low: .72, medium: 1, high: .48 }, high: { low: .3, medium: .72, high: 1 } })[user]?.[value] ?? .45,
      care: (user, value) => ({ low: { easy: 1, medium: .48, hard: .12 }, medium: { easy: .78, medium: 1, hard: .45 }, high: { easy: .7, medium: .9, hard: 1 } })[user]?.[value] ?? .45,
      noise: (user, value) => ({ low: { none: 1, low: .9, medium: .48, high: .12 }, high: { none: .55, low: .72, medium: .9, high: 1 } })[user]?.[value] ?? .5,
      difficulty: (user, value) => ({ beginner: { easy: 1, medium: .5, hard: .08 }, experienced: { easy: .62, medium: .85, hard: 1 } })[user]?.[value] ?? .45,
      time: (user, value) => ({ low: { low: 1, medium: .5, high: .12 }, high: { low: .6, medium: .86, high: 1 } })[user]?.[value] ?? .45,
      activity: (user, value) => ({ low: { low: 1, medium: .55, high: .22 }, high: { low: .5, medium: .82, high: 1 } })[user]?.[value] ?? .45
    };
    let earned = 0;
    let possible = 0;
    const reasons = [];
    entries.forEach((key) => {
      const weight = weights[key] == null ? (DEFAULT_WEIGHTS[key] || 0) : Number(weights[key]);
      const result = dimensionMatches[key](userPrefs[key], animal[key]);
      earned += result * weight;
      possible += weight;
      if (result >= .78) reasons.push("Sesuai dengan " + PARAMETER_NAMES[key] + " yang kamu inginkan");
      else if (result <= .3) reasons.push("Perlu dipertimbangkan: " + PARAMETER_NAMES[key] + " mungkin kurang sesuai");
    });
    const score = possible ? Math.round((earned / possible) * 100) : 50;
    return { score: score, reasons: reasons.slice(0, 4), coverage: entries.length };
  }

  function rankAnimals(animals, prefs, customWeights) {
    return animals.map((animal) => {
      const result = compatibility(prefs, animal, customWeights);
      return { animal: animal, score: result.score, reasons: result.reasons, coverage: result.coverage };
    }).sort((a, b) => b.score - a.score);
  }

  function buildResponse(text, state) {
    const intentResult = detectIntent(text, state.trainingExamples);
    const entity = findAnimal(text, state.animals);
    const mentions = findAnimals(text, state.animals);
    if (intentResult.learnedExample && intentResult.learnedExample.expectedOutput) {
      return { text: intentResult.learnedExample.expectedOutput, intent: intentResult.intent, confidence: intentResult.confidence, recommendations: [], pending: false };
    }
    if (intentResult.intent === "health_safety") {
      return { text: "Aku tidak bisa mendiagnosis atau memastikan penyebab gejala. Jika hewan muntah berulang, tidak mau makan, sulit bernapas, mengalami perdarahan, kejang, atau kondisinya memburuk, segera hubungi dokter hewan. Sampaikan gejala, kapan mulai, dan perubahan makan/minumnya. Jangan memberikan obat manusia tanpa arahan dokter hewan.", intent: intentResult.intent, confidence: intentResult.confidence, recommendations: [], pending: false };
    }
    if (intentResult.intent === "animal_comparison") {
      if (mentions.length >= 2) {
        return { text: "Aku menemukan " + mentions[0].name + " dan " + mentions[1].name + ". Buka menu Bandingkan untuk melihat kebutuhan ruang, waktu, biaya, dan perawatan secara berdampingan.", intent: intentResult.intent, confidence: intentResult.confidence, recommendations: [], pending: false, compareIds: [mentions[0].id, mentions[1].id] };
      }
      return { text: "Hewan mana yang ingin kamu bandingkan? Sebutkan dua nama, misalnya “bandingkan kucing dan kelinci”.", intent: intentResult.intent, confidence: intentResult.confidence, recommendations: [], pending: false };
    }
    if (intentResult.intent === "recommendation" || intentResult.intent === "animal_characteristic") {
      const prefs = extractParameters(text);
      if (!Object.keys(prefs).length) {
        return { text: "Boleh ceritakan sedikit tentang tempat tinggalmu, anggaran, waktu luang, pengalaman merawat hewan, atau seberapa tenang hewan yang kamu cari? Aku akan mencocokkan pilihan berdasarkan kebutuhanmu, bukan memilih secara acak.", intent: intentResult.intent, confidence: intentResult.confidence, recommendations: [], pending: false };
      }
      const ranked = rankAnimals(state.animals, prefs, state.settings.weights).slice(0, 3);
      return { text: "Aku mencocokkan " + Object.keys(prefs).length + " kebutuhan yang terdeteksi. Ini panduan awal—periksa profil dan pastikan kebutuhan spesifik hewannya dapat kamu penuhi.", intent: intentResult.intent, confidence: intentResult.confidence, recommendations: ranked, pending: false };
    }
    if ((intentResult.intent === "animal_information" || intentResult.intent === "animal_care") && entity) {
      const isCare = intentResult.intent === "animal_care";
      const answer = isCare
        ? entity.name + ": " + entity.careGuide
        : entity.name + " (" + entity.scientificName + ") umumnya memerlukan makanan berikut: " + entity.food + "\n\nMasa hidup: " + entity.lifespan + ". Lingkungan: " + entity.habitat;
      return { text: answer, intent: intentResult.intent, confidence: intentResult.confidence, recommendations: [], pending: false, animalId: entity.id };
    }
    if (intentResult.intent === "animal_information" || intentResult.intent === "animal_care") {
      return { text: "Hewan apa yang kamu maksud? Sebutkan namanya—contohnya kucing, hamster, kelinci, ikan cupang, atau burung—agar aku bisa mengambil informasi yang tepat.", intent: intentResult.intent, confidence: intentResult.confidence, recommendations: [], pending: false };
    }
    if (intentResult.intent === "unknown") {
      return { text: "Aku belum tahu jawaban untuk pertanyaan itu. Bisa jelaskan sedikit lagi—misalnya nama hewan dan kebutuhanmu? Aku bisa belajar dari contoh jawaban yang kamu ajarkan di menu Latih AI. Pertanyaan ini akan masuk ke daftar untuk ditinjau, belum dianggap sebagai fakta.", intent: "unknown", confidence: intentResult.confidence, recommendations: [], pending: true };
    }
    return { text: "Aku mengenali pertanyaan tentang hewan, tetapi belum menemukan jawaban yang cukup spesifik. Sebutkan nama hewan atau ceritakan konteksnya supaya aku dapat membantu dengan tepat.", intent: intentResult.intent, confidence: intentResult.confidence, recommendations: [], pending: true };
  }

  window.HewanAI = {
    normalize: normalize,
    similarity: similarity,
    detectIntent: detectIntent,
    extractParameters: extractParameters,
    compatibility: compatibility,
    rankAnimals: rankAnimals,
    findAnimal: findAnimal,
    buildResponse: buildResponse,
    intentNames: INTENT_NAMES,
    parameterNames: PARAMETER_NAMES,
    defaultWeights: DEFAULT_WEIGHTS
  };
}());
