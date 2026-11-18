# Labels and elements

A label is a flat base with up to two elements on it: the symbol and a block of text. This page lists every field of a label as shown in the Properties panel.

## Label

| Field | Type | Default | Notes |
|---|---|---|---|
| Name | Text | Empty | Shown in the title and used when saving. When empty, the set name is used. |
| Size | List | Toploader replacement | Size presets; choosing one fills in width, height and base. See [Sizes and depth](/about/sizes-and-depth). |
| Width (mm) | Number | 76 | At least 5 mm |
| Height (mm) | Number | 100 | At least 5 mm |
| Base (mm) | Number | 2 | Thickness of the base, at least 0.2 mm |
| Corners (mm) | Number | 0 | Corner radius; 0 is square |

Scale opens the Size dialog, where the whole label can be scaled by a percentage: width, height, corner radius, margin, gap and text size change together; the base thickness stays. Save size keeps the current size as a preset.

Changing the width, height or base selects the matching size preset, or Custom.

## Arrangement

See [Arrangements and auto-fit](/about/arrangements).

| Field | Type | Default | Notes |
|---|---|---|---|
| Arrangement | List | Symbol over text | Built-in and saved arrangements; choosing one replaces the values below |
| Layout | List | Symbol over text | Symbol over text, Text over symbol, Symbol only, Text only, Symbol beside text |
| Margin (mm) | Number | 7 | Space kept free along every edge |
| Gap (mm) | Number | 4 | Space between the symbol area and the text area |
| Text area (%) | Number | 27 | Share of the label kept for the text, 5 to 95 |
| Symbol size (%) | Number | 90 | How much of its area the symbol fills, 5 to 100 |

## Symbol

| Field | Type | Default | Notes |
|---|---|---|---|
| Show symbol | Check | On | Off leaves the symbol out and gives the text the whole label |
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
| Show text | Check | On | Off leaves the text out and gives the symbol the whole label |
| Lines | List | Set name, Set code | One row per line: where it comes from, and the text for custom lines. The cross removes a line. Add line adds a custom line. |
| Font | List | Comic Neue | See [Fonts](/about/fonts) |
| Bold | Check | On | |
| Italic | Check | Off | |
| All capitals | Check | Off | Shows every line in capitals |
| Size (mm) | Number | 7 | Font size (the height of the font's em square), at least 0.5 mm |
| Minimum (mm) | Number | 3 | Below this size the label shows a warning |
| Line spacing | Number | 1.15 | Distance between baselines as a multiple of the size, 0.7 to 3 |
| Alignment | List | Center | Center, Left or Right within the text area |
| Color | Slot | 2 | Filament slot of the text |

### Line sources

| Source | Shows |
|---|---|
| Set name | The Scryfall set name; for a label without a set, the label name |
| Set code | The set code, for example NEO |
| Release year | For example 2022 |
| Release date | For example 2022-02-18 |
| Set type | For example Expansion |
| Rarity | The rarity name of the symbol used (sets with an mtg-vectors symbol) |
| Card count | For example 512 cards |
| Custom text | The text typed in the row |

Lines that come out empty (for example Set code on a land label) are left out. Long dashes in set names are shown as a hyphen with spaces. Changing a line to Custom text starts it with what the line showed, so it can be edited.

## Depth

See [Sizes and depth](/about/sizes-and-depth).

| Field | Type | Default | Notes |
|---|---|---|---|
| Profile | List | Standard | Built-in and saved depth profiles; choosing one sets the base and the values below |
| Symbol above (mm) | Number | 1 | Height of the symbol above the top of the base |
| Symbol sunk (mm) | Number | 0 | Depth of the symbol into the base |
| Engrave symbol | Check | Off | Cut the symbol into the base and leave the pocket empty |
| Text above (mm) | Number | 0.5 | |
| Text sunk (mm) | Number | 0.5 | |
| Engrave text | Check | Off | |

## Colors

| Field | Type | Default | Notes |
|---|---|---|---|
| Base | Slot | 1 | Filament slot of the base |

## Undo

Every change to the label can be undone (Ctrl+Z) and redone (Ctrl+Y), up to 150 steps. Opening or starting another label clears the undo history. Changes to filament colors, saved presets and preferences are not part of undo.
