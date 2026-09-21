"use strict";

const STORAGE = {
  profiles: "healthspanLabProfilesV2",
  activeProfile: "healthspanLabActiveProfileV2",
  watchlist: "healthspanLabWatchlistV2",
  notes: "healthspanLabNotesV1"
};

const EVIDENCE_LABELS = {
  human_interventional: "Human interventional",
  human_observational: "Human observational",
  animal: "Animal",
  mechanistic: "Mechanistic / cell",
  evidence_synthesis: "Review / synthesis"
};

const HALLMARKS = [
  { name: "Genomic instability", terms: ["dna damage", "genomic instability", "dna repair", "mutation"] },
  { name: "Telomere attrition", terms: ["telomere", "telomerase"] },
  { name: "Epigenetic alterations", terms: ["epigenetic", "methylation", "chromatin", "epigenomic"] },
  { name: "Loss of proteostasis", terms: ["proteostasis", "protein folding", "proteasome"] },
  { name: "Disabled macroautophagy", terms: ["autophagy", "macroautophagy", "lysosome"] },
  { name: "Deregulated nutrient sensing", terms: ["mtor", "ampk", "igf", "insulin signaling", "sirtuin", "nutrient sensing", "rapamycin"] },
  { name: "Mitochondrial dysfunction", terms: ["mitochond", "oxidative phosphorylation", "mitophagy"] },
  { name: "Cellular senescence", terms: ["senescence", "senolytic", "senomorphic", "sasp"] },
  { name: "Stem cell exhaustion", terms: ["stem cell", "progenitor", "regenerative capacity"] },
  { name: "Altered intercellular communication", terms: ["intercellular", "signaling", "endocrine", "neuroendocrine"] },
  { name: "Chronic inflammation", terms: ["inflammaging", "chronic inflammation", "inflammatory", "cytokine"] },
  { name: "Dysbiosis", terms: ["microbiome", "microbiota", "dysbiosis", "gut bacteria"] }
];

let currentResearch = {
  query: "",
  papers: [],
  paperTotal: 0,
  trials: [],
  trialTotal: 0,
  conflicts: [],
  hallmarks: [],
  ranAt: null,
  profileId: ""
};

const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = Array.from(document.querySelectorAll(".panel"));

