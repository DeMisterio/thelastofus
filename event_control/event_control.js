//event control controls the flow of scenes

import { character, location, item, scenes } from 'event_control/entity system/entity_init/objective_export.js'

// The game initialisation flow: 

// 0. Check the logs for savings if no - start location => scene[0]
// 1. Load characters forEach character in locations of the scene
//2. Assign the location of characters upstairs as the locations[0][sub_location].id 
//3. start the flow of scenario

export class GameState{
    
    constructor(scene, current_location){
        this.scene = scene
        this.current_location = this.current_location
    }

}
//IF no savings
let scene = new scenes(1, 1);
let loc = new location(scene.scene_locations[0].sub_locations_id);

// Преобразуем список имён в список персонажей

function gameprocess(){
    






}


loc.characters = loc.characters.map(name => new Character(name));

console.log(loc.characters);

GameControl = new GameState(scene, loc)




//.map(name => new Character(name));