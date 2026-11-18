# Technical

## Architecture

| Part | Technology |
|---|---|
| Server | Go, standard library only, one static binary with the interface, fonts and sign-in page built in |
| Interface | HTML, CSS and JavaScript in the browser, no build step |
| Label geometry | Built in the browser: SVG and font outlines are turned into polygons, combined, fitted and extruded into closed meshes |
| 3D preview | three.js |
| Exports | Written in the browser (3MF, STL and zip) |
| Data | JSON files in the data folder |
| Container | `FROM scratch` image, runs as user 65532, data in `/data`, built-in health check |

## Installation

TopLabel runs as a Docker Compose stack, normally deployed with Dockhand as a Git stack from github.com/Shwhat/TopLabel (compose file `docker-compose.yml`). The README has the full steps for Dockhand and for the command line. In short:

1. On the Docker host: `sudo mkdir -p /opt/toplabel/data` and `sudo chown -R 65532:65532 /opt/toplabel/data`.
2. Check that the port is free: `sudo ss -ltnp | grep ':8431 '`.
3. Deploy the stack, then check `curl -I http://127.0.0.1:8431`.
4. Open TopLabel and create the first account. The library downloads by itself.

## Updates

- New versions are published as images by GitHub Actions. Dockhand pulls them on its schedule (automatic image updates) or when the stack is pulled and redeployed.
- Updates never change the data folder layout in a way that needs a migration, and never require deleting the data folder.
- The version is shown at the top of this guide.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `TOPLABEL_PORT` | `8431` | Host port the app is published on (compose file) |
| `TOPLABEL_DATA_DIR` | `/opt/toplabel/data` | Host folder for the data (compose file) |
| `TOPLABEL_SIGNUP` | `false` | Allow new accounts to sign up; the first account can always be created |
| `TOPLABEL_SECURE_COOKIE` | `auto` | `auto` marks the sign-in cookie secure when the request arrives over HTTPS (directly or through a proxy that sets X-Forwarded-Proto, such as Cloudflare Tunnel); `always` or `never` force it |
| `TOPLABEL_VECTORS_REPO` | `Investigamer/mtg-vectors` | GitHub repository the symbols are downloaded from |
| `TOPLABEL_AUTO_REFRESH` | `true` | Download the library when the server starts with none |
| `TOPLABEL_ADDR` | `:8080` | Address the server listens on inside the container |
| `TOPLABEL_DATA` | `/data` | Data folder inside the container |
| `TOPLABEL_GITHUB_API` | `https://api.github.com` | GitHub API address (used by the tests) |
| `TOPLABEL_SCRYFALL_API` | `https://api.scryfall.com` | Scryfall API address (used by the tests) |

## Network

The server contacts api.github.com and codeload.github.com (symbols), api.scryfall.com (set list) and svgs.scryfall.io (icons), only during a library refresh. The browser talks only to the TopLabel server.

## Limits

- Elements cannot yet be dragged in the 2D layout; their place comes from the arrangement.
- One symbol and one text block per label or divider.
- Own SVG files and fonts cannot be uploaded yet.
- One label per export; batch export is planned.
- Panels can be resized and hidden but not moved to other edges.
- Text uses the Latin characters of the built-in fonts.
- The 3D preview needs WebGL; without it the 2D layout and exports still work.

## Third-party components

| Component | Used for | License |
|---|---|---|
| three.js 0.147 | 3D preview, SVG reading, triangulation | MIT |
| opentype.js 1.3.4 | Reading fonts and turning text into outlines | MIT |
| Clipper 6.4.2 (JavaScript port) | Combining and offsetting outlines | Boost Software License 1.0 |
| Fontsource font files (33 families) | Built-in fonts | SIL Open Font License 1.1 |
| mtg-vectors | Set symbols and watermarks (downloaded, not bundled) | Mozilla Public License 2.0 |
| Scryfall API | Set list and set icons (downloaded, not bundled) | Scryfall terms of use |
| Go standard library | Server | BSD-style |
