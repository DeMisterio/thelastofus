//event control controls the flow of scenes

import { character, location, item, scenes, loadJSONData } from './entity system/entity_init/objective_export.js'
import { send_text, get_text } from '../effect_control.js'
// The game initialisation flow: 

// 0. Check the logs for savings if no - start location => scene[0]
// 1. Load characters forEach character in locations of the scene
//2. Assign the location of characters upstairs as the locations[0][sub_location].id 
//3. start the flow of scenario

export class GameState {

    constructor(scene, current_location, hint_list = []) {
        this.scene = scene
        this.current_location = current_location
        this.hint_list = hint_list
    }

}
//IF no savings

// Преобразуем список имён в список персонажей



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function out_scene_text() {
    if (!scene || !scene.scene_texts) {
        return;
    }
    
    let BP = false
    let skip_text_cond = []
    let skip_text_amo = []
    
    const spaceHandler = function (event) {
        if (event.code === "Space") {
            console.log("Space key pressed!");
            BP = true; // optional: stops page from scrolling
        }
    };
    
    document.addEventListener("keydown", spaceHandler);

    textloop:
    for (let text = 0; text < scene.scene_texts.length; text++) {
        if (skip_text_amo.length > 0) {
            for (let i = 0; i < skip_text_amo.length; i++) {
                send_text(scene.scene_texts[text].text);
                text++;
                if (text >= scene.scene_texts.length) break textloop;
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
        } else {
            send_text(scene.scene_texts[text].text);
            await sleep(1000 * (scene.scene_texts[text].weight || 1));
            BP = false;
        }
    }
    
    document.removeEventListener("keydown", spaceHandler);
    skip_text_amo = []
    skip_text_cond = []
    return
}
function isGarbage(input) {
    if (!input) return true;
    const text = input.trim().toLowerCase();
    if (text.length < 2) return true;
    const words = text.split(/\s+/);
    const specialRatio = (text.match(/[^a-z0-9\s]/gi)?.length || 0) / text.length;
    if (specialRatio > 0.4) return true;
    const allShort = words.every(w => w.length <= 3);
    const allNoVowels = words.every(w => !/[aeiou]/i.test(w));

    if (allShort && allNoVowels) return true;
    const repeatedSyllable = words.every(
        w => /^([bcdfghjklmnpqrstvwxyz]{1,2}[aeiou]){1,2}$/i.test(w)
    );
    if (repeatedSyllable && words.length >= 2) return true;
    const tooManyClusters = words.every(w => /[bcdfghjklmnpqrstvwxyz]{3,}/i.test(w));
    if (tooManyClusters) return true;

    return false;
}


const isWhitespaceString = str => !str.replace(/\s/g, '').length


function get_content() {
    content = get_text()
    let abuse_counter = 0;
    while (isWhitespaceString(content) && isGarbage(content)) {
        //Character has to say that 'i dont even know what to do'
        content = get_text()
        abuse_counter += 1
        if (abuse_counter > 5) {
            if (GameControl && GameControl.hint_list && GameControl.hint_list.includes('abuse_hint')) {
                send_text("My head... something feels wrong. The words you force me to say dont make logical sence... I feel I am losing myself!!")
                // character.Me.health -= 5; // TODO: Fix character reference
            } else {
                if (GameControl) {
                    GameControl.hint_list.push('abuse_hint')
                }
                send_text('[ HINT - SAYING NONCES MAKES THE KEY CHARACTER TO GO NUTS AND LOOSE HIS HEALTH. ]')
            }
        } else if (abuse_counter > 15) {
            send_text("ITS TERRIBLE! SOMEONE HELP ME!!")
            // character.Me.health -= 10; // TODO: Fix character reference
        } else {
        }
    }
    abuse_counter = 0
    return content

}

async function gameprocess() {
    while (Gameloop === true) {
        await out_scene_text()
        
        content = get_content()
        
        // Process the content here
        // TODO: Add action processing logic
        
    }
}


// Game initialization will happen after JSON files are loaded
let scene = null;
let GameControl = null;
let Gameloop = false; // Define Gameloop variable

// HelloWorld function to output introtext before first scene
export async function HelloWorld(sceneObj) {
    if (!sceneObj || !sceneObj.scene_texts) {
        return;
    }
    
    for (let textObj of sceneObj.scene_texts) {
        send_text(textObj.text);
        await sleep(1000 * (textObj.weight || 1)); // Wait based on weight
    }
}

// Initialize game after data is loaded
export async function initializeGame() {
    try {
        // First ensure JSON data is loaded
        const dataLoaded = await loadJSONData();
        if (!dataLoaded) {
            throw new Error("Failed to load game data");
        }
        
        scene = new scenes(1, 1);
        
        let loc = new location(
            scene.scene_locations[0].location_id      // дом
        );
        
        // Map character names to character objects
        if (loc.characters && Array.isArray(loc.characters)) {
            loc.characters = loc.characters.map(name => new character(name));
        }
        
        console.log(loc.characters);
        
        GameControl = new GameState(scene, loc);
        
        // Output introtext via HelloWorld before first scene
        await HelloWorld(scene);
        
        // Start the game loop
        Gameloop = true;
        gameprocess();
    } catch (error) {
        console.error("Error initializing game:", error);
        send_text("Error initializing game: " + error.message);
    }
}




//.map(name => new Character(name));? 