# MH4U Database

A fan-made web app for browsing [Monster Hunter 4 Ultimate](https://en.wikipedia.org/wiki/Monster_Hunter_4) game data — monsters, weapons, armor, quests, items, and more. Works offline as a Progressive Web App.

**[Open the app →](https://joelago.github.io/mh4udb-webv2/)**

---

## Contributing Data Edits

If you spot incorrect data (wrong stats, missing items, typos, etc.), you can fix it yourself — no coding required.

### How to submit a data fix

1. **Open the [DB Editor](https://joelago.github.io/mh4udb-webv2/editor/)** — a browser-based spreadsheet for the game database.

2. **Load the current database** — the editor loads `mh4u.db` automatically from the site. You'll see a list of tables in the sidebar (monsters, weapons, armor, etc.).

3. **Find and edit the data** — click a table, find the row you want to change, and click it to edit. Use the **Search** box to filter rows. Click **Save** when done.

4. **Export the SQL dump** — click the **Export SQL** button in the top toolbar. This downloads a file called `mh4u.sql`.

5. **Submit a Pull Request** — go to the [upload page](https://github.com/joelago/mh4udb-webv2/upload/main), drag in your `mh4u.sql` file, add a short description of what you changed, and click **Propose changes** → **Create pull request**.

That's it! A maintainer will review and merge your fix.

---

## Running Locally

```sh
make              # generates mh4u.db from mh4u.sql
python3 -m http.server 8080
# open http://localhost:8080
```

Requires `sqlite3` on PATH for the `make` step.

## Tech

Vanilla JS + [sql.js](https://sql-js.github.io/sql.js/) (SQLite compiled to WebAssembly). No framework, no build step. Service worker for full offline support.
