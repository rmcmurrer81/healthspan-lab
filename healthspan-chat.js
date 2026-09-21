"use strict";

const HEALTHSPAN_CHAT_KEY = "healthspanLabChatHistoryV1";

function hsEscape(value) {
  if (typeof escapeHtml === "function") return escapeHtml(value);
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hsNormalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function hsTruncate(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function activeChatProfileId() {
  const profile = typeof window.getHealthspanActiveProfile === "function"
    ? window.getHealthspanActiveProfile()
    : null;
  return profile ? profile.id : "guest";
}

function activeChatProfile() {
  return typeof window.getHealthspanActiveProfile === "function"
    ? window.getHealthspanActiveProfile()
    : null;
}

function chatStorageKey() {
  return HEALTHSPAN_CHAT_KEY + ":" + activeChatProfileId();
}

function getChatHistory() {
  try {
    const value = localStorage.getItem(chatStorageKey());
    return value ? JSON.parse(value) : [];
  } catch (error) {
    return [];
  }
}

function saveChatHistory(history) {
  localStorage.setItem(chatStorageKey(), JSON.stringify(history.slice(-24)));
}

function addChatHistory(role, text, meta) {
  const history = getChatHistory();
  history.push({
    id: crypto.randomUUID ? crypto.randomUUID() : "chat-" + Date.now(),
    role: role,
    text: text,
    at: new Date().toISOString(),
    meta: meta || null
  });
  saveChatHistory(history);
  renderChatHistory();
}

function renderChatHistory() {
  const root = document.getElementById("healthspanChatMessages");
  if (!root) return;

  const history = getChatHistory();
  if (!history.length) {
    root.innerHTML =
      '<article class="chat-message assistant-message">' +
        '<div class="chat-avatar">H</div>' +
        '<div class="chat-bubble"><strong>Healthspan</strong>' +
        '<p>Tell me what you want to improve or investigate. I’ll organize the current research instead of mixing papers, devices, medications, products, and trials together.</p>' +
        '</div>' +
      '</article>';
    return;
  }

  root.innerHTML = history.map(function (item) {
    const isUser = item.role === "user";
    return '<article class="chat-message ' + (isUser ? "user-message" : "assistant-message") + '">' +
      '<div class="chat-avatar">' + (isUser ? "You" : "H") + '</div>' +
      '<div class="chat-bubble">' +
        '<strong>' + (isUser ? "You" : "Healthspan") + '</strong>' +
        '<p>' + hsEscape(item.text) + '</p>' +
        '<time datetime="' + hsEscape(item.at) + '">' + hsEscape(new Date(item.at).toLocaleString()) + '</time>' +
      '</div>' +
    '</article>';
  }).join("");

  root.scrollTop = root.scrollHeight;
}

function renderChatProfileContext() {
  const root = document.getElementById("healthspanChatProfile");
  if (!root) return;

  const profile = activeChatProfile();
  if (!profile) {
    root.innerHTML = '<strong>No active profile</strong><p>Healthspan will search generally.</p>';
    return;
  }

  const age = typeof calculateAge === "function" ? calculateAge(profile.birthDate) : null;
  const confirmedTerms = typeof window.getConfirmedHealthTerms === "function"
    ? window.getConfirmedHealthTerms(profile.id)
    : [];
  const details = [];
  if (age != null) details.push(age + " years old");
  if (profile.city) details.push(profile.city);
  if (profile.state) details.push(profile.state);

  root.innerHTML =
    '<strong>' + hsEscape(profile.name) + '</strong>' +
    '<p>' + hsEscape(details.join(" · ") || "Profile active") + '</p>' +
    (confirmedTerms.length
      ? '<div class="tag-row">' + confirmedTerms.slice(0, 6).map(function (term) {
          return '<span class="match-tag">' + hsEscape(term) + '</span>';
        }).join("") + '</div>'
      : "");
}

function goalFamily(message) {
  const text = hsNormalize(message);

  if (/memory|remember|forget|cognit|brain fog|focus|attention|mental sharp/.test(text)) return "memory";
  if (/sleep|insomnia|circadian|rest/.test(text)) return "sleep";
  if (/muscle|strength|mobility|frailty|sarcopenia|balance/.test(text)) return "mobility";
  if (/heart|cardio|blood pressure|cholesterol|vascular/.test(text)) return "cardiovascular";
  if (/skin|wrinkle|photoaging|sun damage/.test(text)) return "skin";
  if (/biological age|epigenetic|methylation|aging clock/.test(text)) return "biological-age";
  return "general";
}

function buildChatQueries(message) {
  const family = goalFamily(message);
  const clean = message.trim();

  const presets = {
    memory: {
      main: "(memory OR cognition OR cognitive function) AND (aging OR adults OR intervention)",
      device: "(memory OR cognition) AND (tDCS OR transcranial direct current stimulation OR TMS OR neurostimulation)",
      medication: "(memory OR cognition) AND (drug OR pharmacologic OR medication OR randomized)",
      label: "memory and cognitive function"
    },
    sleep: {
      main: "(sleep OR insomnia OR sleep quality) AND (aging OR adults OR intervention)",
      device: "(sleep OR insomnia) AND (device OR stimulation OR wearable)",
      medication: "(sleep OR insomnia) AND (drug OR medication OR pharmacologic)",
      label: "sleep and healthy aging"
    },
    mobility: {
      main: "(muscle strength OR mobility OR frailty OR sarcopenia) AND (aging OR adults OR intervention)",
      device: "(mobility OR muscle strength) AND (device OR electrical stimulation OR neuromuscular stimulation)",
      medication: "(sarcopenia OR frailty OR muscle) AND (drug OR medication OR pharmacologic)",
      label: "strength, mobility, and healthy aging"
    },
    cardiovascular: {
      main: "(cardiovascular OR blood pressure OR vascular health) AND (aging OR adults OR intervention)",
      device: "(blood pressure OR cardiovascular) AND (device OR monitoring OR wearable)",
      medication: "(cardiovascular OR blood pressure) AND (drug OR medication OR randomized)",
      label: "cardiovascular health"
    },
    skin: {
      main: "(skin aging OR photoaging OR ultraviolet) AND (intervention OR randomized OR review)",
      device: "(skin aging OR photoaging) AND (device OR light OR laser)",
      medication: "(skin aging OR photoaging) AND (drug OR topical OR medication)",
      label: "skin aging and protection"
    },
    "biological-age": {
      main: "(biological age OR epigenetic clock OR DNA methylation age) AND (intervention OR aging)",
      device: "(biological age OR aging) AND (device OR wearable OR monitoring)",
      medication: "(biological age OR aging) AND (drug OR pharmacologic OR intervention)",
      label: "biological age"
    }
  };

  if (presets[family]) return presets[family];

  return {
    main: clean + " aging healthspan intervention",
    device: clean + " device stimulation intervention",
    medication: clean + " drug medication pharmacologic",
    label: clean
  };
}

function trialInterventionBuckets(trials) {
  const deviceTrials = [];
  const drugTrials = [];
  const otherTrials = [];

  (trials || []).forEach(function (trial) {
    const details = Array.isArray(trial.interventionDetails) ? trial.interventionDetails : [];
    const text = hsNormalize(
      trial.title + " " +
      (trial.interventions || []).join(" ") + " " +
      details.map(function (item) { return item.type + " " + item.name + " " + item.description; }).join(" ")
    );

    const hasDeviceType = details.some(function (item) {
      return String(item.type || "").toUpperCase() === "DEVICE";
    });
    const hasDrugType = details.some(function (item) {
      return ["DRUG", "BIOLOGICAL"].includes(String(item.type || "").toUpperCase());
    });

    if (hasDeviceType || /tdcs|transcranial|stimulation|neuromod|tms|electrode|neurofeedback|vagus/.test(text)) {
      deviceTrials.push(trial);
    } else if (hasDrugType) {
      drugTrials.push(trial);
    } else {
      otherTrials.push(trial);
    }
  });

  return { deviceTrials: deviceTrials, drugTrials: drugTrials, otherTrials: otherTrials };
}

function dedupeTrials(trials) {
  const seen = new Set();
  return (trials || []).filter(function (trial) {
    if (!trial || !trial.nctId || seen.has(trial.nctId)) return false;
    seen.add(trial.nctId);
    return true;
  });
}

function dedupePapers(papers) {
  const seen = new Set();
  return (papers || []).filter(function (paper) {
    if (!paper || !paper.pmid || seen.has(paper.pmid)) return false;
    seen.add(paper.pmid);
    return true;
  });
}

function trialIsRecruiting(trial) {
  return ["RECRUITING", "NOT_YET_RECRUITING", "ENROLLING_BY_INVITATION"].includes(trial.status);
}

function researchLaneCard(paper) {
  const label = typeof EVIDENCE_LABELS !== "undefined"
    ? EVIDENCE_LABELS[paper.evidenceType] || paper.evidenceType
    : paper.evidenceType;

  return '<article class="chat-result-card">' +
    '<span class="tag">' + hsEscape(label || "Research paper") + '</span>' +
    '<h4>' + hsEscape(paper.title) + '</h4>' +
    '<p>' + hsEscape(hsTruncate(paper.abstract || "Open PubMed for details.", 260)) + '</p>' +
    '<a href="https://pubmed.ncbi.nlm.nih.gov/' + encodeURIComponent(paper.pmid) + '/" target="_blank" rel="noopener noreferrer">Open PubMed ↗</a>' +
  '</article>';
}

function trialLaneCard(trial, kind) {
  const profile = activeChatProfile();
  const reasons = Array.isArray(trial.relevanceReasons) ? trial.relevanceReasons.slice(0, 3) : [];
  const kindLabel = kind || "Clinical trial";

  return '<article class="chat-result-card">' +
    '<div class="tag-row">' +
      '<span class="tag">' + hsEscape(kindLabel) + '</span>' +
      '<span class="' + (trialIsRecruiting(trial) ? "match-tag" : "tag") + '">' + hsEscape((trial.status || "status unavailable").replaceAll("_", " ")) + '</span>' +
      (profile && trial.relevanceScore
        ? '<span class="match-tag">profile relevance ' + trial.relevanceScore + '</span>'
        : "") +
    '</div>' +
    '<h4>' + hsEscape(trial.title) + '</h4>' +
    '<p><strong>' + hsEscape(trial.nctId) + '</strong>' +
      (trial.interventions && trial.interventions.length ? ' · ' + hsEscape(hsTruncate(trial.interventions.join(", "), 140)) : "") +
    '</p>' +
    (reasons.length
      ? '<p class="chat-card-note">' + hsEscape(reasons.join(" · ")) + '</p>'
      : "") +
    '<a href="https://clinicaltrials.gov/study/' + encodeURIComponent(trial.nctId) + '" target="_blank" rel="noopener noreferrer">' +
      (trialIsRecruiting(trial) ? "Open trial / contact study team ↗" : "Open trial record ↗") +
    '</a>' +
  '</article>';
}

function drugNamesFromTrials(trials) {
  const names = [];
  (trials || []).forEach(function (trial) {
    (trial.interventionDetails || []).forEach(function (item) {
      if (["DRUG", "BIOLOGICAL"].includes(String(item.type || "").toUpperCase()) && item.name) {
        names.push({
          name: item.name,
          type: item.type,
          trial: trial
        });
      }
    });
  });

  const seen = new Set();
  return names.filter(function (item) {
    const key = hsNormalize(item.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dailyMedUrl(name) {
  return "https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=" + encodeURIComponent(name);
}

function medicationCard(item) {
  return '<article class="chat-result-card medication-card">' +
    '<div class="tag-row"><span class="warn-tag">Medication research</span><span class="tag">' + hsEscape(item.type || "DRUG") + '</span></div>' +
    '<h4>' + hsEscape(item.name) + '</h4>' +
    '<p>Appears as an intervention in <strong>' + hsEscape(item.trial.nctId) + '</strong>. This does not mean it is approved for this goal or appropriate for the active profile.</p>' +
    '<div class="result-links">' +
      '<a href="https://clinicaltrials.gov/study/' + encodeURIComponent(item.trial.nctId) + '" target="_blank" rel="noopener noreferrer">Trial record ↗</a>' +
      '<a href="' + hsEscape(dailyMedUrl(item.name)) + '" target="_blank" rel="noopener noreferrer">Check U.S. labeling / market listing ↗</a>' +
    '</div>' +
  '</article>';
}

function tDCSExplainerCard(query) {
  const pubmed = "https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURIComponent(query);
  const trials = "https://clinicaltrials.gov/search?term=" + encodeURIComponent(query);
  const fda = "https://www.fda.gov/medical-devices/device-approvals-denials-and-clearances/510k-clearances";

  return '<article class="chat-result-card device-caution-card">' +
    '<div class="tag-row"><span class="warn-tag">Neurostimulation / device research</span><span class="tag">tDCS / related stimulation</span></div>' +
    '<h4>Electrical brain-stimulation devices</h4>' +
    '<p>Healthspan separates tDCS and related neurostimulation from ordinary consumer wellness products. Research and commercial devices exist, but device labeling, intended use, electrode placement, current, duration, contraindications, and regulatory status matter. Healthspan does not provide a self-stimulation protocol or rank a device for unsupervised use.</p>' +
    '<div class="result-links">' +
      '<a href="' + hsEscape(pubmed) + '" target="_blank" rel="noopener noreferrer">Search PubMed ↗</a>' +
      '<a href="' + hsEscape(trials) + '" target="_blank" rel="noopener noreferrer">Search trials ↗</a>' +
      '<a href="' + hsEscape(fda) + '" target="_blank" rel="noopener noreferrer">FDA device clearance resources ↗</a>' +
    '</div>' +
  '</article>';
}

function marketOptionCard(item) {
  return '<article class="chat-result-card">' +
    '<div class="tag-row"><span class="good-tag">Market / wellness category</span><span class="tag">' + hsEscape(item.category) + '</span></div>' +
    '<h4>' + hsEscape(item.name) + '</h4>' +
    '<p>' + hsEscape(item.why) + '</p>' +
    '<p class="chat-card-note"><strong>Why it surfaced:</strong> ' +
      hsEscape(item.reasons && item.reasons.length ? item.reasons.join(", ") : "general research relevance") +
    '</p>' +
    '<p class="chat-card-note"><strong>Safety:</strong> ' + hsEscape(item.safety) + '</p>' +
    '<div class="result-links">' +
      '<a href="https://www.amazon.com/s?k=' + encodeURIComponent(item.retailerQuery) + '" target="_blank" rel="noopener noreferrer">Search Amazon ↗</a>' +
      '<a href="https://www.walgreens.com/search/results.jsp?Ntt=' + encodeURIComponent(item.retailerQuery) + '" target="_blank" rel="noopener noreferrer">Search Walgreens ↗</a>' +
    '</div>' +
  '</article>';
}

function renderLane(title, subtitle, count, body, className) {
  return '<section class="chat-lane ' + (className || "") + '">' +
    '<div class="chat-lane-heading">' +
      '<div><h3>' + hsEscape(title) + '</h3><p>' + hsEscape(subtitle) + '</p></div>' +
      '<span class="status-badge">' + count + '</span>' +
    '</div>' +
    '<div class="chat-lane-body">' + body + '</div>' +
  '</section>';
}

async function runHealthspanChat(message) {
  const input = document.getElementById("healthspanChatInput");
  const send = document.getElementById("healthspanChatSend");
  const lanesRoot = document.getElementById("healthspanChatLanes");
  const labelRoot = document.getElementById("healthspanChatAnswerLabel");
  const researchQuestion = document.getElementById("researchQuestion");

  addChatHistory("user", message);
  send.disabled = true;
  input.disabled = true;
  labelRoot.textContent = "Healthspan is searching live sources…";
  lanesRoot.innerHTML =
    '<div class="chat-thinking">' +
      '<span class="chat-thinking-dot"></span><span class="chat-thinking-dot"></span><span class="chat-thinking-dot"></span>' +
      '<p>Searching PubMed and ClinicalTrials.gov, then separating research, devices, medications, market options, and recruiting trials.</p>' +
    '</div>';

  const queries = buildChatQueries(message);
  researchQuestion.value = queries.main;

  let deviceTrials = [];
  let medicationTrials = [];
  let devicePapers = [];

  try {
    const mainPromise = typeof window.runHealthspanResearch === "function"
      ? window.runHealthspanResearch()
      : Promise.resolve();

    const deviceTrialsPromise = typeof window.searchHealthspanClinicalTrials === "function"
      ? window.searchHealthspanClinicalTrials(queries.device).catch(function () { return { trials: [], total: 0 }; })
      : Promise.resolve({ trials: [], total: 0 });

    const medicationTrialsPromise = typeof window.searchHealthspanClinicalTrials === "function"
      ? window.searchHealthspanClinicalTrials(queries.medication).catch(function () { return { trials: [], total: 0 }; })
      : Promise.resolve({ trials: [], total: 0 });

    const devicePapersPromise = typeof window.searchHealthspanPubMed === "function"
      ? window.searchHealthspanPubMed(queries.device).catch(function () { return { papers: [], total: 0 }; })
      : Promise.resolve({ papers: [], total: 0 });

    const results = await Promise.all([mainPromise, deviceTrialsPromise, medicationTrialsPromise, devicePapersPromise]);

    deviceTrials = results[1].trials || [];
    medicationTrials = results[2].trials || [];
    devicePapers = results[3].papers || [];

    const state = typeof window.getHealthspanResearchState === "function"
      ? window.getHealthspanResearchState()
      : null;

    if (!state) throw new Error("Healthspan research state is unavailable.");

    const mainBuckets = trialInterventionBuckets(state.trials || []);
    const deviceExtraBuckets = trialInterventionBuckets(deviceTrials);
    const medicationExtraBuckets = trialInterventionBuckets(medicationTrials);

    const allDeviceTrials = dedupeTrials(
      mainBuckets.deviceTrials
        .concat(deviceExtraBuckets.deviceTrials)
        .concat(deviceExtraBuckets.otherTrials.filter(function (trial) {
          const text = hsNormalize(trial.title + " " + (trial.interventions || []).join(" "));
          return /tdcs|transcranial|stimulation|neuromod|tms|electrode/.test(text);
        }))
    );

    const allDrugTrials = dedupeTrials(
      mainBuckets.drugTrials.concat(medicationExtraBuckets.drugTrials)
    );

    const recruiting = dedupeTrials(
      (state.trials || [])
        .concat(deviceTrials)
        .concat(medicationTrials)
        .filter(trialIsRecruiting)
    ).sort(function (a, b) {
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });

    const drugNames = drugNamesFromTrials(allDrugTrials);
    const papers = dedupePapers((state.papers || []).concat(devicePapers)).slice(0, 6);

    const market = typeof window.getHealthspanProductOptions === "function"
      ? window.getHealthspanProductOptions().filter(function (item) { return item.score > 0; }).slice(0, 5)
      : [];

    const researchBody = papers.length
      ? papers.map(researchLaneCard).join("")
      : '<div class="empty-mini">No paper records were returned in this search.</div>';

    const deviceBody =
      tDCSExplainerCard(queries.device) +
      (allDeviceTrials.length
        ? allDeviceTrials.slice(0, 5).map(function (trial) { return trialLaneCard(trial, "Device / neurostimulation trial"); }).join("")
        : '<div class="empty-mini">No device-specific trial was found in the retrieved pages. Use the live search links above for a broader check.</div>');

    const medicationBody = drugNames.length
      ? drugNames.slice(0, 6).map(medicationCard).join("")
      : '<div class="empty-mini">No medication intervention was identified in the retrieved trial pages. Healthspan will not invent a drug recommendation when the live records do not show one.</div>';

    const marketBody = market.length
      ? market.map(marketOptionCard).join("")
      : '<div class="empty-mini">No lower-risk market category matched strongly enough. Healthspan keeps this separate from medication and neurostimulation research rather than forcing a shopping suggestion.</div>';

    const trialsBody = recruiting.length
      ? recruiting.slice(0, 8).map(function (trial) { return trialLaneCard(trial, "Recruiting / upcoming trial"); }).join("")
      : '<div class="empty-mini">No recruiting or not-yet-recruiting study appeared in the retrieved pages. That does not prove none exist; broaden the trial search if needed.</div>';

    lanesRoot.innerHTML =
      renderLane("Research", "Peer-reviewed literature and evidence records.", papers.length, researchBody, "research-lane") +
      renderLane("Devices & neurostimulation", "tDCS, TMS, electrodes, stimulation, and other device studies stay separate from ordinary shopping.", allDeviceTrials.length, deviceBody, "device-lane") +
      renderLane("Medications being studied", "Drug or biological interventions found in clinical-trial records. This is research context, not a prescription.", drugNames.length, medicationBody, "medication-lane") +
      renderLane("Market & wellness options", "Lower-risk products that match the profile/research context. Retail links are searches, not endorsements.", market.length, marketBody, "market-lane") +
      renderLane("Trials to investigate", "Recruiting, not-yet-recruiting, or invitation-based studies from ClinicalTrials.gov.", recruiting.length, trialsBody, "trial-lane");

    const profile = activeChatProfile();
    const assistantText =
      "I separated the live results for " + queries.label + " into " +
      papers.length + " research record(s), " +
      allDeviceTrials.length + " device/neurostimulation trial(s), " +
      drugNames.length + " medication intervention(s), " +
      market.length + " market/wellness option(s), and " +
      recruiting.length + " recruiting or upcoming trial(s)." +
      (profile ? " I also ranked relevance using " + profile.name + "'s active profile where the source data allowed it." : "");

    addChatHistory("assistant", assistantText, {
      query: queries.main,
      counts: {
        papers: papers.length,
        devices: allDeviceTrials.length,
        medications: drugNames.length,
        market: market.length,
        trials: recruiting.length
      }
    });

    labelRoot.textContent = "Latest answer: " + queries.label;
  } catch (error) {
    console.error(error);
    lanesRoot.innerHTML =
      '<div class="empty-state">Healthspan could not complete the live research run. ' +
      hsEscape(error.message || "Try again when the live sources are available.") +
      '</div>';
    addChatHistory("assistant", "I could not finish that live research run. " + (error.message || "Please try again."));
    labelRoot.textContent = "Research run failed";
  } finally {
    send.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

const healthspanChatForm = document.getElementById("healthspanChatForm");
if (healthspanChatForm) {
  healthspanChatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const input = document.getElementById("healthspanChatInput");
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    runHealthspanChat(message);
  });
}

const healthspanChatInput = document.getElementById("healthspanChatInput");
if (healthspanChatInput) {
  healthspanChatInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const message = healthspanChatInput.value.trim();
      if (!message) return;
      healthspanChatInput.value = "";
      runHealthspanChat(message);
    }
  });
}

document.querySelectorAll("[data-chat-example]").forEach(function (button) {
  button.addEventListener("click", function () {
    const input = document.getElementById("healthspanChatInput");
    input.value = button.dataset.chatExample;
    input.focus();
  });
});

const openFullDossierBtn = document.getElementById("openFullDossierBtn");
if (openFullDossierBtn) {
  openFullDossierBtn.addEventListener("click", function () {
    if (typeof window.openHealthspanTab === "function") {
      window.openHealthspanTab("command");
    }
  });
}

window.addEventListener("healthspan:profile-changed", function () {
  renderChatProfileContext();
  renderChatHistory();
});

renderChatProfileContext();
renderChatHistory();
