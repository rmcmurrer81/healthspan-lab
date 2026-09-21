"use strict";

/*
 * Healthspan Lab V2.1
 * Local health-record intake, reviewable fact extraction, and research-backed
 * product-category discovery.
 *
 * Important design rule:
 * - Uploaded records are stored per profile in IndexedDB.
 * - Extracted values remain drafts until the user confirms them.
 * - Confirmed fact NAMES may influence research relevance.
 * - Numeric values are not automatically interpreted as normal/abnormal.
 * - Product suggestions are category-level discovery, not treatment advice.
 */

const HEALTH_RECORD_DB = "healthspanLabHealthRecordsV1";
const HEALTH_RECORD_STORE = "records";
const HEALTH_FACTS_KEY = "healthspanLabConfirmedHealthFactsV1";
const HEALTH_MATCH_SETTINGS_KEY = "healthspanLabHealthFactMatchSettingsV1";

const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

const PRODUCT_OPTIONS = [
  {
    id: "upper-arm-bp-monitor",
    name: "Automatic upper-arm blood pressure monitor",
    category: "Home monitoring device",
    tags: ["blood pressure", "hypertension", "cardiovascular", "heart health", "bp"],
    why: "Useful when a user wants to collect repeat blood-pressure readings to discuss with a clinician. It is a monitoring device, not an anti-aging treatment.",
    safety: "Prefer an upper-arm device that has been independently validated. A single home reading should not be used to diagnose or change medication.",
    researchQuery: "home blood pressure monitoring cardiovascular outcomes systematic review",
    retailerQuery: "upper arm blood pressure monitor"
  },
  {
    id: "resistance-bands",
    name: "Resistance bands",
    category: "Exercise equipment",
    tags: ["exercise", "strength", "mobility", "sarcopenia", "frailty", "muscle", "healthy aging"],
    why: "A low-cost way to support resistance exercise when strength and mobility are research priorities.",
    safety: "Exercise choice and intensity should fit the user's abilities, injuries, and clinician or physical-therapy guidance when applicable.",
    researchQuery: "resistance training older adults muscle strength healthspan systematic review",
    retailerQuery: "resistance bands exercise"
  },
  {
    id: "activity-tracker",
    name: "Pedometer or activity tracker",
    category: "Behavior tracking device",
    tags: ["exercise", "walking", "steps", "physical activity", "cardiovascular", "mobility"],
    why: "Can help a user observe activity patterns and set measurable movement goals without claiming the device itself improves longevity.",
    safety: "Treat wearable estimates as approximate. Symptoms and medical concerns matter more than a step target.",
    researchQuery: "wearable activity tracker physical activity randomized trial adults systematic review",
    retailerQuery: "activity tracker pedometer"
  },
  {
    id: "sleep-mask",
    name: "Light-blocking sleep mask",
    category: "Sleep environment",
    tags: ["sleep", "circadian", "insomnia", "sleep quality", "light exposure"],
    why: "A simple environmental option to investigate when sleep and nighttime light exposure are part of the user's research goals.",
    safety: "Persistent sleep problems can have many causes; a sleep mask should not delay evaluation of concerning symptoms.",
    researchQuery: "sleep mask light exposure sleep quality randomized trial systematic review",
    retailerQuery: "sleep mask"
  },
  {
    id: "sunscreen",
    name: "Broad-spectrum SPF 30+ sunscreen",
    category: "Skin protection",
    tags: ["skin", "photoaging", "sun", "uv", "ultraviolet", "skin aging"],
    why: "Relevant when a user's research interests include UV exposure, skin aging, or skin protection.",
    safety: "Follow product directions and individual allergy or dermatologist guidance.",
    researchQuery: "daily sunscreen photoaging randomized trial ultraviolet skin aging",
    retailerQuery: "broad spectrum SPF 30 sunscreen"
  },
  {
    id: "digital-scale",
    name: "Digital home scale",
    category: "Home measurement device",
    tags: ["weight", "body weight", "metabolic", "obesity", "weight management"],
    why: "Can provide repeatable home measurements when body-weight trends are something the user and clinician have chosen to track.",
    safety: "Weight alone does not describe healthspan or body composition, and frequent weighing is not appropriate for everyone.",
    researchQuery: "self weighing weight management systematic review adults",
    retailerQuery: "digital bathroom scale"
  },
  {
    id: "grip-dynamometer",
    name: "Hand-grip dynamometer",
    category: "Functional measurement device",
    tags: ["grip strength", "frailty", "strength", "function", "mobility", "healthy aging"],
    why: "A research-oriented way to track grip strength when functional aging and strength are explicit goals.",
    safety: "Measurements depend on technique and device quality and should not be treated as a diagnosis.",
    researchQuery: "grip strength aging functional outcomes systematic review",
    retailerQuery: "hand grip dynamometer"
  }
];

