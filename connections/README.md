# Creature Connections

A self-contained GitHub Pages microsite for GymTrainerMax's cross-franchise character-connection research.

## Public route

`https://gymtrainermax.github.io/workout-pokedex/connections/`

The parent repository's existing GitHub Pages workflow deploys the entire repository root, so this directory publishes as its own route without changing the Workout Pokédex application.

## What is included

- 195 canonical connection families
- 857 character/line entries represented in the canonical archive
- 1,847 mapped Reel concepts behind the research database
- 13 editorial case files highlighting confirmed history, possible influence, shared real-world sources, folklore and in-franchise lineages
- Search by character, inspiration, topic, franchise or franchise-adjacent keyword
- Filters for major franchises and connection type
- Random-connection discovery
- Detail dialogs with the project's stored research links where available

## Files

- `index.html` — page structure and accessible content shell
- `styles.css` — standalone responsive visual system
- `app.js` — search, filters, randomizer, card rendering and detail dialog
- `data-core.js` + `topics-1.js` through `topics-7.js` — generated public connection database from the project's canonical spreadsheet index

## Updating the site when new Tamagotchi characters are added

1. Research and deduplicate the new characters in the master spreadsheet first.
2. Update the canonical Topic Index and character/reel mappings.
3. Regenerate `data-core.js` and the `topics-*.js` chunks from the canonical index rather than manually duplicating cards in `index.html`.
4. Add a featured case file only when the connection deserves editorial treatment beyond the searchable database.
5. Push the updated data files to `main`; the existing Pages workflow will redeploy automatically.

## Evidence language

The public site intentionally separates:

- **Confirmed connection** — official lore, creator documentation or an explicit historical bridge.
- **Documented visual echo** — unusually close design/history evidence without a canon relationship.
- **Possible influence** — chronology and context make influence plausible, but there is no confirmation.
- **Shared source / convergence** — similarities are substantially explained by the same animal, myth, object, fossil or design problem.
- **In-franchise lineage** — official variants, evolutions, redesigns or archetype families within one franchise.

Chronology establishes precedent. It does **not** prove copying by itself.

## Rights note

This is an unofficial fan research project. Tamagotchi, Digimon, Pokémon, Yu-Gi-Oh! and all other referenced properties belong to their respective rights holders. No affiliation or endorsement is implied.

## Cosmic Planet audit — 2026-11-02

The Neon Planets / Cosmic Planet update was audited with the same rules as the earlier Paradise archive: identify the primary embodied source first; separate source matches from morphology, behavior and gimmick matches; preserve specific biological, folkloric and technological families; treat "Cosmic/Space" as a theme rather than a catch-all family; and leave weak franchise slots open rather than forcing a match.

The public database adds the 18 later-stage Cosmic Planet characters as standalone Paradise topics. The five Cosmic growth-stage designs remain intentionally separate developmental archetypes rather than being promoted into adult source families in this pass.
