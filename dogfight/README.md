# CyberWorld Dogfight - Harfang3D Integration

This folder now contains the upstream [harfang3d/dogfight-sandbox-hg2](https://github.com/harfang3d/dogfight-sandbox-hg2) source plus a CyberWorld overlay that keeps the upstream files intact.

## What Is Included

- `dogfight-sandbox-hg2/` - cloned upstream Harfang Dogfight Sandbox source and assets.
- `dogfight-sandbox-hg2/source/cyberworld_main.py` - themed launcher that installs CyberWorld runtime patches before importing the upstream game loop.
- `dogfight-sandbox-hg2/source/cyberworld_theme_runtime.py` - runtime patch for mission names, display flags, smoke colors, and CyberWorld banner output.
- `assets.json` - CyberWorld aircraft/UAP roster starting with the F-47 and mapping each themed bay to an available upstream dogfight model.
- `cyberworld_theme.py` - local launcher and validator for the integration.

## Run

Install the upstream requirements first:

```powershell
cd dogfight\dogfight-sandbox-hg2\source
pip install -r requirements.txt
```

Then launch the CyberWorld-themed entry point from this folder:

```powershell
cd dogfight
python cyberworld_theme.py
```

To validate the integration without launching the 3D game:

```powershell
cd dogfight
python cyberworld_theme.py --check
```

## CyberWorld Changes

The overlay prepends CyberWorld missions to the stock mission list:

- F-47 NGAD checkout
- TR-3B shadow intercept
- Tic-Tac warp-bubble chase
- SR-75 deep recon
- NGAD Prime air dominance
- FA-XX carrier deck
- F-47 vs NGAD Prime duel
- TR-3B/Tic-Tac UAP scramble
- full advanced aircraft theater mix

The visual theme enables HUD visibility, FPS, selected-aircraft display, cyan allied missile smoke, red threat smoke, and a Win98/CyberWorld launch banner. It does not claim that upstream placeholder aircraft meshes are exact F-47/TR-3B replicas; the website hangar remains the verified Sketchfab source-model viewer for exact visual inspection.

## Web Tie-In

The website hangar at `../hangar.html` is the source model theater. Dogfight uses the same roster metadata and maps those bays to the closest playable upstream aircraft classes available in the Harfang sandbox: `TFX`, `Miuss`, `F16`, `Eurofighter`, and `Rafale`.