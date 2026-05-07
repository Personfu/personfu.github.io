"""
CyberWorld Dogfight — harfang3d theme patch.

Usage (inside dogfight-sandbox-hg2 directory after copying this file):
    python cyberworld_theme.py

This module patches the stock harfang3d dogfight-sandbox-hg2 configuration
before calling main(), injecting the CyberWorld cyberpunk aesthetic and
Black Hangar aircraft roster.

Requirements:
    pip install harfang
    https://github.com/harfang3d/dogfight-sandbox-hg2  (cloned beside this file)
"""

import json
import math
import os
import sys
import importlib

# ── Load assets ──────────────────────────────────────────────────────────────

_HERE = os.path.dirname(os.path.abspath(__file__))
_ASSETS = os.path.join(_HERE, 'assets.json')
with open(_ASSETS, 'r') as f:
    ASSETS = json.load(f)

THEME    = ASSETS['theme']
AIRCRAFT = {ac['id']: ac for ac in ASSETS['aircraft']}
WEAPONS  = ASSETS['weapons']

# ── Colour helpers ─────────────────────────────────────────────────────────

def rgb(r, g, b):
    """Return harfang Color from 0-255 ints."""
    try:
        import harfang as hg
        return hg.Color(r/255, g/255, b/255, 1)
    except ImportError:
        return (r/255, g/255, b/255, 1)


# ── Sky / environment patch ──────────────────────────────────────────────────

def patch_environment(scene, hg):
    """Override sky gradient and ground colour."""
    sky_top    = rgb(*THEME['sky_top_color'])
    sky_bottom = rgb(*THEME['sky_bottom_color'])
    horizon    = rgb(*THEME['horizon_color'])
    ground     = rgb(*THEME['ground_color'])

    # harfang uses environment component on the scene root node
    try:
        env = scene.GetEnvironment()
        env.SetSkyColor(sky_top)
        env.SetHorizonColor(horizon)
        env.SetGroundColor(ground)
        env.SetFogColor(sky_bottom)
        env.SetFogNear(500)
        env.SetFogFar(18000)
    except AttributeError:
        pass  # API version difference — skip gracefully


# ── HUD patch ────────────────────────────────────────────────────────────────

def build_win98_hud_overlay(hg, res):
    """
    Draw a Win98-style HUD chrome:
      - Black background bar at top with titlebar gradient
      - Aircraft designator and status in Share Tech Mono
      - Readout boxes for speed/alt/mach
    Returns a list of overlay draw calls to invoke each frame.
    """
    # This is a no-op stub when harfang draw API is not fully available.
    # Replace with actual hg.DrawSprite / hg.DrawText calls for your
    # harfang version.
    pass


def patch_aircraft_names(plane_configs):
    """
    Remap stock aircraft config slots to CyberWorld names.
    plane_configs: list or dict of harfang aircraft config objects (game-specific).
    """
    for i, slot_data in enumerate(ASSETS['aircraft']):
        try:
            cfg = plane_configs[i]
            if hasattr(cfg, 'name'):
                cfg.name = slot_data['name']
            if hasattr(cfg, 'hud_color'):
                r, g, b = slot_data['hud_color']
                cfg.hud_color = rgb(r, g, b)
        except (IndexError, TypeError):
            break


# ── Title screen ──────────────────────────────────────────────────────────────

WIN98_BANNER = r"""
╔══════════════════════════════════════════════════════════════╗
║   CyberWorld Black Hangar // BHX-9X // Stormcore Terminal    ║
║   USAF NGAD Combat Simulation — Fictional Lore Only          ║
╚══════════════════════════════════════════════════════════════╝
"""

AIRCRAFT_ROSTER = """
Slot  Designator      Name                  Gen
----  -----------     --------------------  ---------------
 0    F-47A           PRIMAS                7th Gen USAF NGAD
 1    F-58B           VALKYRJA              8th Gen Hypersonic
 2    SR-91C          AURORA                6th Gen+ Black Project
 3    RQ-180C         SENTINEL II           UCAV NGAD
 4    TR-3B/A         ASTRA                 ARV UAP
"""

def print_banner():
    cyan  = '\033[96m'
    reset = '\033[0m'
    print(cyan + WIN98_BANNER + reset)
    print(cyan + AIRCRAFT_ROSTER + reset)
    print(f'  Tagline: {ASSETS["tagline"]}\n')


# ── Main entry ────────────────────────────────────────────────────────────────

def main():
    print_banner()

    # Try to import the upstream dogfight entry point.
    # Assumes this file sits inside (or alongside) dogfight-sandbox-hg2.
    try:
        import harfang as hg
    except ImportError:
        print('[CyberWorld] harfang not installed. Run:  pip install harfang')
        sys.exit(1)

    # Look for the upstream main module (typically named 'dogfight' or 'main')
    upstream = None
    for mod_name in ('dogfight', 'main', 'app'):
        try:
            upstream = importlib.import_module(mod_name)
            print(f'[CyberWorld] Loaded upstream module: {mod_name}')
            break
        except ModuleNotFoundError:
            continue

    if upstream is None:
        print('[CyberWorld] Could not find dogfight entry module.')
        print('  Make sure this file is inside the dogfight-sandbox-hg2 directory.')
        sys.exit(1)

    # Inject theme into upstream config dicts if they exist
    for attr in ('SKY_COLOR', 'sky_color', 'BG_COLOR'):
        if hasattr(upstream, attr):
            setattr(upstream, attr, rgb(*THEME['sky_top_color']))

    for attr in ('GROUND_COLOR', 'ground_color'):
        if hasattr(upstream, attr):
            setattr(upstream, attr, rgb(*THEME['ground_color']))

    # Remap aircraft names
    for attr in ('PLANES', 'planes', 'AIRCRAFT', 'aircraft_list'):
        if hasattr(upstream, attr):
            patch_aircraft_names(getattr(upstream, attr))
            break

    print('[CyberWorld] Theme patch applied. Launching...\n')

    # Call upstream entry
    if hasattr(upstream, 'main'):
        upstream.main()
    elif hasattr(upstream, 'run'):
        upstream.run()
    else:
        print('[CyberWorld] No main() or run() found in upstream module.')
        sys.exit(1)


if __name__ == '__main__':
    main()
