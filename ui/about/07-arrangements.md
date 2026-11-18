# Arrangements and auto-fit

An arrangement decides where the symbol and the text go. TopLabel then sizes both to fit, so the same arrangement works for every set and every label size.

## Built-in arrangements

| Arrangement | Layout | Margin | Gap | Text area | Symbol size |
|---|---|---|---|---|---|
| Symbol over text | Symbol above, text below | 7 mm | 4 mm | 27% | 90% |
| Text over symbol | Text above, symbol below | 7 mm | 4 mm | 27% | 90% |
| Symbol only | Symbol fills the label | 7 mm | | | 90% |
| Text only | Text fills the label | 7 mm | | | |
| Symbol beside text | Symbol left, text right, for wide labels | 6 mm | 4 mm | 55% | 90% |
| Divider band | Symbol left, text right, inside a divider's top band | 1.5 mm | 2 mm | 78% | 90% |

New labels use the default arrangement, Symbol over text unless another one was made the default. New dividers use Divider band. On a divider, every arrangement is applied inside its top band.

## Areas

1. The inner area is the label minus the margin on every side.
2. Symbol over text: the text area is the bottom part of the inner area, its height the text area percentage of the inner height. The symbol area is the rest above it, minus the gap.
3. Text over symbol: the same, mirrored, with the text at the top.
4. Symbol beside text: the text area is the right part of the inner area, its width the text area percentage of the inner width. The symbol area is the rest on the left, minus the gap.
5. Symbol only and Text only: the element uses the whole inner area.

When the symbol is hidden (or the set has none), the text uses the whole inner area; when the text is hidden or empty, the symbol does. Symbol only leaves the text out, and Text only leaves the symbol out.

The 2D layout shows the areas when Layout guides is on: the inner area in white, the symbol area in blue and the text area in orange.

## Fitting the symbol

The symbol is scaled to the largest size that fits inside its area times the symbol size percentage, keeping its proportions, and centred in its area.

Example: a 76 x 100 mm label with Symbol over text. The inner area is 62 x 86 mm. The text area is 27% of 86 = 23.22 mm high, so the symbol area runs from 23.22 + 4 mm above the inner bottom to the inner top: 62 x 58.78 mm. At 90% the symbol must fit in 55.8 x 52.9 mm. A symbol twice as wide as it is high becomes 55.8 x 27.9 mm; a tall symbol becomes 52.9 mm high.

## Fitting the text

1. Every line is measured at the chosen text size.
2. A line wider than the text area is split in two: at the first colon (the colon is dropped), else at the first spaced hyphen, else between the two words that make the two halves most even. "Avatar: The Last Airbender" becomes "Avatar" and "The Last Airbender".
3. The lines are stacked with the line spacing and aligned left, centre or right.
4. If the block is wider or higher than the text area, it is scaled down by the smaller of the two ratios: scale = min(1, area width / block width, area height / block height).
5. The block is centred vertically in the text area.

The text size actually used is shown in the work area header. When it is smaller than the Minimum, a warning says so; the text is still placed at the smaller size.

Example: the area is 62 x 23.22 mm and three lines at 7 mm make a block 58 x 24.5 mm. The scale is min(1, 62 / 58, 23.22 / 24.5) = 0.948, so the text is printed at 7 x 0.948 = 6.64 mm.

## Saving arrangements

Label, Save arrangement (or Save in the Arrangement group) keeps the current layout, margin, gap, text area and symbol size under a name. With "Also keep the text settings" on, it also keeps the text lines, font, bold, italic, capitals, size, minimum, spacing and alignment. Saved arrangements:

- are shared with everyone on the server,
- never hold the set, symbol, colors or depth, so they work with any set,
- replace an existing saved arrangement with the same name after asking,
- are listed in the Arrangement list with "(saved)".

**Make default** makes the arrangement selected in the Arrangement list the one new labels start with, using its built-in or saved values. To make changed values the default, save the arrangement first; for an arrangement that is not in the list, Make default opens Save arrangement. The default is kept per user. Label, Manage arrangements lists the saved arrangements with the default marked, and deletes them after asking. Deleting the default arrangement makes Symbol over text the default again.

Changing a value in the Arrangement group changes the open label only; the saved arrangement keeps its values until it is saved again.
