# Healthspan Lab

Healthspan Lab is an open-source Kira Labs research workspace for investigating aging biology, healthspan, geroscience, biomarkers, interventions, and human longevity research.

## Version 2

Version 2 turns the original prototype into a live research command center.

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
- `docs/RESEARCH_STANDARD.md` — evidence-handling rules
- `docs/DATA_MODEL.md` — structured research and profile model
- `docs/PRIVACY_AND_PROFILES.md` — privacy and multi-user matching rules
- `ROADMAP.md` — development plan

## Medical disclaimer

Healthspan Lab is a research and educational project. It is not a medical device and does not provide diagnosis, treatment, individualized medical advice, or clinical-trial eligibility decisions.
