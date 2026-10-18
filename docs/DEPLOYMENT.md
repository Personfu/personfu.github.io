# GitHub Pages deployment boundary

The user site is `Personfu/personfu.github.io` (branch main, root static source).
GitHub separately serves `/CyberWorld/` from the `Personfu/CyberWorld` project
repository. That project route takes precedence over a folder with the same name
in the user-site repository. A successful user-site build alone does not publish
new files at the project's URL.

Ascension's authored scene/campaign sources, build tooling and QA evidence are
maintained here. The public release is exported to `/play-cyberworld/` in this
public user-site repository. Its home and `/play-cyberworld/ascension.html` open the
same game. This avoids the separate project's URL precedence. Root desktop links
and the public compatibility aliases launch this mount; FLLC member links retain
their destinations. No private project application, account data or backend code
is copied into the public release.

`npm run build` bundles the maintained `CyberWorld/` sources and then runs the
explicit public exporter before static validation. The generated runtime has local
assets, a content-derived offline cache version and a unique `cw-ascension-play-`
cache prefix. The bounded snapshot and verified-save update policy remain intact.
The root worker leaves public game navigation alone and retains established member
redirects. Mission evidence and earned reward ZIPs are generated locally, including
when the installed game is offline.

`play-cyberworld/` is generated output: edit maintained sources, then rebuild.
The exporter uses an explicit 29-file public contract, including the root favicon,
and writes the same game to `index.html`. Its deployment manifest records
exact SHA-256 digests and byte lengths for all 30 exported files; the manifest
itself is the thirty-first file. Text is normalized to LF and the GLB model is copied
byte for byte. Favicon and fictional portrait references stay inside the mount;
optional remote font links are omitted. No source commit or private checkout is
needed to regenerate. Git attributes preserve these exact bytes on checkout.

The worker snapshot contains exactly 22 local URLs, including the Last Mile field
contract model. Its version derives from all
exported game bytes, and public credits stay readable through controlled offline
navigations. Focused regression checks compare committed output with a fresh
export, reject incorrect hashes/lengths or extra files, and prove failed installs
preserve the previous complete snapshot and other game caches.

The private `Personfu/CyberWorld` integration PR remains unmerged: on 2026-10-18
GitHub reported that its jobs never started because of account payment or spending
limits, and its Vercel preview was blocked. This release does not change billing,
repository visibility, or those private deployments. The public user-site Pages
build was confirmed healthy independently.

Verify the public repository's CI and Pages deployment, then play the actual
`https://personfu.github.io/play-cyberworld/` URL before claiming the release is
live. A local preview, a merged source PR, and an API build status alone do not
establish that the public route serves the new game.
