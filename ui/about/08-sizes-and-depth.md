# Sizes and depth

This page covers label sizes and how the parts of a label are stacked in height.

## Size presets

| Preset | Width | Height | Base |
|---|---|---|---|
| Toploader replacement | 76 mm | 100 mm | 2 mm |
| Card size | 63 mm | 88 mm | 2 mm |
| Small card | 59 mm | 86 mm | 2 mm |
| Square tile | 50 mm | 50 mm | 2 mm |
| Mini tile | 35 mm | 35 mm | 2 mm |

Any width, height and base thickness can be typed in; the preset then shows the matching preset or Custom. Label, Save size preset keeps the current width, height and base under a name, shared with everyone on the server.

## Depth

Each element has three depth values:

| Value | Meaning |
|---|---|
| Above | How far the element stands up from the top of the base |
| Sunk | How deep the element goes into the base. The base gets a pocket of that shape and depth, and the element fills it. |
| Engrave | The pocket is cut, but the element is not printed, leaving the shape as a recess |

The element runs from (base thickness minus sunk) to (base thickness plus above). It always keeps at least 0.2 mm of base under it.

Example with the Standard profile on a 2 mm base: the symbol and the text each run from 1.5 to 3 mm, filling a 0.5 mm pocket in the base and standing 1 mm above it. The label is 3 mm tall, 15 layers at 0.2 mm.

## Depth profiles

| Profile | Base | Symbol and text |
|---|---|---|
| Standard (default for labels) | 2 mm | 0.5 mm sunk, 1 mm above |
| Low | 1.6 mm | 0.4 mm sunk, 0.6 mm above |
| Bold | 2 mm | 0.5 mm sunk, 1.5 mm above |
| Flush inlay (default for dividers) | 2 mm | 0.5 mm sunk, flush with the top |
| Engraved | 2 mm | 0.5 mm engraved |

Every built-in profile gives the symbol and the text the same depth. **Same depth for symbol and text** (on by default) keeps them equal; turn it off to give each its own values.

Choosing a profile also sets the base thickness of a label; a divider keeps its thickness. Changing any depth value or the base selects the matching profile, or Custom. Label, Save depth profile keeps the base, all depth values and the Same depth setting under a name, shared on the server. Label, Manage presets lists saved sizes, depth profiles and color sets, and deletes them after asking.

## How the parts are built

- Every part is a closed solid: the base, the symbol (or its outline and fill in two-tone) and the text.
- The base is one solid with the pockets cut into it (and, on dividers, the pattern holes through it). When pockets overlap each other or reach the edge of the label, the base is built as stacked layers instead.
- Elements are trimmed to the label outline, and with a rounded or chamfered top edge to the flat part of the top face.
- **Top edge.** A rounded or chamfered edge steps in from the full outline to the top face in steps of about 0.1 mm of height (2 to 12 steps). Rounded follows a quarter circle, chamfered a straight 45 degree line for an equal size. The bottom of the base stays square so it lies flat on the bed. The steps are finer than a print layer, so the slicer prints them as a smooth edge.
- An element with no height (above and sunk both 0, not engraved) is not printed and a warning says so.
