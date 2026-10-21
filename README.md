# WORKOUT DEX — Kanto Edition

A working local-first, static-site **Workout Pokédex** for GymTrainerMax.

## Start in 30 seconds

1. Unzip this folder.
2. Open `index.html` in a modern browser. You don't need a server, installation, account, or API key.
3. Browse the **Dashboard**, **Pokédex**, **Characters**, **Forms**, and **Move Registry**.
4. Open **Workout Studio**, select an entry, edit it, then click **Save draft**. Your changes persist in **this browser only**, using localStorage.
5. When all requirements are met, click **Finalize workout**. Status, counts, lists and the unique-move registry update immediately.

## What's already registered

- Professor Oak (prologue)
- All original 151 Kanto Pokémon, with Pokédex number and base typing
- Red, Blue, Green, all eight original Gym Leaders, and the four Elite Four members
- 63 initial Kanto-associated alternate-form entries (regional, Mega, Gigantamax, and Paldean Tauros variants)
- In total **230 starter records** (all are Planned and **none** is falsely marked final)

The forms list is **not guaranteed exhaustive**, especially regarding cosmetic, gender, event, and future forms. Use **+ New form** for other variants. Each form has its own workout record and a link to its parent species, with form-specific typing and learnset intentionally left blank until verified.

## Approval gates

Based on the supplied **Series Standards v1.1** (`Series-Standards.txt` in this package):

- Each Pokémon/form entry must have **exactly four distinct official moves**, an exercise mapping for each, a learnset-verification acknowledgment, and Pokémon/Trainer/Camera tests.
- A four-move *combination* must be unique across all Pokémon/form entries, independent of order. The registry flags collisions, and Finalize blocks them.
- Both Pokémon and characters need a training goal, difficulty, duration, full programming (warm-up, working session, cooldown, scaling, safety), documented research, a video/social package, five hashtags, and quality review.
- Characters are not assigned Pokémon learnsets. They can be finalized without four official Pokémon moves.
- Ticking “verified” and the audit controls records your editorial sign-off; **the app cannot independently verify game learnsets or exercise safety.**

## Backups and publishing — important

**Editing this website is not equivalent to editing a cloud database.** You can immediately track your work in one browser, but **changes are NOT automatically visible to other people or devices**. There is no account system or web server here.

To update a publicly hosted copy each time you finalize a workout:

1. In Studio, click **Export JSON**. Store `workouts.json` **privately**, outside the public website repository. This is your full master backup (including incomplete records).
2. Click **Publish data.js**. The public export contains the complete data for **Final** workouts but replaces non-final records with blank Planned shells. The internal `notes` field is cleared from final records. Review final workout content for anything else you do not want published. Replace the site's existing `data.js` with the downloaded version.
3. Upload the changed `data.js` to your hosting service. If you use GitHub Pages, **commit and push** it to `main`. The included `.github/workflows/pages.yml` redeploys the public site on every push. **Do not commit private `workouts.json` backups.**
4. Repeat after each finalized episode. When a colleague views the redeployed site, they see the updated data.

**Privacy:** `data.js` is public. It includes full details for Final workouts and blank record shells for unfinished entries. The `notes` field is removed automatically, but **review other fields in Final workouts** for private information. Do not put the full exported JSON backup into a public repository. Studio mode is not password protected; any visitor can *locally* edit their own browser copy but cannot change your hosted files.

**GitHub Pages setup:** Make a new repository, upload the extracted files including `.github/workflows/pages.yml`, and in repository settings choose **Pages → Build and deployment → GitHub Actions**. This setup step is required once. Enable GitHub Actions if requested. A static hosting service (Netlify Drop, Cloudflare Pages, etc.) works as well if it can serve these files.

## Data architecture

