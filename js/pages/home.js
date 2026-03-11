import { query } from '../db.js';
import { esc, img, weaponIconPath, armorIconPath, monsterIconPath, itemIconPath } from './utils.js';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function getInstallInfo() {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /chrome/i.test(ua) && !/edg/i.test(ua);
  const isEdge = /edg\//i.test(ua);
  const isFirefox = /firefox/i.test(ua);

  if (isIOS && isSafari) return {
    browser: 'Safari',
    steps: [
      'Tap the <b>Share</b> button (box with arrow) at the bottom of Safari',
      'Scroll down and tap <b>Add to Home Screen</b>',
      'Tap <b>Add</b> — the app will appear on your home screen',
    ],
  };
  if (isIOS) return {
    browser: 'your current browser',
    steps: [
      'Open this page in <b>Safari</b> (required for installation on iOS)',
      'Tap the <b>Share</b> button, then <b>Add to Home Screen</b>',
    ],
  };
  if (isEdge) return {
    browser: 'Edge',
    steps: [
      'Tap the <b>⋯ menu</b> (three dots) at the bottom',
      'Tap <b>Add to phone</b> or <b>Install app</b>',
      'Tap <b>Install</b> to confirm',
    ],
  };
  if (isChrome) return {
    browser: 'Chrome',
    steps: [
      'Tap the <b>⋮ menu</b> (three dots) in the top right',
      'Tap <b>Add to Home screen</b> or <b>Install app</b>',
      'Tap <b>Install</b> to confirm',
    ],
  };
  if (isFirefox) return {
    browser: 'Firefox',
    steps: [
      'Tap the <b>⋮ menu</b> (three dots) in the top right',
      'Tap <b>Install</b>',
    ],
  };
  return {
    browser: 'your browser',
    steps: [
      'Open the <b>browser menu</b> (three dots or share icon)',
      'Look for <b>Install app</b> or <b>Add to Home Screen</b>',
      'Follow the prompts to install',
    ],
  };
}

function installBannerHTML() {
  const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
  if (!isMobile || isStandalone() || localStorage.getItem('install-banner-dismissed')) return '';
  const { browser, steps } = getInstallInfo();
  return `
    <div class="install-banner" id="install-banner">
      <div class="install-banner-row">
        <span class="install-banner-icon">📲</span>
        <div class="install-banner-text">
          <strong>Install as an app</strong>
          <span>Works offline &amp; feels native — tap to see how</span>
        </div>
        <button class="install-banner-close" id="install-banner-close" aria-label="Dismiss">✕</button>
      </div>
      <div class="install-steps" id="install-steps" style="display:none">
        <div style="color:var(--text-dim);font-size:12px;margin-bottom:6px">Instructions for ${browser}</div>
        ${steps.map((s, i) => `<div>${i + 1}. ${s}</div>`).join('')}
      </div>
    </div>`;
}

