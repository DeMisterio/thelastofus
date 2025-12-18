
import { character, location, item, scenes, loadJSONData } from './entity_system/entity_init/objective_export.js'
import { send_text, get_text } from '../effect_control.js'
import { action_identifier, textprocess } from './action_control/action_engine.js'



export class GameState {

    constructor(scene, current_location, hint_list = []) {
        this.scene = scene
        this.current_location = current_location
        this.hint_list = hint_list
        this.burning_objects = []
    }

}



const INTRO_TEXT = [
    "Welcome.",
    "Take a breath.",
    "This is a story-driven game.",
    "And to play it,",
    "you can just type what you want to do.",
    "Simple words are enough.",
    "If it sounds human — it usually works. No need to type 'Go north', or 'Go south'",
    "Be creative, and use a power of your language.",
    "There is no perfect way to play.",
    "You don’t need to guess the right command.",
    "Just say what feels natural.",
    "Things happen fast.",
    "Some choices matter.",
    "Some mistakes are okay.",
    "The game will adapt to you.",
    "You can finish this game in about 10 minutes.",
    "But you can also slow down and explore.",
    "The game won’t always guide you.",
    "But it will try to understand you.",
    "You can skip the intro textes by pressing the space key, but it will not give you any privilege except the time, thich is what really MATTERS.",
    "Be yourself.",
    "Be human.",
    "Be the last of us.",
    "Let’s begin.",
    "",
    "",
    " "
];
const SceneLogic = {
    2: async function() {
        const player = GameControl.player ?? GameControl.getChar("Me");
        const currentScene = GameControl.scene;
        
        const finishCond = currentScene.scene_finish_condition; 

        if (!finishCond || !finishCond.location) return false;

        const targetLocID = finishCond.location[0];
        
        if (GameControl.current_location.location_id === targetLocID) {
            
            const requiredItems = 5;
            const currentItems = player.init_items.length;
            
            if (currentItems >= requiredItems) {
                const lootList = player.init_items.join(", ");
                send_text(`I have packed my pockets with the most important for me things: ${lootList}, and left the room. Realising, it is the last time i will see it...`);
                return true; 
            } else {
                GameControl.current_location = new location("Init_house");
                GameControl.active_sub_location = "hall";

                const remaining = requiredItems - currentItems;
                send_text(`I really need more items with me to go. At least ${remaining} more!`);
                
                return false;
            }
        }
        return false;
    }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function DisplayIntroText() {
    for (const line of INTRO_TEXT) {
        send_text(line);
        await sleep(1676);
    }
}

    
async function out_scene_text() {
    const currentScene = GameControl.scene;
    
    if (!currentScene || !currentScene.scene_texts) {
        return;
    }
    
    let BP = false;
    let skip_text_cond = [];
    let skip_text_amo = [];
    
    const spaceHandler = function (event) {
        if (event.code === "Space") {
            BP = true; 
        }
    };
    
    document.addEventListener("keydown", spaceHandler);

    textloop:
    for (let text = 0; text < currentScene.scene_texts.length; text++) {
        const txtLine = currentScene.scene_texts[text];
        
        if (skip_text_amo.length > 0) {
             send_text(txtLine.text);
             continue;
        } else {
            send_text(txtLine.text);
            
            if (BP === true) {
                skip_text_cond.push("1");
                if (skip_text_cond.length >= 5) {
                    skip_text_amo.push(1);
                }
                BP = false;
            } else {
                if (skip_text_cond.length > 0) skip_text_cond.pop();
                await sleep(1000 * (txtLine.weight || 1));
            }
        }
    }
    

    document.removeEventListener("keydown", spaceHandler);
    return;
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
    let content = get_text()
    let abuse_counter = 0;
    while (isWhitespaceString(content) || isGarbage(content)) {
        content = get_text()
        abuse_counter += 1
        if (abuse_counter > 5) {
            if (GameControl && GameControl.hint_list && GameControl.hint_list.includes('abuse_hint')) {
                send_text("My head... something feels wrong. The words you force me to say dont make logical sence... I feel I am losing myself!!")
            } else {
                if (GameControl) {
                    GameControl.hint_list.push('abuse_hint')
                }
                send_text('[ HINT - SAYING NONCES MAKES THE KEY CHARACTER TO GO NUTS AND LOOSE HIS HEALTH. ]')
            }
        } else if (abuse_counter > 15) {
            send_text("ITS TERRIBLE! SOMEONE HELP ME!!")
        } else {
        }
    }
    abuse_counter = 0
    return content

}

async function gameprocess() {
    await out_scene_text();

    while (Gameloop === true) {
        const inputRaw = await get_user_input_async();
        
        if (isGarbage(inputRaw)) {
            send_text("I don't understand that...");
            continue;
        }

        
        const processedData = await textprocess(inputRaw);
        
        const actionResult = action_identifier(processedData.intent?.name, processedData.entities);
        
        if (actionResult) {
            send_text(actionResult);
        } else {
            send_text("I can't do that right now.");
        }

        const currentSceneNum = GameControl.scene.scene_n;
        
        if (SceneLogic[currentSceneNum]) {
            const sceneCompleted = await SceneLogic[currentSceneNum]();
            
            if (sceneCompleted) {
                const nextSceneObj = GameControl.scene.getNextScene();
                
                if (nextSceneObj) {
                    GameControl.scene = nextSceneObj;
                    send_text(`\n--- SCENE ${nextSceneObj.scene_n}: ${nextSceneObj.scene_title} ---\n`);
                    
                    await out_scene_text();
                } else {
                    send_text("THE END. (No more scenes defined)");
                    Gameloop = false;
                }
            }
        }
    }
}


let scene = null;
let GameControl = null;
let Gameloop = false;

export async function HelloWorld(sceneObj) {
    if (!sceneObj || !sceneObj.scene_texts) {
        return;
    }
    
    for (let textObj of sceneObj.scene_texts) {
        send_text(textObj.text);
        await sleep(3000 * (textObj.weight || 1));
    }
}


export async function initializeGame() {
    try {
        const dataLoaded = await loadJSONData();
        if (!dataLoaded) throw new Error("Failed to load game data");
        
        scene = new scenes(1); 

        let startLocID = scene.scene_locations[0].location_id;
        let loc = new location(startLocID);

        if (loc.characters && Array.isArray(loc.characters)) {
            loc.characters = loc.characters.map(name => new character(null, name)); 
            loc.characters = loc.characters.map(name => new character(name));
        }

        
        
        
        Object.assign(GameControl, new GameState(scene, loc));
        GameControl.player = GameControl.getChar("Me");

        await DisplayIntroText();
        
        Gameloop = true;
        gameprocess();
        
    } catch (error) {
        console.error("Error initializing game:", error);
        send_text("Error: " + error.message);
    }
}


