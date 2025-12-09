//event control controls the flow of scenes

import { character, location, item, scenes } from 'event_control/entity system/entity_init/objective_export.js'
import { send_text } from 'Game_Visual/CLI_effects/effect_control.js'
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

// Преобразуем список имён в список персонажей



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}




async function gameprocess(){
    while(Gameloop = true){
        let BP = false
        let skip_text_cond = []
        let skip_text_amo = []
        document.addEventListener("keydown", function (event) {
            if (event.code === "Space") {
            console.log("Space key pressed!");
            BP = true; // optional: stops page from scrolling
            }
        });      
        textloop:
        for (let text = 0; text < scene.scene_texts.length; text++) {
            if (skip_text_amo.length > 0) {
                for (let i = 0; i < skip_text_amo.length; i++) {
                    send_text(scene.scene_texts[text].text);
                    text++;  
                continue textloop;
            }
            send_text(scene.scene_texts[text].text);
            if (BP === true) {
                skip_text_cond.push("1");
                if (skip_text_cond.length === 5) {
                    for (let z = 0; z < 4; z++) {
                        skip_text_cond.pop();
                    }
                    skip_text_amo.push(1, 1);
                }
            } else {
                if (skip_text_cond.length < 1) {
                    skip_text_amo.pop(); 
                }
                await sleep(1000); 
                BP = false;
            }
        }
        skip_text_amo =[]
        skip_text_cond =[]
    }

    }





}

let scene = new scenes(1, 1);
let loc = new location(scene.scene_locations[0].sub_locations_id);

loc.characters = loc.characters.map(name => new Character(name));

console.log(loc.characters);

GameControl = new GameState(scene, loc)




//.map(name => new Character(name));