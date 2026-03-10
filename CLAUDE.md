# MH4U Database — PWA

Static PWA porting the iOS app at `~/dev/mh4udb` (read-only reference).
Serve with: `python3 -m http.server 8080` → http://localhost:8080

## Stack
- Vanilla JS ES modules, no build step
- **sql.js** (WASM) loads `mh4u.db` in-browser via `js/db.js`
- Hash routing: `#/monsters`, `#/monsters/42`, `#/weapons/Great%20Sword`
- Service worker (`sw.js`) for full offline support

## Key Files
```
index.html          — app shell, loads sql-wasm.js CDN + js/app.js
js/app.js           — nav, routing, event binding
js/db.js            — initDB(), query(), queryOne()
js/router.js        — hash-based router
js/pages/utils.js   — shared helpers: esc(), img(), weaponIconPath(), sharpnessBar(), etc.
js/pages/*.js       — one file per section, each exports render fns → { html, title }
css/main.css        — all styles, CSS custom properties
sw.js               — service worker (cache-first)
```

## Sections
home, monsters, weapons, armor, items, quests, locations, decorations, skills, combining, canteen, wyporium, veggie-elder, armor-search, talismans

## DB Schema Notes
- `weapons` has no `name` — JOIN `items` on `_id` for name/rarity/icon_name
- `armor` same — JOIN `items` on `_id`
- `monster_habitat` columns: `start_area`, `move_area`, `rest_area` (not `area`)
- `monster_weakness` has a `state` column (Normal/Enraged)
- `hunting_rewards.rank` values: LR / HR / G

## Icon Paths
- Monsters: `icons/icons_monster/{icon_name}` (from DB)
- Items: `icons/icons_items/{icon_name}` (from DB)
- Weapons: `icons/icons_weapons/icons_{type_folder}/{type_folder}{rarity}.png`
- Armor: `icons/icons_armor/icons_{slot_lower}/{slot_lower}{rarity}.png`
- Locations: `icons/icons_location/{map}` (from DB)

## Page Module Pattern
```js
import { query, queryOne } from '../db.js';
export async function renderFoo(id) {
  // ...
  return { title: 'Foo', html: `...` };
}
// Optional: return afterRender() for post-render JS (event listeners, etc.)
```

## Routing Note
Weapon tree URLs pass type as string (`/weapons/Great%20Sword`).
`app.js` decodes: `isNaN(+id) ? decodeURIComponent(id) : +id` before passing to `renderWeaponDetail`.

## Dev Tip
Chrome aggressively caches ES modules. After editing JS, open a **new tab** on a different port or clear module cache via DevTools → Application → Cache Storage.