window.getConfirmedHealthTerms = function getConfirmedHealthTerms(profileId) {
  if (!profileId) return [];
  const settings = getHealthMatchSettings();
  if (settings[profileId] === false) return [];

  return uniqueLocal(
    getConfirmedFacts()
      .filter(function (fact) { return fact.profileId === profileId; })
      .map(function (fact) { return fact.name; })
      .filter(Boolean)
  );
};

function uniqueLocal(values) {
  return Array.from(new Set(values));
}

function getConfirmedFacts() {
  try {
    const value = localStorage.getItem(HEALTH_FACTS_KEY);
    return value ? JSON.parse(value) : [];
  } catch (error) {
    return [];
  }
}

function saveConfirmedFacts(facts) {
  localStorage.setItem(HEALTH_FACTS_KEY, JSON.stringify(facts));
}

function getHealthMatchSettings() {
  try {
    const value = localStorage.getItem(HEALTH_MATCH_SETTINGS_KEY);
    return value ? JSON.parse(value) : {};
  } catch (error) {
    return {};
  }
}

function saveHealthMatchSettings(settings) {
  localStorage.setItem(HEALTH_MATCH_SETTINGS_KEY, JSON.stringify(settings));
}

function getActiveHealthProfile() {
  return typeof getActiveProfile === "function" ? getActiveProfile() : null;
}

function openHealthDb() {
  return new Promise(function (resolve, reject) {
    const request = indexedDB.open(HEALTH_RECORD_DB, 1);

    request.onupgradeneeded = function () {
      const db = request.result;
      if (!db.objectStoreNames.contains(HEALTH_RECORD_STORE)) {
        const store = db.createObjectStore(HEALTH_RECORD_STORE, { keyPath: "id" });
        store.createIndex("profileId", "profileId", { unique: false });
      }
    };

    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error || new Error("Could not open the health-record database.")); };
  });
}

async function putHealthRecord(record) {
  const db = await openHealthDb();
  return new Promise(function (resolve, reject) {
    const tx = db.transaction(HEALTH_RECORD_STORE, "readwrite");
    tx.objectStore(HEALTH_RECORD_STORE).put(record);
    tx.oncomplete = function () {
      db.close();
      resolve(record);
    };
    tx.onerror = function () {
      db.close();
      reject(tx.error || new Error("Could not save the record."));
    };
  });
}

async function getHealthRecord(id) {
  const db = await openHealthDb();
  return new Promise(function (resolve, reject) {
    const tx = db.transaction(HEALTH_RECORD_STORE, "readonly");
    const request = tx.objectStore(HEALTH_RECORD_STORE).get(id);
    request.onsuccess = function () {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = function () {
      db.close();
      reject(request.error || new Error("Could not read the record."));
    };
  });
}

async function getHealthRecordsForProfile(profileId) {
  if (!profileId) return [];
  const db = await openHealthDb();

  return new Promise(function (resolve, reject) {
    const tx = db.transaction(HEALTH_RECORD_STORE, "readonly");
    const index = tx.objectStore(HEALTH_RECORD_STORE).index("profileId");
    const request = index.getAll(IDBKeyRange.only(profileId));

    request.onsuccess = function () {
      db.close();
      const records = request.result || [];
      records.sort(function (a, b) {
        return String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || ""));
      });
      resolve(records);
    };

    request.onerror = function () {
      db.close();
      reject(request.error || new Error("Could not list health records."));
    };
  });
}

async function deleteHealthRecord(id) {
  const db = await openHealthDb();
  return new Promise(function (resolve, reject) {
    const tx = db.transaction(HEALTH_RECORD_STORE, "readwrite");
    tx.objectStore(HEALTH_RECORD_STORE).delete(id);
    tx.oncomplete = function () {
      db.close();
      resolve();
    };
    tx.onerror = function () {
      db.close();
      reject(tx.error || new Error("Could not delete the record."));
    };
  });
}

