# Export

Export turns the open label into a file for the slicer. The Bambu 3MF and STL buttons on the Home tab export straight away; File, Export (Ctrl+E) opens the Export dialog, and the Export menu has one item per format.

## Formats

| Format | File | Contents |
|---|---|---|
| Bambu Studio and OrcaSlicer project | .3mf | One object with one part per element (Base, Symbol or Symbol outline and Symbol fill, Text), each on its filament slot, placed in the middle of the printer bed, with a preview image. Opens with the parts already assigned to their filaments. |
| Standard 3MF, one object per part | .3mf | One object per part, each with its palette color, all in place on the bed. For PrusaSlicer, Cura and other slicers; PrusaSlicer offers to load them as one object with several parts. |
| STL, one combined mesh | .stl | Every part in one binary STL. For single-color printing or for slicers without 3MF. |
| STL, one file per color | .zip | One binary STL per filament slot, named with the slot number and color name. All files share the same origin, so they line up when loaded together. |

Sizes are in millimetres. The label lies flat with its base on the bed and its top facing up.

## Export dialog

| Option | Default | Notes |
|---|---|---|
| Format | Bambu Studio and OrcaSlicer project | Remembered for the Export dialog |
| Printer bed | Bambu Lab H2D (350 x 320) | Where the 3MF places the label: Bambu Lab H2D, Bambu Lab X1, P1, P2, Bambu Lab A1, Bambu Lab A1 mini, Prusa MK4 |
| Include filament colors in the Bambu 3MF | On | Writes the palette colors into the project so the slicer shows them. Turn off to keep the filament colors already set up in the slicer. |
| File name | {code} - {name} | {code} is the set code, {name} the set name (or the label name), {rarity} the symbol rarity. Characters that cannot be in a file name are removed. |

The options are kept per user.

## What the export contains

The export uses the label as currently built, including parts hidden in the views. A label is rebuilt before export if a change is still being processed. Engraved elements are cut into the base and are not separate parts.
