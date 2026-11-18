# Capabilities

This page lists what TopLabel does in the current version, followed by what is planned.

## Available now

### Library

- Downloads the set symbols from mtg-vectors on GitHub and the set list from Scryfall with one Refresh library button.
- Downloads the library by itself the first time the server starts.
- Uses the Scryfall set icon for sets that mtg-vectors does not have yet.
- Matches Scryfall set codes to mtg-vectors symbols through the mtg-vectors code aliases and routes, so promo and token sets show the symbol of their main set.
- Keeps the current library if a refresh fails.
- Basic land symbols (Plains, Island, Swamp, Mountain, Forest, Wastes) and every mtg-vectors watermark.

### Sets panel

- Search by name or code, sort by code, name or date, filter by set type, release year and whether a symbol exists.
- Picking a set, land or watermark builds the label at once.

### Labels

- Label size from presets or any width, height, base thickness and corner radius; scale a whole label by percentage.
- Five arrangements: symbol over text, text over symbol, symbol only, text only, symbol beside text.
- Margin, gap, text area and symbol size settings, saved as named arrangements shared on the server, with one arrangement as the default for new labels.
- Symbol by rarity, in three styles: detailed, silhouette and two-tone.
- Text lines from the set name, code, release year, release date, set type, rarity, card count or custom text, in any order.
- Long names wrap at a colon or between words; text shrinks to fit, with a warning below the minimum size.
- 33 built-in fonts with bold, italic and all capitals.
- Depth profiles: standard (2 mm base, symbol and text 0.5 mm sunk and 1 mm above, 3 mm in all), low, bold, flush inlay and engraved, saved as named profiles.
- The symbol and the text keep the same depth while Same depth for symbol and text is on, or take their own depths when it is off.
- Filament palette of 1 to 16 slots with names and colors, saved as named color sets.

### Dividers

- Drawer dividers with the symbol and text in a solid top band, made from the open label's set with New divider.
- Built-in Card catalog divider shape (71.92 x 72 x 2.16 mm with a narrower tab); every dimension adjustable; shapes and patterns saved by name.
- Hexagon, circle, square, diamond and slot patterns with adjustable holes, spacing and border, or solid.
- Content on the front only or on both faces, flush inlay by default, the back mirrored.

### Views

- 2D layout with dimensions and layout guides, 3D preview with orbit, pan and zoom, or both side by side.
- Parts can be hidden in the views one by one.
- Light and dark theme, and a separate dark work surface.

### Export

- Bambu Studio and OrcaSlicer 3MF project with one part per element on its filament slot, placed on the chosen printer bed, with a preview image.
- Standard 3MF with one colored object per part.
- STL as one combined mesh, or one STL per filament slot in a zip file.
- File names from a pattern with the set code, name and rarity.

### Saving

- Labels saved under each account; preferences, panel sizes and the open label remembered between visits.
- Undo and redo for every change to the label.

## Planned

These are part of the release plan and are not available yet.

| Version | Planned features |
|---|---|
| 0.3.0 | Drag, resize and rotate elements in the 2D layout; upload your own SVG symbols and fonts; several symbols on one label, each in its own color; a grid arrangement for symbol sheets |
| 0.4.0 | Batch export of many sets with plate packing; OBJ, AMF, SVG, DXF and PNG export |
