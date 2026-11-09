# Atlas geography and provenance

GovINT bundles country and United States state geometry so its atlas renders without API keys, external scripts, tiles or a network request to a map provider.

- Publisher: Natural Earth.
- Product: 1:110 million Admin 0 Countries and Admin 1 States/Provinces.
- Country source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
- State source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_1_states_provinces.geojson
- License: public domain. https://www.naturalearthdata.com/about/terms-of-use/
- Bundled 9 November 2026 in `assets/data/world.js` and `assets/data/states.js`.
- Processing: retain administrative name and geometry; omit Antarctica from the overview; retain U.S. states from Admin 1. The browser applies a plate carrée projection.

Borders are approximate cartographic reference data. Regional markers index the geographic coverage of sources. They are not sensor positions, active incidents, intelligence collection locations or real-time observations. Arizona desk markers reference broad regions or public-government desks. Global institutions are a separate conceptual collection.

## Refreshing

Download the source GeoJSON, retain the above fields and serialize as assignments to `window.GOVINT_WORLD` and `window.GOVINT_STATES`. Keep the public-domain credit and source links. Review changes before replacing bundled geometry. No remote content is loaded by the map at runtime.

## Animated coverage globe

The mission-control globe uses land samples derived from the same country geometry, not imagery or a live intelligence feed. `scripts/build_land_points.py --source <country-geojson>` samples the land mask into `assets/data/land-points.js`. `assets/js/globe.js` renders an orthographic projection in Canvas, highlights actual catalog coverage and respects the reduced-motion setting. The globe loads no external map services.

Bundled display fonts (Manrope, Barlow Condensed and IBM Plex Mono) include their SIL Open Font License files under `assets/fonts/`; no font CDN is required.
