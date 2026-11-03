# Fictional catalog service

This companion serves educational catalog entries and local console simulation.
Live RPC forwarding has been removed, including the unauthenticated fallback
that previously could forward ordinary console requests when RPC was configured.
Legacy live-console requests are denied. Existing module references remain
educational data; this service cannot execute them against real systems.

The defensive boundary is to keep execution and network targets outside the
game's request path. Authentication or a command denylist alone does not make
a shared execution bridge an appropriate game feature. Do not add live RPC
credentials or reconnect the bridge.

The container pins an official Node 24.22.1 image digest and installs the
service's own lockfile. Rebuild and replace running containers to receive this
change; a source update does not attest to a running Railway service.
