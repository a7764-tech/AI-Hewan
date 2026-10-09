# HEWAN.AI

HEWAN.AI is a standalone, Indonesian-language animal information and matching application. Its intent detection, knowledge base, and recommendation scoring run in the browser with plain HTML, CSS, and JavaScript. It does not use a frontend framework or external AI API.

## Run locally

From PowerShell, change to this project directory and start a local static web server:

```powershell
Set-Location 'C:\Users\FIN\OneDrive\Documents\AI-Hewan'
python -m http.server 8000
```

Open `http://localhost:8000` in a browser. Python is used only to serve the static files; there are no package dependencies or build step. Browser storage is scoped to the site origin, so use the same local URL to keep accessing the same database.

## Features

- Chat assistant for animal information, care, basic safety guidance, comparisons, and recommendations.
- Explainable animal matching across available space, cost, care, noise, experience, time, and activity preferences.
- Searchable animal profiles, categories, favorites, and side-by-side comparison.
- Local training workspace for adding and reviewing labeled examples, attaching a trusted answer, training the example matcher, and tuning heuristic weights.
- Unknown questions are answered with a clarification request and added to the local review queue. They are not silently converted into facts.
- Local animal profile management, feedback collection, JSON backup/restore, and training-data CSV export.
- Twenty-eight initial animal profiles with care, habitat, food, lifespan, suitability, and limitations.

## How “training” works

This project implements a small, explainable knowledge-base training workflow—not neural-network or large-language-model training. The engine normalizes text, checks intent keywords, and compares a query with labeled training examples using token overlap. Similar trained examples can supply a saved answer or intent. Recommendations are calculated separately with a weighted heuristic; scores are normalized over preferences the user actually filled in. Feedback is collected for evaluation and does not automatically change the weights.

When an answer is uncertain, the assistant asks the user to clarify. The question enters the review queue as an **untrained** example. An editor must assign an intent and optionally add a fact-checked answer before the example can be trained.

## Data and privacy

The database is browser `localStorage` on the current device and browser profile. Chat messages, feedback, favorites, animal edits, training examples, and settings are not sent to a server. Export regular JSON backups. Importing a backup replaces the current local application data.

This static, single-user version does not provide administrator authentication, server-side storage, or synchronized multi-user access. It is suitable as a local prototype, not as a production admin system or a place to store sensitive information.

## Dataset notes and references

The included profiles are an initial educational dataset, not a substitute for individualized veterinary advice. Costs are qualitative estimates; lifespan, diet, legal status, climate suitability, and care needs vary by species, individual, region, and husbandry. Some exotic species have specialized requirements or local ownership restrictions. Verify the profile and local rules before acquiring an animal.

The following public RSPCA pages were checked as starting points for animal-welfare information. They are not a citation for every field in every profile:

- [Cats](https://www.rspca.org.uk/adviceandwelfare/pets/cats)
- [Dogs](https://www.rspca.org.uk/adviceandwelfare/pets/dogs)
- [Hamsters](https://www.rspca.org.uk/adviceandwelfare/pets/rodents/hamsters)
- [Rabbits](https://www.rspca.org.uk/adviceandwelfare/pets/rabbits)
- [Guinea pigs](https://www.rspca.org.uk/adviceandwelfare/pets/rodents/guineapigs)
- [Fish](https://www.rspca.org.uk/adviceandwelfare/pets/fish)
- [Birds](https://www.rspca.org.uk/adviceandwelfare/pets/birds)

The chatbot is not a veterinarian and must not diagnose or prescribe treatment. Seek a veterinarian promptly for illness, injury, repeated vomiting, breathing trouble, refusal to eat, or worsening symptoms.

## Project structure

```text
index.html
styles.css
js/
  data.js       Seed animal profiles, initial training examples, references
  storage.js    Local browser database and backup state
  engine.js     Intent matching, preference extraction, scoring, responses
  app.js        Pages, forms, profiles, comparisons, and event handling
```
