// Router, language toggle, and shared helpers used by every skill module.

// ---- Router -------------------------------------------------------------- //
const ROUTES = ["home", "speaking", "writing", "listening", "reading"];

function route() {
  const hash = (location.hash || "#/home").replace("#/", "");
  const view = ROUTES.includes(hash) ? hash : "home";
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("active", v.dataset.view === view);
  });
  document.querySelectorAll(".tabs a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === view);
  });
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

// ---- Language ------------------------------------------------------------ //
document.getElementById("langToggle").addEventListener("click", () => {
  setLang(LANG === "en" ? "uz" : "en");
});

// ---- Loader -------------------------------------------------------------- //
function showLoader(msg) {
  document.getElementById("loaderText").textContent = msg || t("loader.thinking");
  document.getElementById("loader").classList.remove("hidden");
}
function hideLoader() {
  document.getElementById("loader").classList.add("hidden");
}

// ---- API ----------------------------------------------------------------- //
async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

// ---- Shared: band feedback renderer ------------------------------------- //
function renderFeedback(fb) {
  const crit = fb.criteria.map((c) => `
    <div class="crit-row">
      <div class="crit-name">${escapeHtml(c.name)}</div>
      <div class="crit-band">${c.band}</div>
      <div class="crit-comment">${escapeHtml(c.comment)}</div>
    </div>`).join("");

  const rewrites = (fb.corrected_examples || []).map(
    (r) => `<div class="rewrite">${escapeHtml(r)}</div>`).join("");

  return `
    <div class="fb">
      <div class="fb-band">
        <div class="band-badge"><b>${fb.overall_band}</b><span>${t("fb.band")}</span></div>
        <div><strong>${t("fb.overall")}</strong><br>${escapeHtml(fb.summary)}</div>
      </div>
      <div class="crit">${crit}</div>
      <h4>${t("fb.strengths")}</h4>
      <ul class="good">${(fb.strengths || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      <h4>${t("fb.improve")}</h4>
      <ul class="imp">${(fb.improvements || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      ${rewrites ? `<h4>${t("fb.rewrites")}</h4>${rewrites}` : ""}
    </div>`;
}

// ---- Shared: quiz renderer + grading (Reading & Listening) --------------- //
function renderQuestions(container, questions) {
  container.dataset.total = questions.length;
  const items = questions.map((q, i) => {
    let body;
    if (q.type === "gap") {
      body = `<input type="text" data-q="${i}" placeholder="…" />`;
    } else {
      const opts = (q.options && q.options.length ? q.options : ["True", "False", "Not Given"]);
      body = opts.map((o) => `
        <label class="opt">
          <input type="radio" name="q${i}" value="${escapeAttr(o)}" data-q="${i}" />
          <span>${escapeHtml(o)}</span>
        </label>`).join("");
    }
    return `<div class="q" data-idx="${i}">
      <div class="q-prompt">${i + 1}. ${escapeHtml(q.prompt)}</div>
      ${body}
      <div class="q-explain hidden"></div>
    </div>`;
  }).join("");

  container.innerHTML = `${items}
    <button class="btn btn-primary wide" data-action="check">${t("common.check")}</button>`;

  container.querySelector('[data-action="check"]').addEventListener("click", () => {
    gradeQuestions(container, questions);
  });
}

function gradeQuestions(container, questions) {
  let correct = 0;
  questions.forEach((q, i) => {
    const box = container.querySelector(`.q[data-idx="${i}"]`);
    let given = "";
    if (q.type === "gap") {
      given = (box.querySelector("input[type=text]").value || "").trim();
    } else {
      const sel = box.querySelector("input[type=radio]:checked");
      given = sel ? sel.value : "";
    }
    const ok = normalize(given) === normalize(q.answer);
    if (ok) correct++;
    box.classList.remove("correct", "wrong");
    box.classList.add(ok ? "correct" : "wrong");
    const ex = box.querySelector(".q-explain");
    ex.classList.remove("hidden", "ok", "no");
    ex.classList.add(ok ? "ok" : "no");
    ex.innerHTML = ok
      ? `✓ ${t("common.correct")}. ${escapeHtml(q.explanation)}`
      : `✗ ${t("common.answer")}: <b>${escapeHtml(q.answer)}</b>. ${escapeHtml(q.explanation)}`;
  });

  let banner = container.querySelector(".score-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.className = "score-banner";
    container.prepend(banner);
  }
  banner.textContent = `${t("common.score")} ${correct} ${t("common.of")} ${questions.length}`;
  banner.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---- utils --------------------------------------------------------------- //
function normalize(s) {
  return (s || "").toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

// ---- boot ---------------------------------------------------------------- //
applyI18n();
route();
