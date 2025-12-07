import fs from "fs";
export const SCENEdata = JSON.parse("event_control/entity system/entities/scenes/scenes.json", "utf-8")
export const LOCATIONdata = JSON.parse("event_control/entity system/entities/locations/location.json", "utf-8")
export const CHARACTERdata = JSON.parse("event_control/entity system/entities/Characters/characters.json", "utf-8")
export const ITEMSdata = JSON.parse("event_control/entity system/entities/items/items.json", "utf-8")


export class scenes{
    constructor(scene_n, scene_id){
        this.scene_id = scene_id
        this.scene_n = scene_n
        this.scene_title = SCENEdata.scenes.find(st => st.scene_n === scene_n).scene_title
        this.scene_locations = SCENEdata.scenes.find(l => l.scene_id == scene_id).locations
        this.scene_texts = SCENEdata.scenes.find(t => t.scene_id = scene_id).intro_text
    }

}
export class Character {
    #name;
    #character_type
    constructor(preseted = null, name = null, character_type = null) {
        this.preseted = preseted;
        this.#name = name;
        this.#character_type = character_type
    }
    get name() {
        if (this.preseted === null) {
            return this.#name;
        } else {
            return this.preseted.name;
        }
    }
    get character_type() {
    if (this.preseted === null) {
        return this.#character_type;
    } else {
        CHARACTERdata.characters.find(ch_t => ch_t.character_n === this.name).character_type
        
    }
    }
}

export class location extends scenes{
    constructor(location_id){
        super(scene_locations)
        this.location_id = 
        this.scene_n = scene_n
        this.scene_title = SCENEdata.scenes.find(st => st.scene_n === scene_n).scene_title
        this.scene_locations = SCENEdata.scenes.find(l => l.scene_id == scene_id).locations
        this.scene_texts = SCENEdata.scenes.find(t => t.scene_id = scene_id).intro_text
    }

}