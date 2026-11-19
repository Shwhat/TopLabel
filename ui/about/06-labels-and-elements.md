# Labels and elements

A label is a flat base with its content in rows: set symbols, text, the set code, mana symbols and symbol grids. This page lists every field of a label as shown in the Properties panel. Dividers have the same Symbol, Text, Depth and Colors fields; their shape fields are on the [Dividers](/about/dividers) page.

## Label

| Field | Type | Default | Notes |
|---|---|---|---|
| Name | Text | Empty | Shown in the title and used when saving. When empty, the set name is used. |
| Size | List | Toploader replacement | Size presets; choosing one fills in width, height and base. See [Sizes and depth](/about/sizes-and-depth). |
| Width (mm) | Number | 76 | At least 5 mm |
| Height (mm) | Number | 100 | At least 5 mm |
| Base (mm) | Number | 2 | Thickness of the base, at least 0.2 mm |
| Corners (mm) | Number | 0 | Corner radius; 0 is square |
| Top edge | List | Square | Square, Rounded or Chamfered: the edge around the top face of the base |
| Edge size (mm) | Number | 0.5 | Only for Rounded and Chamfered; how far the edge reaches in and down. At most the base thickness less 0.1 mm. |

Scale opens the Size dialog, where the whole label can be scaled by a percentage: width, height, corner radius, margin, gap and text size change together; the base thickness stays. Save size keeps the current size as a preset.

Changing the width, height or base selects the matching size preset, or Custom.

## Layout

The rows of the label, their items and the margin, gap and symbol size. See [Layout rows and auto-fit](/about/layout).

## Symbol

The label's own symbol. Symbol items with another source (another set, a land or watermark, an uploaded SVG) and symbol grids have their own style and colors in the Layout group.

| Field | Type | Default | Notes |
|---|---|---|---|
| Source | Shown only | | The mtg-vectors folder, Scryfall icon, watermark, or that there is no symbol |
| Rarity | List | Common | Only for sets with an mtg-vectors symbol; lists the rarities the symbol has |
| Style | List | Detailed | Detailed, Silhouette with border or Two-tone (below) |
| Color / Outline color | Slot | 2 | Filament slot of the symbol, or of its outline in two-tone |
| Fill color | Slot | 3 | Two-tone only: filament slot of the symbol itself |

### Symbol styles

mtg-vectors symbols are drawn as a border shape (black, or white for commons) with the symbol on top. TopLabel works out what is visible when the file is drawn:

| Style | Prints |
|---|---|
| Detailed | The symbol itself without its border: the colored parts of rare, mythic, uncommon and similar symbols, or the black parts of common symbols. Inner details show as gaps. |
| Silhouette with border | The whole outline, border included, as one solid shape |
| Two-tone | Two parts: the border and the gaps inside the symbol in the outline color, and the symbol in the fill color |

A symbol without a separate border (most watermarks and Scryfall icons) prints the same in every style. When two-tone is switched on and both parts would use the same slot, the fill takes the slot whose color is closest to the rarity color.

## Text

| Field | Type | Default | Notes |
|---|---|---|---|
| Font | List | Comic Neue | See [Fonts](/about/fonts) |
| Bold | Check | On | |
| Italic | Check | Off | |
| All capitals | Check | Off | Shows every line in capitals |
| Size (mm) | Number | 7 | Font size (the height of the font's em square), at least 0.5 mm; text is never larger, and smaller when it has to fit |
| Minimum (mm) | Number | 3 | Below this size the label shows a warning |
| Line spacing | Number | 1.15 | Distance between baselines as a multiple of the size, 0.7 to 3 |
| Alignment | List | Center | Center, Left or Right within each text item's space |
| New text color | Slot | 2 | Filament slot new text items start with; each text item has its own Color in the Layout group |

### Line sources

Every line of a text item comes from one of these sources:

| Source | Shows |
|---|---|
| Set name | The Scryfall set name; for a label without a set, the label name |
| Short set name | A shorter set name (below); for a label without a set, the label name |
| Set code | The set code, for example NEO |
| Release year | For example 2022 |
| Release date | For example 2022-02-18 |
| Set type | For example Expansion |
| Rarity | The rarity name of the symbol used (sets with an mtg-vectors symbol) |
| Card count | For example 512 cards |
| Custom text | The text typed in the row |

Lines that come out empty (for example Set code on a land label) are left out, and an item with no lines left is not printed. Long dashes in set names are shown as a hyphen with spaces. Changing a line to Custom text starts it with what the line showed, so it can be edited.

### Short set names

A Short set name line drops a leading "The" and a subtitle after a colon when at least two words are left: "The Lord of the Rings: Tales of Middle-earth" becomes "Lord of the Rings". Names whose first part is one word, such as "Kamigawa: Neon Dynasty", stay whole. To choose the short name of a set yourself, type it into the line; it is kept for that set and used by everyone on the server. Clearing the line, or typing the automatic name, goes back to the automatic short name.

## Depth

See [Sizes and depth](/about/sizes-and-depth).

| Field | Type | Default | Notes |
|---|---|---|---|
| Profile | List | Standard (Flush inlay for dividers) | Built-in and saved depth profiles; choosing one sets the values below and, on labels, the base thickness |
| Same depth for symbol and text | Check | On | While on, one set of fields (Above, Sunk, Engrave) applies to both, and changing it changes both. Turning it off keeps the current values and shows separate fields. Turning it on again gives the text the symbol's values. |
| Symbol above (mm) | Number | 1 | Height of the symbol above the top of the base |
| Symbol sunk (mm) | Number | 0.5 | Depth of the symbol into the base |
| Engrave symbol | Check | Off | Cut the symbol into the base and leave the pocket empty |
| Text above (mm) | Number | 1 | |
| Text sunk (mm) | Number | 0.5 | |
| Engrave text | Check | Off | |

Labels saved before version 0.2.0 keep their depths; Same depth for symbol and text is on for them only when their symbol and text depths are already equal.

## Colors

| Field | Type | Default | Notes |
|---|---|---|---|
| Base | Slot | 1 | Filament slot of the base |

## Undo

Every change to the label can be undone (Ctrl+Z) and redone (Ctrl+Y), up to 150 steps. Opening or starting another label clears the undo history. Changes to filament colors, saved presets and preferences are not part of undo.
