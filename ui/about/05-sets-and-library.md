# Sets and the symbol library

This page covers where the symbols and set information come from, how the library is refreshed and how to use the Sets panel.

## Sources

| Source | Provides |
|---|---|
| mtg-vectors (github.com/Investigamer/mtg-vectors) | Set symbols, one SVG file per rarity for each symbol, the watermarks (including the basic land symbols), and the lists that match set codes to symbols |
| Scryfall (scryfall.com) | Every set with its name, code, release date, set type, card count and set icon |

The repository the symbols come from is the server setting `TOPLABEL_VECTORS_REPO`.

## Refresh library

Library, Refresh library (or the Refresh library button) downloads everything again:

1. The newest mtg-vectors files from GitHub (set symbols, watermarks and the code lists).
2. The set list from Scryfall.
3. The Scryfall icon of every set that has no mtg-vectors symbol.
4. The new library replaces the old one.

A window shows each step. It can be closed; the refresh continues on the server. Only one refresh runs at a time. If any step fails, the old library stays in use and the window shows why. When a new server starts with no library, it runs a refresh by itself (server setting `TOPLABEL_AUTO_REFRESH`).

Library, Library information shows when the library was downloaded, how many sets it lists, how many have an mtg-vectors symbol, a Scryfall icon or no symbol, and how many symbol files, watermarks and fonts it holds.

## How a set finds its symbol

For each Scryfall set TopLabel looks for an mtg-vectors symbol in this order, and uses the first one that exists:

1. The symbol the mtg-vectors routes list names for the set code.
2. The mtg-vectors alias of the set's Scryfall icon code.
3. The Scryfall icon code itself (for example the promo set PNEO uses the NEO icon, so it gets the NEO symbol).
4. The mtg-vectors alias of the set code.
5. The set code itself.

If none exists, the Scryfall icon is used. Scryfall icons are a single shape with no rarity versions. A set with neither shows "No symbol".

## Rarities

mtg-vectors keeps one file per rarity. A label can use any rarity the symbol has:

| Code | Rarity |
|---|---|
| C | Common |
| U | Uncommon |
| R | Rare |
| M | Mythic |
| S | Special |
| T | Timeshifted |
| WM | Watermark |
| Other | Shown as "Variant" with the file name, for example Variant 80 |

When a new set is chosen and it does not have the rarity the label used, the label switches to Common, or to the first rarity the set has.

## Sets panel: Sets

| Control | Does |
|---|---|
| Search box | Shows sets whose name or code contains the text. An exact code match is listed first. Press / to jump here. |
| Set type list | Main sets (core, expansion, masters, draft innovation, commander, funny, starter, eternal and similar), All set types, or one type |
| Year list | Any year, or one release year |
| With symbol | Hides sets that have no symbol |
| Column headings | Click Code, Name or Date to sort; click again to reverse |
| Count | Number of sets listed |

Each row shows the symbol, code, name and release date. A "Scryfall icon" badge marks sets that use the Scryfall icon; "No symbol" marks sets without one. Hover a row for the set type. Click a row to use the set; with the search box selected, Up and Down move through the list and Enter uses the highlighted set.

Using a set sets the label's set, clears the label name so the set name is used, and switches back to text lines from the set if the label only had custom lines.

## Sets panel: Lands and watermarks

| Group | Shows |
|---|---|
| Basic lands | Plains, Island, Swamp, Mountain, Forest and Wastes |
| Watermarks | Every other mtg-vectors watermark (guilds, clans, factions and others) |

Clicking a basic land makes a land label: its symbol in the palette slot closest to the land's color (Plains yellow, Island blue, Swamp purple, Mountain red, Forest green, Wastes grey) and one custom text line with the land name in capitals. Clicking a watermark makes a label with that watermark and its name as text. These labels have no set.
