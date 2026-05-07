# CyberWorld Dogfight — Harfang3D Customization

This directory contains the CyberWorld-themed configuration layer for
[harfang3d/dogfight-sandbox-hg2](https://github.com/harfang3d/dogfight-sandbox-hg2).

## Setup

```bash
pip install harfang
git clone https://github.com/harfang3d/dogfight-sandbox-hg2
cd dogfight-sandbox-hg2
# Copy cyberworld_theme.py and assets.json into the dogfight-sandbox-hg2 directory
python cyberworld_theme.py
```

Python 3.10+ and the `harfang` package are required. The harfang3d library is
not bundled here — install via pip or from https://www.harfang3d.com.

## What the customization changes

| Aspect | Default | CyberWorld |
|---|---|---|
| Sky | Blue daytime | Dark navy `#030810` + cyan horizon |
| Ground | Green terrain | Black tarmac grid + hangar lights |
| HUD style | Minimal | Win98-style chrome overlay |
| Aircraft names | Default set | F-47 PRIMAS, F-58 VALKYRJA, SR-91 AURORA, TR-3B ASTRA, RQ-180 SENTINEL II |
| HUD colors | White/green | Cyan `#00b4d8` on black |
| Title screen | Harfang logo | CyberWorld Black Hangar branding |
| Weapon labels | Generic | CyberWorld armament designations |

## Files

- `cyberworld_theme.py` — runtime patch applied before launching the game
- `assets.json` — aircraft name/HUD colour map fed into the patch
- `README.md` — this file

## Running

```bash
# Inside dogfight-sandbox-hg2/ after copying:
python cyberworld_theme.py
```

The patch imports the stock `dogfight.py` entry point, overrides the relevant
config dictionaries, then calls `main()` as normal. You do not need to edit the
upstream source.