function setRecordStatus(message, type) {
  const root = document.getElementById("recordExtractionStatus");
  if (!root) return;
  root.textContent = message || "";
  root.className = "research-status" + (type ? " " + type : "");
}

async function handleRecordFiles(files) {
  const profile = getActiveHealthProfile();

  if (!profile) {
    setRecordStatus("Create or select a household profile before adding medical records.", "error");
    if (typeof openTab === "function") openTab("profiles");
    return;
  }

  const allowed = Array.from(files || []).filter(function (file) {
    return file.type === "application/pdf" || file.type.startsWith("image/");
  });

  if (!allowed.length) {
    setRecordStatus("Choose a PDF or image file.", "error");
    return;
  }

  setRecordStatus("Saving " + allowed.length + " record(s) locally…", "loading");

  for (const file of allowed) {
    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : "record-" + Date.now() + "-" + Math.random(),
      profileId: profile.id,
      name: file.name,
      type: file.type || "",
      size: file.size,
      lastModified: file.lastModified || null,
      uploadedAt: new Date().toISOString(),
      recordDate: "",
      blob: file,
      extractedText: "",
      draftFacts: [],
      extractionStatus: "not_extracted"
    };
    await putHealthRecord(record);
  }

  setRecordStatus("Saved locally. Use “Extract draft facts” on a record when you want Healthspan Lab to read it.");
  await renderHealthRecords();
}

function loadExternalScript(src, globalName) {
  if (globalName && window[globalName]) return Promise.resolve(window[globalName]);

  return new Promise(function (resolve, reject) {
    const existing = Array.from(document.scripts).find(function (script) {
      return script.src === src;
    });

    if (existing) {
      existing.addEventListener("load", function () { resolve(globalName ? window[globalName] : true); }, { once: true });
      existing.addEventListener("error", function () { reject(new Error("Could not load " + src)); }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = function () { resolve(globalName ? window[globalName] : true); };
    script.onerror = function () { reject(new Error("Could not load the local extraction library.")); };
    document.head.appendChild(script);
  });
}

async function extractTextFromPdf(blob) {
  await loadExternalScript(PDFJS_URL, "pdfjsLib");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  const data = await blob.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: data }).promise;
  const pageLimit = Math.min(pdf.numPages, 12);
  const textParts = [];

  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    setRecordStatus("Reading PDF text, page " + pageNumber + " of " + pageLimit + "…", "loading");
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map(function (item) { return item.str; }).join(" ");
    if (pageText.trim()) textParts.push(pageText);
  }

  let text = textParts.join("\n");

  if (text.replace(/\s/g, "").length < 80 && pdf.numPages) {
    setRecordStatus("This PDF looks scanned. Running local OCR on the first page…", "loading");
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    text = await extractTextFromImageSource(canvas);
  }

  return text;
}

async function extractTextFromImageSource(source) {
  await loadExternalScript(TESSERACT_URL, "Tesseract");

  const result = await window.Tesseract.recognize(source, "eng", {
    logger: function (message) {
      if (message && message.status) {
        const percent = typeof message.progress === "number" ? " " + Math.round(message.progress * 100) + "%" : "";
        setRecordStatus("OCR: " + message.status + percent, "loading");
      }
    }
  });

  return result && result.data ? result.data.text || "" : "";
}

async function extractTextForRecord(record) {
  if (record.type === "application/pdf") return extractTextFromPdf(record.blob);
  if (record.type && record.type.startsWith("image/")) return extractTextFromImageSource(record.blob);
  throw new Error("This file type is not supported for extraction.");
}

