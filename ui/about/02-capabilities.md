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
- Upload your own SVG symbols and fonts (TTF, OTF, WOFF), shared with everyone on the server.

### Sets panel

- Search by name or code, sort by code, name or date, filter by set type, release year and whether a symbol exists.
- Picking a set, land or watermark builds the label at once.

### Labels

- Label size from presets or any width, height, base thickness and corner radius; scale a whole label by percentage.
- Square, rounded or chamfered top edge of any size.
- Layout rows from top to bottom, each with items side by side: set symbol, text, set code, mana symbols and symbol grid; rows and items can be added, moved and removed, and rows can have a fixed height.
- Several symbols on one label, each from its own set, land, watermark or uploaded SVG, in its own style and colors.
- Symbol grids of any number of sets in rows and columns, for symbol sheets.
- Every item can be moved, scaled and turned, by typing values or by dragging it and its handles in the 2D layout.
- Mana symbols from Scryfall, any number in a row, evenly spaced, each with its own color and its own style (pip or icon), with presets for single colors, the guilds, shards, wedges and all five colors.
- Seven layout presets (symbol over text, text over symbol, symbol only, text only, symbol beside text, divider band, symbol grid); layouts saved by name and shared on the server, with one as the default for new labels.
- Symbol by rarity, in three styles: detailed, silhouette and two-tone.
- Text items with lines from the set name, short set name, code, release year, release date, set type, rarity, card count or custom text, each item in its own color.
- Long names wrap at a colon or between words; text shrinks to fit, with a warning below the minimum size.
- 33 built-in fonts and uploaded fonts, with bold, italic and all capitals.
- Short set names, automatic or typed once per set for everyone.
- Depth profiles: standard (2 mm base, symbol and text 0.5 mm sunk and 1 mm above, 3 mm in all), low, bold, flush inlay and engraved, saved as named profiles.
- The symbol and the text keep the same depth while Same depth for symbol and text is on, or take their own depths when it is off.
- Filament palette of 1 to 16 slots with names and colors, saved as named color sets.

### Dividers

- Drawer dividers with the symbol and text in a solid top band, made from the open label's set with New divider.
- Built-in Card catalog divider shape (71.92 x 72 x 2.16 mm with a narrower tab); every dimension adjustable; shapes and patterns saved by name.
- Hexagon, circle, square, diamond and slot patterns with adjustable holes, spacing and border, or solid.
- Content on the front only or on both faces, flush inlay by default, the back mirrored; the 2D layout shows either face.

### Views

- 2D layout with dimensions and layout guides, 3D preview with orbit, pan and zoom, or both side by side.
- Parts can be hidden in the views one by one.
- Light and dark theme, and a separate dark work surface.
- Panels can be moved to the left, right or bottom dock, by dragging or from a menu, and share a dock as tabs.

### Export

- Bambu Studio and OrcaSlicer 3MF project with one part per element on its filament slot, placed on the chosen printer bed, with a preview image.
- Standard 3MF with one colored object per part.
- STL as one combined mesh, or one STL per filament slot in a zip file.
- OBJ and AMF with colors, SVG top view, DXF outlines and a PNG picture of the 3D preview.
- Export many sets at once: one Bambu project with the labels packed onto plates or one plate per set, or a zip with one file per set.
- File names from a pattern with the set code, name and rarity.

### Saving

- Labels saved under each account; preferences, panel sizes and the open label remembered between visits.
- Undo and redo for every change to the label.

## Planned

These are ideas for later versions and are not available yet.

| Version | Planned features |
|---|---|
| Later | Floating panels and saved workspaces; several styles of one uploaded font; WOFF2 fonts |
