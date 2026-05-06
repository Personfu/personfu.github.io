# ═══════════════════════════════════════════════════════════
#  FURIOS-INT MSF-SERVICE
#  Metasploit Framework REST API wrapper for Railway
#
#  Provides:
#    GET  /health                  — Healthcheck
#    GET  /api/modules             — Full module catalog + search
#    GET  /api/modules/:type       — Filter by type (exploit/auxiliary/post/payload)
#    GET  /api/cve-map?cve=...     — CVE → exploit mapping
#    GET  /api/ttps                — MITRE ATT&CK TTP reference
#    POST /api/console             — Educational console simulation
#    POST /api/console/live        — Live Metasploit console (if MSF_RPC running)
#    GET  /api/payloads            — Payload generator reference
#    GET  /api/scan/sim            — Educational port scan simulation
#
#  Set in Railway env vars:
#    MSF_RPC_HOST     — host of Metasploit RPC (default localhost)
#    MSF_RPC_PORT     — port of Metasploit RPC (default 55553)
#    MSF_RPC_PASS     — Metasploit RPC password
#    ADMIN_KEY        — Shared with main nexus for auth
#    NEXUS_URL        — https://personfugithubio-production.up.railway.app
# ═══════════════════════════════════════════════════════════

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./

EXPOSE 4567

CMD ["node", "server.js"]
