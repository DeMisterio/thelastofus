//event control controls the flow of scenes

import { character, location, item, scenes } from 'event_control/entity system/entity_init/objective_export.js'
import { send_text, get_text } from 'Game_Visual/CLI_effects/effect_control.js'
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
        skip_text_amo = []
        skip_text_cond = []
    }
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
            if (GameControl.hint_list.includes('abuse_hint')) {
                send_text("My head... something feels wrong. The words you force me to say dont make logical sence... I feel I am losing myself!!")
                character.Me.health -= 5;
            } else {
                GameState.hint_list.push('abuse_hint')
                send_text('[ HINT - SAYING NONCES MAKES THE KEY CHARACTER TO GO NUTS AND LOOSE HIS HEALTH. ]')
            }
        } else if (abuse_counter > 15) {
            send_text("ITS TERRIBLE! SOMEONE HELP ME!!")
            character.Me.health -= 10;
        } else {
        }
    }
    abuse_counter = 0
    return content

}

async function gameprocess() {
    while (Gameloop === true) {
        out_scene_text()
        
        content = get_text()
        
    }

}


let scene = new scenes(1, 1);

let loc = new location(
    scene.scene_locations[0].location_id,      // house
    scene.scene_locations[0].sub_locations_id  // kitchen
);



console.log(loc.characters);

GameControl = new GameState(scene, loc)

GameState.characters = {}

for (const ch of CHARACTERdata.characters) {
  GameState.characters[ch.character_n] = new character(ch.character_n)
}
GameState.player = GameState.characters["Me"]


//.map(name => new Character(name));? 