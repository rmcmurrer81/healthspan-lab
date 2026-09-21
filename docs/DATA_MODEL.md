# Healthspan Lab Data Model

Healthspan Lab keeps source facts, automated analysis, and personal profile information conceptually separate.

## PubMed paper record

```json
{
  "pmid": "12345678",
  "title": "Paper title",
  "abstract": "Abstract text",
  "publicationTypes": ["Randomized Controlled Trial"],
  "authors": ["Example Author"],
  "journal": "Journal",
  "year": "2026",
  "doi": "10.x/example",
  "evidenceType": "human_interventional",
  "resultSignal": "unclear",
  "relevanceScore": 0,
  "relevanceReasons": []
}
```

Automated fields such as `evidenceType`, `resultSignal`, and `relevanceScore` are Healthspan Lab analysis and are not copied source facts.

## Clinical trial record

```json
{
  "nctId": "NCT00000000",
  "title": "Trial title",
  "status": "RECRUITING",
  "conditions": [],
  "phases": [],
  "interventions": [],
  "sex": "ALL",
  "minimumAge": "18 Years",
  "maximumAge": "75 Years",
  "eligibilityCriteria": "",
  "locations": [],
  "relevanceScore": 0,
  "relevanceReasons": [],
  "hardMismatches": []
}
```

## Household profile

```json
{
  "id": "profile-id",
  "name": "Display name",
  "birthDate": "1980-01-01",
  "sex": "MALE",
  "city": "",
  "state": "",
  "country": "",
  "conditions": "",
  "goals": "",
  "interests": "",
  "updatedAt": ""
}
```

All health-related profile fields are optional.

Profile records are local personalization data. They must not be mixed into the source-data layer.

## Research watch item

```json
{
  "id": "watch-id",
  "query": "senolytics and cellular senescence",
  "profileId": "profile-id",
  "lastRun": "",
  "paperTotal": 0,
  "trialTotal": 0,
  "snapshot": {
    "paperIds": [],
    "trialIds": []
  },
  "delta": {
    "papers": 0,
    "trials": 0
  }
}
```

The V2 watchlist compares IDs from the latest retrieved page, not the entire universe of matching records.

## Research note

```json
{
  "id": "note-id",
  "title": "",
  "body": "",
  "tags": [],
  "question": "",
  "createdAt": ""
}
```

## Evidence levels

Allowed initial values:

- `mechanistic`
- `animal`
- `human_observational`
- `human_interventional`
- `evidence_synthesis`

## Result-screening signals

Allowed initial values:

- `positive_signal`
- `null_or_uncertain`
- `adverse_or_negative`
- `unclear`

These values are keyword-screening aids. They are not a substitute for reading the full paper.

## Design rule

Raw source facts and Healthspan Lab interpretation must remain distinguishable.

That makes it possible to improve an algorithm or revise an interpretation without rewriting what PubMed or ClinicalTrials.gov actually reported.
