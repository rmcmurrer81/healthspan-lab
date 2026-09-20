# Initial Research Data Model

This is the proposed schema for the first real research database.

## Study

```json
{
  "id": "study-id",
  "title": "Study title",
  "year": 2026,
  "source_type": "journal",
  "identifiers": {
    "doi": null,
    "pmid": null,
    "nct": null
  },
  "study_type": "human_interventional",
  "population_or_model": "",
  "sample_size": null,
  "intervention_or_exposure": "",
  "comparator": "",
  "primary_endpoints": [],
  "key_results": [],
  "limitations": [],
  "adverse_events": [],
  "funding": "",
  "conflicts": "",
  "hallmarks": [],
  "tags": [],
  "source_url": "",
  "last_checked": ""
}
```

## Evidence levels

Allowed initial values:

- `mechanistic`
- `animal`
- `human_observational`
- `human_interventional`
- `evidence_synthesis`

## Research note

```json
{
  "id": "note-id",
  "title": "",
  "body": "",
  "tags": [],
  "linked_study_ids": [],
  "created_at": "",
  "updated_at": ""
}
```

## Design rule

Raw source facts and Healthspan Lab interpretation should be stored separately.

That makes it possible to revise an interpretation without rewriting what the original paper or registry actually reported.
