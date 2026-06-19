# PersonFu Developer Portal

This repository hosts the public `personfu.github.io` developer portal for PersonFu / FLLC.

## Purpose

The root page is a clean index into the public FLLC ecosystem:

- FLLC.net as the main company/revenue site
- CyberWorld as the browser training universe
- offensive OSINT education within legal scope
- CVE and exploit-intelligence triage utilities
- aerospace / mission-control visual direction
- hardware, RF, and engineering learning lanes

## Content Boundary

The portal may use red-team, exploit-hunter, and operator language, but public content must stay inside:

- owned infrastructure;
- written consent;
- contracted assessments;
- bug bounty scope;
- CTF/lab/synthetic targets;
- responsible disclosure and defensive reporting.

Do not publish credential theft, persistence, evasion, unauthorized exploitation, doxxing, or live-target attack workflows.

## Repo Intelligence Manifest

The portal now includes a machine-readable ecosystem map at `data/personfu-repo-intelligence.json` and a generated summary at `data/personfu-portal-summary.md`.

To regenerate the summary after changing the manifest:

```bash
node scripts/render-portal-manifest.mjs
```

The manifest preserves the FLLC content model:

- 50% free public education and previews
- 15% basic member reports/templates
- 35% premium simulations, labs, and visual workbenches

## Core Links

- Main site: <https://fllc.net>
- Developer portal: <https://personfu.github.io>
- CyberWorld target: <https://cyberworld.fllc.net>
- GitHub: <https://github.com/Personfu>
