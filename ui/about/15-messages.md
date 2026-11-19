# Messages

## Warnings on the label

Warnings appear in amber boxes at the top of the Properties panel, and their number in the status bar. The label is still built and can be exported.

| Message | Cause | What to do |
|---|---|---|
| The symbol file could not be loaded. Refresh the library or pick another rarity. | The symbol file is missing from the library, or the server could not be reached | Refresh the library, or choose another rarity |
| The library has no mana symbols yet. Refresh the library to download them. | A mana row is used and the library was downloaded before version 0.3.0 | Refresh the library |
| The mana symbol X could not be loaded. Refresh the library. | The symbol file is missing from the library | Refresh the library, or choose another symbol |
| This set has no symbol in the library. | Neither mtg-vectors nor Scryfall has a symbol for the set | Use another set, or remove the symbol item |
| The set X has no symbol in the library. / The set X is not in the library. | A symbol item or symbol grid names a set without a symbol, or a code that is not a set | Check the set code |
| An uploaded symbol is no longer on the server. Pick another symbol. | The uploaded SVG of a symbol item was deleted | Upload it again, or choose another source |
| An uploaded symbol could not be loaded. | The uploaded file could not be read | Upload it again |
| No fonts are available. | The font list could not be loaded | Reload the page |
| The font could not be loaded. | The font file could not be downloaded | Reload the page, or choose another font |
| This symbol has no separate border, so two-tone prints it in one color. | Two-tone is on for a symbol drawn as a single shape | Use Detailed or Silhouette |
| The text is X mm, smaller than the Y mm minimum. Shorten the text, make the label larger or lower the minimum. | The text had to shrink below the minimum to fit its area | Shorten or remove lines, enlarge the text area or the label, or lower the minimum |
| An element is sunk deeper than the base allows; it keeps 0.2 mm of base under it. | Sunk is more than the base thickness minus 0.2 mm | Lower Sunk or thicken the base |
| The front and back are sunk deeper than the divider allows; 0.2 mm of plate is kept between them. | On a divider, the front and back depths add up to more than the thickness minus 0.2 mm | Lower one of the depths or make the divider thicker |
| Symbol (or Text) has no height, so it is not printed. Raise it or sink it into the base. | Above and Sunk are both 0 and Engrave is off | Give the element a height or a depth |
| The label could not be built: ... | An unexpected problem with a symbol or font file | Try another rarity, symbol style or font |

## Library refresh

Shown in the Refresh library window. The current library stays in use after every one of these.

| Message | Cause |
|---|---|
| could not download the symbols from GitHub: ... | GitHub could not be reached or refused the download (for example its limit of downloads per hour) |
| could not read the symbols download: ... | The download was cut off or damaged |
| the symbols download held no set symbols | The repository in `TOPLABEL_VECTORS_REPO` has no `svg/optimized/set` folder |
| could not download the set list from Scryfall: ... | Scryfall could not be reached |
| could not read the Scryfall set list: ... / the Scryfall set list was empty | Scryfall answered with something unexpected |
| could not download the mana symbols from Scryfall: ... / could not read the Scryfall mana symbols: ... / the Scryfall mana symbols could not be downloaded | Scryfall could not be reached or answered with something unexpected |
| the download is larger than expected | The download is over 400 MB |
| A library refresh is already running. | Someone else started a refresh; the window follows it |

Missing Scryfall icons do not stop a refresh; those sets show "No symbol".

## Confirmations

| Question | Asked when |
|---|---|
| This label has changes that are not saved. Continue without saving? | Starting a new label, opening another one, opening a demo or signing out with unsaved changes |
| Reset this label to the default size, arrangement, depth and text? The chosen set stays. | Edit, Reset label to defaults (the arrangement is the default layout) |
| Delete the saved label "name"? This cannot be undone. | Deleting a saved label |
| Replace the saved layout "name"? / Replace the saved preset "name"? | Saving under a name that exists |
| Delete the saved layout "name"? / Delete the saved preset "name"? | Deleting a saved layout or preset |
| Delete the upload "name"? Labels that use it will show a warning. | Deleting an upload in Library, Uploads |

## Other messages

| Message | Cause |
|---|---|
| Enter a name. | Saving without a name |
| Enter a number of 0 or more | A number field in the Properties panel got text or a negative number; the old value stays |
| Width and height must be at least 5 mm, the base at least 0.2 mm, and the scale above 1%. | The Size dialog got values outside these limits |
| Nothing to undo / Nothing to redo | The undo or redo history is empty |
| Nothing to export | The label has no parts |
| Save the label first | Renaming a label that is not saved |
| This label is not saved | Deleting a label that is not saved |
| No saved labels yet | Opening when nothing is saved |
| Save the layout first | Make default for a Custom layout |
| Open a divider first | Save divider shape while a label is open |
| The back is shown for dividers | Back of the divider (2D) while a label is open |
| Choose a file. / Choose at least one set. | Uploading without a file; Export many sets without a set |
| The file is not an SVG image. / The SVG is larger than 2 MB. | Upload SVG symbol with a wrong or too large file |
| The file is not a font. Upload a TTF, OTF or WOFF file. / WOFF2 fonts cannot be used. Upload the TTF, OTF or WOFF file of the font. / The font is larger than 8 MB. | Upload font with a wrong or too large file |
| Uploads need the TopLabel server | Uploading in a page opened without the server |
| The library has no sets yet | Export many sets before the library is downloaded |
| Refresh the library first; the demo labels use its symbols | Opening the demos before the library is downloaded |
| That set is not in the library | A demo label's set is missing |
| Could not save in this browser | The page runs without a server and the browser refused to store data |
| Passwords need at least 8 characters. / The new passwords do not match. / The current password is wrong. | Changing the password |
| Wrong user name or password. / That user name is taken. / New accounts are turned off on this server. / Too many attempts. Try again in a few minutes. | Sign-in and sign-up |
| You are signed out. | The sign-in ended; the sign-in page opens |
| The server could not save the change. | The server could not write to its data folder (check the folder's owner) |
