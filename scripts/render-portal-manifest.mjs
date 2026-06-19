#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'data', 'personfu-repo-intelligence.json');
const outPath = path.join(root, 'data', 'personfu-portal-summary.md');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const lines = [];
lines.push('# PersonFu Portal Intelligence Summary');
lines.push('');
lines.push(`Updated: ${manifest.updatedUtc}`);
lines.push('');
lines.push(`Main site: ${manifest.brand.mainSite}`);
lines.push(`Developer portal: ${manifest.brand.developerPortal}`);
lines.push(`CyberWorld: ${manifest.brand.cyberWorld}`);
lines.push('');
lines.push('## Membership split');
lines.push('');
lines.push(`- Free: ${manifest.contentSplit.freePercent}%`);
lines.push(`- Basic: ${manifest.contentSplit.basicPercent}%`);
lines.push(`- Premium: ${manifest.contentSplit.premiumPercent}%`);
lines.push('');
lines.push(manifest.contentSplit.rule);
lines.push('');
lines.push('## Engineering lanes');
lines.push('');

for (const lane of manifest.lanes) {
  lines.push(`### ${lane.label}`);
  lines.push('');
  lines.push(`Repos: ${lane.repos.join(', ')}`);
  lines.push('');
  lines.push(`Free: ${lane.free.join('; ')}`);
  lines.push(`Basic: ${lane.basic.join('; ')}`);
  lines.push(`Premium: ${lane.premium.join('; ')}`);
  lines.push('');
}

lines.push('## Boundary');
lines.push('');
lines.push(`Allowed: ${manifest.safetyBoundary.join('; ')}`);
lines.push('');
lines.push(`Blocked: ${manifest.blockedContent.join('; ')}`);
lines.push('');

fs.writeFileSync(outPath, `${lines.join('\n')}\n`);
console.log(`wrote ${path.relative(root, outPath)}`);
