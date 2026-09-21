# Privacy and Household Profiles

Healthspan Lab Version 2 supports multiple profiles so one installation can be used by an individual, family, or household without treating everyone as one person.

## Local-first storage

Version 2 stores these records in browser local storage:

- household profiles
- active profile ID
- research watchlist
- research notebook

The app does not intentionally upload those records to GitHub or Kira Labs.

However, browser local storage is **not encrypted** in Version 2. Anyone with access to the same computer account and browser profile may be able to inspect it.

Do not treat Healthspan Lab local storage as a medical record system.

## Optional profile fields

A household profile may contain:

- display name
- birthday
- sex field used by structured clinical-trial eligibility records
- city
- state / region
- country
- health topics / conditions to research
- longevity goals
- research interests

Users do not need to fill every field.

## Separation between profiles

Every saved profile has its own ID.

A research run records which profile was active for relevance ranking. Healthspan Lab should not silently copy conditions, goals, or other personal fields from one profile into another.

## What a profile match means

A trial relevance score is a screening tool.

Version 2 may add relevance points when:

- the profile's calculated age falls inside the trial's listed age range;
- the trial's structured sex field matches the optional profile field;
- profile research terms overlap trial conditions, keywords, interventions, or eligibility text;
- the trial lists a location that matches the profile's city, state, or country;
- the trial is recruiting or not yet recruiting.

Healthspan Lab may flag a hard mismatch when a structured age or sex field clearly does not match.

## What a profile match does NOT mean

It does not mean:

- the person is eligible;
- the study is safe for that person;
- the intervention is effective;
- the person should enroll;
- a medical professional has reviewed the profile;
- all inclusion and exclusion criteria have been checked.

Clinical trial staff determine actual eligibility.

## Research-paper relevance

For PubMed papers, Healthspan Lab can rank retrieved records by overlap with a profile's research topics, goals, and interests.

This is a discovery ranking only. A higher score does not mean the paper is stronger evidence or more clinically appropriate.

## Export and import

The workspace export contains local profile information, watchlist data, and notes.

Treat exported JSON as potentially sensitive.

A future version should add optional encryption for local storage and encrypted exports.

## Deleting data

Deleting a profile in Healthspan Lab removes that profile from the app's local profile list. Users should also manage browser data and exported backup files according to their own privacy needs.

## Development rules

Future code should preserve these principles:

1. personal profile fields remain optional;
2. no silent cross-profile merging;
3. relevance scoring stays separate from evidence strength;
4. medical suitability must not be inferred from a relevance score;
5. private profile data should not be committed to the public repository;
6. stronger encryption should be preferred before adding more sensitive profile fields.


## Uploaded medical records

Healthspan Lab may store PDFs and images for an active profile in browser IndexedDB.

Version 2.1 rules:

- a record belongs to exactly one profile;
- records are not committed to the public repository;
- raw record files are not included in ordinary JSON workspace exports;
- deleting a profile triggers deletion of that profile's local records and confirmed health facts;
- each uploaded record is limited to 25 MB in the browser implementation;
- text extracted from a PDF or image is treated as unverified;
- detected measurements enter a draft review queue;
- only facts explicitly confirmed by the user can contribute labels to research matching.

PDF text extraction and OCR are performed in the browser. The extraction libraries and OCR language assets are loaded from public CDNs when extraction is requested. The app should not claim that this is equivalent to an offline encrypted medical-record vault.

## Numerical medical data

Version 2.1 stores confirmed values but does not automatically decide whether a result is:

- high or low;
- normal or abnormal;
- dangerous;
- diagnostic;
- an indication for a supplement, medication, or dose.

A future interpretation layer should preserve the source laboratory's own reference ranges, units, specimen context, date, and clinician notes before making any structured comparison.
