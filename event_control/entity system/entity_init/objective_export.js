import fs from "fs";

export const SCENEdata = JSON.parse("event_control/entity system/entities/scenes/scenes.json", "utf-8")
export const LOCATIONdata = JSON.parse("event_control/entity system/entities/locations/location.json", "utf-8")
export const CHARACTERdata = JSON.parse("event_control/entity system/entities/Characters/characters.json", "utf-8")
export const ITEMSdata = JSON.parse("event_control/entity system/entities/items/items.json", "utf-8")
export const entity_data_base = typisation_init()

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
export function typisation_init(LOCATIONdata=LOCATIONdata, CHARACTERdata = CharacterData, ITEMSdata = ITEMSdata){
    let entity_db = {}
    let location_db = {}
    for (let i = 0; i < LOCATIONdata.length; i++) {
        let sub_loc_data = {}

        for (let z = 0; z < LOCATIONdata[i].sub_locations.length; z++) {
            const sub = LOCATIONdata[i].sub_locations[z]
            sub_loc_data[sub.name] = sub.tokens
        }

        location_db[LOCATIONdata[i].id] = sub_loc_data
    }
    let characters_db = {}
    for (let i = 0; i < CHARACTERdata.length; i++) {
        characters_db[CHARACTERdata[i].name] = CHARACTERdata[i].tokens
    }
    let items_db = {}
    let containers_obj = {}
    for (let i = 0; i < ITEMSdata.containers.length; i++) {
        const c = ITEMSdata.containers[i]
        containers_obj[c.id] = c.tokens
    }
    let items_obj = {}
    for (let i = 0; i < ITEMSdata.items.length; i++) {
        const it = ITEMSdata.items[i]
        items_obj[it.id] = it.tokens
    }
    items_db["containers"] = containers_obj
    items_db["items"] = items_obj
    items_db["containers"] = contairer_list
    item_db["items"] = items_list
    
    entity_db["locations"] = location_db
    entity_db["characters"] = characters_db
    entity_db['items']= items_db
    return entity_db
}



export class character {
    #name;
    #character_type;
    #personality;
    #init_parameters;

    constructor(preseted = null, name = null, character_type = null, personality = null, init_parameters = null) {
        this.preseted = preseted;

        if (this.preseted !== null) {
            const presetData = CHARACTERdata.characters.find(ch => ch.character_n === this.preseted);
            if (!presetData) {
                throw new Error(`Character preset not found: ${this.preseted}`);
            }
            this.#name = presetData.character_n;
            this.#character_type = presetData.character_type;
            this.#personality = presetData.personality;
            this.#init_parameters = presetData.init_parameters;
        } else {
            this.#name = name;
            this.#character_type = character_type;
            this.#personality = personality;
            this.#init_parameters = init_parameters || [];
        }
        this.location = null
        this.health = this.#init_parameters[0]?.health ?? null;
        this.action_speed = this.#init_parameters[1]?.action_speed ?? null;
        this.endurance = this.#init_parameters[2]?.endurance ?? null;
        this.strength = this.#init_parameters[3]?.strength ?? null;
        this.init_items = this.#init_parameters[4]?.init_items ?? [];
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
        return this.#init_parameters;
    }
    getCharacter(name) {
        return this.characters.find(c => c.name === name)
    }
}

export class location {
    constructor(location_id) {
        const loc = LOCATIONdata.locations.find(l => l.location_id === location_id);
        if (!loc) {
            throw new Error(`Location not found: ${location_id}`);
        }
        
        this.location_id = loc.location_id;
        this.location_n = loc.location_n;
        this.sub_locations = loc.sub_locations;   
        this.scene_id = loc.scene_id ?? null;
        this.characters = loc.characters || []
    }

}

export class item {
    constructor(item_id) {
        const data = ITEMSdata.items.find(it => it.id === item_id);
        if (!data) {
            throw new Error(`Item not found: ${item_id}`);
        }
        this.ignitable = this.ignitable
        this.id = data.id;
        this.type = data.type;
        this.NV = data.NV ?? null;
        this.Eating_speed = data.Eating_speed ?? null;
        this.effect = data.effect ?? null;
        this.functionality = data.functionality ?? null;
        this.HarmRate = data.HarmRate ?? null;
        this.movable = data.movable || { access: false, weight: 0 };
    }
}

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


