# TopLabel

TopLabel makes 3D-printable labels and drawer dividers for Magic: The Gathering card storage, such as a full toploader replacement. Choose a set and TopLabel builds the label: a flat base with the set symbol and the set name and code raised or inlaid, each part on its own filament slot, ready for Bambu Studio, OrcaSlicer or any other slicer.

Set symbols come from [mtg-vectors](https://github.com/Investigamer/mtg-vectors) and the set list from [Scryfall](https://scryfall.com). Both are downloaded by the server and refreshed with one button.

The full user guide is built into the program: Help, About TopLabel.

## Features

- Symbol library from mtg-vectors and Scryfall: Refresh library button, automatic first download, Scryfall icons for sets mtg-vectors does not have yet, every rarity, basic lands and watermarks.
- Sets panel: search by name or code, sort by code, name or date, filter by set type, year and symbol.
- Automatic labels: pick a set and the label is built; symbol and text scale to fit any label size; long names wrap.
- Layout rows: each row holds set symbols, text, set codes, mana symbols or symbol grids side by side; add, move and remove rows and items; seven presets; save layouts by name and pick a default.
- Move, scale and turn any item: Position fields, or drag the item and its handles in the 2D layout; arrow keys nudge it.
- Several symbols per label: each symbol item uses the label's symbol, another set, a land or watermark, or an uploaded SVG, in its own style and colors. Symbol grids show many sets in rows and columns.
- Uploads: your own SVG symbols and fonts (TTF, OTF, WOFF), shared on the server.
- Mana symbols from Scryfall, any number in a row, each with its own color and pip or icon style, with guild, shard and wedge presets.
- Sizes: toploader replacement (76 x 100 mm), card size, small card, square tile, mini tile, or any custom size; scale by percentage; square, rounded or chamfered top edge.
- Depth profiles: standard (2 mm base, symbol and text 0.5 mm sunk and 1 mm above, 3 mm in all), low, bold, flush inlay, engraved; the symbol and text share one depth unless Same depth is turned off; save profiles by name.
- Dividers: Card catalog divider shape (71.92 x 72 x 2.16 mm with a narrower tab), hexagon, circle, square, diamond, slot or solid patterns, symbol and text in the top band on one or both faces (flush by default), front or back in the 2D layout, saved divider shapes.
- Symbol styles: detailed (symbol without its border), silhouette, two-tone.
- Text lines from the set name, short set name (automatic or saved per set), code, year, date, type, rarity, card count or custom text; 33 built-in free fonts with bold, italic and capitals.
- Filament palette of up to 16 slots with saved color sets.
- 2D layout with guides and dimensions, 3D preview, or both; light and dark theme and a dark work surface; panels dock left, right or bottom, as tabs.
- Export: Bambu Studio and OrcaSlicer 3MF project (parts on their filament slots), standard 3MF, STL, STL per color, OBJ and AMF with colors, SVG top view, DXF outlines, PNG picture.
- Export many at once: sets, basic lands and watermarks together, built from the open label, a saved label or a divider shape, as one Bambu project with labels packed onto plates or one plate per item, or a zip of files.
- Accounts, saved labels and preferences on the server, undo and redo, keyboard shortcuts.

Planned for later: floating panels and saved workspaces; several styles of one uploaded font; WOFF2 fonts.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+Shift+S | New label, open, save, save as |
| Ctrl+Shift+N | New divider |
| Ctrl+E | Export |
| Ctrl+Shift+E | Export many |
| Ctrl+Z, Ctrl+Y | Undo, redo |
| Ctrl+L | Add a text row |
| 2, 3, B | 2D layout, 3D preview, both |
| F | Fit the label in the view |
| G | Layout guides on or off |
| / | Search the set list (Up, Down and Enter to pick) |
| Arrows, Shift+arrows | Move the item picked in the 2D layout by 0.1 mm or 1 mm |
| Delete | Remove the item picked in the 2D layout |
| Esc | Close a menu, dialog or the About screen |
| F1 | Keyboard shortcuts |

## Install with Dockhand

On the Docker host, create the data folder and give it to the container user:

```bash
sudo mkdir -p /opt/toplabel/data
sudo chown -R 65532:65532 /opt/toplabel/data
sudo ss -ltnp | grep ':8431 '
```

No output from the last command means port 8431 is free. If it is taken, choose another port for `TOPLABEL_PORT` below.

In Dockhand:

1. Add a Git stack with the repository URL `https://github.com/Shwhat/TopLabel` and compose path `docker-compose.yml`.
2. Enter the environment variables from `.env.example` (at least `TOPLABEL_PORT` and `TOPLABEL_DATA_DIR` if you change them).
3. Deploy the stack and check its logs. The first start downloads the symbol library; the log shows "library refresh finished".

On the Docker host, confirm the app answers:

```bash
curl -I http://127.0.0.1:8431
```

A `303 See Other` to `/login` is correct. Then add a public hostname to the existing Cloudflare Tunnel pointing to `http://SERVER_IP:8431`. Open TopLabel and create the first account.

## Automatic updates

In Dockhand, turn on automatic image updates for the `toplabel` container with a schedule (for example weekly). New images published by GitHub Actions to `ghcr.io/shwhat/toplabel:latest` are then pulled and the container is recreated. Optionally turn on Git auto sync or a webhook for the stack so changes to `docker-compose.yml` redeploy it.

## Install from the command line

On the Docker host:

```bash
sudo mkdir -p /opt/toplabel/data
cd /opt/toplabel
sudo curl -fsSLO https://raw.githubusercontent.com/Shwhat/TopLabel/main/docker-compose.yml
sudo curl -fsSL https://raw.githubusercontent.com/Shwhat/TopLabel/main/.env.example -o .env
sudo nano .env
sudo chown -R 65532:65532 /opt/toplabel/data
sudo docker compose config -q
sudo docker compose pull
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs --tail=100
curl -I http://127.0.0.1:8431
```

## Manual update

In Dockhand: pull and redeploy the stack, then check its logs.

On the command line, on the Docker host:

```bash
cd /opt/toplabel
sudo cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)
sudo cp .env .env.backup-$(date +%Y%m%d-%H%M%S)
sudo docker compose pull
sudo docker compose up -d
sudo docker compose logs --tail=100
```

Never remove the stack with its volumes and never run `docker compose down -v`. An update never requires deleting the data folder.

## Backup

Copy `/opt/toplabel/data`, the stack's environment values (Dockhand) or `.env`, and `docker-compose.yml`, and keep one copy off the Docker host. A Docker volume is not a backup. The `library` folder inside the data folder can be left out; Refresh library downloads it again.

```bash
sudo tar czf toplabel-backup-$(date +%Y%m%d).tar.gz -C /opt/toplabel data
```

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `TOPLABEL_PORT` | `8431` | Host port |
| `TOPLABEL_DATA_DIR` | `/opt/toplabel/data` | Host data folder |
| `TOPLABEL_SIGNUP` | `false` | Allow new accounts to sign up; the first account can always be created |
| `TOPLABEL_SECURE_COOKIE` | `auto` | Secure sign-in cookie: `auto`, `always` or `never` |
| `TOPLABEL_VECTORS_REPO` | `Investigamer/mtg-vectors` | Repository the symbols are downloaded from |
| `TOPLABEL_AUTO_REFRESH` | `true` | Download the library when the server starts with none |

## Development

- `go test ./...` runs the server tests.
- `npm install` then `npm test` builds the server, starts it with the test library in `tests/fixtures` and a fake GitHub and Scryfall, and runs the browser tests in headless Chromium. `npm test -- export` runs suites whose name contains "export".
- `python3 tools/about.py` rebundles the About guide after editing `ui/about/*.md`.
- `node tools/fonts.mjs` downloads the built-in fonts again into `assets/fonts`.
- `python3 tools/assemble.py` writes the assembled page to `build/toplabel.html`.

The interface follows the OpenSchem structure: `ui/index.html`, one `ui/style.css`, and the scripts in `ui/js` loaded in the order of `ui/manifest.txt`. See `docs/HANDOFF.md` for the code map and working rules.

## Licenses

TopLabel bundles three.js (MIT), opentype.js (MIT), Clipper (Boost Software License) and 33 font families from Fontsource (SIL Open Font License); license files are in `ui/vendor` and `assets/fonts`. Set symbols are downloaded from mtg-vectors (Mozilla Public License 2.0) and set data from Scryfall. Magic: The Gathering symbols are property of Wizards of the Coast. TopLabel is not affiliated with Wizards of the Coast, Scryfall or mtg-vectors.
