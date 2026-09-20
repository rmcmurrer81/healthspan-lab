# Healthspan Lab Research Standard

Healthspan Lab should make it obvious **what kind of evidence exists, what it can support, and what remains uncertain**.

## Evidence classes

Every research record should identify the study type.

### 1. Mechanistic / cell evidence
Examples include cell culture, molecular pathways, organoids, ex vivo tissue, and biochemical experiments.

Useful for:
- mechanism discovery
- target identification
- hypothesis generation

Not enough by itself to claim a treatment improves human healthspan or lifespan.

### 2. Animal evidence
Record:
- species and strain
- sex
- age at intervention
- intervention and dose
- lifespan vs. healthspan endpoint
- effect size
- adverse effects
- replication status

Animal lifespan extension should never be presented as equivalent to demonstrated human lifespan extension.

### 3. Human observational evidence
Record:
- population
- sample size
- follow-up period
- exposure or biomarker
- outcome
- major confounders
- whether the result is association or causal evidence

### 4. Human interventional evidence
Record:
- trial design
- registration identifier
- randomized / blinded status
- sample size
- population
- intervention
- comparator
- primary and secondary endpoints
- adverse events
- trial status
- published results, if any

### 5. Evidence synthesis
Systematic reviews and meta-analyses should record:
- inclusion criteria
- number of studies
- heterogeneity
- risk-of-bias method
- publication-bias concerns
- whether conclusions apply to the population being discussed

## Confidence labels

Future versions should support labels such as:

- **Exploratory** — early or hypothesis-generating evidence
- **Preliminary** — some evidence, substantial uncertainty
- **Moderate** — multiple reasonably consistent findings with important limitations
- **Stronger evidence** — replicated human evidence with appropriate design

These labels are descriptions of the evidence base, not treatment recommendations.

## Required source fields

A saved paper or trial should eventually include:

- title
- authors / sponsor
- year
- source
- DOI, PMID, NCT number, or stable URL when available
- study type
- population or model
- sample size
- intervention / exposure
- outcome
- key result
- limitations
- conflicts of interest / funding when reported
- Healthspan Lab notes
- date last checked

## Hallmarks framework

The initial Hallmarks Explorer follows the expanded 12-hallmark framework described by López-Otín and colleagues in *Cell* (2023), including:

1. Genomic instability
2. Telomere attrition
3. Epigenetic alterations
4. Loss of proteostasis
5. Disabled macroautophagy
6. Deregulated nutrient sensing
7. Mitochondrial dysfunction
8. Cellular senescence
9. Stem cell exhaustion
10. Altered intercellular communication
11. Chronic inflammation
12. Dysbiosis

The framework organizes research. It should not be treated as proof that targeting a hallmark will extend human lifespan.

## Safety and communication

Healthspan Lab should:

- distinguish research findings from medical advice;
- display uncertainty prominently;
- avoid converting biomarker changes into unsupported lifespan claims;
- distinguish surrogate endpoints from clinical outcomes;
- identify whether findings are in cells, animals, or humans;
- preserve negative and null findings instead of collecting only exciting results;
- prefer primary sources and trial registries for factual research records.

## Reproducibility

When Healthspan Lab begins analyzing public datasets, every analysis should preserve:

- source dataset and version
- inclusion / exclusion criteria
- transformation steps
- statistical methods
- code version
- random seeds where applicable
- known limitations

The goal is for another researcher to be able to reproduce the result from the repository.
