# Content pipeline

The shipped campaign lives in `CyberWorld/ascension-data.js`. Stable mission IDs
connect local save records, graded validators, Codex, rewards and NPC actions.
The renderer never evaluates mission text as code. Black Freight's seven acts
exercise different reasoning, including corroboration and uncertain attribution.

Open `tools/quest-studio.html` in the local preview for the internal JSON editor.
It loads the shipped pack, imports/exports drafts and reports structural problems.
It is intentionally absent from the player navigation and offline runtime.

1. Write the player discovery and defensive lesson before the evidence.
2. Choose a registered puzzle kind and author synthetic artifacts of that kind.
3. Use stable unique IDs, three hints and a bounded reward/module.
4. Validate a draft with the editor or `node scripts/validate-content.cjs draft.json`.
5. Review narrative, evidence consistency, attribution confidence and originality.
6. Integrate the reviewed data. A new validator kind needs its own safe local
   implementation and adversarial tests; a JSON string cannot add executable code.
7. Extend the actual browser playthrough, checking wrong findings and recovery as
   well as success. Review screenshots and gameplay, then publish through a PR.

City interactions use a separate small authored state machine in ascension-city.js:
quartermaster transactions, trainer field route, three physical repeaters and a
rooftop discovery. Conversation memory is local, deterministic game AI; it is not
presented as a live generative model. Geometry owns reachability and elevation.

An MMO-scale content service, collaborative world editor, large raid authoring,
generative NPC service and live content moderation are future production work.
This editor establishes reviewable content drafts and validates the current schema;
it does not claim those larger systems already exist.
