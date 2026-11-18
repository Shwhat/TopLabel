# Layout rows and auto-fit

The content of a label or divider is a list of rows, from top to bottom. Each row holds one or more items side by side, from left to right. TopLabel sizes every item to fit, so the same layout works for every set and every label size.

## Items

| Item | Shows | Settings |
|---|---|---|
| Set symbol | The symbol of the set, land or watermark | Rarity, style and colors in the Symbol group |
| Text | One or more lines, each from the set name, set code, release year, release date, set type, rarity, card count or custom text | Its lines (Add line, and the cross to remove one) and its Color; font and size in the Text group |
| Set code | A text item that starts with one line, the set code | As Text |
| Mana symbols | Any number of mana symbols in a row, evenly spaced | Each symbol: which symbol, Pip or Icon, and its color. Add adds one, the cross removes one, Preset fills the row. Size (mm) of the symbols, default 8 mm |

## Editing rows

The Layout group of the Properties panel lists the rows:

| Control | Does |
|---|---|
| Height | Empty for Auto, or a percentage of the content area |
| Up and down arrows | Move the row up or down |
| Cross on a row | Remove the row |
| Left and right arrows on an item | Move the item left or right in its row |
| Cross on an item | Remove the item; a row left empty is removed |
| Add to this row | Add a set symbol, text, set code or mana symbols item at the end of the row |
| Add a row | Add a row at the bottom with one item |

Insert, Symbol row, Text row, Set code row and Mana row (and the same commands in the Edit menu: Add a set symbol row, Add a text row, Add a set code row, Add a mana symbols row) add a row at the bottom. Any change to the rows makes the layout Custom.

## Layout settings

| Field | Default | Notes |
|---|---|---|
| Preset | Symbol over text | Built-in and saved layouts; choosing one replaces the rows and the values below |
| Margin (mm) | 7 | Space kept free along every edge (on a divider, inside the top band) |
| Gap (mm) | 3 | Space between rows, and between items in a row |
| Symbol size (%) | 90 | How much of its space the set symbol fills |

Label, Layout opens the same settings as a dialog.

## Built-in layouts

| Preset | Rows | Margin | Gap |
|---|---|---|---|
| Symbol over text | Set symbol / set name / set code | 7 mm | 3 mm |
| Text over symbol | Set name / set code / set symbol | 7 mm | 3 mm |
| Symbol only | Set symbol | 7 mm | 3 mm |
| Text only | Set name / set code | 7 mm | 3 mm |
| Symbol beside text | Set symbol + text with the set name and set code | 6 mm | 4 mm |
| Divider band | Set symbol + set name | 1.5 mm | 2 mm |

New labels use the default layout, Symbol over text unless another one was made the default, with its text settings when it keeps them. New dividers use Divider band.

## Row heights

1. The content area is the label minus the margin on every side; on a divider it is the top band minus the margin.
2. A row with a percentage gets that share of the content area height.
3. A text row gets the height its lines need at the chosen text size (long lines wrapped), and a mana row the height of its symbols.
4. Rows with a set symbol share the height that is left. They always keep at least 30% of the space; when the other rows need more, those rows are made smaller in proportion.
5. When no row has a set symbol, the space left over is shared out among the automatic rows, and every row is centred in its height.

Example: a 76 x 100 mm label with Symbol over text. The content area is 62 x 86 mm with two 3 mm gaps, leaving 80 mm. "Kamigawa: Neon Dynasty" wraps to two lines at 7 mm with 1.15 spacing (16.1 mm); "NEO" needs 8.05 mm. The symbol row gets 80 - 16.1 - 8.05 = 55.85 mm.

## Widths in a row

1. A set symbol takes the width it needs at the row height (its proportions times the row height); mana symbols take their count times their size, plus a quarter of their size between each.
2. Text items share the rest equally. Text always keeps at least a quarter of the row; when symbols need more, they are made narrower.
3. A row without text is centred.

## Fitting

- **Set symbol:** scaled to the largest size that fits its space times the symbol size percentage, keeping its proportions, and centred.
- **Text:** a line wider than its space is split in two: at the first colon (the colon is dropped), else at the first spaced hyphen, else between the two words that make the two halves most even. The lines are stacked with the line spacing and aligned left, centre or right. If the block is wider or higher than its space it is scaled down: scale = min(1, space width / block width, space height / block height). Each text item is fitted on its own, so the set code can stay larger than a long set name. The size actually used (of the first text item) is shown in the work area header; when any text is smaller than the Minimum, a warning says so.
- **Mana symbols:** the symbol size is the item's Size, or smaller when the row is lower or narrower than the symbols need. They are centred in their space.

The 2D layout shows each item's space when Layout guides is on: set symbols in blue, text in orange and mana in violet, inside the content area in white.

## Mana symbols

The mana symbols come from Scryfall with the library (see [Sets and the symbol library](/about/sets-and-library)).

| Style | Prints |
|---|---|
| Pip | The round symbol with its icon cut out of it |
| Icon | Only the icon shape |

Each symbol has its own style and color. A new symbol takes the palette slot closest to its color: white on the yellow slot, blue on blue, black on purple (so it shows on a black base), red on red, green on green; colorless, generic and other symbols on grey. Hybrid symbols take the color of their first half. Choosing another symbol resets its color the same way.

| Preset group | Presets |
|---|---|
| Colors | White, Blue, Black, Red, Green, Colorless, All five colors |
| Guilds | Azorius (W U), Dimir (U B), Rakdos (B R), Gruul (R G), Selesnya (G W), Orzhov (W B), Izzet (U R), Golgari (B G), Boros (R W), Simic (G U) |
| Shards | Bant (G W U), Esper (W U B), Grixis (U B R), Jund (B R G), Naya (R G W) |
| Wedges | Abzan (W B G), Jeskai (U R W), Sultai (B G U), Mardu (R W B), Temur (G U R) |

A preset replaces the symbols of the row with pips in their default colors. Mana symbols use the symbol depth. In the exports, mana symbols of the same color are one part, named "Mana, slot" and the slot number.

## Saving layouts

Label, Save layout (or Save in the Layout group) keeps the rows with all their items, lines, colors and mana symbols, the margin, gap and symbol size under a name. With "Also keep the text settings" on, it also keeps the font, bold, italic, capitals, size, minimum, spacing and alignment. Saved layouts:

- are shared with everyone on the server,
- never hold the set, the symbol's rarity and colors, or the depth, so they work with any set,
- replace an existing saved layout with the same name after asking,
- are listed in the Preset list with "(saved)".

**Make default** makes the layout selected in the Preset list the one new labels start with. To make changed rows the default, save the layout first; for a Custom layout, Make default opens Save layout. The default is kept per user. Label, Manage layouts lists the saved layouts with their rows and the default marked, and deletes them after asking. Deleting the default layout makes Symbol over text the default again.

Labels and saved layouts from versions before 0.3.0 are converted to rows when they are opened: the symbol and the text lines keep their order and colors.
