# TopLabel handoff

Version 0.4.0, 2026-11-18. This document is kept identical in the claude.ai project (MTG Top oad Labels) and in `docs/HANDOFF.md`, and is updated with every build.

## Project

TopLabel is a self-hosted web app that makes 3D-printable Magic: The Gathering storage labels (the main use is a 76 x 100 x 3 mm toploader replacement) and drawer dividers (default shape from Devon's Card catalog divider, 71.92 x 72 x 2.16 mm). Picking a set builds the label from the mtg-vectors set symbol and Scryfall set data; it exports to a Bambu Studio and OrcaSlicer 3MF with each part on its filament slot, a standard 3MF, STL and STL per color. Owner: Devon. Repository: github.com/Shwhat/TopLabel. The approved specification is `TopLabel-spec.md` in the project.

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
| `uploads.go` | Uploaded SVG symbols and fonts in `shared/uploads` with `uploads.json`; routes `/api/uploads` (list, POST with `?kind=svg|font&name=`, GET file, DELETE) |
| `library.go` | Symbol library: refresh (GitHub tarball, Scryfall sets, Scryfall mana symbols to `mana/` and `mana.json`, Scryfall icons), atomic swap, set index with alias and route matching |
| `server_test.go` | Go tests with a fake GitHub and Scryfall |
| `assets/fonts/` | 33 Fontsource font families (WOFF, latin) and `fonts.json`; rebuilt by `tools/fonts.mjs` |
| `web/login.html`, `web/logo.svg` | Sign-in page and logo |
| `ui/index.html`, `ui/style.css`, `ui/manifest.txt` | Page skeleton, the whole stylesheet, script order |
| `ui/vendor/` | three.js 0.147 (classic build) with OrbitControls and SVGLoader, opentype.js 1.3.4, Clipper 6.4.2, licenses |
| `ui/js/core.js` | APP_VERSION, helpers, PREFS defaults, the open label `L`, `commit()`, undo and redo, `flash()`, `render()` |
| `ui/js/presets.js` | Size presets, depth profiles, item types, layout presets (`ARRANGEMENTS` with row functions), `rowsFromKind()` migration, mana colors and presets, palette, rarities, lands, line sources, `newLabel()`, `applySet()`, divider patterns and shapes, `newDivider()` |
| `ui/js/host.js` | API calls, data load and save (server or local storage), library index, uploads (`UPLOADS`, uploaded fonts join `LIB.fonts` as `u-<id>`), symbol URLs per item, symbol and font loading |
| `ui/js/geom.js` | Clipper wrappers, SVG to outlines, symbol styles (detailed, silhouette, two-tone), mana shapes (pip, icon), text to outlines |
| `ui/js/layout.js` | Text lines (short names), wrapping, content area (`contentArea`: label or divider top band), row heights and item widths, symbol item sources, symbol grids, `itemXform` (move, scale, turn), top edge steps (`edgeSteps`), divider outline and pattern holes, auto-fit, depth, front and back pockets: `buildLabel()` |
| `ui/js/mesh.js` | Closed meshes: base solid with holes, pockets on both faces and a stepped top edge from shared rings, slab solids, vertex welding |
| `ui/js/views.js` | Build scheduling, 2D layout (SVG) with picking, dragging, scale and turn handles, arrow keys and the divider back, 3D preview (three.js), part toggles, view switching |
| `ui/js/export.js` | Zip writer, binary STL, Bambu project with many objects and plates (`bambuProject`), standard 3MF, OBJ, AMF, SVG, DXF, PNG, `exportFile()`, `exportLabel()`, batch export with plate packing (`packPlates`, `batchExport`) |
| `ui/js/ribbon.js` | Icons, ribbon tabs and groups |
| `ui/js/menus.js` | Menus, the ACTIONS map, keyboard shortcuts |
| `ui/js/dialogs.js` | `dialog()` helper and every dialog (size, layout, depth, presets, palette, refresh, library, fonts, export, save, account, uploads, export many sets) |
| `ui/js/about.js`, `ui/js/about-pages.js`, `ui/about/*.md` | About screen, generated page bundle (`python3 tools/about.py`), guide pages |
| `ui/js/sets.js` | Sets panel: sets table, filters, sorting, keyboard, lands and watermarks |
| `ui/js/props.js` | Properties panel and its change handling |
| `ui/js/rows.js` | Layout rows editor in the Properties panel: rows, items, text lines, short names, symbol sources, grids, Position fields, mana symbols and presets |
| `ui/js/labels.js` | Saved labels panel |
| `ui/js/theme.js` | Light, dark and system theme; dark work surface |
| `ui/js/demo.js` | Demo labels (one per feature) |
| `ui/js/app.js` | Startup (last in the manifest), docking panels (`PREFS.dock`, `PREFS.dockTab`), status bar |
| `tests/run.mjs` | Builds the server, starts it with the fixture library and a fake GitHub and Scryfall, runs the Playwright suites |
| `tests/suites/` | 00-static, 10-label, 15-divider, 17-design (0.4.0 features), 20-sets, 30-export, 40-save, 50-library, 54-about, 60-ui, 91-server |
| `tests/fixtures/library/current/` | A small real library (9 symbol folders, watermarks, code lists, 13 sets) |
| `Dockerfile`, `docker-compose.yml`, `.env.example`, `.github/workflows/docker.yml` | Image (scratch, CA certificates, UID 65532), Dockhand-ready stack, CI publishing to GHCR |

## How it works

- The server only stores data and keeps the library. All geometry is built in the browser: SVG paths and font glyphs are flattened to polygons, combined with Clipper (integer units of 1/1000 mm), placed by the layout rows, then extruded into closed meshes.
- Symbol styles use painter's order: later SVG elements cover earlier ones. Detailed = visible colored parts if any, otherwise visible black parts; silhouette = everything; two-tone = everything minus detailed as the outline.
- Pockets: elements with Sunk > 0 cut the base from the top; a divider's back elements (mirrored copies) cut it from the bottom. The base is one solid when pockets are inside the outline, apart on each side and do not meet across the plate (pockets at the same depth are merged); otherwise stacked slabs.
- Depth: `L.depth.sync` (Same depth for symbol and text) links the symbol and text values in the Properties panel and the Depth dialog. Labels saved before 0.2.0 get `sync` only when their two depths are equal.
- Layout: `L.arr = {id, name, margin, gap, symPct, rows:[{h, items:[...]}]}`. Item types: `symbol`, `text` (`lines`, `slot`), `code`, `mana` (`syms:[{c, slot, style:'pip'|'icon'}]`, `size`). Rows without a fixed height share the space; rows with a symbol flex and keep at least 30%. Labels and layouts saved before 0.3.0 are converted in `normalizeLabel()` with `rowsFromKind()`.
- Items: every item may carry `x`, `y` (mm), `scale` (%) and `rot` (degrees, clockwise), applied about the centre of its space. Symbol items have `src` ('label' or missing = the label's symbol and Symbol group; 'set' with `set` code and `rarity`; 'wm' with `wm`; 'upload' with `up`) plus `style`, `slot`, `slot2`. Grid items: `{t:'grid', codes, cols, rarity, style, slot, slot2}`. Other symbols are parts `sym_<row>_<item>`, grids `grid_<row>_<item>`.
- Top edge: `L.size.edge` ('none', 'round', 'chamfer') and `L.size.edgeR`; the base steps in ring by ring (about 0.1 mm per step) in `baseSolid`, or by slabs in the fallback.
- Short names: line source 'short'; saved names in `presets.json` under `shortNames`.
- Mana: SVGs come from the library (`/api/library/mana/<code>.svg`). Pip = circle minus the dark glyph; icon = the glyph. Default colors W yellow, U blue, B purple, R red, G green, others grey.
- Dividers: `L.kind = 'divider'` with `L.div` (shape id, band, tabH, tabInset, pattern, back). Rows are placed inside the top band (Divider band layout by default). Saved divider shapes are in `presets.json` under `dividers`.
- The open label autosaves into `prefs.json` (`autosave`) 1.5 s after each change.
- Library refresh downloads into `library/new-<time>`, swaps it with `library/current` only when every step worked, and removes leftovers on start.

## Tests

- `go test ./...` and `npm test` (68 browser tests) pass at 0.4.0.
- The browser tests use one account (`tester`) and reset its data per test, because sign-ups are rate limited per address.
- Exports are checked with Python: XML well formed, every mesh edge shared by exactly two triangles, filament slots, placement.

## Open bugs

- Two-tone outlines of some symbols (for example NEO rare) contain a few triangles with inconsistent winding where a gap in the symbol touches the outline at a point. The mesh is closed and slicers accept it.

## Open ideas

- Floating panels and saved workspaces (OpenSchem style).
- Several styles (bold, italic) of one uploaded font; WOFF2 support.
- A picker for a symbol item's set instead of typing the code.

## Known limits

- Panels dock left, right or bottom (as tabs); no floating panels or workspaces.
- Uploads need the server (not available when the page is opened from disk).
- The Bambu 3MF writes a minimal project settings file (filament colors and types only). It has not yet been opened in Bambu Studio by Devon; if the slicer complains, export with "Include filament colors" off.
- GitHub limits anonymous downloads to 60 per hour per address, which only matters for repeated refreshes.

## Where work stopped

0.4.0 is built, tested and pushed to `main`. It brings everything that was planned: moving, scaling and turning items (fields and 2D dragging), symbol items from other sets, lands, watermarks or uploaded SVGs, symbol grids, SVG and font uploads, rounded or chamfered top edges, short set names, the divider back in 2D, export many sets (packed or one plate each, or a zip), OBJ, AMF, SVG, DXF and PNG export, and docking panels. Defaults chosen without Devon's answer: rotation is clockwise; uploads are shared with everyone on the server; packed plates use 5 mm from the edges and 4 mm between labels; the edge is on the top face only; short names drop "The" and a subtitle only when two or more words remain. Next: Devon to deploy, print a label with a rounded edge and try Export many sets in Bambu Studio, and report anything that looks wrong.
