//event control controls the flow of scenes

import { character, location, item, scenes, CHARACTERdata, GameControl, initData } from './entity system/entity_init/objective_export.js'
import { get_user_input_async, send_text } from '../effect_control.js'
import { textprocess, action_identifier } from './action control/action_engine.js'

// The game initialisation flow: 

// 0. Check the logs for savings if no - start location => scene[0]
// 1. Load characters forEach character in locations of the scene
//2. Assign the location of characters upstairs as the locations[0][sub_location].id 
//3. start the flow of scenario


//IF no savings

// Преобразуем список имён в список персонажей



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// GitHub/thelastofus/event_control/event_control.js

// async function out_scene_text(scene) {
//     let BP = false
//     const handleKeydown = (event) => {
//         if (event.code === "Space") {
//             BP = true; 
//         }
//     };
//     document.addEventListener("keydown", handleKeydown);
//     try {
//         console.log("Scene outputting is started!")
//         for (let text = 0; text < scene.scene_texts.length; text++) {
//             send_text(scene.scene_texts[text].text);
//             if (BP === false) {
//                 // Ждем 1 секунду
//                 await sleep(1000); 
//             } 
//         }
//     } finally {
//         document.removeEventListener("keydown", handleKeydown);
//     }
//     return
// }


// thelastofus/event_control/event_control.js

async function out_scene_text(scene) {
    // Эта функция временно выводит весь текст мгновенно для отладки
    if (!scene || !scene.scene_texts) {
        send_text("ERROR: Scene data is missing!");
        return;
    }
    
    // ВЫВОДИМ ВЕСЬ ТЕКСТ СРАЗУ, БЕЗ ПАУЗ
    for (const textData of scene.scene_texts) {
        send_text(textData.text);
    }
    
    // ЭТО ДОКАЖЕТ, ЧТО ИГРОВОЙ ЦИКЛ РАБОТАЕТ И ПЕРЕМЕННЫЕ ПЕРЕДАЮТСЯ
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

function waitForInput() {
    return new Promise((resolve) => {
        const handler = (event) => {
            window.removeEventListener("cli-input", handler);
            resolve((event.detail ?? "").trim());
        };
        window.addEventListener("cli-input", handler);
    });
}

async function get_content() {
  async function get_content() {
    // ВАЖНО: await! Скрипт остановится здесь и будет ждать игрока
    let content = await get_user_input_async();  
    let abuse_counter = 0;
    }
    while (isWhitespaceString(content) || isGarbage(content)) {
        abuse_counter += 1
        if (abuse_counter > 5) {
            if (GameControl.hint_list.includes('abuse_hint')) {
                send_text("My head... something feels wrong. The words you force me to say dont make logical sence... I feel I am losing myself!!")
                const player = GameControl.player ?? GameControl.getChar("Me");
                if (player && typeof player.health === "number") {
                    player.health = Math.max(player.health - 5, 0);
                }
            } else {
                GameControl.addHint('abuse_hint')
                send_text('[ HINT - SAYING NONCES MAKES THE KEY CHARACTER TO GO NUTS AND LOOSE HIS HEALTH. ]')
            }
        } else if (abuse_counter > 15) {
            send_text("ITS TERRIBLE! SOMEONE HELP ME!!")
            const player = GameControl.player ?? GameControl.getChar("Me");
            if (player && typeof player.health === "number") {
                player.health = Math.max(player.health - 10, 0);
            }
        }
        content = await get_user_input_async();
    }
    return content

}
const Game_cond_satisfied = () => {
    const currentScene = GameControl.scene;
    if (!currentScene || currentScene.on_complete == null) {
        console.log("* SCENE CONDITION SATISFIED")
        return true;
    }

    if (currentScene.on_complete.location) {
        const requiredLocations = Array.isArray(currentScene.on_complete.location)
            ? currentScene.on_complete.location
            : [currentScene.on_complete.location];
        return requiredLocations.includes(GameControl.current_location);
    }

    return true;
}


let Gameloop = true
async function gameprocess() {
    while (Gameloop === true) {
        await out_scene_text(GameControl.scene);
        while(!Game_cond_satisfied()){
            let input = await get_content();
            textprocess(input)
            action_identifier()
        }
    }
}

async function  initialiseGame(){
    console.log("[INIT] Waiting for the data from the objective export to be initialised")
    try {
        await initData();
    } catch (error) {
        send_text("Game failed to load the data");
        console.error(error);
        return; // I stop the game if error occures 
    }
    
    console.log("[INIT] Data loaded. Starting scene initialization.");

    const scene = new scenes(1, 1);
    GameControl.setScene(scene);
    const initialLocation = scene.scene_locations[0];
    const loc = new location(
        initialLocation.location_id      // house
    );
    GameControl.setLocation(loc.location_id, initialLocation.sub_locations_id);
    //Initialisation of characters 
    GameControl.characters = {};
    for (const ch of CHARACTERdata.characters ?? []) {
        const charInstance = new character(ch.character_n);
        GameControl.setChar(ch.character_n, charInstance);
    }
    GameControl.player = GameControl.getChar("Me")
    console.log(GameControl.player.health)
    console.log("* GAME INITIALISED")
    gameprocess()
}

initialiseGame();

/*
=========================================================
СПРАВОЧНИК ПО ПЕРСОНАЖАМ, ИНВЕНТАРЮ И ПРЕДМЕТАМ
---------------------------------------------------------
1) Конкретный персонаж:
   const me = GameControl.getChar("Me");
   const tom = GameControl.getChar("Tom");
   GameControl.player всегда указывает на активного игрока.

2) Работа с инвентарём персонажа:
   me.getInventory();        // копия массива предметов
   me.hasItem("knife");      // проверка наличия
   me.addItem("lighter");    // добавить предмет по id
   me.removeItem("lighter"); // убрать предмет

3) Классы предметов:
   const knife = new item("knife");
   knife.functionality;   // назначение
   knife.ignitable;       // [флаг, вероятность]
   knife.movable.weight;  // вес и доступность переноса

4) Смена сцены/локации:
   GameControl.setLocation("Init_house", "kitchen");
   GameControl.setScene(new scenes(2)); // или любой другой id
=========================================================
*/