- `data/workouts.json` — initial human-readable seed only; never replace this *public* repository file with a private full backup
- `data.js` — browser-ready *public* data file, containing complete Final records and blank shells for incomplete entries; also works via `file://`
- `app.js` — search/filter, pages, Studio editor, validation, form creation, import/export, move registry, publishing export
- `styles.css` — responsive web styling
- `index.html` — app shell
- `generate_seed.py` — reproducible initial seed generator (**do not rerun over your active data**, or you'll overwrite it)
- `Series-Standards.txt` — supplied series guidelines

Imported files replace local records after explicit confirmation. Back up JSON regularly. An empty form's base Pokémon illustration is not the official artwork for that form. Artwork is loaded from the [PokéAPI sprites repository](https://github.com/PokeAPI/sprites) when online; the rest of the site works offline.

## Future upgrades

For true one-click public publishing, cross-device sync, collaborative editing, and authenticated creator access, this needs a hosted backend (for example, Supabase) or an authenticated publication API. Credentials and a hosting choice are needed for that deployment; they're intentionally **not** hard-coded or stored in this starter site.

## GitHub connection from ChatGPT

Once a GitHub repository is created and available to the connected GitHub app, ChatGPT can propose or commit the approved `data.js` change for each Final workout using the GitHub integration. GitHub Pages then redeploys the public site on push. Repository creation and first-time GitHub Pages settings are user-controlled steps; the ChatGPT connector currently cannot create a repository or turn on Pages itself.

## Episode 000 — Professor Oak published program

- The public Kanto Dex includes a dedicated **Professor Oak** page at `/#oak`.
- Oak's 7-exercise, 14-set beginner Trainer Orientation program, coaching notes and regressions are available to visitors **now**. Four character-inspired signature assignments, two-character sketch dialogue, a timed 17-shot production package, and a social caption are on that page.
- The **workout program is published** (`publicWorkout: true`), but the entry retains **Review** status because on-camera execution and final video sign-off are not complete. This is deliberately distinct from a `Final` episode; do not set `quality.visual` to true until the footage passes the Camera Test.
- In `app.js`, `publicDatabase()` includes entries that are `Final` **or** explicitly `publicWorkout: true`, and strips private `notes`. All other planned and draft records continue to export as blank shells.
- Returning visitors whose browser stored the original blank Oak entry will receive the public version unless they have actually started editing Oak locally. The dedicated public Oak page always displays the published seed, not an unreviewed local browser draft.
- When updating Oak in Studio, export/publish a fresh `data.js` and push it to GitHub; the public page reads its training and filming content from that seed. Site source code and CSS only need republishing if you change the page design or schema.

## Professor Oak artwork

Professor Oak’s popup, character card, dashboard spotlight and full workout page use a recognizable character illustration from the Pokémon: Let’s Go era. The live image is loaded from a third-party artwork reference and automatically falls back to a bundled, original simplified SVG illustration when external artwork cannot load. Source/reference: https://eternia.fr/fr/site/article/1684-pokemon-lets-go-pikachu-et-lets-go-evoli-le-professeur-chen/ . Pokémon characters and official artwork belong to their respective rights holders; this site is an unofficial fan project, and reference attribution does not grant a license.


## Episode 001 — Bulbasaur approved workout + A/B scripts

- Dedicated public workout page at `/#bulbasaur`, with a four-move preview from its Kanto Pokédex card and dashboard teaser.
- Seven-exercise program and exact work/rest doses approved by the creator, **Review** status (the video has not been shot). No Camera Tests were marked complete.
- Dual scripts with the same timecodes and footage: **A = accessible gym humor** and **B = Pokémon-specific game humor**. Toggle on the Bulbasaur page to see timed dialogue, scene direction and on-screen cards.
- The two separate production drafts and approved training reference are linked from that page, under `production/`.
- **New editorial production convention for all future Pokémon episodes:** Write a Version A and Version B script, hold the workout, footage, labels and editing conditions constant and compare retention, completion, shares and saves. This is a project workflow addition, not a silent change to Series Standards v1.1.
- Bulbasaur's `production.versions` structured data is a reusable format for future Pokémon to follow.
- The public `data.js` contains the approved workout and both scripts. Do not export a private Studio `workouts.json` backup into the public repository.
- Existing browsers with an untouched Bulbasaur placeholder receive the published seed. Public Bulbasaur and Oak pages always show the published program even if a visitor has an older local Studio draft.


## Episode 002 — Ivysaur approved workout + two approved A/B scripts

- Dedicated public entry at `/#ivysaur`; Pokémon #002 preview shows official move-type emblems (Sludge Bomb: Poison; Growth: Normal; Grassy Glide and Synthesis: Grass) and the full seven-exercise Rooted Power workout.
- Intermediate 45–55 minute program, approved by GymTrainerMax, **Review** status (`publicWorkout: true`), filming and all four Camera Tests pending.
- Version A: accessible gym comedy. Version B: game-mechanics jokes. Both scripts are approved and have matching exercise labels, shot list, edit structure and CTA.
- The 18-shot guide, prescriptions, exercise modifications, and downloadable production documents are under `production/`.
- The project's pre-draft workflow is recorded in `production/EDITORIAL_PREFLIGHT.md` and checks are runnable with `python production/check_workouts.py data.js`; pre-filming Camera Test *planning* can be checked automatically, but actual filmed camera quality still requires video review.