function openTab(tabId) {
  tabs.forEach(function (tab) {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });
  panels.forEach(function (panel) {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

tabs.forEach(function (tab) {
  tab.addEventListener("click", function () {
    openTab(tab.dataset.tab);
  });
});

document.querySelectorAll("[data-open-tab]").forEach(function (button) {
  button.addEventListener("click", function () {
    openTab(button.dataset.openTab);
  });
});

document.querySelectorAll("[data-query]").forEach(function (button) {
  button.addEventListener("click", function () {
    document.getElementById("researchQuestion").value = button.dataset.query;
    document.getElementById("researchQuestion").focus();
  });
});

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeXml(value) {
  return escapeHtml(value);
}

function truncate(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function splitTerms(value) {
  return String(value || "")
    .split(/[,;\n]/)
    .map(function (item) { return item.trim(); })
    .filter(Boolean);
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const dob = new Date(birthDate + "T12:00:00");
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const month = now.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function getProfiles() {
  return readJson(STORAGE.profiles, []);
}

function getActiveProfileId() {
  return localStorage.getItem(STORAGE.activeProfile) || "";
}

function setActiveProfileId(id) {
  if (id) localStorage.setItem(STORAGE.activeProfile, id);
  else localStorage.removeItem(STORAGE.activeProfile);
}

function getActiveProfile() {
  const id = getActiveProfileId();
  return getProfiles().find(function (profile) { return profile.id === id; }) || null;
}

function profileTerms(profile) {
  if (!profile) return [];
  const confirmedHealthTerms =
    typeof window.getConfirmedHealthTerms === "function"
      ? window.getConfirmedHealthTerms(profile.id)
      : [];

  return unique(
    splitTerms(profile.conditions)
      .concat(splitTerms(profile.goals))
      .concat(splitTerms(profile.interests))
      .concat(confirmedHealthTerms)
      .map(normalize)
      .filter(function (term) { return term.length > 2; })
  );
}

function renderProfileSelector() {
  const select = document.getElementById("activeProfileSelect");
  const profiles = getProfiles();
  const activeId = getActiveProfileId();

  select.innerHTML = '<option value="">No profile selected</option>' +
    profiles.map(function (profile) {
      return '<option value="' + escapeHtml(profile.id) + '">' + escapeHtml(profile.name) + '</option>';
    }).join("");

  if (profiles.some(function (profile) { return profile.id === activeId; })) {
    select.value = activeId;
  } else {
    select.value = "";
    setActiveProfileId("");
  }

  renderProfileContext();
  renderProfilePreview();
  window.dispatchEvent(new CustomEvent("healthspan:profile-changed"));
}

function renderProfileContext() {
  const root = document.getElementById("profileContext");
  const profile = getActiveProfile();

  if (!profile) {
    root.innerHTML =
      '<div><span class="context-label">Personalization</span><strong>No active profile</strong></div>' +
      '<p>Create a profile to rank studies and trials by age, interests, conditions, goals, and general location.</p>';
    return;
  }

  const age = calculateAge(profile.birthDate);
  const details = [];
  if (age != null) details.push(age + " years old");
  if (profile.city) details.push(profile.city);
  if (profile.state) details.push(profile.state);
  const terms = profileTerms(profile).slice(0, 5);

  root.innerHTML =
    '<div><span class="context-label">Personalization</span><strong>' + escapeHtml(profile.name) + '</strong></div>' +
    '<p>' + escapeHtml(details.join(" · ") || "Profile active") +
    (terms.length ? ' · Research focus: ' + escapeHtml(terms.join(", ")) : "") + '</p>';
}

document.getElementById("activeProfileSelect").addEventListener("change", function (event) {
  setActiveProfileId(event.target.value);
  renderProfileSelector();
  if (currentResearch.query) {
    rankResearchForProfile();
    renderAllResearch();
  }
});

document.getElementById("newProfileBtn").addEventListener("click", function () {
  clearProfileForm();
  openTab("profiles");
  document.getElementById("profileName").focus();
});

function loadProfileIntoForm(profile) {
  document.getElementById("profileId").value = profile ? profile.id : "";
  document.getElementById("profileName").value = profile ? profile.name || "" : "";
  document.getElementById("profileBirthDate").value = profile ? profile.birthDate || "" : "";
  document.getElementById("profileSex").value = profile ? profile.sex || "" : "";
  document.getElementById("profileCity").value = profile ? profile.city || "" : "";
  document.getElementById("profileState").value = profile ? profile.state || "" : "";
  document.getElementById("profileCountry").value = profile ? profile.country || "United States" : "United States";
  document.getElementById("profileConditions").value = profile ? profile.conditions || "" : "";
  document.getElementById("profileGoals").value = profile ? profile.goals || "" : "";
  document.getElementById("profileInterests").value = profile ? profile.interests || "" : "";
}

function clearProfileForm() {
  loadProfileIntoForm(null);
  document.getElementById("profilePreview").innerHTML = '<div class="empty-mini">Creating a new profile.</div>';
}

function renderProfilePreview() {
  const profile = getActiveProfile();
  if (!profile) {
    loadProfileIntoForm(null);
    document.getElementById("profilePreview").innerHTML = '<div class="empty-mini">Select or create a profile.</div>';
    return;
  }

  loadProfileIntoForm(profile);
  const age = calculateAge(profile.birthDate);
  const focus = profileTerms(profile);

  document.getElementById("profilePreview").innerHTML =
    previewRow("Profile", profile.name) +
    previewRow("Current age", age == null ? "Not provided" : String(age)) +
    previewRow("Trial sex field", profile.sex || "Not specified") +
    previewRow("Location", [profile.city, profile.state, profile.country].filter(Boolean).join(", ") || "Not provided") +
    previewRow("Research terms", focus.length ? focus.slice(0, 10).join(", ") : "None yet");
}

function previewRow(label, value) {
  return '<div class="preview-row"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
}

document.getElementById("profileForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const existingId = document.getElementById("profileId").value;
  const profile = {
    id: existingId || (crypto.randomUUID ? crypto.randomUUID() : "profile-" + Date.now()),
    name: document.getElementById("profileName").value.trim(),
    birthDate: document.getElementById("profileBirthDate").value,
    sex: document.getElementById("profileSex").value,
    city: document.getElementById("profileCity").value.trim(),
    state: document.getElementById("profileState").value.trim(),
    country: document.getElementById("profileCountry").value.trim(),
    conditions: document.getElementById("profileConditions").value.trim(),
    goals: document.getElementById("profileGoals").value.trim(),
    interests: document.getElementById("profileInterests").value.trim(),
    updatedAt: new Date().toISOString()
  };

  const profiles = getProfiles();
  const index = profiles.findIndex(function (item) { return item.id === profile.id; });
  if (index >= 0) profiles[index] = profile;
  else profiles.push(profile);

  writeJson(STORAGE.profiles, profiles);
  setActiveProfileId(profile.id);
  renderProfileSelector();
  setStatus("Saved profile " + profile.name + " locally in this browser.");
});

document.getElementById("profileResetBtn").addEventListener("click", clearProfileForm);

document.getElementById("deleteProfileBtn").addEventListener("click", function () {
  const id = document.getElementById("profileId").value;
  if (!id) return;
  const profile = getProfiles().find(function (item) { return item.id === id; });
  if (!profile) return;
  if (!window.confirm("Delete the local profile for " + profile.name + "?")) return;

  const profiles = getProfiles().filter(function (item) { return item.id !== id; });
  writeJson(STORAGE.profiles, profiles);
  if (getActiveProfileId() === id) setActiveProfileId("");
  if (typeof window.deleteHealthDataForProfile === "function") {
    window.deleteHealthDataForProfile(id);
  }
  clearProfileForm();
  renderProfileSelector();
  setStatus("Profile deleted from this browser.");
});

function buildProfileResearchQuery(profile) {
  const terms = profileTerms(profile).slice(0, 8);
  if (!terms.length) return "healthy aging OR healthspan OR geroscience";
  return terms.map(function (term) {
    return term.includes(" ") ? '"' + term.replaceAll('"', "") + '"' : term;
  }).join(" OR ");
}

document.getElementById("matchProfileBtn").addEventListener("click", function () {
  const profile = getActiveProfile();
  if (!profile) {
    openTab("profiles");
    setStatus("Create or select a profile first.", "error");
    return;
  }
  const query = buildProfileResearchQuery(profile);
  document.getElementById("researchQuestion").value = query;
  runResearch();
});

document.getElementById("runResearchBtn").addEventListener("click", function () {
  runResearch();
});

document.getElementById("researchQuestion").addEventListener("keydown", function (event) {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") runResearch();
});

function setStatus(message, type) {
  const root = document.getElementById("researchStatus");
  root.textContent = message;
  root.className = "research-status" + (type ? " " + type : "");
}

function setPipeline(stage) {
  const order = ["question", "literature", "trials", "classify", "dossier"];
  const currentIndex = order.indexOf(stage);
  document.querySelectorAll(".agent-step").forEach(function (step) {
    const index = order.indexOf(step.dataset.step);
    step.classList.toggle("done", currentIndex >= 0 && index < currentIndex);
    step.classList.toggle("active", index === currentIndex);
  });
  if (stage === "done") {
    document.querySelectorAll(".agent-step").forEach(function (step) {
      step.classList.add("done");
      step.classList.remove("active");
    });
  }
}

async function runResearch(options) {
  options = options || {};
  const query = document.getElementById("researchQuestion").value.trim();
  if (!query) {
    setStatus("Enter a research question first.", "error");
    return;
  }

  const button = document.getElementById("runResearchBtn");
  button.disabled = true;
  document.getElementById("watchQuestionBtn").disabled = true;
  setPipeline("question");
  setStatus("Framing research question…", "loading");

  const previousWatch = options.watchId ? getWatchlist().find(function (item) { return item.id === options.watchId; }) : null;

  try {
    currentResearch = {
      query: query,
      papers: [],
      paperTotal: 0,
      trials: [],
      trialTotal: 0,
      conflicts: [],
      hallmarks: [],
      ranAt: new Date().toISOString(),
      profileId: getActiveProfileId()
    };

    setPipeline("literature");
    setStatus("Searching live PubMed literature…", "loading");
    const paperDataPromise = searchPubMed(query);

    setPipeline("trials");
    setStatus("Searching ClinicalTrials.gov API v2…", "loading");
    const trialDataPromise = searchClinicalTrials(query);

    const results = await Promise.allSettled([paperDataPromise, trialDataPromise]);
    const paperResult = results[0];
    const trialResult = results[1];

    if (paperResult.status === "fulfilled") {
      currentResearch.papers = paperResult.value.papers;
      currentResearch.paperTotal = paperResult.value.total;
    }

    if (trialResult.status === "fulfilled") {
      currentResearch.trials = trialResult.value.trials;
      currentResearch.trialTotal = trialResult.value.total;
    }

    if (paperResult.status === "rejected" && trialResult.status === "rejected") {
      throw new Error("Both live sources failed. " + friendlyFetchHint());
    }

    setPipeline("classify");
    currentResearch.papers.forEach(function (paper) {
      paper.evidenceType = classifyPaper(paper);
      paper.resultSignal = detectResultSignal(paper);
    });
    currentResearch.conflicts = findConflictSignals(currentResearch.papers);
    currentResearch.hallmarks = detectHallmarks(query, currentResearch.papers);

    rankResearchForProfile();
    setPipeline("dossier");
    renderAllResearch();
    setPipeline("done");

    const sourceWarnings = [];
    if (paperResult.status === "rejected") sourceWarnings.push("PubMed unavailable");
    if (trialResult.status === "rejected") sourceWarnings.push("ClinicalTrials.gov unavailable");

    let message = "Research dossier built from live sources.";
    if (sourceWarnings.length) message += " " + sourceWarnings.join(" and ") + ".";
    setStatus(message);

    document.getElementById("watchQuestionBtn").disabled = false;

    if (previousWatch) {
      updateWatchAfterRun(previousWatch);
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Research run failed.", "error");
    setPipeline("question");
  } finally {
    button.disabled = false;
  }
}

function friendlyFetchHint() {
  if (location.protocol === "file:") {
    return "Because this page is opened as a file, the browser may block live API requests. Run the folder with: python -m http.server 8000 and open http://localhost:8000.";
  }
  return "Check the internet connection and try again.";
}

async function fetchChecked(url) {
  const response = await fetch(url, {
    headers: { "Accept": "application/json, application/xml, text/xml, */*" }
  });
  if (!response.ok) throw new Error("Source returned HTTP " + response.status + ".");
  return response;
}

async function searchPubMed(query) {
  const searchUrl =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" +
    "?db=pubmed&retmode=json&retmax=20&sort=pub_date&tool=healthspan_lab&term=" +
    encodeURIComponent(query);

  const searchResponse = await fetchChecked(searchUrl);
  const searchJson = await searchResponse.json();
  const result = searchJson.esearchresult || {};
  const ids = result.idlist || [];
  const total = Number(result.count || ids.length);

  if (!ids.length) return { papers: [], total: total };

  const fetchUrl =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi" +
    "?db=pubmed&retmode=xml&tool=healthspan_lab&id=" + encodeURIComponent(ids.join(","));

  const fetchResponse = await fetch(fetchUrl);
  if (!fetchResponse.ok) throw new Error("PubMed record retrieval returned HTTP " + fetchResponse.status + ".");
  const xmlText = await fetchResponse.text();
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");

  if (xml.querySelector("parsererror")) throw new Error("PubMed returned data the browser could not parse.");

  const papers = Array.from(xml.querySelectorAll("PubmedArticle")).map(parsePubMedArticle).filter(function (paper) {
    return paper.pmid;
  });

  return { papers: papers, total: total };
}

function nodeText(node, selector) {
  const found = node.querySelector(selector);
  return found ? found.textContent.replace(/\s+/g, " ").trim() : "";
}

function parsePubMedArticle(article) {
  const pmid = nodeText(article, "MedlineCitation > PMID") || nodeText(article, "PMID");
  const title = nodeText(article, "Article > ArticleTitle") || "Untitled PubMed record";
  const abstractParts = Array.from(article.querySelectorAll("Article > Abstract AbstractText")).map(function (item) {
    const label = item.getAttribute("Label");
    const body = item.textContent.replace(/\s+/g, " ").trim();
    return label ? label + ": " + body : body;
  });
  const publicationTypes = Array.from(article.querySelectorAll("PublicationTypeList PublicationType")).map(function (item) {
    return item.textContent.trim();
  });
  const authors = Array.from(article.querySelectorAll("AuthorList > Author")).slice(0, 5).map(function (author) {
    return [nodeText(author, "ForeName"), nodeText(author, "LastName")].filter(Boolean).join(" ");
  }).filter(Boolean);
  const journal = nodeText(article, "Journal > Title") || nodeText(article, "Journal > ISOAbbreviation");
  const year =
    nodeText(article, "JournalIssue > PubDate > Year") ||
    (nodeText(article, "JournalIssue > PubDate > MedlineDate").match(/\d{4}/) || [""])[0];
  const doiNode = Array.from(article.querySelectorAll("ArticleId")).find(function (item) {
    return (item.getAttribute("IdType") || "").toLowerCase() === "doi";
  });

  return {
    pmid: pmid,
    title: title,
    abstract: abstractParts.join(" "),
    publicationTypes: publicationTypes,
    authors: authors,
    journal: journal,
    year: year,
    doi: doiNode ? doiNode.textContent.trim() : "",
    evidenceType: "",
    resultSignal: "unclear",
    relevanceScore: 0,
    relevanceReasons: []
  };
}

async function searchClinicalTrials(query) {
  const url =
    "https://clinicaltrials.gov/api/v2/studies" +
    "?query.term=" + encodeURIComponent(query) +
    "&pageSize=20&countTotal=true&format=json";

  const response = await fetchChecked(url);
  const data = await response.json();
  const studies = Array.isArray(data.studies) ? data.studies : [];

  return {
    total: Number(data.totalCount == null ? studies.length : data.totalCount),
    trials: studies.map(parseTrial)
  };
}

function parseTrial(study) {
  const protocol = study.protocolSection || {};
  const identification = protocol.identificationModule || {};
  const status = protocol.statusModule || {};
  const conditions = protocol.conditionsModule || {};
  const design = protocol.designModule || {};
  const arms = protocol.armsInterventionsModule || {};
  const eligibility = protocol.eligibilityModule || {};
  const contacts = protocol.contactsLocationsModule || {};

  const interventionDetails = (arms.interventions || []).map(function (item) {
    return {
      name: item.name || "",
      type: item.type || "",
      description: item.description || ""
    };
  }).filter(function (item) {
    return item.name || item.type;
  });

  const interventions = interventionDetails.map(function (item) {
    return item.name || item.type || "";
  }).filter(Boolean);

  const locations = (contacts.locations || []).slice(0, 20).map(function (item) {
    return [item.facility, item.city, item.state, item.country].filter(Boolean).join(", ");
  });

  return {
    nctId: identification.nctId || "",
    title: identification.briefTitle || identification.officialTitle || "Untitled clinical trial",
    officialTitle: identification.officialTitle || "",
    status: status.overallStatus || "",
    startDate: status.startDateStruct ? status.startDateStruct.date || "" : "",
    completionDate: status.completionDateStruct ? status.completionDateStruct.date || "" : "",
    conditions: conditions.conditions || [],
    keywords: conditions.keywords || [],
    phases: design.phases || [],
    studyType: design.studyType || "",
    interventions: interventions,
    interventionDetails: interventionDetails,
    sex: eligibility.sex || "ALL",
    minimumAge: eligibility.minimumAge || "",
    maximumAge: eligibility.maximumAge || "",
    healthyVolunteers: eligibility.healthyVolunteers,
    eligibilityCriteria: eligibility.eligibilityCriteria || "",
    locations: locations,
    relevanceScore: 0,
    relevanceReasons: [],
    hardMismatches: []
  };
}

function classifyPaper(paper) {
  const types = paper.publicationTypes.join(" ").toLowerCase();
  const text = (paper.title + " " + paper.abstract).toLowerCase();

  if (/meta-analysis|systematic review|review/.test(types)) return "evidence_synthesis";
  if (/randomized controlled trial|controlled clinical trial|clinical trial/.test(types) ||
      /randomi[sz]ed|placebo-controlled|double-blind/.test(text)) return "human_interventional";
  if (/mouse|mice|murine|rat\b|rats\b|drosophila|c\. elegans|animal model|nonhuman primate/.test(text)) return "animal";
  if (/in vitro|cell culture|cell line|organoid|mechanistic|molecular mechanism/.test(text)) return "mechanistic";
  return "human_observational";
}

function detectResultSignal(paper) {
  const text = (paper.title + " " + paper.abstract).toLowerCase();
  const nullPhrases = ["no significant", "not significant", "did not improve", "no difference", "no effect", "failed to", "was not associated"];
  const positivePhrases = ["significantly improved", "improved", "reduced", "decreased", "increased lifespan", "extended lifespan", "associated with lower", "beneficial"];
  const adversePhrases = ["increased risk", "adverse event", "worsened", "harm"];

  if (adversePhrases.some(function (term) { return text.includes(term); })) return "adverse_or_negative";
  if (nullPhrases.some(function (term) { return text.includes(term); })) return "null_or_uncertain";
  if (positivePhrases.some(function (term) { return text.includes(term); })) return "positive_signal";
  return "unclear";
}

function findConflictSignals(papers) {
  const positive = papers.filter(function (paper) { return paper.resultSignal === "positive_signal"; });
  const nullish = papers.filter(function (paper) {
    return paper.resultSignal === "null_or_uncertain" || paper.resultSignal === "adverse_or_negative";
  });

  if (!positive.length || !nullish.length) return [];

  return [{
    title: "Possible mixed findings in retrieved abstracts",
    description:
      positive.length + " retrieved record(s) contain positive-result language while " +
      nullish.length + " contain null, uncertain, adverse, or negative-result language. Compare populations, endpoints, doses, and study designs before drawing conclusions.",
    positive: positive.slice(0, 3),
    nullish: nullish.slice(0, 3)
  }];
}

function detectHallmarks(query, papers) {
  const text = normalize(query + " " + papers.slice(0, 10).map(function (paper) {
    return paper.title + " " + paper.abstract;
  }).join(" "));

  return HALLMARKS.filter(function (hallmark) {
    return hallmark.terms.some(function (term) { return text.includes(normalize(term)); });
  }).map(function (hallmark) { return hallmark.name; });
}

function parseAgeYears(value) {
  if (!value) return null;
  const match = String(value).match(/([0-9.]+)\s*(year|month|week|day)/i);
  if (!match) return null;
  const number = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("year")) return number;
  if (unit.startsWith("month")) return number / 12;
  if (unit.startsWith("week")) return number / 52.1775;
  if (unit.startsWith("day")) return number / 365.25;
  return null;
}

function rankResearchForProfile() {
  const profile = getActiveProfile();
  const terms = profileTerms(profile);

  currentResearch.papers.forEach(function (paper) {
    paper.relevanceScore = 0;
    paper.relevanceReasons = [];
    if (!profile) return;

    const text = normalize(paper.title + " " + paper.abstract);
    const matches = terms.filter(function (term) { return text.includes(term); }).slice(0, 5);
    if (matches.length) {
      paper.relevanceScore += Math.min(60, matches.length * 12);
      paper.relevanceReasons.push("Profile topics: " + matches.join(", "));
    }
    if (paper.evidenceType === "human_interventional") {
      paper.relevanceScore += 12;
      paper.relevanceReasons.push("Human interventional evidence");
    } else if (paper.evidenceType === "evidence_synthesis") {
      paper.relevanceScore += 8;
      paper.relevanceReasons.push("Evidence synthesis");
    }
  });

  currentResearch.papers.sort(function (a, b) {
    return b.relevanceScore - a.relevanceScore;
  });

  currentResearch.trials.forEach(function (trial) {
    scoreTrialForProfile(trial, profile);
  });

  if (profile) {
    currentResearch.trials.sort(function (a, b) {
      return b.relevanceScore - a.relevanceScore;
    });
  }
}

function scoreTrialForProfile(trial, profile) {
  trial.relevanceScore = 0;
  trial.relevanceReasons = [];
  trial.hardMismatches = [];
  if (!profile) return;

  const age = calculateAge(profile.birthDate);
  const minAge = parseAgeYears(trial.minimumAge);
  const maxAge = parseAgeYears(trial.maximumAge);

  if (age != null) {
    const withinMin = minAge == null || age >= minAge;
    const withinMax = maxAge == null || age <= maxAge;
    if (withinMin && withinMax) {
      trial.relevanceScore += 25;
      trial.relevanceReasons.push("Listed age range includes age " + age);
    } else {
      trial.hardMismatches.push("Age is outside the listed trial range");
    }
  }

  if (profile.sex && trial.sex && trial.sex !== "ALL") {
    if (profile.sex === trial.sex) {
      trial.relevanceScore += 15;
      trial.relevanceReasons.push("Trial sex field matches profile");
    } else {
      trial.hardMismatches.push("Trial sex field does not match profile");
    }
  }

  const trialText = normalize(
    trial.title + " " +
    trial.conditions.join(" ") + " " +
    trial.keywords.join(" ") + " " +
    trial.interventions.join(" ") + " " +
    trial.eligibilityCriteria
  );
  const terms = profileTerms(profile);
  const matchedTerms = terms.filter(function (term) { return trialText.includes(term); }).slice(0, 5);
  if (matchedTerms.length) {
    trial.relevanceScore += Math.min(35, matchedTerms.length * 10);
    trial.relevanceReasons.push("Topic overlap: " + matchedTerms.join(", "));
  }

  const locationText = normalize(trial.locations.join(" "));
  if (profile.city && locationText.includes(normalize(profile.city))) {
    trial.relevanceScore += 20;
    trial.relevanceReasons.push("Location list includes " + profile.city);
  } else if (profile.state && locationText.includes(normalize(profile.state))) {
    trial.relevanceScore += 14;
    trial.relevanceReasons.push("Location list includes " + profile.state);
  } else if (profile.country && locationText.includes(normalize(profile.country))) {
    trial.relevanceScore += 7;
    trial.relevanceReasons.push("Location list includes " + profile.country);
  }

  if (["RECRUITING", "NOT_YET_RECRUITING", "ENROLLING_BY_INVITATION"].includes(trial.status)) {
    trial.relevanceScore += 10;
    trial.relevanceReasons.push("Enrollment status may be relevant");
  }

  if (trial.hardMismatches.length) {
    trial.relevanceScore = Math.min(trial.relevanceScore, 20);
  }
}

function renderAllResearch() {
  renderMetrics();
  renderDossier();
  renderPapers();
  renderTrials();
  renderEvidenceBreakdown();
  renderConflicts();
  renderResearchGaps();
  renderGraph();
  renderProfileContext();

  document.getElementById("lastRunBadge").textContent =
    currentResearch.ranAt ? "Updated " + new Date(currentResearch.ranAt).toLocaleString() : "No dossier yet";
  document.getElementById("evidenceQueryLabel").textContent =
    currentResearch.query ? truncate(currentResearch.query, 55) : "No active question";
  document.getElementById("trialQueryLabel").textContent =
    currentResearch.query ? truncate(currentResearch.query, 55) : "ClinicalTrials.gov API v2";
  document.getElementById("noteQuestion").value = currentResearch.query || "";
  window.dispatchEvent(new CustomEvent("healthspan:research-rendered"));
}

function renderMetrics() {
  const profile = getActiveProfile();
  const possibleMatches = profile ? currentResearch.trials.filter(function (trial) {
    return trial.relevanceScore >= 25 && !trial.hardMismatches.length;
  }).length : 0;

  document.getElementById("metricPapers").textContent =
    currentResearch.paperTotal ? currentResearch.paperTotal.toLocaleString() : String(currentResearch.papers.length || 0);
  document.getElementById("metricPapersNote").textContent =
    "Showing " + currentResearch.papers.length + " newest retrieved records";

  document.getElementById("metricTrials").textContent =
    currentResearch.trialTotal ? currentResearch.trialTotal.toLocaleString() : String(currentResearch.trials.length || 0);
  document.getElementById("metricTrialsNote").textContent =
    "Showing " + currentResearch.trials.length + " retrieved studies";

  document.getElementById("metricMatches").textContent = profile ? String(possibleMatches) : "—";
  document.getElementById("metricConflicts").textContent = String(currentResearch.conflicts.length);
}

function renderDossier() {
  const root = document.getElementById("dossierSummary");
  if (!currentResearch.query) {
    root.className = "empty-state";
    root.textContent = "Run a research question to build a dossier.";
    return;
  }

  const counts = evidenceCounts();
  const recruiting = currentResearch.trials.filter(function (trial) {
    return ["RECRUITING", "NOT_YET_RECRUITING"].includes(trial.status);
  }).length;
  const profile = getActiveProfile();
  const profileSentence = profile
    ? " Results are ranked for research relevance to " + profile.name + "'s active local profile."
    : " No personal profile was used for ranking.";

  root.className = "subpanel";
  root.innerHTML =
    '<p class="eyebrow">Dossier</p>' +
    '<h3>' + escapeHtml(currentResearch.query) + '</h3>' +
    '<p class="section-intro">The retrieved set contains <strong>' +
    currentResearch.papers.length + '</strong> PubMed records and <strong>' +
    currentResearch.trials.length + '</strong> ClinicalTrials.gov records. Automated classification identified <strong>' +
    counts.human_interventional + '</strong> human interventional paper(s), <strong>' +
    counts.evidence_synthesis + '</strong> review/synthesis record(s), and <strong>' +
    recruiting + '</strong> recruiting or not-yet-recruiting trial(s).' +
    escapeHtml(profileSentence) + '</p>' +
    '<div class="tag-row">' +
    currentResearch.hallmarks.map(function (name) {
      return '<span class="match-tag">' + escapeHtml(name) + '</span>';
    }).join("") +
    (currentResearch.hallmarks.length ? "" : '<span class="tag">No hallmark keywords detected</span>') +
    '</div>';
}

function evidenceCounts() {
  const counts = {
    human_interventional: 0,
    human_observational: 0,
    animal: 0,
    mechanistic: 0,
    evidence_synthesis: 0
  };
  currentResearch.papers.forEach(function (paper) {
    if (counts[paper.evidenceType] != null) counts[paper.evidenceType] += 1;
  });
  return counts;
}

function paperCard(paper, compact) {
  const abstract = paper.abstract
    ? truncate(paper.abstract, compact ? 250 : 520)
    : "No abstract was returned in this PubMed record.";
  const meta = [
    paper.year,
    paper.journal,
    paper.authors.length ? paper.authors.slice(0, 3).join(", ") + (paper.authors.length > 3 ? " et al." : "") : ""
  ].filter(Boolean);

  const tags = [
    '<span class="tag">' + escapeHtml(EVIDENCE_LABELS[paper.evidenceType] || paper.evidenceType) + '</span>',
    '<span class="tag">PMID ' + escapeHtml(paper.pmid) + '</span>'
  ];

  if (paper.resultSignal === "positive_signal") tags.push('<span class="good-tag">positive-language signal</span>');
  if (paper.resultSignal === "null_or_uncertain") tags.push('<span class="warn-tag">null/uncertain-language signal</span>');
  if (paper.resultSignal === "adverse_or_negative") tags.push('<span class="warn-tag">adverse/negative-language signal</span>');
  if (paper.relevanceScore > 0) tags.push('<span class="match-tag">profile relevance ' + paper.relevanceScore + '</span>');

  return '<article class="result-card">' +
    '<div class="result-meta">' + meta.map(escapeHtml).join(" · ") + '</div>' +
    '<h4>' + escapeHtml(paper.title) + '</h4>' +
    '<p>' + escapeHtml(abstract) + '</p>' +
    '<div class="tag-row">' + tags.join("") + '</div>' +
    (paper.relevanceReasons.length
      ? '<div class="match-reasons">' + paper.relevanceReasons.map(function (reason) {
          return '<span class="match-tag">' + escapeHtml(reason) + '</span>';
        }).join("") + '</div>'
      : "") +
    '<div class="result-links">' +
      '<a href="https://pubmed.ncbi.nlm.nih.gov/' + encodeURIComponent(paper.pmid) + '/" target="_blank" rel="noopener noreferrer">Open PubMed ↗</a>' +
      (paper.doi ? '<a href="https://doi.org/' + encodeURIComponent(paper.doi) + '" target="_blank" rel="noopener noreferrer">DOI ↗</a>' : "") +
    '</div>' +
  '</article>';
}

function renderPapers() {
  const preview = document.getElementById("paperResults");
  const full = document.getElementById("paperResultsFull");
  const filter = document.getElementById("evidenceTypeFilter").value;

  if (!currentResearch.papers.length) {
    preview.innerHTML = '<div class="empty-mini">No PubMed records loaded.</div>';
    full.innerHTML = '<div class="empty-mini">No PubMed records loaded.</div>';
    return;
  }

  preview.innerHTML = currentResearch.papers.slice(0, 4).map(function (paper) {
    return paperCard(paper, true);
  }).join("");

  const filtered = currentResearch.papers.filter(function (paper) {
    return filter === "all" || paper.evidenceType === filter;
  });

  full.innerHTML = filtered.length
    ? filtered.map(function (paper) { return paperCard(paper, false); }).join("")
    : '<div class="empty-mini">No retrieved papers match this evidence filter.</div>';
}

document.getElementById("evidenceTypeFilter").addEventListener("change", renderPapers);

function trialCard(trial, compact) {
  const profile = getActiveProfile();
  const ageRange = [trial.minimumAge, trial.maximumAge].filter(Boolean).join(" – ") || "Age range not listed";
  const details = [
    trial.status ? trial.status.replaceAll("_", " ") : "Status not listed",
    trial.phases.length ? trial.phases.join(", ") : "",
    ageRange
  ].filter(Boolean);

  const locationText = trial.locations.length
    ? truncate(trial.locations.slice(0, compact ? 2 : 5).join(" · "), compact ? 180 : 360)
    : "No locations returned.";

  const tags = [];
  if (trial.interventions.length) tags.push('<span class="tag">' + escapeHtml(truncate(trial.interventions.join(", "), 90)) + '</span>');
  trial.conditions.slice(0, 3).forEach(function (condition) {
    tags.push('<span class="tag">' + escapeHtml(condition) + '</span>');
  });

  if (profile && trial.relevanceScore > 0) {
    tags.push('<span class="match-tag">profile relevance ' + trial.relevanceScore + '</span>');
  }
  trial.hardMismatches.forEach(function (reason) {
    tags.push('<span class="warn-tag">' + escapeHtml(reason) + '</span>');
  });

  return '<article class="result-card">' +
    '<div class="result-meta">' + details.map(escapeHtml).join(" · ") + '</div>' +
    '<h4>' + escapeHtml(trial.title) + '</h4>' +
    '<p><strong>' + escapeHtml(trial.nctId) + '</strong> · ' + escapeHtml(locationText) + '</p>' +
    '<div class="tag-row">' + tags.join("") + '</div>' +
    (trial.relevanceReasons.length
      ? '<div class="match-reasons">' + trial.relevanceReasons.map(function (reason) {
          return '<span class="match-tag">' + escapeHtml(reason) + '</span>';
        }).join("") + '</div>'
      : "") +
    '<div class="result-links">' +
      '<a href="https://clinicaltrials.gov/study/' + encodeURIComponent(trial.nctId) + '" target="_blank" rel="noopener noreferrer">Open trial record ↗</a>' +
    '</div>' +
  '</article>';
}

function visibleTrials() {
  const status = document.getElementById("trialStatusFilter").value;
  const onlyMatches = document.getElementById("onlyProfileMatches").checked;
  const profile = getActiveProfile();

  return currentResearch.trials.filter(function (trial) {
    if (status !== "all" && trial.status !== status) return false;
    if (onlyMatches && profile) {
      return trial.relevanceScore >= 25 && !trial.hardMismatches.length;
    }
    return true;
  });
}

function renderTrials() {
  const preview = document.getElementById("trialResultsPreview");
  const full = document.getElementById("trialResults");

  if (!currentResearch.trials.length) {
    preview.innerHTML = '<div class="empty-mini">No ClinicalTrials.gov records loaded.</div>';
    full.innerHTML = '<div class="empty-mini">No ClinicalTrials.gov records loaded.</div>';
    return;
  }

  preview.innerHTML = currentResearch.trials.slice(0, 4).map(function (trial) {
    return trialCard(trial, true);
  }).join("");

  const trials = visibleTrials();
  full.innerHTML = trials.length
    ? trials.map(function (trial) { return trialCard(trial, false); }).join("")
    : '<div class="empty-mini">No retrieved trials match the current filters.</div>';
}

document.getElementById("trialStatusFilter").addEventListener("change", renderTrials);
document.getElementById("onlyProfileMatches").addEventListener("change", renderTrials);

function renderEvidenceBreakdown() {
  const root = document.getElementById("evidenceBreakdown");
  const counts = evidenceCounts();
  const total = Math.max(1, currentResearch.papers.length);

  if (!currentResearch.papers.length) {
    root.innerHTML = '<div class="empty-mini">No evidence loaded.</div>';
    return;
  }

  root.innerHTML = Object.keys(counts).map(function (key) {
    const count = counts[key];
    const percent = Math.round((count / total) * 100);
    return '<div class="evidence-row">' +
      '<span>' + escapeHtml(EVIDENCE_LABELS[key]) + '</span>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + percent + '%"></div></div>' +
      '<strong>' + count + '</strong>' +
    '</div>';
  }).join("") +
  '<p class="helper">Classification is automated from publication type and text cues. Open the source record to verify important studies.</p>';
}

function renderConflicts() {
  const root = document.getElementById("conflictSignals");
  if (!currentResearch.papers.length) {
    root.innerHTML = '<div class="empty-mini">No signals loaded.</div>';
    return;
  }

  if (!currentResearch.conflicts.length) {
    root.innerHTML =
      '<div class="conflict-item"><strong>No mixed-result signal detected in the retrieved abstracts</strong>' +
      '<p>This does not mean the literature agrees. It only means the current keyword screen did not find both positive and null/adverse language in this limited retrieved set.</p></div>';
    return;
  }

  root.innerHTML = currentResearch.conflicts.map(function (conflict) {
    const positiveTitles = conflict.positive.map(function (paper) { return paper.title; }).join(" | ");
    const nullTitles = conflict.nullish.map(function (paper) { return paper.title; }).join(" | ");
    return '<div class="conflict-item">' +
      '<strong>' + escapeHtml(conflict.title) + '</strong>' +
      '<p>' + escapeHtml(conflict.description) + '</p>' +
      '<p><span class="good-tag">Positive-language examples</span> ' + escapeHtml(truncate(positiveTitles, 260)) + '</p>' +
      '<p><span class="warn-tag">Null/adverse-language examples</span> ' + escapeHtml(truncate(nullTitles, 260)) + '</p>' +
    '</div>';
  }).join("");
}

function renderResearchGaps() {
  const root = document.getElementById("researchGaps");
  if (!currentResearch.query) {
    root.innerHTML = '<div class="empty-mini">Run research to identify gaps.</div>';
    return;
  }

  const counts = evidenceCounts();
  const gaps = [];

  if (counts.human_interventional === 0) {
    gaps.push(["Human intervention evidence is sparse in this retrieved set", "No paper in the first retrieved records was automatically classified as a human interventional study. Search wording can affect this."]);
  }

  if (counts.evidence_synthesis === 0) {
    gaps.push(["No synthesis detected", "The retrieved set did not include a systematic review, meta-analysis, or review classification. A dedicated review search may be useful."]);
  }

  if (currentResearch.trials.length === 0) {
    gaps.push(["No trial records retrieved", "The current ClinicalTrials.gov search returned no studies in the retrieved set. Try a broader intervention or mechanism term."]);
  }

  const recruiting = currentResearch.trials.filter(function (trial) {
    return ["RECRUITING", "NOT_YET_RECRUITING"].includes(trial.status);
  }).length;
  if (currentResearch.trials.length && recruiting === 0) {
    gaps.push(["No actively recruiting signal in retrieved trials", "The retrieved records do not show recruiting or not-yet-recruiting status. This can change over time."]);
  }

  const missingAbstracts = currentResearch.papers.filter(function (paper) { return !paper.abstract; }).length;
  if (missingAbstracts >= Math.max(2, Math.ceil(currentResearch.papers.length / 3))) {
    gaps.push(["Abstract coverage is incomplete", missingAbstracts + " retrieved PubMed records do not include an abstract in the API response, limiting automated comparison."]);
  }

  if (currentResearch.conflicts.length) {
    gaps.push(["Results deserve side-by-side comparison", "The keyword screen found both positive and null/adverse language. Compare endpoints, populations, duration, dose, and study quality."]);
  }

  const profile = getActiveProfile();
  if (profile) {
    const matches = currentResearch.trials.filter(function (trial) {
      return trial.relevanceScore >= 25 && !trial.hardMismatches.length;
    }).length;
    if (!matches) {
      gaps.push(["No strong profile-relevance trial signal", "None of the retrieved trial records crossed the basic profile relevance threshold. This is not a medical eligibility determination."]);
    }
  }

  if (!gaps.length) {
    gaps.push(["No obvious structural gap detected", "The retrieved set contains several evidence types. A complete review would still need broader searches, source-quality assessment, and full-text reading."]);
  }

  root.innerHTML = gaps.map(function (gap) {
    return '<article class="gap-card"><strong>' + escapeHtml(gap[0]) + '</strong><p>' + escapeHtml(gap[1]) + '</p></article>';
  }).join("");
}

function renderGraph() {
  const root = document.getElementById("researchGraph");
  if (!currentResearch.query) {
    root.innerHTML = '<div class="empty-state">Run research to build the graph.</div>';
    return;
  }

  const width = 1100;
  const height = 560;
  const centerX = 520;
  const centerY = 280;
  const hallmarks = currentResearch.hallmarks.slice(0, 4);
  const papers = currentResearch.papers.slice(0, 5);
  const trials = currentResearch.trials.slice(0, 4);
  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Research graph">';

  function edge(x1, y1, x2, y2) {
    svg += '<line class="graph-edge" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"></line>';
  }

  function rectNode(x, y, w, h, title, subtitle, fill, stroke) {
    svg += '<g class="graph-node">' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="14" fill="' + fill + '" stroke="' + stroke + '"></rect>' +
      '<text x="' + (x + 12) + '" y="' + (y + 24) + '">' + escapeXml(truncate(title, 28)) + '</text>' +
      (subtitle ? '<text class="small-text" x="' + (x + 12) + '" y="' + (y + 43) + '">' + escapeXml(truncate(subtitle, 34)) + '</text>' : "") +
      '</g>';
  }

  hallmarks.forEach(function (name, index) {
    const y = 60 + index * 115;
    edge(250, y + 32, centerX - 20, centerY);
    rectNode(25, y, 225, 64, name, "hallmark connection", "#102842", "#35607d");
  });

  papers.forEach(function (paper, index) {
    const y = 28 + index * 98;
    edge(centerX + 160, centerY, 800, y + 31);
    rectNode(800, y, 275, 62, paper.title, EVIDENCE_LABELS[paper.evidenceType], "#14253d", "#355579");
  });

  trials.forEach(function (trial, index) {
    const angleOffset = 80 + index * 105;
    const x = 390 + (index % 2) * 250;
    const y = 405 + (index % 2) * 70;
    edge(centerX, centerY + 44, x + 105, y);
    rectNode(x, y, 210, 58, trial.nctId || "Trial", truncate(trial.title, 28), "#14332f", "#347469");
  });

  rectNode(centerX - 160, centerY - 44, 320, 88, currentResearch.query, "research question", "#16304a", "#67e1c2");
  svg += '</svg>';
  root.innerHTML = svg;
}

function getWatchlist() {
  return readJson(STORAGE.watchlist, []);
}

function saveWatchlist(items) {
  writeJson(STORAGE.watchlist, items);
}

document.getElementById("watchQuestionBtn").addEventListener("click", function () {
  if (!currentResearch.query) return;
  const items = getWatchlist();
  const existing = items.find(function (item) {
    return normalize(item.query) === normalize(currentResearch.query) &&
      (item.profileId || "") === (getActiveProfileId() || "");
  });

  const snapshot = {
    paperIds: currentResearch.papers.map(function (paper) { return paper.pmid; }),
    trialIds: currentResearch.trials.map(function (trial) { return trial.nctId; })
  };

  if (existing) {
    existing.snapshot = snapshot;
    existing.lastRun = currentResearch.ranAt;
    existing.paperTotal = currentResearch.paperTotal;
    existing.trialTotal = currentResearch.trialTotal;
  } else {
    items.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : "watch-" + Date.now(),
      query: currentResearch.query,
      profileId: getActiveProfileId(),
      createdAt: new Date().toISOString(),
      lastRun: currentResearch.ranAt,
      paperTotal: currentResearch.paperTotal,
      trialTotal: currentResearch.trialTotal,
      snapshot: snapshot,
      delta: { papers: 0, trials: 0 }
    });
  }

  saveWatchlist(items);
  renderWatchlist();
  setStatus("Research question saved to the local watchlist.");
});

function updateWatchAfterRun(previousWatch) {
  const items = getWatchlist();
  const item = items.find(function (candidate) { return candidate.id === previousWatch.id; });
  if (!item) return;

  const oldPapers = new Set((item.snapshot && item.snapshot.paperIds) || []);
  const oldTrials = new Set((item.snapshot && item.snapshot.trialIds) || []);
  const newPaperIds = currentResearch.papers.map(function (paper) { return paper.pmid; });
  const newTrialIds = currentResearch.trials.map(function (trial) { return trial.nctId; });

  item.delta = {
    papers: newPaperIds.filter(function (id) { return !oldPapers.has(id); }).length,
    trials: newTrialIds.filter(function (id) { return !oldTrials.has(id); }).length
  };
  item.snapshot = { paperIds: newPaperIds, trialIds: newTrialIds };
  item.lastRun = currentResearch.ranAt;
  item.paperTotal = currentResearch.paperTotal;
  item.trialTotal = currentResearch.trialTotal;

  saveWatchlist(items);
  renderWatchlist();
  setStatus("Watchlist refreshed: " + item.delta.papers + " new retrieved PubMed record(s), " + item.delta.trials + " new retrieved trial record(s) since the previous snapshot.");
}

function renderWatchlist() {
  const root = document.getElementById("watchlistItems");
  const items = getWatchlist();
  const profiles = getProfiles();

  if (!items.length) {
    root.innerHTML = '<div class="empty-state">No watched research questions yet.</div>';
    return;
  }

  root.innerHTML = items.map(function (item) {
    const profile = profiles.find(function (candidate) { return candidate.id === item.profileId; });
    const delta = item.delta || { papers: 0, trials: 0 };
    return '<article class="watch-card">' +
      '<div>' +
        '<h3>' + escapeHtml(item.query) + '</h3>' +
        '<p>Profile: <strong>' + escapeHtml(profile ? profile.name : "None / deleted") + '</strong> · Last run: ' +
        escapeHtml(item.lastRun ? new Date(item.lastRun).toLocaleString() : "Never") + '</p>' +
        '<div class="tag-row">' +
          '<span class="tag">' + Number(item.paperTotal || 0).toLocaleString() + ' PubMed matches</span>' +
          '<span class="tag">' + Number(item.trialTotal || 0).toLocaleString() + ' trial matches</span>' +
          '<span class="' + (delta.papers ? "match-tag" : "tag") + '">' + delta.papers + ' new retrieved papers</span>' +
          '<span class="' + (delta.trials ? "match-tag" : "tag") + '">' + delta.trials + ' new retrieved trials</span>' +
        '</div>' +
      '</div>' +
      '<div class="watch-actions">' +
        '<button class="button secondary" data-watch-run="' + escapeHtml(item.id) + '">Rerun</button>' +
        '<button class="button danger" data-watch-delete="' + escapeHtml(item.id) + '">Remove</button>' +
      '</div>' +
    '</article>';
  }).join("");

  root.querySelectorAll("[data-watch-run]").forEach(function (button) {
    button.addEventListener("click", function () {
      const item = getWatchlist().find(function (candidate) { return candidate.id === button.dataset.watchRun; });
      if (!item) return;
      if (item.profileId && getProfiles().some(function (profile) { return profile.id === item.profileId; })) {
        setActiveProfileId(item.profileId);
        renderProfileSelector();
      }
      document.getElementById("researchQuestion").value = item.query;
      openTab("command");
      runResearch({ watchId: item.id });
    });
  });

  root.querySelectorAll("[data-watch-delete]").forEach(function (button) {
    button.addEventListener("click", function () {
      saveWatchlist(getWatchlist().filter(function (item) { return item.id !== button.dataset.watchDelete; }));
      renderWatchlist();
    });
  });
}

function getNotes() {
  return readJson(STORAGE.notes, []);
}

function saveNotes(notes) {
  writeJson(STORAGE.notes, notes);
}

function renderNotes() {
  const root = document.getElementById("notesList");
  const notes = getNotes();

  if (!notes.length) {
    root.innerHTML = '<div class="empty-state">No research notes yet. Add the first one above.</div>';
    return;
  }

  root.innerHTML = notes.map(function (note) {
    return '<article class="note">' +
      '<div class="note-head">' +
        '<div><h3>' + escapeHtml(note.title) + '</h3>' +
        '<time datetime="' + escapeHtml(note.createdAt) + '">' + escapeHtml(new Date(note.createdAt).toLocaleString()) + '</time></div>' +
        '<button class="button danger" data-delete-note="' + escapeHtml(note.id) + '">Delete</button>' +
      '</div>' +
      (note.question ? '<p><span class="tag">Question</span> ' + escapeHtml(note.question) + '</p>' : "") +
      '<p class="note-body">' + escapeHtml(note.body) + '</p>' +
      '<div class="tag-row">' + (note.tags || []).map(function (tag) {
        return '<span class="tag">' + escapeHtml(tag) + '</span>';
      }).join("") + '</div>' +
    '</article>';
  }).join("");

  root.querySelectorAll("[data-delete-note]").forEach(function (button) {
    button.addEventListener("click", function () {
      saveNotes(getNotes().filter(function (note) { return note.id !== button.dataset.deleteNote; }));
      renderNotes();
    });
  });
}

document.getElementById("noteForm").addEventListener("submit", function (event) {
  event.preventDefault();
  const notes = getNotes();
  notes.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : "note-" + Date.now(),
    title: document.getElementById("noteTitle").value.trim(),
    body: document.getElementById("noteBody").value.trim(),
    tags: splitTerms(document.getElementById("noteTags").value),
    question: document.getElementById("noteQuestion").value.trim(),
    createdAt: new Date().toISOString()
  });
  saveNotes(notes);
  event.target.reset();
  document.getElementById("noteQuestion").value = currentResearch.query || "";
  renderNotes();
});

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

