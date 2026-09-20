const hallmarks = [
  ["Genomic instability", "Accumulation of DNA damage and errors that can affect cellular function."],
  ["Telomere attrition", "Progressive changes to chromosome-end structures associated with replicative history and cellular stress."],
  ["Epigenetic alterations", "Age-associated changes in gene regulation and chromatin state."],
  ["Loss of proteostasis", "Declining ability to maintain correctly folded, functional proteins."],
  ["Disabled macroautophagy", "Reduced efficiency of cellular recycling pathways that clear damaged components."],
  ["Deregulated nutrient sensing", "Age-associated changes in pathways that respond to nutrients and energy availability."],
  ["Mitochondrial dysfunction", "Changes in energy-producing organelles, signaling, and metabolic function."],
  ["Cellular senescence", "Cells enter durable growth arrest and can alter surrounding tissue through secreted signals."],
  ["Stem cell exhaustion", "Reduced regenerative capacity in tissue-specific stem and progenitor cell pools."],
  ["Altered intercellular communication", "Changes in hormonal, neuronal, immune, and other signals between cells and tissues."],
  ["Chronic inflammation", "Persistent low-grade inflammatory signaling associated with aging and many age-related conditions."],
  ["Dysbiosis", "Age-associated changes in host-associated microbial communities and their interactions with the body."]
];

const researchTopics = [
  {
    title: "Cellular senescence",
    level: "mechanistic",
    summary: "Study why senescent cells accumulate, how they signal to surrounding tissue, and when removing or modifying them helps or harms.",
    tags: ["hallmark", "senescence", "mechanisms"]
  },
  {
    title: "Senolytic interventions",
    level: "interventional",
    summary: "Track human trials separately from animal findings. Record intervention, population, endpoints, adverse events, and trial status.",
    tags: ["clinical trials", "senolytics", "human evidence"]
  },
  {
    title: "Epigenetic clocks",
    level: "observational",
    summary: "Compare what different biological-age clocks measure, the populations in which they were validated, and whether changes predict meaningful outcomes.",
    tags: ["biomarkers", "epigenetics", "biological age"]
  },
  {
    title: "Exercise and healthspan",
    level: "interventional",
    summary: "Organize randomized and prospective human evidence on strength, aerobic fitness, mobility, metabolic health, and aging-related outcomes.",
    tags: ["exercise", "healthspan", "human evidence"]
  },
  {
    title: "Nutrient-sensing pathways",
    level: "animal",
    summary: "Track findings involving pathways such as mTOR, AMPK, insulin/IGF signaling, and sirtuins while keeping animal longevity results distinct from human outcomes.",
    tags: ["metabolism", "nutrient sensing", "animal evidence"]
  },
  {
    title: "Mitochondrial biology",
    level: "mechanistic",
    summary: "Explore mitochondrial quality control, energy metabolism, signaling, and how these processes change with age.",
    tags: ["mitochondria", "hallmark", "mechanisms"]
  }
];

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    panels.forEach((panel) => panel.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

function renderHallmarks() {
  const root = document.getElementById("hallmarkCards");
  root.innerHTML = hallmarks.map(([title, description], index) => `
    <article class="card">
      <span class="chip">Hallmark ${index + 1}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
    </article>
  `).join("");
}

function renderResearch() {
  const query = document.getElementById("researchSearch").value.trim().toLowerCase();
  const level = document.getElementById("evidenceFilter").value;

  const filtered = researchTopics.filter((item) => {
    const haystack = [item.title, item.summary, ...item.tags].join(" ").toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesLevel = level === "all" || item.level === level;
    return matchesQuery && matchesLevel;
  });

  const root = document.getElementById("researchCards");
  if (!filtered.length) {
    root.innerHTML = '<div class="empty-state">No matching research topics yet.</div>';
    return;
  }

  root.innerHTML = filtered.map((item) => `
    <article class="card">
      <span class="chip">${labelForLevel(item.level)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div>${item.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}</div>
    </article>
  `).join("");
}

function labelForLevel(level) {
  return {
    mechanistic: "Mechanistic / cell",
    animal: "Animal",
    observational: "Human observational",
    interventional: "Human interventional"
  }[level] || level;
}

document.getElementById("researchSearch").addEventListener("input", renderResearch);
document.getElementById("evidenceFilter").addEventListener("change", renderResearch);

document.getElementById("trialSearchButton").addEventListener("click", () => {
  const query = document.getElementById("trialQuery").value.trim() || "aging";
  const url = `https://clinicaltrials.gov/search?term=${encodeURIComponent(query)}`;
  window.open(url, "_blank", "noopener,noreferrer");
});

const noteForm = document.getElementById("noteForm");
const notesList = document.getElementById("notesList");
const storageKey = "healthspanLabNotesV1";

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(storageKey, JSON.stringify(notes));
}

function renderNotes() {
  const notes = loadNotes();
  if (!notes.length) {
    notesList.innerHTML = '<div class="empty-state">No research notes yet. Add the first one above.</div>';
    return;
  }

  notesList.innerHTML = notes.map((note) => `
    <article class="note">
      <div class="note-head">
        <div>
          <h3>${escapeHtml(note.title)}</h3>
          <time datetime="${note.createdAt}">${new Date(note.createdAt).toLocaleString()}</time>
        </div>
        <button class="danger" data-delete-note="${note.id}">Delete</button>
      </div>
      <p class="note-body">${escapeHtml(note.body)}</p>
      <div>${note.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}</div>
    </article>
  `).join("");

  document.querySelectorAll("[data-delete-note]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteNote;
      saveNotes(loadNotes().filter((note) => note.id !== id));
      renderNotes();
    });
  });
}

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = document.getElementById("noteTitle").value.trim();
  const body = document.getElementById("noteBody").value.trim();
  const tags = document.getElementById("noteTags").value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const notes = loadNotes();
  notes.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title,
    body,
    tags,
    createdAt: new Date().toISOString()
  });

  saveNotes(notes);
  noteForm.reset();
  renderNotes();
});

document.getElementById("exportNotes").addEventListener("click", () => {
  const data = JSON.stringify({
    exportedAt: new Date().toISOString(),
    project: "Healthspan Lab",
    notes: loadNotes()
  }, null, 2);

  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "healthspan-lab-notes.json";
  link.click();
  URL.revokeObjectURL(url);
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderHallmarks();
renderResearch();
renderNotes();