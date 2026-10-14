// Listening: generate a transcript, read it aloud with TTS, then quiz.
(function () {
  const genBtn = document.getElementById("listeningGen");
  const levelEl = document.getElementById("listeningLevel");
  const player = document.getElementById("listeningPlayer");
  const transcriptEl = document.getElementById("listeningTranscript");
  const questionsEl = document.getElementById("listeningQuestions");
  const showScriptBtn = document.getElementById("listeningShowScript");
  let transcript = "";

  genBtn.addEventListener("click", async () => {
    showLoader();
    try {
      const data = await api("/api/listening/generate", { level: levelEl.value });
      transcript = data.transcript;
      transcriptEl.textContent = `${data.title}\n\n${data.transcript}`;
      transcriptEl.classList.add("hidden");
      showScriptBtn.textContent = t("listening.showScript");
      player.classList.remove("hidden");
      renderQuestions(questionsEl, data.questions);
      player.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      questionsEl.innerHTML = `<p class="muted">⚠ ${escapeHtml(e.message)}</p>`;
    } finally { hideLoader(); }
  });

  document.getElementById("listeningPlay").addEventListener("click", () => {
    if (!window.speechSynthesis || !transcript) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(transcript);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  });
  document.getElementById("listeningStop").addEventListener("click", () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  });
  showScriptBtn.addEventListener("click", () => {
    const hidden = transcriptEl.classList.toggle("hidden");
    showScriptBtn.textContent = hidden ? t("listening.showScript") : t("listening.hideScript");
  });
})();