export async function renderHome() {
  const counts = {
    monsters:    query('SELECT COUNT(*) as c FROM monsters')[0].c,
    weapons:     query('SELECT COUNT(*) as c FROM weapons')[0].c,
    armor:       query('SELECT COUNT(*) as c FROM armor')[0].c,
    items:       query("SELECT COUNT(*) as c FROM items WHERE type NOT IN ('Weapon','Armor','Decoration')")[0].c,
    quests:      query('SELECT COUNT(*) as c FROM quests')[0].c,
    locations:   query('SELECT COUNT(*) as c FROM locations')[0].c,
    decorations: query('SELECT COUNT(*) as c FROM decorations')[0].c,
    skills:      query('SELECT COUNT(*) as c FROM skill_trees')[0].c,
    combining:   query('SELECT COUNT(*) as c FROM combining')[0].c,
    canteen:     query('SELECT COUNT(*) as c FROM food_combos')[0].c,
    wyporium:    query('SELECT COUNT(*) as c FROM wyporium')[0].c,
    veggie:      query('SELECT COUNT(*) as c FROM veggie_elder')[0].c,
  };

  function hcImg(src) { return `<img class="hc-img" src="${src}" alt="">`; }

  const cards = [
    { id: 'monsters',     icon: hcImg('icons/icons_monster/MH4U-Rathalos_Icon.png'),                               label: 'Monsters',     count: counts.monsters },
    { id: 'weapons',      icon: hcImg('icons/icons_weapons/icons_great_sword/great_sword1.png'),                    label: 'Weapons',      count: counts.weapons },
    { id: 'armor',        icon: hcImg('icons/icons_armor/icons_head/head1.png'),                                    label: 'Armor',        count: counts.armor },
    { id: 'items',        icon: hcImg('icons/icons_items/Bag-Orange.png'),                                          label: 'Items',        count: counts.items },
    { id: 'quests',       icon: hcImg('icons/icons_items/Quest-Icon-Red.png'),                                      label: 'Quests',       count: counts.quests },
    { id: 'locations',    icon: hcImg('icons/icons_location/maps_mh4_ancestral_steppe_mini.png'),                   label: 'Locations',    count: counts.locations },
    { id: 'decorations',  icon: hcImg('icons/icons_items/Jewel-Purple.png'),                                        label: 'Decorations',  count: counts.decorations },
    { id: 'skills',       icon: hcImg('icons/icons_items/Book-Purple.png'),                                         label: 'Skills',       count: counts.skills },
    { id: 'combining',    icon: hcImg('icons/icons_items/Book-Grey.png'),                                           label: 'Combining',    count: counts.combining },
    { id: 'canteen',      icon: hcImg('icons/icons_items/BBQSpit-Orange.png'),                                      label: 'Canteen',      count: counts.canteen },
    { id: 'wyporium',     icon: hcImg('icons/icons_items/Ticket-Gold.png'),                                         label: 'Wyporium',     count: counts.wyporium },
    { id: 'veggie-elder', icon: hcImg('icons/icons_items/Sprout.png'),                                              label: 'Veggie Elder', count: counts.veggie },
    { id: 'armor-search', icon: hcImg('icons/icons_items/Charm-Stone-Orange.png'),                                  label: 'Armor Search', count: null },
  ];

  const html = `
    ${installBannerHTML()}
    <div class="search-wrap" style="margin-bottom:20px">
      <input class="search-input" type="search" placeholder="Search everything…" id="global-search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div id="search-results" style="display:none"></div>
    <div class="home-grid" id="home-grid">
      ${cards.map(c => `
        <div class="home-card" data-nav="/${c.id}">
          <div class="hc-icon">${c.icon}</div>
          <div class="hc-label">${c.label}</div>
          ${c.count != null ? `<div class="hc-count">${c.count} entries</div>` : ''}
        </div>`).join('')}
    </div>`;

  return {
    title: 'MH4U Database',
    html,
    afterRender() {
      const banner = document.getElementById('install-banner');
      if (banner) {
        banner.addEventListener('click', e => {
          if (e.target.closest('#install-banner-close')) {
            localStorage.setItem('install-banner-dismissed', '1');
            banner.remove();
            return;
          }
          const steps = document.getElementById('install-steps');
          steps.style.display = steps.style.display === 'none' ? '' : 'none';
        });
      }

      const input = document.getElementById('global-search');
      const results = document.getElementById('search-results');
      const grid = document.getElementById('home-grid');

      const CATEGORIES = [
        { type: 'monster', label: 'Monsters',
          sql: `SELECT 'monster' as type, _id as id, name, icon_name as sub, null as rarity FROM monsters WHERE name LIKE ?` },
        { type: 'weapon',  label: 'Weapons',
          sql: `SELECT 'weapon' as type, w._id as id, i.name, w.wtype as sub, i.rarity FROM weapons w JOIN items i ON w._id=i._id WHERE i.name LIKE ?` },
        { type: 'armor',   label: 'Armor',
          sql: `SELECT 'armor' as type, a._id as id, i.name, a.slot as sub, i.rarity FROM armor a JOIN items i ON a._id=i._id WHERE i.name LIKE ?` },
        { type: 'item',    label: 'Items',
          sql: `SELECT 'item' as type, _id as id, name, icon_name as sub, null as rarity FROM items WHERE name LIKE ? AND type NOT IN ('Weapon','Armor','Decoration')` },
      ];
      const LIMIT = 5;

      function iconForResult(r) {
        if (r.type === 'monster') return img(monsterIconPath(r.sub), r.name);
        if (r.type === 'weapon')  return img(weaponIconPath(r.sub, r.rarity), r.name);
        if (r.type === 'armor')   return img(armorIconPath(r.sub, r.rarity), r.name);
        return img(itemIconPath(r.sub), r.name);
      }

      function navPath(r) {
        return `/${r.type}s/${r.id}`;
      }

      function renderGroup(cat, rows, expanded) {
        const shown = expanded ? rows : rows.slice(0, LIMIT);
        const extra = rows.length - LIMIT;
        return `
          <div class="search-group" data-type="${cat.type}">
            <div class="search-group-header">${cat.label}</div>
            <div class="card" style="margin-bottom:0">
              ${shown.map(r => `
                <div class="list-item" data-nav="${navPath(r)}">
                  ${iconForResult(r)}
                  <div class="list-item-info">
                    <div class="list-item-name">${esc(r.name)}</div>
                  </div>
                  <span class="list-arrow">›</span>
                </div>`).join('')}
            </div>
            ${!expanded && extra > 0
              ? `<button class="see-all-btn" data-type="${cat.type}">See all ${rows.length} results</button>`
              : ''}
          </div>`;
      }

      let groups = [];

      results.addEventListener('click', e => {
        const item = e.target.closest('[data-nav]');
        if (item) { window.location.hash = item.dataset.nav; return; }
        const btn = e.target.closest('.see-all-btn');
        if (btn) {
          const type = btn.dataset.type;
          const { cat, rows } = groups.find(g => g.cat.type === type);
          results.querySelector(`.search-group[data-type="${type}"]`).outerHTML = renderGroup(cat, rows, true);
        }
      });

      let timer;
      input.addEventListener('input', () => {
        clearTimeout(timer);
        const q = input.value.trim();
        if (!q) {
          results.style.display = 'none';
          grid.style.display = '';
          return;
        }
        timer = setTimeout(() => {
          groups = CATEGORIES
            .map(cat => ({ cat, rows: query(cat.sql, [`%${q}%`]) }))
            .filter(g => g.rows.length > 0);

          if (!groups.length) {
            results.innerHTML = '<div class="empty-state"><p>No results for "' + esc(q) + '"</p></div>';
          } else {
            results.innerHTML = groups.map(({ cat, rows }) => renderGroup(cat, rows, false)).join('');
          }
          results.style.display = '';
          grid.style.display = 'none';
        }, 250);
      });
    }
  };
}
