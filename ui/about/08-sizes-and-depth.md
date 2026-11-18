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
| Box divider | 70 mm | 95 mm | 1.6 mm |

Any width, height and base thickness can be typed in; the preset then shows the matching preset or Custom. Label, Save size preset keeps the current width, height and base under a name, shared with everyone on the server.

## Depth

Each element has three depth values:

| Value | Meaning |
|---|---|
| Above | How far the element stands up from the top of the base |
| Sunk | How deep the element goes into the base. The base gets a pocket of that shape and depth, and the element fills it. |
| Engrave | The pocket is cut, but the element is not printed, leaving the shape as a recess |

The element runs from (base thickness minus sunk) to (base thickness plus above). It always keeps at least 0.2 mm of base under it.

Example with the Standard profile on a 2 mm base: the symbol runs from 2 to 3 mm; the text runs from 1.5 to 2.5 mm, filling a 0.5 mm pocket in the base and standing 0.5 mm above it. The label is 3 mm tall.

## Depth profiles

| Profile | Base | Symbol | Text |
|---|---|---|---|
| Standard | 2 mm | 1 mm above | 0.5 mm above, 0.5 mm sunk |
| Low | 1.6 mm | 0.6 mm above | 0.4 mm above, 0.4 mm sunk |
| Bold | 2 mm | 1.5 mm above | 1 mm above, 0.5 mm sunk |
| Flush inlay | 2 mm | 0.6 mm sunk, flush with the top | 0.6 mm sunk, flush with the top |
| Engraved | 2 mm | 0.6 mm engraved | 0.6 mm engraved |

Choosing a profile also sets the base thickness. Changing any depth value or the base selects the matching profile, or Custom. Label, Save depth profile keeps the base and all depth values under a name, shared on the server. Label, Manage presets lists saved sizes, depth profiles and color sets, and deletes them after asking.

## How the parts are built

- Every part is a closed solid: the base, the symbol (or its outline and fill in two-tone) and the text.
- The base is one solid with the pockets cut into it. When pockets overlap each other or reach the edge of the label, the base is built as stacked layers instead.
- Elements are trimmed to the label outline.
- An element with no height (above and sunk both 0, not engraved) is not printed and a warning says so.
