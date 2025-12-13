const readJSON = async (relativePath) => {
    const url = new URL(relativePath, import.meta.url);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load JSON from ${url}`);
    }
    return response.json();
};

export let SCENEdata = null; // ИЗМЕНЕНО: const на let, присвоено null
export let LOCATIONdata = null; // ИЗМЕНЕНО
export let CHARACTERdata = null; // ИЗМЕНЕНО
export let ITEMSdata = null; // ИЗМЕНЕНО
export let entity_data_base = null; // ИЗМЕНЕНО


export async function initData() {
    console.log("Starting async data load..."); // DEBUG
    SCENEdata = await readJSON("../entities/scenes/scenes.json");
    LOCATIONdata = await readJSON("../entities/locations/location.json");
    CHARACTERdata = await readJSON("../entities/Characters/characters.json");
    ITEMSdata = await readJSON("../entities/items/items.json");
    entity_data_base = typisation_init();
    console.log("Data load complete."); // DEBUG
}


export class scenes {
    constructor(scene_n, scene_id = null) {
        let scene = null;
        if (scene_id !== null) {
            scene = SCENEdata.scenes.find(st => st.scene_id === scene_id);
        } else {
            scene = SCENEdata.scenes.find(st => st.scene_n === scene_n);
        }
        if (!scene) {
            throw new Error(`Scene not found: scene_n=${scene_n}, scene_id=${scene_id}`);
        }
        this.scene_id = scene.scene_id;
        this.scene_n = scene.scene_n;
        this.scene_title = scene.scene_title;
        this.scene_locations = scene.locations;
        this.scene_texts = scene.intro_text;
    }


    getNextScene() {
        const next = SCENEdata.scenes.find(st => st.scene_n === this.scene_n + 1);
        if (!next) return null;
        return new scenes(next.scene_n, next.scene_id);
    }
}
export function typisation_init(
    locationData = LOCATIONdata,
    characterData = CHARACTERdata,
    itemsData = ITEMSdata
) {
    const entity_db = {
        locations: {},
        characters: {},
        items: {
            containers: {},
            items: {}
        }
    };

    for (const loc of locationData?.locations ?? []) {
        const sub_loc_data = {};

        for (const sub of loc?.sub_locations ?? []) {
            sub_loc_data[sub.name] = sub.tokens ?? [];
        }

        entity_db.locations[loc.id ?? loc.location_id] = {
            tokens: loc.tokens ?? [],
            sub_locations: sub_loc_data
        };
    }

    for (const ch of characterData?.characters ?? []) {
        entity_db.characters[ch.character_n] = ch.tokens ?? [];
    }

    for (const container of itemsData?.containers ?? []) {
        entity_db.items.containers[container.id] = container.tokens ?? [];
    }

    for (const itemEntry of itemsData?.items ?? []) {
        entity_db.items.items[itemEntry.id] = itemEntry.tokens ?? [];
    }

    return entity_db;
}



export class character {
    #name;
    #character_type;
    #personality;
    #init_parameters;
    #stats;

    constructor(
        preseted = null,
        name = null,
        character_type = null,
        personality = null,
        init_parameters = null,
        verbal_reactions = {},
        tokens = []
    ) {
        this.preseted = preseted;
        let presetData = null;

        if (this.preseted !== null) {
            presetData = CHARACTERdata.characters.find(
                (ch) => ch.character_n === this.preseted
            );
            if (!presetData) {
                throw new Error(`Character preset not found: ${this.preseted}`);
            }
        }

        const source = presetData ?? {
            character_n: name,
            character_type,
            personality,
            init_parameters: init_parameters ?? [],
            verbal_reactions: verbal_reactions ?? {},
            tokens: tokens ?? []
        };

        if (!source.character_n) {
            throw new Error("Custom characters must define a name.");
        }

        this.#name = source.character_n;
        this.#character_type = source.character_type ?? null;
        this.#personality = source.personality ?? null;
        this.#init_parameters = Array.isArray(source.init_parameters)
            ? source.init_parameters
            : [];

        const paramMap = {};
        for (const param of this.#init_parameters) {
            Object.assign(paramMap, param);
        }
        this.#stats = { ...paramMap };

        this.tokens = source.tokens ?? [];
        this.verbal_reactions = source.verbal_reactions ?? {};
        this.location = null;
        this.sub_location = null;
        this.health = this.#stats.health ?? null;
        this.action_speed = this.#stats.action_speed ?? null;
        this.endurance = this.#stats.endurance ?? null;
        this.strength = this.#stats.strength ?? null;

        const startingItems = Array.isArray(this.#stats.init_items)
            ? [...this.#stats.init_items]
            : [];
        this.init_items = [...startingItems];
        this.inventory = [...startingItems];
    }
    get name() {
        return this.#name;
    }
    get character_type() {
        return this.#character_type;
    }

    get personality() {
        return this.#personality;
    }

    get init_parameters() {
        return this.#init_parameters.map((param) => ({ ...param }));
    }

    get stats() {
        return { ...this.#stats };
    }

    getInventory() {
        return [...this.inventory];
    }

    hasItem(itemId) {
        return this.inventory.includes(itemId);
    }

    addItem(itemId) {
        if (!itemId || this.inventory.includes(itemId)) {
            return;
        }
        this.inventory.push(itemId);
    }

    removeItem(itemId) {
        if (!itemId) {
            return;
        }
        this.inventory = this.inventory.filter((id) => id !== itemId);
    }
}

export class location {
    constructor(location_id) {
        const loc = LOCATIONdata.locations.find(
            (l) => l.id === location_id || l.location_id === location_id
        );
        if (!loc) {
            throw new Error(`Location not found: ${location_id}`);
        }

        this.location_id = loc.id ?? loc.location_id;
        this.name = loc.name ?? loc.location_n ?? null;
        this.tokens = loc.tokens ?? [];
        this.sub_locations = loc.sub_locations ?? [];
        this.scenes = loc.scenes ?? [];
        this.characters = loc.characters ?? [];
    }
}

export class item {
    constructor(item_id) {
        const data = ITEMSdata.items.find(it => it.id === item_id);
        if (!data) {
            throw new Error(`Item not found: ${item_id}`);
        }
        this.id = data.id;
        this.tokens = data.tokens ?? [];
        this.type = data.type ?? null;
        this.NV = data.NV ?? null;
        this.Eating_speed = data.Eating_speed ?? null;
        this.ignitable = data.ignitable ?? [false, 0];
        this.effect = data.effect ?? null;
        this.functionality = data.functionality ?? null;
        this.HarmRate = data.HarmRate ?? null;
        this.capacity = data.capacity ?? null;
        this.movable = data.movable || { access: false, weight: 0 };
    }
}

class GameState {

    constructor(scen=null, current_location=null, hint_list = []) {
        this.scene = scen
        this.current_location = current_location
        this.current_sub_location = null
        this.hint_list = [...hint_list]
        this.characters = {}
        this.player = null
    }
    getChar(name) {
        return this.characters[name] ?? null;
    }
    setChar(name, characterInstance) {
        if (!name || !characterInstance) {
            return;
        }
        this.characters[name] = characterInstance;
    }
    setScene(sceneInstance) {
        this.scene = sceneInstance;
    }
    setLocation(locationId, subLocationId = null) {
        this.current_location = locationId;
        this.current_sub_location = subLocationId;
    }
    addHint(hint) {
        if (!hint || this.hint_list.includes(hint)) {
            return;
        }
        this.hint_list.push(hint);
    }
  
}

export var GameControl = new GameState()


//VISUAL example of Character class usage

// const customChar = new Character(
//     null,          
//     "Bandit",       
//     "NPC",               
//     "aggressive",          
//     [
//         { health: 100 },
//         { action_speed: 5 },
//         { endurance: 40 },
//         { strength: 60 },
//         { init_items: ["knife", "water_bottle"] }
//     ]
// );

//VISUAL example of Location class usage

//const house = new location("Init_house");

// house.characters.forEach(ch => {
//     console.log(ch.name, ch.health);
// });

// We can link certain characters to locations easily

// const me = new Character("Me");
// me.location = house;

// console.log(me.location.location_id); // "Init_house"
