# Colors and filament slots

Every part of a label is assigned a filament slot. The slot number is the filament the slicer prints that part with: a part on slot 2 prints with the second filament. The colors show the parts in the views and are written into the 3MF exports.

## Default palette

| Slot | Name | Color |
|---|---|---|
| 1 | Black | `#161616` |
| 2 | White | `#FFFFFF` |
| 3 | Red | `#C12E1F` |
| 4 | Blue | `#0078BF` |
| 5 | Yellow | `#F4EE2A` |
| 6 | Purple | `#443089` |
| 7 | Green | `#057748` |
| 8 | Grey | `#A6A9AA` |

New labels use slot 1 for the base, slot 2 for the symbol and the text, and slot 3 for the fill of a two-tone symbol.

## Filament colors dialog

Label, Filament colors opens the palette:

- Change a slot's color with its color box and its name in the text field.
- Add slot adds a slot (up to 16); the cross removes a slot (at least one stays).
- Default colors restores the palette above.
- Type a name and select Save set to keep the palette as a color set, shared with everyone on the server. Load a saved set replaces the palette with a saved one.
- OK applies the palette. The palette is kept per user.

Labels store slot numbers, not colors, so changing the palette recolors every label. If a label uses a slot the palette no longer has, the first slot's color is shown.

## Automatic colors

- Basic lands take the slot closest in color to the land's color.
- A two-tone symbol whose outline and fill would share a slot takes, for the fill, the slot closest to the rarity color (gold for rare, orange for mythic, silver for uncommon, purple for timeshifted and special).

"Closest" means the smallest difference in red, green and blue.
