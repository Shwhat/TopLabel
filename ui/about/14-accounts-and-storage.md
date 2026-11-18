# Accounts and storage

## Accounts

- Everyone signs in with a user name and password. User names are 3 to 32 letters, digits, dots, dashes or underscores, starting with a letter or digit, and are not case sensitive. Passwords need at least 8 characters.
- The first account on a new server can always be created. Further accounts can sign up only when the server setting `TOPLABEL_SIGNUP` is `true`; otherwise the sign-in page shows no Create account tab.
- All accounts can do the same things. There are no roles.
- A sign-in lasts 30 days and is extended while it is used.
- After 5 wrong passwords for a user name, or 30 failed attempts from one address, sign-in is refused for a few minutes.
- File, Change password (or the account menu) asks for the current password and a new one twice. Changing the password signs out every other browser.
- Sign out ends the sign-in in this browser. If the open label has unsaved changes, TopLabel asks first.

## What is saved where

| Data | Kept | Shared |
|---|---|---|
| Saved labels and dividers | On the server, per account | No |
| The open label (including unsaved changes) | On the server, per account, a moment after each change | No |
| Preferences: theme, work surface, view, panels and their sizes, ribbon tab, Sets panel search, filter and sort, export options, palette, default layout | On the server, per account | No |
| Saved layouts | On the server | Yes, everyone on the server |
| Saved size presets, depth profiles, color sets and divider shapes | On the server | Yes |
| Symbol library | On the server | Yes |

When TopLabel opens, it reopens the label that was open last, with its unsaved changes. A label never saved shows "(not saved)" next to its name.

## Saving labels

- Save (Ctrl+S) saves the open label. The first time, it asks for a name; afterwards it updates the saved label.
- Save as saves a copy under a new name and continues with the copy.
- File, Rename label renames the saved label.
- Delete (Saved labels panel, or File, Delete saved label) removes a saved label after asking. The open label stays open as an unsaved label.
- New label, opening another label and signing out ask before discarding unsaved changes.

## On the server

All data lives in the server's data folder (`/opt/toplabel/data` on the Docker host by default):

| Path | Contents |
|---|---|
| `users.json` | Accounts (passwords are stored only as salted hashes) |
| `sessions.json` | Sign-ins (stored only as hashes) |
| `users/<id>/labels.json` | Saved labels and dividers of one account |
| `users/<id>/prefs.json` | Preferences and the open label of one account |
| `shared/arrangements.json` | Saved layouts |
| `shared/presets.json` | Saved sizes, depth profiles, color sets and divider shapes |
| `library/current/` | The symbol library; it can always be downloaded again with Refresh library |

Every file is written to a temporary file first and then renamed, so a crash never leaves half a file.

## Backups

Back up the whole data folder, together with the stack's environment values and `docker-compose.yml`, and keep one copy off the Docker host. A Docker volume is not a backup. To restore, stop the stack, put the folder back with owner 65532 (`sudo chown -R 65532:65532 /opt/toplabel/data`) and start the stack. The `library` folder can be left out of backups.
