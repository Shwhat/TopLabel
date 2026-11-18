# TopLabel handoff

Version 0.1.0, 2026-11-18. This document is kept identical in the claude.ai project (MTG Top oad Labels) and in `docs/HANDOFF.md`, and is updated with every build.

## Project

TopLabel is a self-hosted web app that makes 3D-printable Magic: The Gathering storage labels (the main use is a 76 x 100 x 3 mm toploader replacement). Picking a set builds the label from the mtg-vectors set symbol and Scryfall set data; it exports to a Bambu Studio and OrcaSlicer 3MF with each part on its filament slot, a standard 3MF, STL and STL per color. Owner: Devon. Repository: github.com/Shwhat/TopLabel. The approved specification is `TopLabel-spec.md` in the project.

The design follows the program-design-guide skill (OpenSchem structure and theme), the About section follows program-about-guide, and deployment follows docker-server-setup.

## Rules

- Do not build or change the program until Devon says "build it". Settle the specification with questions first.
- Before building, review the enabled skills, say which apply and load them.
- Do not commit or push until asked. Do not remind Devon about uncommitted work.
- Never use em dashes anywhere (code, comments, docs, interface text). A static test checks this.
- Answer questions simply and directly, without extra unrequested actions.
- Keep a task list while building, update the README feature list and the keyboard shortcut lists (README, About page, shortcuts dialog).
- Bump the version in `ui/js/core.js` (APP_VERSION), `package.json` and `package-lock.json` with every delivered build.
- Every pull request that changes what the app does, or the rules it follows, also updates the About guide: the affected pages, Capabilities, and a new entry in the release notes. It also raises the version (patch for fixes, minor for features). The version is shown in the guide.
- Update this handoff with every build.

## Code map

| Path | Contents |
|---|---|
| `main.go` | Config from environment, page assembly, routes, accounts, data files, health check |
| `auth.go` | Password hashing (PBKDF2), session token hashing, rate limiter (copied from OpenSchem) |
| `store.go` | Users, sessions and the allow-listed data files (`labels.json`, `prefs.json` per user; `arrangements.json`, `presets.json` shared) |
| `library.go` | Symbol library: refresh (GitHub tarball, Scryfall sets, Scryfall icons), atomic swap, set index with alias and route matching |
| `server_test.go` | Go tests with a fake GitHub and Scryfall |
| `assets/fonts/` | 33 Fontsource font families (WOFF, latin) and `fonts.json`; rebuilt by `tools/fonts.mjs` |
| `web/login.html`, `web/logo.svg` | Sign-in page and logo |
| `ui/index.html`, `ui/style.css`, `ui/manifest.txt` | Page skeleton, the whole stylesheet, script order |
| `ui/vendor/` | three.js 0.147 (classic build) with OrbitControls and SVGLoader, opentype.js 1.3.4, Clipper 6.4.2, licenses |
| `ui/js/core.js` | APP_VERSION, helpers, PREFS defaults, the open label `L`, `commit()`, undo and redo, `flash()`, `render()` |
| `ui/js/presets.js` | Size presets, depth profiles, arrangements, palette, rarities, lands, line sources, `newLabel()`, `applySet()` |
| `ui/js/host.js` | API calls, data load and save (server or local storage), library index, symbol and font loading |
| `ui/js/geom.js` | Clipper wrappers, SVG to outlines, symbol styles (detailed, silhouette, two-tone), text to outlines |
| `ui/js/layout.js` | Text lines, wrapping, arrangement areas, auto-fit, depth and pockets: `buildLabel()` |
| `ui/js/mesh.js` | Closed meshes: base solid with pockets from shared rings, slab solids, vertex welding |
| `ui/js/views.js` | Build scheduling, 2D layout (SVG), 3D preview (three.js), part toggles, view switching |
| `ui/js/export.js` | Zip writer, binary STL, Bambu 3MF, standard 3MF, `exportLabel()` |
| `ui/js/ribbon.js` | Icons, ribbon tabs and groups |
| `ui/js/menus.js` | Menus, the ACTIONS map, keyboard shortcuts |
| `ui/js/dialogs.js` | `dialog()` helper and every dialog (size, arrangement, depth, presets, palette, refresh, library, fonts, export, save, account) |
| `ui/js/about.js`, `ui/js/about-pages.js`, `ui/about/*.md` | About screen, generated page bundle (`python3 tools/about.py`), guide pages |
| `ui/js/sets.js` | Sets panel: sets table, filters, sorting, keyboard, lands and watermarks |
| `ui/js/props.js` | Properties panel and its change handling |
| `ui/js/labels.js` | Saved labels panel |
| `ui/js/theme.js` | Light, dark and system theme; dark work surface |
| `ui/js/demo.js` | Demo labels (one per feature) |
| `ui/js/app.js` | Startup (last in the manifest), panels, status bar |
| `tests/run.mjs` | Builds the server, starts it with the fixture library and a fake GitHub and Scryfall, runs the Playwright suites |
| `tests/suites/` | 00-static, 10-label, 20-sets, 30-export, 40-save, 50-library, 54-about, 60-ui, 91-server |
| `tests/fixtures/library/current/` | A small real library (9 symbol folders, watermarks, code lists, 13 sets) |
| `Dockerfile`, `docker-compose.yml`, `.env.example`, `.github/workflows/docker.yml` | Image (scratch, CA certificates, UID 65532), Dockhand-ready stack, CI publishing to GHCR |

