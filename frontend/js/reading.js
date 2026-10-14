// Reading: generate an academic passage, show it, then quiz.
(function () {
  const genBtn = document.getElementById("readingGen");
  const levelEl = document.getElementById("readingLevel");
  const passageEl = document.getElementById("readingPassage");
  const questionsEl = document.getElementById("readingQuestions");

  genBtn.addEventListener("click", async () => {
    showLoader();
    try {
      const data = await api("/api/reading/generate", { level: levelEl.value });
      passageEl.innerHTML = `<h3>${escapeHtml(data.title)}</h3>` +
        data.passage.split(/\n\s*\n/).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      passageEl.classList.remove("hidden");
      renderQuestions(questionsEl, data.questions);
      passageEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      questionsEl.innerHTML = `<p class="muted">⚠ ${escapeHtml(e.message)}</p>`;
    } finally { hideLoader(); }
  });
})();