document.getElementById("exportNotes").addEventListener("click", function () {
  downloadJson("healthspan-lab-notes.json", {
    exportedAt: new Date().toISOString(),
    notes: getNotes()
  });
});

document.getElementById("exportWorkspaceBtn").addEventListener("click", function () {
  downloadJson("healthspan-lab-workspace.json", {
    format: "healthspan-lab-workspace-v2",
    exportedAt: new Date().toISOString(),
    profiles: getProfiles(),
    activeProfileId: getActiveProfileId(),
    watchlist: getWatchlist(),
    notes: getNotes(),
    healthContext:
      typeof window.getHealthWorkspaceData === "function"
        ? window.getHealthWorkspaceData()
        : null
  });
});

document.getElementById("importWorkspaceInput").addEventListener("change", async function (event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.format !== "healthspan-lab-workspace-v2") {
      throw new Error("This does not look like a Healthspan Lab V2 workspace export.");
    }

    if (!window.confirm("Import this workspace and replace the current local profiles, watchlist, and notes?")) {
      event.target.value = "";
      return;
    }

    writeJson(STORAGE.profiles, Array.isArray(data.profiles) ? data.profiles : []);
    writeJson(STORAGE.watchlist, Array.isArray(data.watchlist) ? data.watchlist : []);
    writeJson(STORAGE.notes, Array.isArray(data.notes) ? data.notes : []);
    if (data.healthContext && typeof window.importHealthWorkspaceData === "function") {
      window.importHealthWorkspaceData(data.healthContext);
    }
    setActiveProfileId(data.activeProfileId || "");

    renderProfileSelector();
    renderWatchlist();
    renderNotes();
    setStatus("Workspace imported into this browser.");
  } catch (error) {
    setStatus(error.message || "Workspace import failed.", "error");
  } finally {
    event.target.value = "";
  }
});

window.getHealthspanResearchState = function getHealthspanResearchState() {
  return currentResearch;
};

window.runHealthspanResearch = runResearch;
window.searchHealthspanPubMed = searchPubMed;
window.searchHealthspanClinicalTrials = searchClinicalTrials;
window.openHealthspanTab = openTab;
window.getHealthspanActiveProfile = getActiveProfile;

renderProfileSelector();
renderWatchlist();
renderNotes();
renderAllResearch();