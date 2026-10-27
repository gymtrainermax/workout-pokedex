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


## Venusaur #003 • Solar Overload (2026-10-22)

Approved and locked full-body strength/power program is published in `Review` status. Visit `#venusaur` or click the Venusaur #003 Pokédex card for its four-move Grass/Poison preview and seven-exercise full program. The four assigned moves are Solar Beam (standing single-arm landmine push press), Frenzy Plant (double-arm battle rope power slams), Giga Drain (half-kneeling single-arm cable row), and Poison Powder (resistance band pull-apart). The video A/B scripts are intentionally **pending**, not written or approved; filmed Camera Tests and Final status are also pending. Full prescription, scaling and source notes: `production/Workout_003_Venusaur_Approved_Program.md`. This is a program-only publication at the creator's explicit direction and does not relax later video quality gates.


## Charmander #004 • First Flame (2026-10-22)

Seven-exercise creator-approved athletic workout is publicly available in **Review** status via `#charmander` and the #004 Pokédex preview. Four moves: **Flame Charge** (Short Acceleration Run, Fire), **Ember** (Medicine Ball Chest Pass to Wall, Fire), **Fire Spin** (Landmine 180s, Fire), and **Scratch** (Single-Arm High-to-Low Diagonal Cable Pulldown, Normal). Three supporting exercises: Goblet Squat, Dumbbell Romanian Deadlift, and Incline Push-Up. **16 working sets**, beginner+, ~40–50 minutes. The popup matches existing #001–003 design but shows new Fire/Normal move-type icons. See `production/Workout_004_Charmander_Approved_Program.md` for all doses, rests, equipment, scaling, and safety details.

This is a creator-directed **program-only publication** (`publicWorkout: true`, `status: Review`, `production.releaseStage: program-only`). A/B video scripts are pending rather than placeholders; final Camera Tests require footage. The preflight validates this release type using the same strict programming and uniqueness checks as previous workouts.

### Charmander A/B video scripts approved (2026-10-22)
Both 70-second versions are now included in the #004 page as interactive A/B tabs, alongside the approved 20-shot filming checklist, exact four Camera Tests, shared overlay cards, social caption, and five hashtags. The #004 full workout is **unchanged**. Current public status: **Review**, with actual filming and final Camera Tests pending.

Production documents: `production/Workout_004_Charmander_Script_A.md`, `production/Workout_004_Charmander_Script_B.md`, `production/Workout_004_Charmander_Filming_and_AB_Test_Plan.md`, and `production/Workout_004_Charmander_Complete_Package.md`.

## Charmeleon #005 • Tempered Flame (2026-10-23)

The creator-approved intermediate seven-exercise **Tempered Flame** workout is public in **Review** at `#charmeleon` with a four-move Fire/Normal type-icon popup. Official moves: **Fire Punch** (Shadowboxing, Fire, 3 × 20 sec), **Flamethrower** (Standing Svend Press, Fire, 3 × 8–10), **Slash** (Two-Handed High-to-Low Cable Woodchop, Normal, 2 × 8/side), and **Smokescreen** (Outside-Circle Battle Rope Waves, Normal, 2 × 15 sec). Supporting work: Trap Bar Deadlift (3 × 5–6), Chest-Supported Dumbbell Row (3 × 8–10), Reverse Lunge (2 × 8/side). **18 working sets, 50–60 minutes.** The gym workout order starts with the deadlift, although the video leads with signature moves.

Both 70-second matched A/B scripts and the 20-shot checklist are published **as production drafts for review** with a tab switcher. A is accessible gym comedy; B is Pokémon battle humor. Filmed Camera Tests, actual footage, A/B results and final quality approval are **pending**. Neither workout nor scripts should be marked Final before those steps. `production/Workout_005_Charmeleon_Approved_Program.md`, `Workout_005_Charmeleon_Script_A.md`, `Workout_005_Charmeleon_Script_B.md`, `Workout_005_Charmeleon_Filming_and_AB_Test_Plan.md`, and `Workout_005_Charmeleon_Complete_Package.md` contain the full working package. All actual smoke/fire must remain digital, and the Svend press is a light accessory rather than a substitute for a heavy strength press.

