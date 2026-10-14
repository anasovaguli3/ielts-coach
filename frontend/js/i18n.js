// Bilingual strings (English / Uzbek). Toggle with the UZ/EN button.
const I18N = {
  en: {
    "nav.home": "Home", "nav.speaking": "Speaking", "nav.writing": "Writing",
    "nav.listening": "Listening", "nav.reading": "Reading",
    "home.title": "Master IELTS with an AI coach",
    "home.subtitle": "Practise Speaking with a real-time AI examiner, get band-scored feedback on your Writing, and train Listening & Reading with unlimited fresh material.",
    "home.cta": "Start Speaking",
    "home.card.speaking": "Talk to an AI examiner with your microphone. Parts 1–3, then get a band estimate.",
    "home.card.writing": "Submit Task 1 or Task 2 essays and receive detailed, criterion-by-criterion feedback.",
    "home.card.listening": "Generate fresh audio exercises read aloud, then answer and check yourself.",
    "home.card.reading": "Academic passages with True/False/Not Given, multiple choice and gap-fill questions.",
    "speaking.title": "Speaking practice",
    "speaking.hint": "Choose a part, press the mic and talk. The examiner replies out loud.",
    "speaking.reset": "Restart", "speaking.micIdle": "Press the mic to speak",
    "speaking.listening": "Listening… speak now", "speaking.thinking": "Examiner is thinking…",
    "speaking.type": "Type instead", "speaking.send": "Send",
    "speaking.finish": "Finish & get feedback",
    "speaking.noSpeech": "Speech recognition isn't supported in this browser. Use “Type instead”.",
    "speaking.empty": "Say something first, then finish for feedback.",
    "writing.title": "Writing feedback",
    "writing.hint": "Paste the question and your essay. You'll get band scores for each criterion.",
    "writing.promptLabel": "Question / prompt", "writing.essayLabel": "Your essay",
    "writing.words": "words", "writing.assess": "Assess my essay",
    "writing.empty": "Please write your essay first.",
    "listening.title": "Listening practice",
    "listening.hint": "Generate an exercise, play the audio and answer the questions.",
    "listening.generate": "Generate", "listening.play": "▶ Play", "listening.stop": "■ Stop",
    "listening.showScript": "Show transcript", "listening.hideScript": "Hide transcript",
    "reading.title": "Reading practice",
    "reading.hint": "Generate a passage and answer the questions, then check your score.",
    "reading.generate": "Generate",
    "common.check": "Check answers", "common.regenerate": "New exercise",
    "common.score": "You scored", "common.of": "of", "common.correct": "Correct",
    "common.your": "Your answer", "common.answer": "Answer",
    "fb.overall": "Overall", "fb.band": "Band", "fb.strengths": "Strengths",
    "fb.improve": "How to improve", "fb.rewrites": "Better phrasing",
    "loader.thinking": "The AI is working…",
  },
  uz: {
    "nav.home": "Bosh sahifa", "nav.speaking": "Speaking", "nav.writing": "Writing",
    "nav.listening": "Listening", "nav.reading": "Reading",
    "home.title": "AI murabbiy bilan IELTSni zabt eting",
    "home.subtitle": "Speakingni jonli AI imtihonchi bilan mashq qiling, Writing uchun ball bilan izohli baho oling, Listening va Readingni cheksiz yangi materiallar bilan mashq qiling.",
    "home.cta": "Speakingni boshlash",
    "home.card.speaking": "Mikrofon orqali AI imtihonchi bilan gaplashing. 1–3 qismlar, so‘ng taxminiy ball.",
    "home.card.writing": "Task 1 yoki Task 2 esselarini yuboring va har bir mezon bo‘yicha batafsil baho oling.",
    "home.card.listening": "Ovoz chiqarib o‘qiladigan yangi mashqlar yarating, javob bering va o‘zingizni tekshiring.",
    "home.card.reading": "True/False/Not Given, test va bo‘sh joyni to‘ldirish savollari bilan akademik matnlar.",
    "speaking.title": "Speaking mashqi",
    "speaking.hint": "Qismni tanlang, mikrofonni bosing va gapiring. Imtihonchi ovoz bilan javob beradi.",
    "speaking.reset": "Qaytadan", "speaking.micIdle": "Gapirish uchun mikrofonni bosing",
    "speaking.listening": "Tinglanmoqda… hozir gapiring", "speaking.thinking": "Imtihonchi o‘ylamoqda…",
    "speaking.type": "Yozib kiritish", "speaking.send": "Yuborish",
    "speaking.finish": "Tugatib, baho olish",
    "speaking.noSpeech": "Bu brauzerda ovoz tanish ishlamaydi. “Yozib kiritish”dan foydalaning.",
    "speaking.empty": "Avval biror narsa ayting, keyin baho uchun tugating.",
    "writing.title": "Writing bahosi",
    "writing.hint": "Savol va esseingizni joylashtiring. Har bir mezon bo‘yicha ball olasiz.",
    "writing.promptLabel": "Savol / topshiriq", "writing.essayLabel": "Esseingiz",
    "writing.words": "so‘z", "writing.assess": "Esseni baholash",
    "writing.empty": "Avval esseingizni yozing.",
    "listening.title": "Listening mashqi",
    "listening.hint": "Mashq yarating, audio-ni qo‘ying va savollarga javob bering.",
    "listening.generate": "Yaratish", "listening.play": "▶ Qo‘yish", "listening.stop": "■ To‘xtatish",
    "listening.showScript": "Matnni ko‘rsatish", "listening.hideScript": "Matnni yashirish",
    "reading.title": "Reading mashqi",
    "reading.hint": "Matn yarating, savollarga javob bering va ballingizni tekshiring.",
    "reading.generate": "Yaratish",
    "common.check": "Javoblarni tekshirish", "common.regenerate": "Yangi mashq",
    "common.score": "Ballingiz", "common.of": "/", "common.correct": "To‘g‘ri",
    "common.your": "Sizning javobingiz", "common.answer": "Javob",
    "fb.overall": "Umumiy", "fb.band": "Band", "fb.strengths": "Kuchli tomonlar",
    "fb.improve": "Qanday yaxshilash mumkin", "fb.rewrites": "Yaxshiroq ifoda",
    "loader.thinking": "AI ishlamoqda…",
  },
};

let LANG = localStorage.getItem("ielts_lang") || "en";

function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) || (I18N.en[key]) || key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.getElementById("langToggle").textContent = LANG === "en" ? "UZ" : "EN";
  document.documentElement.lang = LANG;
}

function setLang(lang) {
  LANG = lang;
  localStorage.setItem("ielts_lang", lang);
  applyI18n();
  document.dispatchEvent(new CustomEvent("langchange"));
}
