# Healthspan Lab

Healthspan Lab is an open-source Kira Labs research project for organizing, exploring, and communicating evidence about aging biology, healthspan, geroscience, biomarkers, and human longevity research.

## Version 1

The first working prototype includes:

- **Research Explorer** — searchable research topics organized by evidence level.
- **Hallmarks Explorer** — the expanded 12-hallmark aging framework.
- **Clinical Trials** — launches focused searches on the official ClinicalTrials.gov site.
- **Research Notebook** — saves notes in the browser and exports them as JSON.

No account, API key, or paid service is required for the V1 prototype.

## Run locally

Clone the repository and open `index.html` in a modern browser.

For a local web server, Python can also be used:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Goals

- Track longevity research without treating preliminary findings as established medical facts.
- Separate cell, animal, observational-human, and interventional-human evidence.
- Explore the hallmarks of aging and related research.
- Track clinical trials and research questions.
- Maintain a local research notebook.
- Build toward reproducible public-data analysis and research reports.

## Project principles

1. **Evidence first** — sources and study type matter.
2. **Uncertainty is visible** — preliminary evidence is labeled as preliminary.
3. **Research, not medical advice** — the project is educational and research-oriented.
4. **Reproducibility** — future analyses should document data sources, methods, and assumptions.
5. **Privacy by design** — personal health data should not be required for basic use.

## Research standard

See [docs/RESEARCH_STANDARD.md](docs/RESEARCH_STANDARD.md).

The initial evidence ladder distinguishes:

1. mechanistic / cell evidence;
2. animal evidence;
3. human observational evidence;
4. human interventional evidence; and
5. evidence synthesis.

## Architecture

The initial prototype is intentionally lightweight:

- `index.html` — interface
- `styles.css` — visual design
- `app.js` — research explorer, hallmarks, trials launcher, and notebook logic
- `docs/` — research methodology and data-model documentation
- `ROADMAP.md` — planned development

The next major step is replacing the seeded topic cards with source-backed PubMed and ClinicalTrials.gov records.

## Medical disclaimer

Healthspan Lab is a research and educational project. It is not a medical device and does not provide diagnosis, treatment, or individualized medical advice.