## Charizard #006 • Full Blaze (2026-10-23)

Creator-approved advanced seven-exercise workout published in **Review** at `#charizard` with four official moves: Dragon Claw (single-arm high-to-low cable chop with controlled step-and-pivot), Seismic Toss (soft sandbag over-the-shoulder toss), Flare Blitz (sled push), and Blast Burn (two-handed landmine thruster). **22 working sets; 65–75 minutes.** Supporting exercises: Barbell Front Squat, Pull-Up / Assisted Pull-Up and Incline Dumbbell Bench Press.

The page highlights Scratch → Slash → Dragon Claw, Flame Charge → Flare Blitz and Ember → Flamethrower → Blast Burn. Seismic Toss is a historical legitimate Charizard move, not in Scarlet/Violet, and introduces aerial grappling. Six linked production documents include the complete workout, workout card, progression audit, two 70-second A/B script drafts and a 20-shot filming plan. Program approved and public; **video scripts drafts, four actual Camera Tests and A/B results pending, not Final**.


## Move-type icon library (all 18 types)

This static site bundles modern-game-inspired circular Pokémon type emblems under `assets/type-icons/`, sourced from [partywhale/pokemon-type-icons](https://github.com/partywhale/pokemon-type-icons). These recreations are MIT licensed by James Watkins (2022). Attribution and the full license are retained in `assets/type-icons/LICENSE.txt`. The fan project is not officially endorsed by The Pokémon Company.

The centralized `moveTypeEmblem` helper in `app.js` handles all 18 types: Normal, Fire, Water, Electric, Grass, Ice, Fighting, Poison, Ground, Flying, Psychic, Bug, Rock, Ghost, Dragon, Dark, Steel, Fairy. All published Pokémon move cards, Pokédex previews and Move Registry entries use the same self-hosted SVG files and color-matched type labels. Unexpected values display an explicit Unknown fallback, not a misleading Normal icon. The move's type is independent of its Pokémon's species typing.


## Connected evolution families: Kanto Starters #001–009 (2026-10-27)

The nine creator-approved starter workouts now display shared evolution navigation and linked movement progressions. The permanent creative rules, preserving all earlier approved exercises, are documented in [Starter Evolution Continuity Standard](production/Starter_Evolution_Continuity_Standard.md). Every **future evolution family** will be developed as one three-stage (or actual species-specific number of stages) workout arc before episode publication. Progress movement skills and difficulty without fabricating canonical Pokémon move evolutions; keep unique four-move sets and 7 real exercises per Pokémon. Cross-family repetition is allowed when purposeful, e.g. Bulbasaur **Tackle / Sled Push** versus Squirtle **Tackle / Light Sled March**.

**Grass:** Bulbasaur Seedling Strength → Ivysaur Rooted Power → Venusaur Solar Overload. Related plant power, vine/root control, supporting leg strength and emerging poison tactics. Existing #001–003 approved prescriptions remain unchanged.

**Fire:** Charmander First Flame → Charmeleon Tempered Flame → Charizard Full Blaze. Exact thematic sequences: Scratch → Slash → Dragon Claw; Flame Charge → strength bridge → Flare Blitz; Ember → Flamethrower → Blast Burn; Seismic Toss is a distinctive final-stage addition. Existing #004–006 approved prescriptions remain unchanged.

**Water:** Squirtle Shell School → Wartortle Current Control → Blastoise Cannon Fortress. Four linked themes: Water Gun → Water Pulse → Hydro Cannon; Withdraw → Protect → Iron Defense; Rapid Spin → Aqua Tail → Surf; Tackle → Aqua Jet → Wave Crash. Approved complete workouts are 16/18/22 working sets and 40–50/50–60/65–75 minutes. All three now have public Review pages with four genuine moves, seven exercises, beginner/intermediate/advanced modifications, both A/B script drafts, 20-shot filming checklists, four pending filmed Camera Tests and production asset links. Not Final, not filmed. See [Water evolution blueprint](production/Water_Starter_Evolution_Blueprint.md).


## Viridian Forest: Silk vs. Sting — six approved connected workouts #010–015 (2026-10-27)

**All six exercise programs and both A/B scripts per Pokémon are creator-approved and publicly available in `Review`; filmed Camera Tests and A/B video results are pending. No episode is `Final`.** This paired mini-series is mapped across both evolutionary lines and each same-stage rival matchup:

| Silk line | Opposing Sting line | Training identity |
|---|---|---|
| [#010 Caterpie](https://gymtrainermax.github.io/workout-pokedex/#caterpie) • Silk School, 16 sets | [#013 Weedle](https://gymtrainermax.github.io/workout-pokedex/#weedle) • Sting School, 16 sets | Sled / sting fundamentals, forward silk presses, sandbag clamping and battle rope webs |
| [#011 Metapod](https://gymtrainermax.github.io/workout-pokedex/#metapod) • Shell Protocol, 15 sets | [#014 Kakuna](https://gymtrainermax.github.io/workout-pokedex/#kakuna) • Sting Guard, 15 sets | Reduced-intensity cocoon bracing, longer holds and paused inherited moves |
| [#012 Butterfree](https://gymtrainermax.github.io/workout-pokedex/#butterfree) • Wing Control, 18 training sets plus 2 recovery-breathing rounds | [#015 Beedrill](https://gymtrainermax.github.io/workout-pokedex/#beedrill) • Double Sting, 21 sets | Coordination/status control versus physical power and precision |

Each page includes the four verified game moves, seven complete training prescriptions, equipment, coaching, safety and scaling, matched 70-second A/B script tabs, twenty-shot filming plan, four pending camera feasibility tests and linked production documents.

**Same move name = same recognizable exercise family.** Tackle uses safe sled push/march variations, String Shot forward band/cable presses, Bug Bite sandbag bear-hug holds/carries, Harden forearm planks, and Electroweb traveling battle rope waves. Refer to [Silk vs. Sting master blueprint](production/Silk_vs_Sting_Master_Continuity_Blueprint.md) and [same-name continuity audit](production/Silk_vs_Sting_Approval_and_Same_Name_Audit.md). These are exercise-storytelling relationships, not in-game move evolutions.

No previously approved workouts #001–009 were changed for this release.


## Flight School trilogy #016–018 (2026-10-27)
Creator-approved exercise programs and **six A/B script drafts**, published as **Review**. Each Pokémon has four verified Gen VII moves, seven prescribed exercises, modifications, coaching and safety notes, two matched 70-second scripts, a twenty-shot filming plan and four pending actual Camera Tests.
- [#016 Pidgey — Route One Flight School](https://gymtrainermax.github.io/workout-pokedex/#pidgey), 16 working sets
- [#017 Pidgeotto — Territory Patrol](https://gymtrainermax.github.io/workout-pokedex/#pidgeotto), 16 strength/athletic sets plus 2 balance sets
- [#018 Pidgeot — Sky Sovereign](https://gymtrainermax.github.io/workout-pokedex/#pidgeot), 22 working sets
The three linked training themes: Gust → Whirlwind → Hurricane (anchored rope waves); Sand Attack → Wing Attack → Air Slash (wing sweeps); Quick Attack → Agility → Tailwind (footwork). Tackle → supporting trap-bar strength → Brave Bird builds stronger horizontal force. **Pidgey Tackle remains a sled push and Pidgeot Air Slash is the exact cable-sweep family already used by Butterfree.** Brave Bird was inherited by Pidgey as an egg move (Gen VII). See [Flight School master blueprint](production/Flight_School_Master_Evolution_Blueprint.md) and [creator approval audit](production/Flight_School_Creator_Approval_Audit.md). No filmed Camera Tests or A/B audience results exist yet. Earlier workouts #001–015 remain unchanged.
