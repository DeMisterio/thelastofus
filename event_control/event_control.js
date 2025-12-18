//event control controls the flow of scenes

import { character, location, item, scenes, loadJSONData, ITEMSdata } from './entity_system/entity_init/objective_export.js'
import { send_text, get_user_input_async } from '../effect_control.js'
import { HelloWorld as DisplayIntroText } from '../script.js'
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

const SceneLogic = {
    // Scene 1 finish condition is satisfied initially (auto-advance)
    1: function() {
        return true;
    }
    // Add more scene completion logic here as needed
    // Example:
    // 2: async function() {
    //     // Check conditions for scene 2
    //     return someCondition;
    // }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function out_scene_text() {
    if (!scene || !scene.scene_texts) {
        return;
    }
    
    // Display scene title before scene text
    if (scene.scene_title) {
        send_text(`\n=== ${scene.scene_title} ===\n`);
        await sleep(1000); // Brief pause after title
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


const isWhitespaceString = str => {
    if (!str || typeof str !== 'string') return true;
    return !str.replace(/\s/g, '').length;
}


async function get_content() {
    let content = await get_user_input_async();
    if (!content) {
        content = '';
    }

    let abuse_counter = 0;
    while (isWhitespaceString(content) || isGarbage(content)) {
        content = await get_user_input_async();
        if (!content) {
            content = '';
        }
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

function prettifyName(raw) {
    if (!raw) return '';
    return raw.toString().replace(/_/g, ' ');
}

// Build a human-friendly location description that includes containers, items, and visible characters
export function location_descr_generator(subLocationInput, locationObj = GameControl?.current_location) {
    const activeLocation = locationObj || GameControl?.current_location;
    const subLocation = typeof subLocationInput === 'string'
        ? activeLocation?.sub_locations?.find(sl => sl.name === subLocationInput)
        : subLocationInput;

    if (!subLocation) {
        return '';
    }

    const initDescription = subLocation.init_description || `I am now in ${prettifyName(subLocation.name)}`;
    const itemsSet = ITEMSdata?.sets?.find(set => set.id === subLocation.items_id);
    const containers = itemsSet?.containers || [];

    const containerNames = containers.map(cont => prettifyName(cont.id)).filter(Boolean);
    const containerListText = containerNames.length ? containerNames.join(', ') : 'nothing notable';

    const surfaceContainers = containers.filter(cont => cont.verbs?.some(v => v === 'on the' || v === 'under the')).slice(0, 2);
    const itemPhrases = [];

    for (const cont of surfaceContainers) {
        const verb = cont.verbs.find(v => v === 'on the' || v === 'under the') || cont.verbs?.[0] || '';
        const baseContainer = ITEMSdata?.containers?.find(c => c.id === cont.id);
        const items = baseContainer?.items || [];
        if (!items.length) continue;

        const itemNames = items.map(it => prettifyName(it.name || it.id)).filter(Boolean);
        if (!itemNames.length) continue;

        itemPhrases.push(`the ${itemNames.join(', ')} ${verb} ${prettifyName(cont.id)}`);
    }

    const itemText = itemPhrases.length ? itemPhrases.join('; ') : 'nothing else of note';

    const characters = (activeLocation?.characters || []).filter(ch => {
        if (!ch) return false;
        if (typeof ch === 'string') return true;
        if (typeof ch.health === 'number') return ch.health > 0;
        return true;
    }).map(ch => typeof ch === 'string' ? prettifyName(ch) : prettifyName(ch.name));

    const charVerb = characters.length === 1 ? 'is' : 'are';
    const characterText = characters.length ? characters.join(', ') : 'no one else';

    return `${initDescription}. Here, I see ${containerListText}. I also see ${itemText}. There ${charVerb} ${characterText}.`;
}


// Advance to next scene
async function advanceToNextScene() {
    const nextScene = scene.getNextScene();
    if (!nextScene) {
        send_text("End of game reached.");
        Gameloop = false;
        return false;
    }
    
    scene = nextScene;
    sceneTextDisplayed = false;
    
    // Update location for new scene
    if (scene.scene_locations && scene.scene_locations.length > 0) {
        let loc = new location(scene.scene_locations[0].location_id);
        
        // Map character names to character objects
        if (loc.characters && Array.isArray(loc.characters)) {
            loc.characters = loc.characters.map(name => new character(name));
        }
        
        GameControl.current_location = loc;
    }
    
    return true;
}

async function gameprocess() {
    while (Gameloop === true) {
        // Display scene text only once per scene
        if (!sceneTextDisplayed) {
            await out_scene_text();
            sceneTextDisplayed = true;
        }
        
        // Check scene completion using SceneLogic
        const sceneNum = scene.scene_n;
        let sceneComplete = false;
        
        // Check if there's specific logic for this scene
        if (SceneLogic[sceneNum]) {
            const logicResult = SceneLogic[sceneNum]();
            sceneComplete = logicResult instanceof Promise ? await logicResult : logicResult;
        } else if (scene.on_complete === null) {
            // If on_complete is null and no specific logic, auto-advance
            sceneComplete = true;
        }
        
        if (sceneComplete) {
            // Scene is complete, advance to next scene
            const advanced = await advanceToNextScene();
            if (!advanced) {
                break; // Game ended
            }
            continue; // Start next scene
        }
        
        // Scene not complete yet, get user input and process actions
        let content = await get_content();
        
        // Process the content here
        // TODO: Add action processing logic
        
    }
}


// Game initialization will happen after JSON files are loaded
let scene = null;
let GameControl = null;
let Gameloop = false; // Define Gameloop variable
let sceneTextDisplayed = false; // Track if current scene text has been displayed

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
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve);
                } else {
                    resolve();
                }
            });
        }
        
        // Verify output element exists
        const outputElement = document.getElementById('output');
        if (!outputElement) {
            throw new Error("Output element not found in DOM");
        }
        
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
        
        // Reset scene text display flag
        sceneTextDisplayed = false;
        
        // First display the intro text from script.js
        try {
            console.log("Displaying intro text...");
            await DisplayIntroText();
            console.log("Intro text displayed successfully");
        } catch (introError) {
            console.error("Error displaying intro text:", introError);
            send_text("Error displaying intro text: " + introError.message);
        }
        
        // Scene intro text will be displayed by out_scene_text() in gameprocess()
        // No need to call HelloWorld(scene) here as it duplicates the output
        
        // Start the game loop
        Gameloop = true;
        gameprocess();
    } catch (error) {
        console.error("Error initializing game:", error);
        send_text("Error initializing game: " + error.message);
    }
}




//.map(name => new Character(name));? 
