# Release notes

The installed version is shown at the top of this guide.

## 0.3.0 (2026-11-18): Layout rows and mana symbols

- Layout rows replace the arrangement list: the content is a list of rows, top to bottom, each holding items side by side. Items are set symbol, text, set code and mana symbols; rows and items can be added, moved and removed, and a row can have a fixed height.
- Mana symbols: any number in a row, evenly spaced, each with its own color and its own style, pip (the round symbol with its icon cut out) or icon. Presets fill a row with a single color, a guild, a shard, a wedge or all five colors.
- The library now also downloads the mana symbols from Scryfall. Refresh the library once after updating to get them.
- Each text item has its own color; text items are fitted one by one.
- Layout presets: Symbol over text, Text over symbol, Symbol only, Text only, Symbol beside text and Divider band. Saved layouts keep the rows with their items and colors.
- Labels and saved layouts from earlier versions are converted to rows with the same content.
- The Show symbol and Show text settings are replaced by adding and removing rows.

## 0.2.1 (2026-11-18): Finer number steps

- The arrow keys and arrow buttons in number fields now change millimetre values by 0.1 instead of 1, percentages by 1 and line spacing by 0.05.

## 0.2.0 (2026-11-18): Dividers and new depth defaults

- Dividers: New divider makes a drawer divider for the open set, with the symbol and text in a solid top band. The default Card catalog divider shape is 71.92 x 72 x 2.16 mm with a narrower tab; every dimension can be changed and saved as a named shape.
- Divider patterns: Hexagon, Circles, Squares, Diamonds, Vertical slots or Solid, with adjustable hole size, spacing, staggering and border.
- Divider faces: content on the front only or on both faces, flush inlay by default, the back mirrored to read from behind.
- New depth defaults: Standard is now a 2 mm base with the symbol and text both sunk 0.5 mm and standing 1 mm above, 3 mm in all. Low, Bold, Flush inlay and Engraved also give the symbol and text the same depth; Flush inlay and Engraved are 0.5 mm deep.
- Same depth for symbol and text: a checkbox in the Depth group, on by default, keeps the symbol and text depths equal; turn it off for separate depths. Saved depth profiles keep this setting.
- The Box divider size preset is removed.
- Labels saved before this version keep their depths.

## 0.1.0 (2026-11-18): First release

- Symbol library from mtg-vectors and Scryfall, with Refresh library, automatic first download and Scryfall icons for sets without a symbol.
- Sets panel with search, sorting and filters, and a Lands and watermarks view.
- Labels built automatically from a set, land or watermark, with five arrangements, auto-fit and wrapping of long names.
- Saved arrangements, a default arrangement, size presets and depth profiles.
- Detailed, silhouette and two-tone symbols in any rarity.
- Text lines from set data or custom text, 33 built-in fonts.
- Filament palette with saved color sets.
- 2D layout and 3D preview, light and dark theme, dark work surface.
- Export to a Bambu Studio and OrcaSlicer 3MF project, standard 3MF, STL and STL per color.
- Accounts, saved labels and preferences on the server; undo and redo.
- Docker image for Dockhand with the About guide built in.
