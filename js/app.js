import { initDB } from './db.js';
import { onRoute, navigate, back, initRouter } from './router.js';
import { renderHome } from './pages/home.js';
import { renderMonsterList, renderMonsterDetail } from './pages/monsters.js';
import { renderWeaponList, renderWeaponDetail } from './pages/weapons.js';
import { renderArmorList, renderArmorDetail } from './pages/armor.js';
import { renderItemList, renderItemDetail } from './pages/items.js';
import { renderQuestList, renderQuestDetail, renderArenaQuestDetail } from './pages/quests.js';
import { renderLocationList, renderLocationDetail } from './pages/locations.js';
import { renderDecorationList, renderDecorationDetail } from './pages/decorations.js';
import { renderSkillList, renderSkillDetail } from './pages/skills.js';
import { renderCombining } from './pages/combining.js';
import { renderCanteen } from './pages/canteen.js';
import { renderWyporium } from './pages/wyporium.js';
import { renderVeggieElder } from './pages/veggie-elder.js';
import { renderArmorSearch } from './pages/armor-search.js';
import { renderTalismans } from './pages/talismans.js';

function navImg(src) {
  return `<img class="nav-img" src="${src}" alt="">`;
}

const NAV_PRIMARY = [
  { id: 'home',     label: 'Home',     icon: `<svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/></svg>` },
  { id: 'monsters', label: 'Monsters', icon: navImg('icons/icons_monster/MH4U-Rathalos_Icon.png') },
  { id: 'weapons',  label: 'Weapons',  icon: navImg('icons/icons_weapons/icons_great_sword/great_sword1.png') },
  { id: 'armor',    label: 'Armor',    icon: navImg('icons/icons_armor/icons_head/head1.png') },
  { id: 'items',    label: 'Items',    icon: navImg('icons/icons_items/Bag-Orange.png') },
  { id: 'more',     label: 'More',     icon: '☰' },
];

const NAV_MORE = [
  { id: 'quests',       label: 'Quests',       icon: navImg('icons/icons_items/Quest-Icon-Red.png') },
  { id: 'locations',    label: 'Locations',    icon: navImg('icons/icons_location/maps_mh4_ancestral_steppe_mini.png') },
  { id: 'decorations',  label: 'Decorations',  icon: navImg('icons/icons_items/Jewel-Purple.png') },
  { id: 'skills',       label: 'Skills',       icon: navImg('icons/icons_items/Book-Purple.png') },
  { id: 'combining',    label: 'Combining',    icon: navImg('icons/icons_items/Book-Grey.png') },
  { id: 'canteen',      label: 'Canteen',      icon: navImg('icons/icons_items/BBQSpit-Orange.png') },
  { id: 'wyporium',     label: 'Wyporium',     icon: navImg('icons/icons_items/Ticket-Gold.png') },
  { id: 'veggie-elder', label: 'Veggie Elder', icon: navImg('icons/icons_items/Sprout.png') },
  { id: 'armor-search', label: 'Armor Search', icon: navImg('icons/icons_items/Charm-Stone-Orange.png') },
];

const ALL_SECTIONS = [...NAV_PRIMARY.filter(n => n.id !== 'more'), ...NAV_MORE];

