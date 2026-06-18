# CyberWorld Sprite Sheets

This folder now contains generated SVG sprite/reference sheets that serve as global default art assets:

- `items-tools-entities.svg` — consumables, tools, loot, artifacts, drones, automata, and non-human entities.
- `operatives-hardware-threats.svg` — player operatives, vanity customization, faction marks, gear, hardware, adversaries, and cyber-threat sprites.
- `vehicles-transit-mobility.svg` — vehicles, transit kiosks, hovercraft, orbital shuttles, and network mobility systems.

The live atlas page at `/sprite-atlas.html` loads these paths by default:

- `/assets/sprites/gemini/items-tools-entities.svg`
- `/assets/sprites/gemini/operatives-hardware-threats.svg`
- `/assets/sprites/gemini/vehicles-transit-mobility.svg`

Optional high-detail PNG replacements can still be added later using these filenames:

- `items-tools-entities.png`
- `operatives-hardware-threats.png`
- `vehicles-transit-mobility.png`

Until/if PNG replacements are committed, `/sprite-atlas.html` supports local browser import and stores preview overrides in localStorage.