function parseDraftFacts(text, record) {
  const source = String(text || "").replace(/\r/g, "\n");
  const drafts = [];
  const patterns = [
    { name: "Hemoglobin A1c", regex: /\b(?:hemoglobin\s*a1c|hba1c|a1c)\b[^\n]{0,40}?([0-9]+(?:\.[0-9]+)?)\s*(%)/ig },
    { name: "LDL cholesterol", regex: /\b(?:ldl(?:\s+cholesterol)?|ldl-c)\b[^\n]{0,45}?([0-9]+(?:\.[0-9]+)?)\s*(mg\/dL|mmol\/L)?/ig },
    { name: "HDL cholesterol", regex: /\b(?:hdl(?:\s+cholesterol)?|hdl-c)\b[^\n]{0,45}?([0-9]+(?:\.[0-9]+)?)\s*(mg\/dL|mmol\/L)?/ig },
    { name: "Triglycerides", regex: /\btriglycerides?\b[^\n]{0,45}?([0-9]+(?:\.[0-9]+)?)\s*(mg\/dL|mmol\/L)?/ig },
    { name: "Total cholesterol", regex: /\btotal\s+cholesterol\b[^\n]{0,45}?([0-9]+(?:\.[0-9]+)?)\s*(mg\/dL|mmol\/L)?/ig },
    { name: "Glucose", regex: /\b(?:fasting\s+)?glucose\b[^\n]{0,45}?([0-9]+(?:\.[0-9]+)?)\s*(mg\/dL|mmol\/L)?/ig },
    { name: "Creatinine", regex: /\bcreatinine\b[^\n]{0,45}?([0-9]+(?:\.[0-9]+)?)\s*(mg\/dL|µmol\/L|umol\/L)?/ig },
    { name: "eGFR", regex: /\b(?:egfr|estimated\s+glomerular\s+filtration\s+rate)\b[^\n]{0,55}?([0-9]+(?:\.[0-9]+)?)\s*(mL\/min\/1\.73m2|mL\/min)?/ig },
    { name: "Vitamin D", regex: /\b(?:25[- ]?hydroxy\s+)?vitamin\s+d\b[^\n]{0,50}?([0-9]+(?:\.[0-9]+)?)\s*(ng\/mL|nmol\/L)?/ig },
    { name: "TSH", regex: /\bTSH\b[^\n]{0,45}?([0-9]+(?:\.[0-9]+)?)\s*(mIU\/L|uIU\/mL|µIU\/mL)?/ig },
    { name: "BMI", regex: /\bBMI\b[^\n]{0,35}?([0-9]+(?:\.[0-9]+)?)/ig },
    { name: "Weight", regex: /\bweight\b[^\n]{0,35}?([0-9]+(?:\.[0-9]+)?)\s*(lb|lbs|kg)/ig }
  ];

  patterns.forEach(function (pattern) {
    let match;
    let guard = 0;
    while ((match = pattern.regex.exec(source)) !== null && guard < 4) {
      drafts.push({
        id: crypto.randomUUID ? crypto.randomUUID() : "draft-" + Date.now() + "-" + guard,
        name: pattern.name,
        value: match[1] || "",
        unit: match[2] || "",
        recordDate: record.recordDate || "",
        sourceName: record.name
      });
      guard += 1;
    }
  });

  const bpRegex = /\b(?:blood\s+pressure|bp)\b[^\n]{0,35}?([0-9]{2,3})\s*\/\s*([0-9]{2,3})/ig;
  let bpMatch;
  if ((bpMatch = bpRegex.exec(source))) {
    drafts.push({
      id: crypto.randomUUID ? crypto.randomUUID() : "draft-bp-" + Date.now(),
      name: "Blood pressure",
      value: bpMatch[1] + "/" + bpMatch[2],
      unit: "mmHg",
      recordDate: record.recordDate || "",
      sourceName: record.name
    });
  }

  const seen = new Set();
  return drafts.filter(function (fact) {
    const key = [fact.name, fact.value, fact.unit].join("|").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30);
}

async function runRecordExtraction(id) {
  const record = await getHealthRecord(id);
  if (!record) return;

  try {
    record.extractionStatus = "extracting";
    await putHealthRecord(record);
    await renderHealthRecords();

    setRecordStatus("Reading " + record.name + " locally…", "loading");
    const text = await extractTextForRecord(record);
    record.extractedText = text;
    record.draftFacts = parseDraftFacts(text, record);
    record.extractionStatus = "complete";
    record.extractedAt = new Date().toISOString();
    await putHealthRecord(record);

    if (record.draftFacts.length) {
      setRecordStatus("Extraction complete. Review " + record.draftFacts.length + " draft fact(s) before confirming them.");
    } else {
      setRecordStatus("Text extraction completed, but no supported measurements were confidently detected. You can add confirmed facts manually.");
    }

    await renderHealthRecords();
  } catch (error) {
    console.error(error);
    record.extractionStatus = "error";
    record.extractionError = error.message || "Extraction failed.";
    await putHealthRecord(record);
    setRecordStatus((error.message || "Extraction failed.") + " The original record is still stored locally.", "error");
    await renderHealthRecords();
  }
}

async function confirmDraftFact(recordId, draftId) {
  const record = await getHealthRecord(recordId);
  const profile = getActiveHealthProfile();
  if (!record || !profile || record.profileId !== profile.id) return;

  const draft = (record.draftFacts || []).find(function (fact) { return fact.id === draftId; });
  if (!draft) return;

  const facts = getConfirmedFacts();
  facts.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : "fact-" + Date.now(),
    profileId: profile.id,
    recordId: record.id,
    sourceName: draft.sourceName || record.name,
    name: draft.name,
    value: draft.value,
    unit: draft.unit,
    recordDate: draft.recordDate || record.recordDate || "",
    confirmedAt: new Date().toISOString()
  });

  saveConfirmedFacts(facts);
  record.draftFacts = (record.draftFacts || []).filter(function (fact) { return fact.id !== draftId; });
  await putHealthRecord(record);

  await refreshHealthContext();
  setRecordStatus("Confirmed fact added to " + profile.name + "'s profile context.");
}

