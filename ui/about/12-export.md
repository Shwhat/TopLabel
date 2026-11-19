# Export

Export turns the open label into a file for the slicer, a drawing program or a picture. The Bambu 3MF and STL buttons on the Home tab export straight away; File, Export (Ctrl+E) opens the Export dialog, and the Export menu has one item per format. Export many sets (Ctrl+Shift+E) makes the open label's design for many sets at once.

## Formats

| Format | File | Contents |
|---|---|---|
| Bambu Studio and OrcaSlicer project | .3mf | One object with one part per element (Base, Symbol or Symbol outline and Symbol fill, Text), each on its filament slot, placed in the middle of the printer bed, with a preview image. Opens with the parts already assigned to their filaments. |
| Standard 3MF, one object per part | .3mf | One object per part, each with its palette color, all in place on the bed. For PrusaSlicer, Cura and other slicers; PrusaSlicer offers to load them as one object with several parts. |
| STL, one combined mesh | .stl | Every part in one binary STL. For single-color printing or for slicers without 3MF. |
| STL, one file per color | .zip | One binary STL per filament slot, named with the slot number and color name. All files share the same origin, so they line up when loaded together. |
| OBJ with colors | .zip | An .obj file with one object per part and an .mtl file with one material per filament slot in its palette color. For modelling programs and slicers that read OBJ. |
| AMF with colors | .amf | One object per part, each with the material of its filament slot (name and color). For PrusaSlicer and other slicers that read AMF. |
| SVG top view | .svg | The label from above at its real size in millimetres: the base, then each part on the front as a filled shape in its color, engraved parts as outlines. For cutting machines, laser cutters and drawings. |
| DXF outlines | .dxf | Every outline as a closed polyline in millimetres (AutoCAD R12 format), the base on the layer BASE and each part on a layer named after it. For CAD and laser cutting. |
| PNG picture of the 3D preview | .png | A picture 1600 pixels wide of the 3D preview as it is turned and zoomed. Without WebGL, a picture of the top view. |

Sizes are in millimetres. The label lies flat with its base on the bed and its top facing up. The SVG and DXF show the front only.

## Export dialog

| Option | Default | Notes |
|---|---|---|
| Format | Bambu Studio and OrcaSlicer project | Remembered for the Export dialog |
| Printer bed | Bambu Lab H2D (350 x 320) | Where the 3MF places the label: Bambu Lab H2D, Bambu Lab X1, P1, P2, Bambu Lab A1, Bambu Lab A1 mini, Prusa MK4 |
| Include filament colors in the Bambu 3MF | On | Writes the palette colors into the project so the slicer shows them. Turn off to keep the filament colors already set up in the slicer. |
| File name | {code} - {name} | {code} is the set code, {name} the set name (or the label name), {rarity} the symbol rarity. Characters that cannot be in a file name are removed. |

The options are kept per user.

## Export many sets

Export many sets makes a copy of the open label for every chosen set, with that set's symbol and text; the size, layout, depth, colors and positions stay the same. The rarity stays when the set has it, otherwise the set's common symbol is used.

| Option | Default | Notes |
|---|---|---|
| Output | One Bambu Studio project (.3mf) | Or One file per set (.zip) |
| Plates in the project | Packed onto the printer bed | Packed: the labels are placed in rows from the top left of the bed, 4 mm apart and 5 mm from the edges, and a new plate starts when a plate is full. One plate per set: each label in the middle of its own plate. |
| Format of the files | STL, one combined mesh | For One file per set: every format except the Bambu project and PNG |
| Printer bed | As in the Export dialog | Bed size used for the plates |
| Sets | The open label's set | The list shows the sets of the Sets panel filter that have a symbol. Filter narrows it by name or code; Choose all shown and Choose none tick or clear the sets shown. |

In the project, each label is one object named with its set code and name, with its parts on their filament slots, and the plates are laid out the way Bambu Studio lays them out. The status bar shows which set is being built. The open label is not changed. The choices are kept per user.

## What the export contains

The export uses the label as currently built, including parts hidden in the views. A label is rebuilt before export if a change is still being processed. Engraved elements are cut into the base and are not separate parts.
