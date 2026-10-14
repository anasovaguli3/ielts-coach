// Writing: submit an essay and render band-scored feedback.
(function () {
  const promptEl = document.getElementById("writingPrompt");
  const essayEl = document.getElementById("writingEssay");
  const wordsEl = document.getElementById("writingWords");
  const feedbackEl = document.getElementById("writingFeedback");
  let task = 1;

  function countWords() {
    const n = essayEl.value.trim() ? essayEl.value.trim().split(/\s+/).length : 0;
    wordsEl.textContent = n;
  }
  essayEl.addEventListener("input", countWords);
  countWords();

  document.querySelectorAll("#writingTask .seg").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#writingTask .seg").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      task = parseInt(btn.dataset.task, 10);
    });
  });

  document.getElementById("writingAssess").addEventListener("click", async () => {
    if (!essayEl.value.trim()) {
      feedbackEl.innerHTML = `<p class="muted">${t("writing.empty")}</p>`;
      return;
    }
    showLoader();
    try {
      const fb = await api("/api/writing/assess", {
        task,
        prompt: promptEl.value.trim(),
        essay: essayEl.value.trim(),
      });
      feedbackEl.innerHTML = renderFeedback(fb);
      feedbackEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      feedbackEl.innerHTML = `<p class="muted">⚠ ${escapeHtml(e.message)}</p>`;
    } finally { hideLoader(); }
  });
})();