async function rejectDraftFact(recordId, draftId) {
  const record = await getHealthRecord(recordId);
  if (!record) return;
  record.draftFacts = (record.draftFacts || []).filter(function (fact) { return fact.id !== draftId; });
  await putHealthRecord(record);
  await renderHealthRecords();
}

function humanFileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

async function openStoredRecord(id) {
  const record = await getHealthRecord(id);
  if (!record || !record.blob) return;
  const url = URL.createObjectURL(record.blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
}

async function updateRecordDate(id, value) {
  const record = await getHealthRecord(id);
  if (!record) return;
  record.recordDate = value || "";
  (record.draftFacts || []).forEach(function (fact) {
    if (!fact.recordDate) fact.recordDate = record.recordDate;
  });
  await putHealthRecord(record);
  await renderHealthRecords();
}

async function removeStoredRecord(id) {
  const record = await getHealthRecord(id);
  if (!record) return;
  if (!window.confirm("Delete the local copy of " + record.name + "? Confirmed facts will remain until you delete them separately.")) return;
  await deleteHealthRecord(id);
  await renderHealthRecords();
  setRecordStatus("Local record deleted.");
}

async function renderHealthRecords() {
  const listRoot = document.getElementById("healthRecordList");
  const draftRoot = document.getElementById("draftHealthFacts");
  const profileLabel = document.getElementById("recordsProfileLabel");
  const profile = getActiveHealthProfile();

  if (!listRoot || !draftRoot || !profileLabel) return;

  if (!profile) {
    profileLabel.textContent = "No active profile";
    listRoot.innerHTML = '<div class="empty-mini">Select a profile and add a PDF or photo.</div>';
    draftRoot.innerHTML = '<div class="empty-mini">No active profile.</div>';
    renderConfirmedFacts();
    return;
  }

  profileLabel.textContent = profile.name;
  const records = await getHealthRecordsForProfile(profile.id);

  if (!records.length) {
    listRoot.innerHTML = '<div class="empty-mini">No uploaded records for ' + escapeHtml(profile.name) + '.</div>';
  } else {
    listRoot.innerHTML = records.map(function (record) {
      const statusLabel = {
        not_extracted: "Not extracted",
        extracting: "Extracting…",
        complete: "Extracted",
        error: "Extraction error"
      }[record.extractionStatus] || record.extractionStatus;

      return '<article class="record-card">' +
        '<div class="record-card-head">' +
          '<div><strong>' + escapeHtml(record.name) + '</strong>' +
          '<small>' + escapeHtml(humanFileSize(record.size)) + ' · ' + escapeHtml(record.type || "file") + '</small></div>' +
          '<span class="tag">' + escapeHtml(statusLabel) + '</span>' +
        '</div>' +
        '<label class="record-date"><span>Record date</span><input type="date" value="' + escapeHtml(record.recordDate || "") + '" data-record-date="' + escapeHtml(record.id) + '"></label>' +
        (record.extractedText
          ? '<details class="text-preview"><summary>Extracted text preview</summary><pre>' + escapeHtml(record.extractedText.slice(0, 1800)) + '</pre></details>'
          : "") +
        (record.extractionError
          ? '<p class="record-error">' + escapeHtml(record.extractionError) + '</p>'
          : "") +
        '<div class="record-actions">' +
          '<button class="button secondary" data-record-extract="' + escapeHtml(record.id) + '">' + (record.extractedText ? "Re-extract" : "Extract draft facts") + '</button>' +
          '<button class="button ghost" data-record-open="' + escapeHtml(record.id) + '">View record</button>' +
          '<button class="button danger" data-record-delete="' + escapeHtml(record.id) + '">Delete</button>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  const drafts = records.flatMap(function (record) {
    return (record.draftFacts || []).map(function (fact) {
      return { recordId: record.id, fact: fact };
    });
  });

  if (!drafts.length) {
    draftRoot.innerHTML = '<div class="empty-mini">No extracted draft facts waiting for review.</div>';
  } else {
    draftRoot.innerHTML = drafts.map(function (entry) {
      const fact = entry.fact;
      return '<article class="fact-card draft-fact">' +
        '<div><strong>' + escapeHtml(fact.name) + '</strong>' +
        '<span class="fact-value">' + escapeHtml([fact.value, fact.unit].filter(Boolean).join(" ")) + '</span>' +
        '<small>' + escapeHtml(fact.sourceName || "") + (fact.recordDate ? " · " + escapeHtml(fact.recordDate) : "") + '</small></div>' +
        '<div class="fact-actions">' +
          '<button class="button primary" data-fact-confirm="' + escapeHtml(fact.id) + '" data-record-id="' + escapeHtml(entry.recordId) + '">Confirm</button>' +
          '<button class="button ghost" data-fact-reject="' + escapeHtml(fact.id) + '" data-record-id="' + escapeHtml(entry.recordId) + '">Reject</button>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  listRoot.querySelectorAll("[data-record-extract]").forEach(function (button) {
    button.addEventListener("click", function () { runRecordExtraction(button.dataset.recordExtract); });
  });

  listRoot.querySelectorAll("[data-record-open]").forEach(function (button) {
    button.addEventListener("click", function () { openStoredRecord(button.dataset.recordOpen); });
  });

  listRoot.querySelectorAll("[data-record-delete]").forEach(function (button) {
    button.addEventListener("click", function () { removeStoredRecord(button.dataset.recordDelete); });
  });

  listRoot.querySelectorAll("[data-record-date]").forEach(function (input) {
    input.addEventListener("change", function () { updateRecordDate(input.dataset.recordDate, input.value); });
  });

  draftRoot.querySelectorAll("[data-fact-confirm]").forEach(function (button) {
    button.addEventListener("click", function () {
      confirmDraftFact(button.dataset.recordId, button.dataset.factConfirm);
    });
  });

  draftRoot.querySelectorAll("[data-fact-reject]").forEach(function (button) {
    button.addEventListener("click", function () {
      rejectDraftFact(button.dataset.recordId, button.dataset.factReject);
    });
  });

  renderConfirmedFacts();
}

function renderConfirmedFacts() {
  const root = document.getElementById("confirmedHealthFacts");
  const toggle = document.getElementById("useFactsForMatching");
  if (!root || !toggle) return;

  const profile = getActiveHealthProfile();
  if (!profile) {
    root.innerHTML = '<div class="empty-mini">No active profile.</div>';
    toggle.checked = true;
    toggle.disabled = true;
    return;
  }

  toggle.disabled = false;
  const settings = getHealthMatchSettings();
  toggle.checked = settings[profile.id] !== false;

  const facts = getConfirmedFacts().filter(function (fact) { return fact.profileId === profile.id; });

  if (!facts.length) {
    root.innerHTML = '<div class="empty-mini">No confirmed facts for this profile.</div>';
    return;
  }

  root.innerHTML = facts.map(function (fact) {
    return '<article class="fact-card confirmed-fact">' +
      '<div><strong>' + escapeHtml(fact.name) + '</strong>' +
      '<span class="fact-value">' + escapeHtml([fact.value, fact.unit].filter(Boolean).join(" ") || "Confirmed context") + '</span>' +
      '<small>' + escapeHtml(fact.recordDate || "Date not entered") +
      (fact.sourceName ? " · " + escapeHtml(fact.sourceName) : "") + '</small></div>' +
      '<div class="fact-actions">' +
        '<button class="button secondary" data-fact-research="' + escapeHtml(fact.id) + '">Research</button>' +
        '<button class="button danger" data-confirmed-delete="' + escapeHtml(fact.id) + '">Delete</button>' +
      '</div>' +
    '</article>';
  }).join("");

  root.querySelectorAll("[data-confirmed-delete]").forEach(function (button) {
    button.addEventListener("click", function () {
      saveConfirmedFacts(getConfirmedFacts().filter(function (fact) {
        return fact.id !== button.dataset.confirmedDelete;
      }));
      refreshHealthContext();
    });
  });

  root.querySelectorAll("[data-fact-research]").forEach(function (button) {
    button.addEventListener("click", function () {
      const fact = getConfirmedFacts().find(function (item) { return item.id === button.dataset.factResearch; });
      if (!fact) return;
      document.getElementById("researchQuestion").value = fact.name + " healthy aging healthspan evidence";
      if (typeof openTab === "function") openTab("command");
      if (typeof runResearch === "function") runResearch();
    });
  });
}

function collectOptionContext() {
  const profile = getActiveHealthProfile();
  const terms = [];
  if (profile && typeof profileTerms === "function") {
    terms.push.apply(terms, profileTerms(profile));
  }
  if (window.currentResearch && window.currentResearch.query) {
    terms.push(window.currentResearch.query);
  } else if (typeof currentResearch !== "undefined" && currentResearch.query) {
    terms.push(currentResearch.query);
  }

  const facts = profile
    ? getConfirmedFacts().filter(function (fact) { return fact.profileId === profile.id; })
    : [];

  facts.forEach(function (fact) { terms.push(fact.name); });

  return normalizeLocal(terms.join(" "));
}

function normalizeLocal(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreProductOption(option, context) {
  let score = 0;
  const reasons = [];

  option.tags.forEach(function (tag) {
    const normalized = normalizeLocal(tag);
    if (normalized && context.includes(normalized)) {
      score += normalized.includes(" ") ? 14 : 8;
      reasons.push(tag);
    }
  });

  return {
    score: score,
    reasons: uniqueLocal(reasons).slice(0, 4)
  };
}

function retailerSearchUrl(retailer, query) {
  if (retailer === "amazon") {
    return "https://www.amazon.com/s?k=" + encodeURIComponent(query);
  }
  return "https://www.walgreens.com/search/results.jsp?Ntt=" + encodeURIComponent(query);
}

function renderResearchBackedOptions() {
  const root = document.getElementById("researchBackedOptions");
  const summary = document.getElementById("optionsProfileSummary");
  if (!root || !summary) return;

  const profile = getActiveHealthProfile();
  const context = collectOptionContext();

  if (profile) {
    const factCount = getConfirmedFacts().filter(function (fact) { return fact.profileId === profile.id; }).length;
    summary.innerHTML =
      '<div><span class="context-label">Personalization</span><strong>' + escapeHtml(profile.name) + '</strong></div>' +
      '<p>Using profile research interests plus ' + factCount + ' confirmed health-record fact label(s). Numeric lab values are not automatically interpreted for shopping recommendations.</p>';
  } else {
    summary.innerHTML =
      '<div><span class="context-label">Personalization</span><strong>No active profile</strong></div>' +
      '<p>Run a research question or select a profile to see why an option surfaced.</p>';
  }

  const ranked = PRODUCT_OPTIONS.map(function (option) {
    const match = scoreProductOption(option, context);
    return { option: option, score: match.score, reasons: match.reasons };
  }).sort(function (a, b) { return b.score - a.score; });

  const hasContext = Boolean(context);
  const visible = ranked.filter(function (item) {
    return hasContext ? item.score > 0 : ["resistance-bands", "activity-tracker", "sunscreen"].includes(item.option.id);
  });

  if (!visible.length) {
    root.innerHTML =
      '<div class="empty-state">No low-risk product category matched the current context. Healthspan Lab will not force a product recommendation from a lab result. Use the Research button beside a confirmed fact first.</div>';
    return;
  }

  root.innerHTML = visible.map(function (item) {
    const option = item.option;
    const whyMatched = item.reasons.length
      ? "Matched context: " + item.reasons.join(", ")
      : "General healthy-aging research category";

    return '<article class="option-card">' +
      '<div class="option-card-top">' +
        '<div><span class="tag">' + escapeHtml(option.category) + '</span><h3>' + escapeHtml(option.name) + '</h3></div>' +
        '<span class="match-tag">relevance ' + item.score + '</span>' +
      '</div>' +
      '<p>' + escapeHtml(option.why) + '</p>' +
      '<div class="option-reason">' + escapeHtml(whyMatched) + '</div>' +
      '<div class="option-safety"><strong>Safety note:</strong> ' + escapeHtml(option.safety) + '</div>' +
      '<div class="option-actions">' +
        '<button class="button secondary" data-option-research="' + escapeHtml(option.id) + '">Review research</button>' +
        '<a class="button ghost retailer-link" href="' + escapeHtml(retailerSearchUrl("amazon", option.retailerQuery)) + '" target="_blank" rel="noopener noreferrer">Search Amazon ↗</a>' +
        '<a class="button ghost retailer-link" href="' + escapeHtml(retailerSearchUrl("walgreens", option.retailerQuery)) + '" target="_blank" rel="noopener noreferrer">Search Walgreens ↗</a>' +
      '</div>' +
    '</article>';
  }).join("");

  root.querySelectorAll("[data-option-research]").forEach(function (button) {
    button.addEventListener("click", function () {
      const option = PRODUCT_OPTIONS.find(function (item) { return item.id === button.dataset.optionResearch; });
      if (!option) return;
      document.getElementById("researchQuestion").value = option.researchQuery;
      if (typeof openTab === "function") openTab("command");
      if (typeof runResearch === "function") runResearch();
    });
  });
}

async function refreshHealthContext() {
  await renderHealthRecords();
  renderConfirmedFacts();
  renderResearchBackedOptions();

  if (typeof renderProfileSelector === "function") renderProfileSelector();

  if (typeof rankResearchForProfile === "function" &&
      typeof currentResearch !== "undefined" &&
      currentResearch.query) {
    rankResearchForProfile();
    if (typeof renderAllResearch === "function") renderAllResearch();
  }
}

const recordUploadInput = document.getElementById("recordUploadInput");
if (recordUploadInput) {
  recordUploadInput.addEventListener("change", async function (event) {
    await handleRecordFiles(event.target.files);
    event.target.value = "";
  });
}

const manualHealthFactForm = document.getElementById("manualHealthFactForm");
if (manualHealthFactForm) {
  manualHealthFactForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const profile = getActiveHealthProfile();
    if (!profile) {
      setRecordStatus("Select a profile first.", "error");
      return;
    }

    const fact = {
      id: crypto.randomUUID ? crypto.randomUUID() : "fact-" + Date.now(),
      profileId: profile.id,
      recordId: "",
      sourceName: "Manual entry",
      name: document.getElementById("manualFactName").value.trim(),
      value: document.getElementById("manualFactValue").value.trim(),
      unit: document.getElementById("manualFactUnit").value.trim(),
      recordDate: document.getElementById("manualFactDate").value,
      confirmedAt: new Date().toISOString()
    };

    const facts = getConfirmedFacts();
    facts.unshift(fact);
    saveConfirmedFacts(facts);
    event.target.reset();
    await refreshHealthContext();
    setRecordStatus("Confirmed fact added to " + profile.name + "'s local context.");
  });
}

const useFactsToggle = document.getElementById("useFactsForMatching");
if (useFactsToggle) {
  useFactsToggle.addEventListener("change", function () {
    const profile = getActiveHealthProfile();
    if (!profile) return;
    const settings = getHealthMatchSettings();
    settings[profile.id] = useFactsToggle.checked;
    saveHealthMatchSettings(settings);
    refreshHealthContext();
  });
}

const refreshOptionsBtn = document.getElementById("refreshOptionsBtn");
if (refreshOptionsBtn) {
  refreshOptionsBtn.addEventListener("click", renderResearchBackedOptions);
}

window.addEventListener("healthspan:profile-changed", function () {
  renderHealthRecords();
  renderResearchBackedOptions();
});

window.addEventListener("healthspan:research-rendered", function () {
  renderResearchBackedOptions();
});

renderHealthRecords();
renderResearchBackedOptions();

if (typeof renderProfileSelector === "function") {
  renderProfileSelector();
}
