# Healthspan Lab

Healthspan Lab is an open-source Kira Labs research workspace for investigating aging biology, healthspan, geroscience, biomarkers, interventions, and human longevity research.

## Version 2

Version 2 turns the original prototype into a live research command center.

### Healthspan Chat

The primary interface is now conversational. A user can type a goal such as:

> I want to improve my memory.

Healthspan turns that into live source searches and separates the answer into:

- **Research** — PubMed literature and evidence records.
- **Devices & neurostimulation** — device trials and approaches such as tDCS/TMS when relevant, kept separate from ordinary shopping.
- **Medications being studied** — drug/biological interventions found in clinical trials, with links to trial records and U.S. labeling/market-status searches.
- **Market & wellness options** — conservative non-prescription product categories matched to the profile/research context.
- **Trials to investigate** — recruiting, not-yet-recruiting, or invitation-based studies from ClinicalTrials.gov.

Medication and neurostimulation lanes summarize evidence and study activity. They are not instructions to start a medication or electrical-stimulation protocol.


### Research Command Center

Enter a research question and Healthspan Lab can:

- search live PubMed / NCBI records;
- search the ClinicalTrials.gov API v2;
- classify retrieved literature by evidence type;
- screen retrieved abstracts for possible mixed-result signals;
- identify research gaps in the retrieved set;
- detect connections to the 12 Hallmarks of Aging;
- build a visual research graph;
- save the question to a watchlist and compare future retrieved IDs.

### Household profiles

Healthspan Lab supports multiple local profiles for a person, family, or household.

A profile can optionally contain:

- display name;
- birthday;
- sex field used by some clinical-trial eligibility records;
- city, state/region, and country;
- health topics or conditions the user wants to research;
- longevity goals;
- research interests.

The app uses those fields to calculate **research relevance signals**. For trials, it can compare basic structured fields such as listed age range, sex, topic overlap, enrollment status, and location text.

A relevance score is not a medical recommendation and is not confirmation that somebody qualifies for a clinical trial. Trial staff determine eligibility.

### Health-record intake

Each household profile can now attach recent medical PDFs or photos.

- files are stored locally in browser IndexedDB;
- PDFs use browser-side text extraction;
- scanned PDFs and photos can use browser OCR;
- detected measurements are placed into a draft review queue;
- a user must confirm a fact before its label can affect research relevance;
- numeric measurements are stored but are not automatically labeled normal, abnormal, safe, or unsafe.

Raw medical files are intentionally excluded from normal JSON workspace exports because they can be large and sensitive.

### Research-backed options

Healthspan Lab can also match profile interests, confirmed health-context labels, and the current research question against a conservative catalog of non-prescription product categories.

The first implementation includes categories such as:

- upper-arm blood-pressure monitors;
- resistance bands;
- activity trackers / pedometers;
- sleep masks;
- broad-spectrum sunscreen;
- digital home scales;
- grip-strength dynamometers.

Each card explains why it surfaced, includes a safety note, can launch a research question, and provides retailer search links.

This system does **not** currently turn a lab value into a supplement, medication, or dosage recommendation.

See [docs/PRODUCT_OPTIONS_SAFETY.md](docs/PRODUCT_OPTIONS_SAFETY.md).

### Local-first privacy

Profiles, notes, and watchlists are stored in browser local storage by default. Healthspan Lab does not upload those local profile records to GitHub or Kira Labs.

Version 2 browser storage is **not encrypted** and is not a medical-record system. See [docs/PRIVACY_AND_PROFILES.md](docs/PRIVACY_AND_PROFILES.md).

Workspace JSON export/import is included so a user can make a backup or move their local workspace deliberately.

### Evidence engine

The initial automated evidence classifier distinguishes:

1. mechanistic / cell;
2. animal;
3. human observational;
4. human interventional; and
5. review / evidence synthesis.

This classification is automated from publication metadata and text cues. Important records should always be verified at the linked source.

## Live data sources

Healthspan Lab currently uses:

- PubMed through NCBI E-utilities;
- ClinicalTrials.gov API v2.

No paid API key is required for the initial implementation.

## Run locally

Because Version 2 performs live web API requests, use a local HTTP server rather than double-clicking `index.html`.

From the repository folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Project principles

1. **Evidence first** — source and study type matter.
2. **Traceable sources** — important records link back to PubMed or ClinicalTrials.gov.
3. **Uncertainty stays visible** — automated signals are labeled as screening tools, not conclusions.
4. **Research relevance is not medical suitability**.
5. **Household profiles stay separate**.
6. **Local-first privacy** — personal data is optional and should not be required for general research.
7. **Reproducibility** — future public-data analyses should preserve datasets, methods, versions, and assumptions.

## Repository structure

- `index.html` — research dashboard and profile interface
- `styles.css` — responsive visual system
- `app.js` — live research engine, profile matching, graph, watchlist, and notebook
- `health-records.js` — local medical-record storage, reviewable extraction, confirmed health context, and research-backed product-category matching
- `healthspan-chat.js` — conversational research orchestration and separated research/device/medication/market/trial lanes
- `docs/RESEARCH_STANDARD.md` — evidence-handling rules
- `docs/DATA_MODEL.md` — structured research and profile model
- `docs/PRIVACY_AND_PROFILES.md` — privacy and multi-user matching rules
- `docs/PRODUCT_OPTIONS_SAFETY.md` — safety rules for practical product-category discovery
- `ROADMAP.md` — development plan

## Medical disclaimer

Healthspan Lab is a research and educational project. It is not a medical device and does not provide diagnosis, treatment, individualized medical advice, or clinical-trial eligibility decisions.