function buildNav() {
  // Sidebar
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <img class="sidebar-logo" src="icons/icons_weapons/icons_great_sword/great_sword1.png" alt="">
      <span class="sidebar-title">MH4U DB</span>
    </div>
    <nav class="sidebar-nav">
      ${ALL_SECTIONS.map(n => `
        <div class="sidebar-item" data-route="${n.id}">
          <span class="nav-icon">${n.icon}</span>
          <span>${n.label}</span>
        </div>`).join('')}
    </nav>`;

  sidebar.querySelectorAll('.sidebar-item').forEach(el =>
    el.addEventListener('click', () => navigate('/' + el.dataset.route)));

}

function setActiveNav(section) {
  document.querySelectorAll('.sidebar-item').forEach(el =>
    el.classList.toggle('active', el.dataset.route === section));
}

async function handleRoute({ section, id }) {
  setActiveNav(section || 'home');

  const backBtn = document.getElementById('back-btn');
  backBtn.style.display = (section && section !== 'home') ? '' : 'none';

  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading-inline">Loading…</div>';

  try {
    let result;
    switch (section) {
      case 'home': case undefined: case '': result = await renderHome(); break;
      case 'monsters':    result = id ? await renderMonsterDetail(+id)  : await renderMonsterList();    break;
      case 'weapons':     result = id ? await renderWeaponDetail(isNaN(+id) ? decodeURIComponent(id) : +id) : await renderWeaponList(); break;
      case 'armor':       result = id ? await renderArmorDetail(+id)    : await renderArmorList();      break;
      case 'items':       result = id ? await renderItemDetail(+id)     : await renderItemList();       break;
      case 'quests':       result = id ? await renderQuestDetail(+id)    : await renderQuestList();      break;
      case 'arena-quests': result = id ? await renderArenaQuestDetail(+id) : await renderQuestList(); break;
      case 'locations':   result = id ? await renderLocationDetail(+id) : await renderLocationList();   break;
      case 'decorations': result = id ? await renderDecorationDetail(+id) : await renderDecorationList(); break;
      case 'skills':      result = id ? await renderSkillDetail(+id)    : await renderSkillList();      break;
      case 'combining':   result = await renderCombining();    break;
      case 'canteen':     result = await renderCanteen();      break;
      case 'wyporium':    result = await renderWyporium();     break;
      case 'veggie-elder': result = await renderVeggieElder(); break;
      case 'armor-search': result = await renderArmorSearch(); break;
      case 'talismans':   result = await renderTalismans();    break;
      default:
        result = { html: '<div class="empty-state"><div class="es-icon">🤷</div><h2>Not Found</h2></div>', title: '404' };
    }
    document.getElementById('page-title').textContent = result.title;
    content.innerHTML = result.html;
    content.scrollTop = 0;
    window.scrollTo(0, 0);
    bindPageEvents(section, id);
    if (result.afterRender) result.afterRender();
  } catch (e) {
    console.error(e);
    content.innerHTML = `<div class="empty-state"><div class="es-icon">⚠️</div><h2>Error</h2><p>${e.message}</p></div>`;
  }
}

function bindPageEvents(section, id) {
  // Navigation links
  document.querySelectorAll('[data-nav]').forEach(el =>
    el.addEventListener('click', () => navigate(el.dataset.nav)));

  // Filter chips (supports multiple groups per target with AND logic)
  const activeFilters = {};
  function applyFilters(target) {
    const filters = activeFilters[target] || {};
    document.querySelectorAll(`[data-filterable="${target}"]`).forEach(item => {
      const visible = Object.entries(filters).every(([group, val]) => {
        if (val === 'all') return true;
        if (group === 'rank') return (item.dataset.filterRank ?? item.dataset.filterValue) === val;
        return item.dataset.filterValue === val;
      });
      item.style.display = visible ? '' : 'none';
    });
  }

  // Initialize filter state from localStorage, falling back to active chip in HTML
  const seenGroups = new Set();
  document.querySelectorAll('.chip[data-filter-group]').forEach(chip => {
    const g = chip.dataset.filterGroup;
    const target = chip.dataset.filterTarget;
    const key = `filter:${target}:${g}`;
    if (seenGroups.has(key)) return;
    seenGroups.add(key);
    const saved = localStorage.getItem(key);
    if (!activeFilters[target]) activeFilters[target] = {};
    if (saved !== null) {
      document.querySelectorAll(`.chip[data-filter-group="${g}"]`).forEach(c => c.classList.remove('active'));
      const match = document.querySelector(`.chip[data-filter-group="${g}"][data-filter="${saved}"]`);
      if (match) match.classList.add('active');
      activeFilters[target][g] = saved;
    } else {
      const activeChip = document.querySelector(`.chip[data-filter-group="${g}"].active`);
      activeFilters[target][g] = activeChip ? activeChip.dataset.filter : 'all';
    }
  });
  // Apply initial filter state
  [...new Set([...seenGroups].map(k => k.split(':')[1]))].forEach(applyFilters);

  document.querySelectorAll('.chip[data-filter-group]').forEach(chip => {
    chip.addEventListener('click', () => {
      const g = chip.dataset.filterGroup;
      const target = chip.dataset.filterTarget;
      document.querySelectorAll(`.chip[data-filter-group="${g}"]`).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (!activeFilters[target]) activeFilters[target] = {};
      activeFilters[target][g] = chip.dataset.filter;
      localStorage.setItem(`filter:${target}:${g}`, chip.dataset.filter);
      applyFilters(target);
    });
  });

  // Search filtering (ignores active filters — shows all text matches)
  document.querySelectorAll('[data-search]').forEach(input => {
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      const key = input.dataset.search;
      if (q) {
        const items = [...document.querySelectorAll(`[data-searchable="${key}"]`)];
        const hasPriority = items.some(i => i.dataset.searchname !== undefined);
        if (hasPriority) {
          const nameMatches = [], skillMatches = [];
          items.forEach(item => {
            const text = (item.dataset.searchtext || item.textContent).toLowerCase();
            const name = item.dataset.searchname.toLowerCase();
            if (text.includes(q)) {
              item.style.display = '';
              (name.includes(q) ? nameMatches : skillMatches).push(item);
            } else {
              item.style.display = 'none';
            }
          });
          [...nameMatches, ...skillMatches].forEach(item => item.parentNode.appendChild(item));
        } else {
          items.forEach(item => {
            const text = (item.dataset.searchtext || item.textContent).toLowerCase();
            item.style.display = text.includes(q) ? '' : 'none';
          });
        }
      } else {
        const items = [...document.querySelectorAll(`[data-searchable="${key}"]`)];
        const hasPriority = items.some(i => i.dataset.searchname !== undefined);
        if (hasPriority) {
          items.sort((a, b) => +a.dataset.index - +b.dataset.index)
               .forEach(item => { item.style.display = ''; item.parentNode.appendChild(item); });
        } else {
          items.forEach(item => item.style.display = '');
        }
        applyFilters(key);
      }
    });
  });

  // Tabs
  document.querySelectorAll('.tab[data-tab-group]').forEach(tab => {
    tab.addEventListener('click', () => {
      const g = tab.dataset.tabGroup;
      document.querySelectorAll(`.tab[data-tab-group="${g}"]`).forEach(t => t.classList.remove('active'));
      document.querySelectorAll(`.tab-panel[data-tab-group="${g}"]`).forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      const panel = document.querySelector(`.tab-panel[data-tab-group="${g}"][data-tab-id="${tab.dataset.tabId}"]`);
      if (panel) panel.style.display = '';
    });
  });
}

async function main() {
  buildNav();
  document.getElementById('back-btn').addEventListener('click', () => navigate('/home'));
  try {
    await initDB();
    document.getElementById('loading').style.display = 'none';
    onRoute(handleRoute);
    initRouter();
  } catch (e) {
    document.getElementById('loading').querySelector('.loading-text').textContent = 'Error: ' + e.message;
  }
}

main();
