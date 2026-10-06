# Vouches

Two parts:

- **`../vouches.json`** — the text of each vouch (who, what they said, when).
  This is the source of truth.
- **this folder** — the screenshots, opened when someone clicks a card.

## Adding or editing a vouch

1. Put the screenshot in **this folder** (e.g. `NewPerson.png`).
2. Add an entry to **`../vouches.json`**:

```json
{
  "name": "NewPerson",
  "date": "8/3/26, 9:50 AM",
  "shot": "NewPerson.png",
  "text": "What they actually said."
}
```

3. From the project folder, run:

```bash
node build-vouches.mjs
```

That rebuilds the vouch cards and prints what it found. Cards appear in the
order they are listed in `vouches.json` (newest first is the current order).

### Fields

| Field  | Required | Notes |
| ------ | -------- | ----- |
| `name` | yes      | Shown as the name above the bubble |
| `text` | yes      | The vouch itself. Use `\n\n` for a paragraph break |
| `date` | no       | Shown at the right of the name |
| `shot` | no       | Screenshot filename in this folder. Omit to show the bubble with no click-to-view |

## Housekeeping

The build script warns about two common mistakes:

- **referenced but not found** — a `shot` filename that is not in this folder
  (exits with an error so it is not missed)
- **not used by any vouch** — an image in this folder that no entry references,
  so you can safely delete it

Files starting with `.` or `_` are ignored, which is handy for hiding drafts.
Supported types: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`
