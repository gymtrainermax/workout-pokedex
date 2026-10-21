# Workout Pokédex — Quiet Pre-draft Quality Gate

**Applies to every new Pokémon workout before the first proposal is shown to GymTrainerMax.** The official Series Standards v1.1 continue to govern. This workflow adds A/B scripting and explicit pre-draft checks for speed and consistency; it does not change the series rules.

## Invisible preparation, visible decisions

1. **Identify the Pokémon:** Check Pokédex species, type(s), learnset by generation, anatomy, evolution, behavior and personality against reputable references. Don't invent moves or abilities. If a move can be learned only in a later game, mention the generation when relevant.
2. **Choose exactly four unique legitimate moves:** Check four distinct move names are learnable by this Pokémon and the order-insensitive four-move *combination* is not already used. Keep signature moves reserved by the creator for evolutions (e.g. Solar Beam for Venusaur) out of earlier workouts. Maintain a registry check.
3. **Run three tests before proposing exercises:** Pokémon Test (clear recognizable mapping), Trainer Test (real, useful, safe exercise with exact gym terminology), and **camera feasibility review** (realistic angles, equipment, visual readability). Camera feasibility is *not* the final filmed Camera Test.
4. **Program an actual session:** Suitable training goal, frequency context, difficulty, warm-up, exercise order, sets, reps/timing, rest, intensity or RPE, cooldown, equipment, coaching, and beginner/intermediate/advanced modifications. Signature moves may be status/recovery moves when meaningful; don't force every move into a maximal-effort lift. Distinguish warm-up/cooldown sets from productive strength working sets.
5. **Safety and exercise science audit:** Check movement balance and redundancy, loading, safe implement/wall requirements, clear equipment-specific cautions, realistic duration (include rest and transitions), contraindication-aware regressions, and honest claims. Don't promise health outcomes or instant recovery from a Pokémon-inspired effect. Compare with preceding evolutions to avoid copy-paste workouts.
6. **Write two matched scripts after program approval:** **A = accessible gym comedy; B = Pokémon-game-specific comedy**. One audience-facing host, shared exercise footage, overlays, music, CTA, caption, cover, timing and 9:16 composition. Only spoken jokes and matching subtitles vary in a clean first A/B test. Each episode gets cover concept, social caption, five hashtags, and filming checklist with tests for all four signature moves.
7. **Internal quality review before presenting:** Re-read for factual errors, clunky/artificial dialogue, comedy fit, missing equipment, contradictory reps/rest and ungrounded lore. Run `python production/check_workouts.py data.js` on site entries. Fix issues silently or state genuine uncertainty when creator input is essential. Offer one polished working draft, rather than requesting approval after every minor mechanical adjustment.
8. **Publish only after approval:** Mark the workout `Review`, `publicWorkout: true`; include both scripts and camera checklist. Do **not** mark `Final` until actual footage and post-filming audits pass. Preserve the last-approved website design, existing workouts, and production files.

### What cannot be done pre-filming

The final **Camera Test** is a practical footage test and cannot be certified from a script. Also, a computer check cannot prove correct exercise technique or official Pokémon move legality without independent, curated references. Document sources and assess these editorially. The preflight tool validates consistency and catches obvious omissions, not medical or game-design truth.

### Lightweight handoff for the creator

Present the Pokémon concept, four signature moves and the **complete pre-audited workout** at once, calling out at most the one or two *creative* decisions worth choosing. After approval, deliver the two video cuts and shot plan together. After script approval, publish the episode as a public `Review` entry with the preview and move-type emblems.