## How it works

- The server only stores data and keeps the library. All geometry is built in the browser: SVG paths and font glyphs are flattened to polygons, combined with Clipper (integer units of 1/1000 mm), placed by the arrangement, then extruded into closed meshes.
- Symbol styles use painter's order: later SVG elements cover earlier ones. Detailed = visible colored parts if any, otherwise visible black parts; silhouette = everything; two-tone = everything minus detailed as the outline.
- Pockets: elements with Sunk > 0 cut the base. The base is one solid when pockets are inside the label and apart (pockets at the same depth are merged); otherwise stacked slabs.
- The open label autosaves into `prefs.json` (`autosave`) 1.5 s after each change.
- Library refresh downloads into `library/new-<time>`, swaps it with `library/current` only when every step worked, and removes leftovers on start.

## Tests

- `go test ./...` and `npm test` (48 browser tests) pass at 0.1.0.
- The browser tests use one account (`tester`) and reset its data per test, because sign-ups are rate limited per address.
- Exports are checked with Python: XML well formed, every mesh edge shared by exactly two triangles, filament slots, placement.

## Open bugs

- Two-tone outlines of some symbols (for example NEO rare) contain a few triangles with inconsistent winding where a gap in the symbol touches the outline at a point. The mesh is closed and slicers accept it.

## Open ideas

- Release 0.2.0: drag, resize and rotate elements in the 2D layout; upload own SVGs and fonts; several symbols per label with their own colors (the Landing Party label); grid arrangement for marketing-style symbol sheets.
- Release 0.3.0: batch export of many sets with one plate per label or plates packed to the bed; OBJ, AMF, SVG, DXF and PNG export.
- A short-name option for set names (the example labels used "Lord of the Rings" instead of the full Scryfall name; today this is a custom line).

## Known limits

- One symbol and one text block per label; no drag editing yet.
- Panels can be resized and hidden but not docked elsewhere (no OpenSchem docking or workspaces).
- The Bambu 3MF writes a minimal project settings file (filament colors and types only). It has not yet been opened in Bambu Studio by Devon; if the slicer complains, export with "Include filament colors" off.
- GitHub limits anonymous downloads to 60 per hour per address, which only matters for repeated refreshes.

## Where work stopped

0.1.0 is built, tested and pushed to `main`. Next: Devon to deploy with Dockhand, open a Bambu 3MF in Bambu Studio on the H2D, and report anything that looks wrong; then plan 0.2.0.
