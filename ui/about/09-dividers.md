# Dividers

A divider is a plate that stands in a card drawer between groups of cards. Its solid top band carries the set symbol and text, so it can be read while sorting; the rest is patterned with holes or solid. Dividers use the same sets, symbols, text, fonts, colors and exports as labels.

## Making a divider

1. Pick a set (or a land or watermark) in the Sets panel.
2. Select **New divider** (Home tab, or File, New divider, Ctrl+Shift+N). The divider starts with the set, land or watermark of the open label.
3. Adjust it in the Properties panel and export it like a label.

Picking another set in the Sets panel changes the open divider. Dividers are saved, opened and deleted with the saved labels; the Saved labels panel marks them "divider".

## Shape

The default shape, **Card catalog divider**, is a 71.92 x 72 x 2.16 mm plate. Its upper part is full width; its lower part, the tab, is narrower so it slots into the drawer.

| Field | Default | Notes |
|---|---|---|
| Shape | Card catalog divider | The built-in shape, saved shapes, or Custom |
| Width (mm) | 71.92 | Width of the upper part |
| Height (mm) | 72 | Total height, tab included |
| Thickness (mm) | 2.16 | |
| Corners (mm) | 0.6 | Corner radius of the outline |
| Top edge | Square | Square, Rounded or Chamfered, with Edge size (mm), as on a label; only the front edge, the face on the bed stays square |
| Top band (mm) | 12 | Solid band along the top edge that holds the symbol and text |
| Tab height (mm) | 20.4 | Height of the narrower lower part; 0 for no tab |
| Tab inset (mm) | 2.5 | How much narrower the tab is on each side; 0 for no tab |

Changing any value makes the shape Custom. **Save shape** (Properties panel, Label, Save divider shape, or the Label tab) keeps the outline and the pattern under a name, shared with everyone on the server. Choosing a shape fills in all its values. Label, Manage presets lists and deletes saved divider shapes. Scale in the Size dialog changes the width, height, corners, top band, tab, margins and text size together; the thickness and the pattern stay.

## Pattern

The area below the top band is patterned or solid.

| Pattern | Hole width | Hole height | Columns every | Rows every | Staggered |
|---|---|---|---|---|---|
| Hexagon (default) | 8.28 mm | 6.35 mm | 9.1 mm | 8.06 mm | Yes |
| Circles | 6 mm | 6 mm | 8 mm | 8 mm | Yes |
| Squares | 6 mm | 6 mm | 8 mm | 8 mm | No |
| Diamonds | 7 mm | 7 mm | 5.2 mm | 7.6 mm | Yes |
| Vertical slots | 3 mm | 16 mm | 5.5 mm | 18 mm | No |
| Solid | | | | | |

- **Columns every** and **Rows every** are the distances between hole centres. With **Stagger rows**, every other column is shifted by half a row.
- **Border** (default 2 mm) is the solid edge kept around the pattern. The pattern area runs from the border at the bottom up to the top band, and is as wide as the tab minus the border on each side.
- The pattern is centred in its area. Holes cut off by the edge of the area are kept when at least a quarter of the hole remains; smaller pieces are left solid.
- Choosing another pattern fills in its default sizes and keeps the border.
- The number of holes is shown under the pattern settings.

The 2D layout shows the pattern area in green when Layout guides is on.

## Content

The layout rows are placed in the top band. New dividers use the **Divider band** layout: one row with the set symbol and the set name side by side, 1.5 mm margin and 2 mm gap. Rows and items can be changed like on a label (see [Layout rows and auto-fit](/about/layout)), for example to add a row of mana symbols.

## Faces

| Face | Default | Options |
|---|---|---|
| Front (the top face when printed) | Flush inlay, 0.5 mm | Any depth: raised, flush or engraved (Depth group) |
| Back (the face on the print bed) | Flush inlay, 0.5 mm | Off (front only), Flush inlay or Engraved, with its own depth |

The back carries the same symbol and text as the front, mirrored so they read correctly from behind, in the same colors. It lies on the print bed, so it cannot stand out. Front and back pockets always keep at least 0.2 mm of plate between them; if their depths add up to more, the back is made shallower and a warning says so.

## How a divider is built

The divider is one closed solid with the pattern holes through it and pockets cut into the front and the back. The symbol and text on each face are separate parts on their filament slots. In the 2D layout, **Front** and **Back** at the top of the work area (or View, Front of the divider (2D) and Back of the divider (2D)) choose the face; the back is shown as seen from behind, so its content reads the right way round. The 3D preview shows both faces, and the boxes at the bottom left show or hide each part, including the back ones.
