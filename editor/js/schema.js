// FK: { col: { table, display } }
// enums: { col: [values] }
// textareas: columns that get textarea input

export const SCHEMA = {
  wishlist: {
    pk: '_id',
    fks: {},
    enums: {}
  },
  arena_quests: {
    pk: '_id',
    fks: {
      location_id: { table: 'locations', display: 'name' }
    },
    enums: {},
    textareas: ['goal']
  },
  arena_rewards: {
    pk: '_id',
    fks: {
      arena_id: { table: 'arena_quests', display: 'name' },
      item_id:  { table: 'items', display: 'name' }
    },
    enums: {}
  },
  combining: {
    pk: '_id',
    fks: {
      created_item_id: { table: 'items', display: 'name' },
      item_1_id:       { table: 'items', display: 'name' },
      item_2_id:       { table: 'items', display: 'name' }
    },
    enums: {}
  },
  components: {
    pk: '_id',
    fks: {
      created_item_id:   { table: 'items', display: 'name' },
      component_item_id: { table: 'items', display: 'name' }
    },
    enums: {
      type: ['Create', 'Create A', 'Create B', 'Improve']
    }
  },
  felyne_skills: {
    pk: '_id',
    fks: {},
    enums: {},
    textareas: ['description']
  },
  food_combos: {
    pk: '_id',
    fks: {
      skill1_id: { table: 'felyne_skills', display: 'skill_name' },
      skill2_id: { table: 'felyne_skills', display: 'skill_name' },
      skill3_id: { table: 'felyne_skills', display: 'skill_name' }
    },
    enums: {}
  },
  gathering: {
    pk: '_id',
    fks: {
      item_id:     { table: 'items', display: 'name' },
      location_id: { table: 'locations', display: 'name' }
    },
    enums: {
      rank: ['LR', 'HR', 'G']
    }
  },
  hunting_rewards: {
    pk: '_id',
    fks: {
      item_id:    { table: 'items', display: 'name' },
      monster_id: { table: 'monsters', display: 'name' }
    },
    enums: {
      rank:      ['LR', 'HR', 'G'],
      condition: [
        'Body Carve', 'Body Carve (Apparent Death)', 'Body Carve (KO Large Kelbi)',
        'Body Carve (KO)', 'Break Antenna', 'Break Back', 'Break Back Leg',
        'Break Beak', 'Break Belly', 'Break Blowhole', 'Break Body', 'Break Chest',
        'Break Claw', 'Break Cover Skin', 'Break Ear', 'Break Eye', 'Break Fin',
        'Break Front Leg', 'Break Head', 'Break Horn', 'Break Jaw', 'Break Leg',
        'Break Poison Stinger', 'Break Shell', 'Break Tail', 'Break Talon',
        'Break Wing', 'Break Wing Leg', 'Bug-Catching Back', 'Capture',
        'Head Carve', 'Lower Body Carve', 'Mining Back', 'Mining Ore',
        'Mining Scale', 'Mouth Carve', 'Shiny Drop', 'Shiny Drop (Ballista)',
        'Shiny Drop (Blue)', 'Shiny Drop (Bone)', 'Shiny Drop (Breaking Ice)',
        'Shiny Drop (Egg)', 'Shiny Drop (Gold Egg)', 'Shiny Drop (Gold)',
        'Shiny Drop (Gray)', 'Shiny Drop (Green)', 'Shiny Drop (Mushroom)',
        'Shiny Drop (Orange)', 'Shiny Drop (Ore)', 'Tail Carve',
        'Upper Body Carve', 'Virus Reward'
      ]
    }
  },
  horn_melodies: {
    pk: '_id',
    fks: {},
    enums: {}
  },
  ingredients: {
    pk: '_id',
    fks: {
      quest_id: { table: 'quests', display: 'name' }
    },
    enums: {}
  },
  items: {
    pk: '_id',
    fks: {},
    enums: {
      type: [
        'Account', 'Ammo', 'Armor', 'Bait', 'Bone', 'Book', 'Bug',
        'Coating', 'Coin/Ticket', 'Commodity', 'Consumable', 'Decoration',
        'Fish', 'Flesh', 'Meat', 'Nectar', 'Ore', 'Plant', 'Sac/Fluid',
        'Scrap', 'Supply', 'Tool', 'Weapon', 'Wystone'
      ]
    },
    textareas: ['description']
  },
  item_to_skill_tree: {
    pk: '_id',
    fks: {
      item_id:       { table: 'items', display: 'name' },
      skill_tree_id: { table: 'skill_trees', display: 'name' }
    },
    enums: {}
  },
  locations: {
    pk: '_id',
    fks: {},
    enums: {}
  },
  monsters: {
    pk: '_id',
    fks: {},
    enums: {
      class: ['Boss', 'Minion']
    },
    textareas: ['signature_move', 'trait']
  },
  monster_ailment: {
    pk: '_id',
    fks: {
      monster_id: { table: 'monsters', display: 'name' }
    },
    enums: {}
  },
  monster_damage: {
    pk: '_id',
    fks: {
      monster_id: { table: 'monsters', display: 'name' }
    },
    enums: {}
  },
  monster_to_quest: {
    pk: '_id',
    fks: {
      monster_id: { table: 'monsters', display: 'name' },
      quest_id:   { table: 'quests', display: 'name' }
    },
    enums: {}
  },
  monster_weakness: {
    pk: '_id',
    fks: {
      monster_id: { table: 'monsters', display: 'name' }
    },
    enums: {
      state: ['Normal', 'Enraged', 'Charged']
    }
  },
  quest_rewards: {
    pk: '_id',
    fks: {
      quest_id: { table: 'quests', display: 'name' },
      item_id:  { table: 'items', display: 'name' }
    },
    enums: {
      reward_slot: ['A', 'B', 'Sub']
    }
  },
  skill_trees: {
    pk: '_id',
    fks: {},
    enums: {}
  },
  quests: {
    pk: '_id',
    fks: {
      location_id: { table: 'locations', display: 'name' }
    },
    enums: {
      hub:  ['Caravan', 'Guild', 'Event'],
      type: ['Key', 'Normal', 'Urgent']
    },
    textareas: ['goal', 'sub_goal']
  },
  quest_prereqs: {
    pk: '_id',
    fks: {
      quest_id:  { table: 'quests', display: 'name' },
      prereq_id: { table: 'quests', display: 'name' }
    },
    enums: {}
  },
  monster_habitat: {
    pk: '_id',
    fks: {
      monster_id:  { table: 'monsters', display: 'name' },
      location_id: { table: 'locations', display: 'name' }
    },
    enums: {}
  },
  armor: {
    pk: '_id',
    fks: {
      _id: { table: 'items', display: 'name' }
    },
    enums: {
      slot:        ['Head', 'Body', 'Arms', 'Waist', 'Legs'],
      gender:      ['Male', 'Female', 'Both'],
      hunter_type: ['Blade', 'Gunner', 'Both']
    }
  },
  weapons: {
    pk: '_id',
    fks: {
      _id:       { table: 'items', display: 'name' },
      parent_id: { table: 'items', display: 'name' }
    },
    enums: {
      wtype: [
        'Bow', 'Charge Blade', 'Dual Blades', 'Great Sword', 'Gunlance',
        'Hammer', 'Heavy Bowgun', 'Hunting Horn', 'Insect Glaive',
        'Lance', 'Light Bowgun', 'Long Sword', 'Switch Axe', 'Sword and Shield'
      ],
      element:   ['', 'Blastblight', 'Dragon', 'Fire', 'Ice', 'Paralysis', 'Poison', 'Sleep', 'Thunder', 'Water'],
      element_2: ['', 'Blastblight', 'Dragon', 'Fire', 'Ice', 'Paralysis', 'Poison', 'Sleep', 'Thunder', 'Water'],
      awaken:    ['', 'Blastblight', 'Dragon', 'Fire', 'Ice', 'Paralysis', 'Poison', 'Sleep', 'Thunder', 'Water']
    }
  },
  decorations: {
    pk: '_id',
    fks: {
      _id: { table: 'items', display: 'name' }
    },
    enums: {}
  },
  monster_status: {
    pk: '_id',
    fks: {
      monster_id: { table: 'monsters', display: 'name' }
    },
    enums: {
      status: ['Poison', 'Sleep', 'Para', 'KO', 'Exhaust', 'Blast', 'Jump', 'Mount']
    }
  },
  skills: {
    pk: '_id',
    fks: {
      skill_tree_id: { table: 'skill_trees', display: 'name' }
    },
    enums: {},
    textareas: ['description', 'description_de', 'description_fr', 'description_es', 'description_it', 'description_jp']
  },
  veggie_elder: {
    pk: '_id',
    fks: {
      location_id:     { table: 'locations', display: 'name' },
      offer_item_id:   { table: 'items', display: 'name' },
      receive_item_id: { table: 'items', display: 'name' }
    },
    enums: {}
  },
  wyporium: {
    pk: '_id',
    fks: {
      item_in_id:      { table: 'items', display: 'name' },
      item_out_id:     { table: 'items', display: 'name' },
      unlock_quest_id: { table: 'quests', display: 'name' }
    },
    enums: {}
  },
  asb_sets: {
    pk: '_id',
    fks: {
      head_armor:  { table: 'armor', display: '_id' },
      body_armor:  { table: 'armor', display: '_id' },
      arms_armor:  { table: 'armor', display: '_id' },
      waist_armor: { table: 'armor', display: '_id' },
      legs_armor:  { table: 'armor', display: '_id' }
    },
    enums: {}
  }
};

