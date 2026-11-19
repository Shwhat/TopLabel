# Screen layout

TopLabel has a menu bar and ribbon at the top, the Sets panel on the left, the work area in the middle with the Saved labels panel under it, the Properties panel on the right and the status bar at the bottom. The panels can be moved to other sides of the window.

## Menu bar

| Menu | Items |
|---|---|
| File | New label, New divider, Open saved label, Save, Save as, Rename label, Delete saved label, Export, Export Bambu Studio 3MF, Export STL, Export many sets, Change password, Sign out |
| Edit | Undo, Redo, Add a set symbol row, Add a text row, Add a set code row, Add a mana symbols row, Add a symbol grid row, Reset label to defaults |
| Label | Size, Layout, Save layout, Make layout the default, Manage layouts, Depth, Save depth profile, Save size preset, Save divider shape, Manage presets, Filament colors, Two-tone symbol on or off |
| Library | Refresh library, Library information, Fonts, Upload SVG symbol, Upload font, Uploads, Show sets, Show lands and watermarks |
| Export | Export (the dialog), Export many sets, and one item per format |
| View | 2D layout, 3D preview, Both views, Fit the label in the view, Front of the divider (2D), Back of the divider (2D), Layout guides on or off, Dark theme on or off, Dark work surface on or off, show or hide each panel, Reset panel layout |
| Help | Keyboard shortcuts, Open demo labels, About TopLabel |

The name of the open label is shown to the right of the menus, with "(not saved)" for a label that has never been saved and "(changed)" for a saved label with changes. On the server, your user name at the far right opens the account menu: About TopLabel, Change password and Sign out.

## Ribbon

| Tab | Groups and buttons |
|---|---|
| Home | Label: New label, New divider, Save, Save as, Open. Edit: Undo, Redo. Export: Bambu 3MF, STL, Export, Export many. View: 2D layout, 3D preview, Both |
| Label | Size: Size. Layout: Layout, Save layout, Make default. Depth: Depth, Save depth. Divider: Save divider shape. Colors: Filament colors, Two-tone symbol |
| Insert | Rows: Symbol row, Text row, Set code row, Mana row, Symbol grid. Symbols: Sets, Lands and watermarks |
| Library | Library: Refresh library, Library info, Fonts. Uploads: Upload SVG, Upload font, Uploads |
| View | Views: 2D layout, 3D preview, Both, Fit. Divider: Front, Back. Show: Layout guides, Panels, Reset panels. Theme: Dark theme, Dark work surface |
| Help | About, Shortcuts, Demo labels |

Buttons that switch something on or off are highlighted while it is on. The chosen tab is remembered.

## Sets panel

The Sets panel has two views, chosen at its top: **Sets** and **Lands and watermarks**. See [Sets and the symbol library](/about/sets-and-library).

## Work area

The header shows the label name, its set code and date, the layout, the text size used, the symbol size and the number of mana symbols. On the right, the view switch chooses **2D layout**, **3D preview** or **Both**, **Front** and **Back** (dividers only) choose which face the 2D layout shows, and **Fit** brings the whole label back into view.

| View | Shows |
|---|---|
| 2D layout | The label from above in its filament colors, with its width and height. Layout guides show the margin (white), the symbol area (blue), the text area (orange) and, on dividers, the pattern area (green). Engraved parts are shown darker. Items can be picked, moved, scaled and turned here (see [Layout rows and auto-fit](/about/layout)). For a divider, Back shows the back face as seen from behind. |
| 3D preview | The label as it will print. Drag to turn it, right drag or Shift drag to move it, and use the wheel to zoom. The boxes at the bottom left show or hide each part. |

## Properties panel

The Properties panel shows the open label: its name and set at the top, warnings in amber boxes, then the groups Label, Layout (with the rows), Symbol, Text, Depth and Colors. For a divider, the Label group is replaced by Divider and Pattern, and a Back face group follows Depth (see [Dividers](/about/dividers)). Every change applies at once and can be undone. In number fields, the Up and Down arrow keys and the small arrow buttons change millimetre values by 0.1, percentages by 1 and line spacing by 0.05. The fields are described in [Labels and elements](/about/labels-and-elements).

## Saved labels panel

Lists the labels saved under your account with their set, size, layout and when they were saved. Click a row to open that label; Delete removes it after asking.

## Panels

The three panels (Sets, Properties, Saved labels) sit in three docks: left, right and bottom. Each panel has a tab with its name at the top of its dock.

| Action | Does |
|---|---|
| Drag a panel's tab to another dock | Moves the panel there; while dragging, every dock is shown and the one under the pointer is highlighted |
| The arrows button on a tab | Menu: Move to the left, right or bottom, or Hide this panel |
| Click a tab | Shows that panel when a dock holds more than one; they share the dock as tabs |
| Drag the inner edge of a dock | Resizes it |
| View, Hide or Show each panel, or the Panels button | Hides and shows the panels |
| View, Reset panel layout, or Reset panels | Puts every panel back in its first place and shows it |

Where each panel is, which tab is in front, sizes and visibility are remembered per user.

## Status bar

| Item | Shows |
|---|---|
| Size | Width and height of the label and its total height |
| Parts | Number of parts and triangles, or "Building..." while the label is being rebuilt |
| Warnings | Number of warnings; click to show them in the Properties panel |
| Library | When the library was downloaded and how many sets it has |
| Message | Short confirmation of the last action, at the right |

## About screen

Help, About TopLabel opens this guide in the work area. Close it with Escape or Close.
