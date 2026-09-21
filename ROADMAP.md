# Healthspan Lab Roadmap

## V1 — Research workspace

Status: complete

- [x] Static web interface
- [x] Hallmarks Explorer foundation
- [x] local research notebook
- [x] notebook JSON export
- [x] evidence classification standard
- [x] initial research data model
- [x] automated JavaScript syntax checks

## V2 — Research Command Center

Status: in development

- [x] live PubMed / NCBI search
- [x] live ClinicalTrials.gov API v2 search
- [x] source-backed PMID and NCT links
- [x] automated evidence-type classification
- [x] mixed-result / contradiction screening
- [x] research-gap detection
- [x] Hallmarks-of-Aging detection
- [x] research dossier summary
- [x] Healthspan conversational research interface
- [x] goal-to-research query expansion
- [x] separated research / device / medication / market / recruiting-trial lanes
- [x] device and neurostimulation research lane with regulatory-resource links
- [x] medication intervention extraction from ClinicalTrials.gov records
- [x] U.S. medication labeling / market-status lookup links
- [x] profile-specific local chat history
- [x] SVG research graph
- [x] multiple household profiles
- [x] birthday-to-age calculation
- [x] trial relevance screening using age, sex, topic, status, and location text
- [x] profile-aware literature ranking
- [x] local research watchlist
- [x] new-retrieved-ID comparison on watchlist reruns
- [x] workspace JSON export/import
- [x] per-profile PDF / image medical-record storage in IndexedDB
- [x] browser-side PDF text extraction
- [x] browser OCR for scanned records and photos
- [x] review-before-confirm measurement workflow
- [x] confirmed health-fact labels in research relevance
- [x] conservative research-backed product-category discovery
- [x] Amazon and Walgreens category search links
- [x] raw medical records excluded from ordinary JSON export
- [ ] encrypted local profile and record vault
- [ ] citation attachment from a paper/trial directly into a notebook note
- [ ] pagination beyond the first retrieved result set
- [ ] dedicated intervention dossier pages
- [ ] trial-detail eligibility parser with structured inclusion/exclusion criteria
- [ ] browser integration tests
- [ ] optional GitHub Pages deployment

## V3 — Evidence graph and local research intelligence

- relationship graph linking:
  - hallmarks
  - pathways
  - genes
  - proteins
  - interventions
  - biomarkers
  - diseases / age-related conditions
  - papers
  - clinical trials
- stronger duplicate detection
- paper-to-paper citation links
- author / laboratory tracking
- replication tracker
- intervention timeline
- structured adverse-event comparison
- dedicated biological-age methods comparison
- local AI integration for source-grounded summaries
- contradiction analysis that quotes and cites exact source passages
- automatic Kira Labs research reports

The graph must distinguish association, intervention, mechanism, and hypothesis rather than displaying every connection as causal.

## V4 — Public-data research lab

Candidate capabilities:

- reproducible notebooks
- dataset provenance
- cohort filtering
- survival analysis
- longitudinal biomarker analysis
- visualization
- model cards for machine-learning work
- exportable research reports
- saved analysis recipes
- independent reruns against updated public datasets

Public datasets must be used according to their licenses, data-use agreements, and privacy requirements.

## V5 — Research monitoring and publishing

- scheduled topic monitoring
- trial status-change tracking
- newly published paper alerts
- Kira Labs research report generator
- research-to-video workflow
- source list and citation export
- changelog showing what new evidence altered a dossier

## Safety and privacy backlog

- optional encrypted local vault
- profile-level export and delete
- clear distinction between research relevance and medical suitability
- no automatic cross-profile data sharing
- no silent use of one family member's health information for another member
- audit log for imported/exported personal workspace data
