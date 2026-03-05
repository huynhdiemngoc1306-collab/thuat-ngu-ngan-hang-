let TERMS = [];
let FILTERED = [];

const el = (id) => document.getElementById(id);
const qEl = el("q");
const domainEl = el("domain");
const eqTypeEl = el("eqType");
const wfRuEl = el("wfRu");
const strengthEl = el("strength");
const rowsEl = el("rows");
const statsEl = el("stats");
const modalEl = el("modal");
const closeModalEl = el("closeModal");

const setText = (id, value) => { 
  const elem = el(id); 
  if (elem) elem.textContent = value || ""; 
};

function norm(str) {
  return (str ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function uniq(values) {
  return [...new Set(values.filter(v => (v ?? "").toString().trim() !== "").map(v => v.toString().trim()))]
    .sort((a, b) => a.localeCompare(b, "vi"));
}

function fillSelect(selectEl, values) {
  const current = selectEl.value;
  while (selectEl.options.length > 1) selectEl.remove(1);
  values.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
  if ([...selectEl.options].some(o => o.value === current)) selectEl.value = current;
}

function buildFilters() {
  fillSelect(domainEl, uniq(TERMS.map(x => x.Domain)));
  fillSelect(eqTypeEl, uniq(TERMS.map(x => x.EquivalenceType)));
  fillSelect(wfRuEl, uniq(TERMS.map(x => x.WordFormation_RU)));
  fillSelect(strengthEl, uniq(TERMS.map(x => x.EquivalenceStrength)));
}

function applyFilters() {
  const q = norm(qEl.value);
  const domain = domainEl.value;
  const eqType = eqTypeEl.value;
  const wfRu = wfRuEl.value;
  const strength = strengthEl.value;

  FILTERED = TERMS.filter(t => {
    if (domain && t.Domain !== domain) return false;
    if (eqType && t.EquivalenceType !== eqType) return false;
    if (wfRu && t.WordFormation_RU !== wfRu) return false;
    if (strength && t.EquivalenceStrength !== strength) return false;

    // Chỉ lọc khi có từ khóa hoặc filter thay đổi
    if (!q && !domain && !eqType && !wfRu && !strength) return false;

    const hay = [
      t.RU, t.EN, t.VI, t.Domain,
      t.WordFormation_RU, t.WordFormation_EN, t.WordFormation_VI,
      t.EquivalenceType, t.EquivalenceStrength,
      t.ConceptualMeaning, t.PragmaticMeaning, t.SemanticNote
    ].map(norm).join(" | ");

    return hay.includes(q);
  });

  renderTable();
  renderStats();
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTable() {
  rowsEl.innerHTML = "";
  const noResultsEl = document.getElementById("noResults");

  if (FILTERED.length === 0) {
    noResultsEl.style.display = "block";
    return;
  }

  noResultsEl.style.display = "none";

  const frag = document.createDocumentFragment();

  FILTERED.forEach((t, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.index = idx.toString();
    tr.innerHTML = `
      <td class="mono">${escapeHtml(t.RU)}</td>
      <td>${escapeHtml(t.EN)}</td>
      <td>${escapeHtml(t.VI)}</td>
      <td>${escapeHtml(t.Domain)}</td>
      <td>${escapeHtml(t.EquivalenceType)}</td>
      <td>${escapeHtml(t.EquivalenceStrength)}</td>
      <td>${escapeHtml(t.ConceptualMeaning || '(chưa điền)')}</td>
      <td>${escapeHtml(t.PragmaticMeaning || '(chưa điền)')}</td>
      <td>${escapeHtml(t.SemanticNote || '(chưa điền)')}</td>
    `;
    frag.appendChild(tr);
  });

  rowsEl.appendChild(frag);
}

function renderStats() {
  statsEl.textContent = `Hiển thị ${FILTERED.length} / ${TERMS.length} thuật ngữ`;
}

function openModalByIndex(idx) {
  const t = FILTERED[idx];
  if (!t) return;

  setText("mTitle", t.RU);
  setText("mRU", t.RU);
  setText("mEN", t.EN);
  setText("mVI", t.VI);
  setText("mDomain", t.Domain);
  setText("mConcept", t.ConceptualMeaning || "(chưa điền)");
  setText("mPrag", t.PragmaticMeaning || "(chưa điền)");
  setText("mNote", t.SemanticNote || "(chưa điền)");

  modalEl.classList.add("show");
  modalEl.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modalEl.classList.remove("show");
  modalEl.setAttribute("aria-hidden", "true");
}

async function loadData() {
  try {
    const res = await fetch("./terms.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được terms.json");
    TERMS = await res.json();

    TERMS = TERMS.map(t => ({
      RU: t.RU ?? "",
      EN: t.EN ?? "",
      VI: t.VI ?? "",
      Domain: t.Domain ?? "",
      WordFormation_RU: t.WordFormation_RU ?? "",
      WordFormation_EN: t.WordFormation_EN ?? "",
      WordFormation_VI: t.WordFormation_VI ?? "",
      EquivalenceType: t.EquivalenceType ?? "",
      EquivalenceStrength: t.EquivalenceStrength ?? "",
      ConceptualMeaning: t.ConceptualMeaning ?? "",
      PragmaticMeaning: t.PragmaticMeaning ?? "",
      SemanticNote: t.SemanticNote ?? ""
    }));

    // Sắp xếp theo RU (bảng chữ cái tiếng Nga)
    TERMS.sort((a, b) => a.RU.localeCompare(b.RU, 'ru'));

    buildFilters();

    // Ban đầu: bảng trống
    FILTERED = [];
    renderTable();
    renderStats();
  } catch (err) {
    statsEl.textContent = "Lỗi: " + err.message;
  }
}

function bindEvents() {
  qEl.addEventListener("input", applyFilters);
  domainEl.addEventListener("change", applyFilters);
  eqTypeEl.addEventListener("change", applyFilters);
  wfRuEl.addEventListener("change", applyFilters);
  strengthEl.addEventListener("change", applyFilters);

  el("reset").addEventListener("click", () => {
    qEl.value = "";
    domainEl.value = "";
    eqTypeEl.value = "";
    wfRuEl.value = "";
    strengthEl.value = "";
    applyFilters();
  });

  rowsEl.addEventListener("click", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    openModalByIndex(parseInt(tr.dataset.index, 10));
  });

  closeModalEl.addEventListener("click", closeModal);
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const targetId = btn.getAttribute("data-copy");
    const text = el(targetId)?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied";
      setTimeout(() => btn.textContent = "Copy", 800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      btn.textContent = "Copied";
      setTimeout(() => btn.textContent = "Copy", 800);
    }
  });
}

(async function init() {
  bindEvents();
  await loadData();
})();
