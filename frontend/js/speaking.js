// Speaking: live conversation with the AI examiner using the browser's
// SpeechRecognition (mic -> text) and SpeechSynthesis (examiner -> voice).
(function () {
  const chatEl = document.getElementById("speakingChat");
  const micBtn = document.getElementById("micBtn");
  const micStatus = document.getElementById("micStatus");
  const typeRow = document.getElementById("speakingTypeRow");
  const typeInput = document.getElementById("speakingInput");
  const feedbackEl = document.getElementById("speakingFeedback");

  let part = 1;
  let messages = [];      // {role:'user'|'assistant', content}
  let recognizing = false;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;
  if (SR) {
    recog = new SR();
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = (e) => {
      const text = e.results[0][0].transcript.trim();
      if (text) handleUser(text);
    };
    recog.onerror = () => stopRec();
    recog.onend = () => stopRec();
  }

  // ---- UI helpers ---- //
  function bubble(text, who) {
    const b = document.createElement("div");
    b.className = "bubble " + (who === "user" ? "me" : "ex");
    b.textContent = text;
    chatEl.appendChild(b);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.98;
    window.speechSynthesis.speak(u);
  }

  function startRec() {
    if (!recog) { micStatus.textContent = t("speaking.noSpeech"); return; }
    try { recog.start(); } catch { return; }
    recognizing = true;
    micBtn.classList.add("rec");
    micStatus.textContent = t("speaking.listening");
  }
  function stopRec() {
    recognizing = false;
    micBtn.classList.remove("rec");
    micStatus.textContent = t("speaking.micIdle");
  }

  // ---- conversation ---- //
  async function handleUser(text) {
    stopRec();
    bubble(text, "user");
    messages.push({ role: "user", content: text });
    micStatus.textContent = t("speaking.thinking");
    try {
      const { reply } = await api("/api/speaking/reply", { part, messages });
      messages.push({ role: "assistant", content: reply });
      bubble(reply, "assistant");
      speak(reply);
    } catch (e) {
      bubble("⚠ " + e.message, "assistant");
    }
    micStatus.textContent = t("speaking.micIdle");
  }

  async function openingQuestion() {
    micStatus.textContent = t("speaking.thinking");
    try {
      const { reply } = await api("/api/speaking/reply", {
        part,
        messages: [{ role: "user", content: "Let's begin the test." }],
      });
      messages = [
        { role: "user", content: "Let's begin the test." },
        { role: "assistant", content: reply },
      ];
      // Don't show the seed user line; only the examiner's opener.
      bubble(reply, "assistant");
      speak(reply);
    } catch (e) {
      bubble("⚠ " + e.message, "assistant");
    }
    micStatus.textContent = t("speaking.micIdle");
  }

  function reset() {
    messages = [];
    chatEl.innerHTML = "";
    feedbackEl.innerHTML = "";
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    openingQuestion();
  }

  // ---- wiring ---- //
  micBtn.addEventListener("click", () => {
    if (recognizing) { recog && recog.stop(); stopRec(); }
    else startRec();
  });

  document.getElementById("speakingType").addEventListener("click", () => {
    typeRow.classList.toggle("hidden");
    if (!typeRow.classList.contains("hidden")) typeInput.focus();
  });
  document.getElementById("speakingSend").addEventListener("click", sendTyped);
  typeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendTyped(); });
  function sendTyped() {
    const v = typeInput.value.trim();
    if (!v) return;
    typeInput.value = "";
    handleUser(v);
  }

  document.getElementById("speakingReset").addEventListener("click", reset);

  document.querySelectorAll("#speakingPart .seg").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#speakingPart .seg").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      part = parseInt(btn.dataset.part, 10);
      reset();
    });
  });

  document.getElementById("speakingFinish").addEventListener("click", async () => {
    const spoke = messages.some((m) => m.role === "user" && m.content !== "Let's begin the test.");
    if (!spoke) { feedbackEl.innerHTML = `<p class="muted">${t("speaking.empty")}</p>`; return; }
    showLoader();
    try {
      const fb = await api("/api/speaking/assess", { messages });
      feedbackEl.innerHTML = renderFeedback(fb);
    } catch (e) {
      feedbackEl.innerHTML = `<p class="muted">⚠ ${escapeHtml(e.message)}</p>`;
    } finally { hideLoader(); }
  });

  // Kick off the first question when the user first opens Speaking.
  let started = false;
  function maybeStart() {
    if (location.hash.includes("speaking") && !started) {
      started = true;
      openingQuestion();
    }
  }
  window.addEventListener("hashchange", maybeStart);
  maybeStart();
})();
