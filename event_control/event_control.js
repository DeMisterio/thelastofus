//event control controls the flow of scenes

import { character, location, item, scenes, loadJSONData } from './entity_system/entity_init/objective_export.js'
import { send_text, get_text } from '../effect_control.js'
import { action_identifier, textprocess } from './action_control/action_engine.js'
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
        this.burning_objects = []
    }

}
//IF no savings

// Преобразуем список имён в список персонажей


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
    // Логика для Сцены 2: "Preparation"
    // Задача: Игрок должен собрать 5 предметов перед выходом на улицу
    2: async function() {
        const player = GameControl.player ?? GameControl.getChar("Me");
        const currentScene = GameControl.scene;
        
        // Получаем условие завершения из JSON (ожидается { "location": ["street_bullet"] })
        //
        const finishCond = currentScene.scene_finish_condition; 

        if (!finishCond || !finishCond.location) return false;

        const targetLocID = finishCond.location[0]; // "street_bullet"
        
        // 1. Проверяем, находится ли игрок в целевой локации (сработал ли 'go to street')
        if (GameControl.current_location.location_id === targetLocID) {
            
            // 2. Проверяем условия миссии (собрано ли 5 предметов)
            const requiredItems = 5;
            const currentItems = player.init_items.length;
            
            if (currentItems >= requiredItems) {
                // УСПЕХ
                const lootList = player.init_items.join(", ");
                send_text(`I have packed my pockets with the most important for me things: ${lootList}, and left the room. Realising, it is the last time i will see it...`);
                return true; 
            } else {
                // ПРОВАЛ (Недостаточно предметов)
                // Возвращаем игрока обратно в дом (так как он не может уйти)
                // Создаем заново объект локации "Init_house"
                GameControl.current_location = new location("Init_house");
                // Можно установить сублокацию выхода (например, hall)
                GameControl.active_sub_location = "hall";

                const remaining = requiredItems - currentItems;
                send_text(`I really need more items with me to go. At least ${remaining} more!`);
                
                return false;
            }
        }
        return false;
    }
    // Сюда можно добавлять функции для scene_3, scene_4 и т.д.
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
    // Используем GameControl.scene, так как scene обновляется глобально
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
            // Режим быстрого пропуска
             send_text(txtLine.text);
             continue; // Пропускаем sleep
        } else {
            // Обычный режим
            send_text(txtLine.text);
            
            if (BP === true) {
                // Логика активации пропуска (5 нажатий)
                skip_text_cond.push("1");
                if (skip_text_cond.length >= 5) {
                    skip_text_amo.push(1); // Включаем пропуск
                }
                BP = false;
            } else {
                // Сброс счетчика, если не спамим пробел
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
    // 1. Выводим текст первой сцены при старте
    await out_scene_text();

    while (Gameloop === true) {
        // A. Ожидание ввода игрока
        const inputRaw = await get_user_input_async();
        
        // B. Обработка "Мусора"
        if (isGarbage(inputRaw)) {
            send_text("I don't understand that...");
            continue;
        }

        
        // C. Обработка NLP и Действий
        // 1. Получаем intent и entities
        const processedData = await textprocess(inputRaw);
        
        // 2. Выполняем действие
        const actionResult = action_identifier(processedData.intent?.name, processedData.entities);
        
        // 3. Выводим результат действия (Action Engine возвращает строку)
        if (actionResult) {
            send_text(actionResult);
        } else {
            send_text("I can't do that right now.");
        }

        // D. Проверка условий Сцены (Scene Logic)
        const currentSceneNum = GameControl.scene.scene_n;
        
        if (SceneLogic[currentSceneNum]) {
            // Запускаем проверку для текущей сцены
            const sceneCompleted = await SceneLogic[currentSceneNum]();
            
            if (sceneCompleted) {
                // ПЕРЕХОД НА СЛЕДУЮЩУЮ СЦЕНУ
                const nextSceneObj = GameControl.scene.getNextScene();
                
                if (nextSceneObj) {
                    GameControl.scene = nextSceneObj;
                    send_text(`\n--- SCENE ${nextSceneObj.scene_n}: ${nextSceneObj.scene_title} ---\n`);
                    
                    // Выводим текст новой сцены
                    await out_scene_text();
                } else {
                    send_text("THE END. (No more scenes defined)");
                    Gameloop = false;
                }
            }
        }
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
        await sleep(3000 * (textObj.weight || 1)); // Wait based on weight
    }
}

// Initialize game after data is loaded

export async function initializeGame() {
    try {
        const dataLoaded = await loadJSONData();
        if (!dataLoaded) throw new Error("Failed to load game data");
        
        // 1. Инициализация Сцены 1
        scene = new scenes(1); 

        // 2. Инициализация Локации (Берем первую локацию из сцены 1)
        // В scenes.json: Scene 1 -> "Init_house"
        let startLocID = scene.scene_locations[0].location_id;
        let loc = new location(startLocID);

        // 3. Инициализация Персонажей
        // Преобразуем массив имен ["Tom", "Me"...] в объекты character
        if (loc.characters && Array.isArray(loc.characters)) {
            loc.characters = loc.characters.map(name => new character(null, name)); 
            // Используем конструктор: new character(preseted=name) если name совпадает с базой
            // В вашем классе character: constructor(preseted=null...)
            // Поэтому передаем имя первым аргументом:
            loc.characters = loc.characters.map(name => new character(name));
        }

        // 4. Создаем GameState
        // Важно: Мы должны записать это в глобальный объект, доступный action_engine
        // В текущей архитектуре action_engine импортирует GameControl из objective_export.
        // Мы должны обновить ЕГО.
        // Т.к. мы не можем переписать импорт, мы должны использовать метод set или мутировать объект.
        
        // ВРЕМЕННЫЙ ХАК: Присваиваем свойства глобальному GameControl, если он объект.
        // Если в objective_export GameControl = null, то мы не можем его изменить через импорт.
        // РЕШЕНИЕ: action_engine должен брать GameState из этого файла? 
        // Или objective_export должен иметь функцию initGameControl.
        
        // Допустим, objective_export имеет объект-контейнер.
        // Для работы кода, я присвою локальному GameControl и буду надеяться, 
        // что в objective_export.js `GameControl` инициализирован как объект или класс.
        
        // ПРАВИЛЬНЫЙ ПУТЬ: 
        // Присваиваем свойства существующему GameControl (импортированному)
        Object.assign(GameControl, new GameState(scene, loc));
        // Устанавливаем ссылку на игрока
        GameControl.player = GameControl.getChar("Me");

        await DisplayIntroText();
        
        Gameloop = true;
        gameprocess();
        
    } catch (error) {
        console.error("Error initializing game:", error);
        send_text("Error: " + error.message);
    }
}



//.map(name => new Character(name));? 