// Table groups for sidebar display
export const TABLE_GROUPS = [
  {
    label: 'Core',
    tables: ['items', 'locations', 'skill_trees', 'felyne_skills']
  },
  {
    label: 'Monsters',
    tables: ['monsters', 'monster_ailment', 'monster_damage', 'monster_habitat',
             'monster_status', 'monster_weakness']
  },
  {
    label: 'Quests',
    tables: ['quests', 'quest_prereqs', 'quest_rewards', 'monster_to_quest',
             'arena_quests', 'arena_rewards', 'hunting_rewards']
  },
  {
    label: 'Crafting',
    tables: ['weapons', 'armor', 'decorations', 'components', 'combining',
             'item_to_skill_tree']
  },
  {
    label: 'Skills',
    tables: ['skills', 'food_combos', 'ingredients']
  },
  {
    label: 'Other',
    tables: ['gathering', 'horn_melodies', 'veggie_elder',
             'wyporium', 'wishlist', 'asb_sets']
  }
];

// All tables in the order they appear in mh4u.sql (for exporter)
export const TABLE_ORDER = [
  'wishlist', 'arena_quests', 'arena_rewards', 'combining', 'components',
  'felyne_skills', 'food_combos', 'gathering', 'hunting_rewards', 'horn_melodies',
  'ingredients', 'items', 'item_to_skill_tree', 'locations', 'monsters',
  'monster_ailment', 'monster_damage', 'monster_to_quest', 'monster_weakness',
  'quest_rewards', 'skill_trees', 'quests', 'quest_prereqs', 'monster_habitat',
  'armor', 'weapons', 'decorations', 'monster_status', 'skills',
  'veggie_elder', 'wyporium', 'asb_sets'
];
