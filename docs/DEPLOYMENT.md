# GitHub Pages deployment boundary

The user site is `Personfu/personfu.github.io` (branch main, root static source).
GitHub separately serves `/CyberWorld/` from the `Personfu/CyberWorld` project
repository. That project route takes precedence over a folder with the same name
in the user-site repository. A successful user-site build alone does not publish
new files at the project's URL.

Ascension's authored scene/campaign sources, build tooling and complete QA evidence
are maintained here. Its explicit public runtime must also be integrated into the
CyberWorld project's static public output and deployed by that project's existing
workflow. The public entry remains `/CyberWorld/ascension.html`; its home opens the
same game. Account and member subroutes remain distinct, and no backend policy is
changed by this static release.

The root and scoped workers allow network navigation to the public project home
and the explicit Ascension entry. Other established member paths retain their
gateway behavior. The scoped offline worker still caches only the bounded
allowlist, and update activation still requires an explicit verified save.

Verify both repositories' CI/deployments and play the actual production URL before
claiming the release is live. A local preview, a merged source PR, and an API build
status do not establish that the public route serves the new game.
