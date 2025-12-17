//Action engine controls interraction between entities 
import { match_items } from './parse_engine.js/semantic_parser.js'
import { item, GameControl, ITEMSdata } from '../entity_system/entity_init/objective_export.js'
import { Logger } from '../../log_system/log_it.js'
// В начале файла action_engine.js
// ДОБАВЛЕНО: ITEMSdata для доступа к сетам предметов
// Server returns something like:


let inpsample = {
    "text": "fix the car door with screwdriver",
    "intent": {
      "name": "fix",
      "confidence": 0.9634
    },
    "entities": [
      {
        "entity": "tool",
        "value": "screwdriver",
        "start": 27,
        "end": 33,
        "confidence_entity": 0.98,
        "extractor": "DIETClassifier"
      },
      {
        "entity": "item",
        "value": "car_door",
        "start": 38,
        "end": 46,
        "confidence_entity": 0.95,
        "extractor": "DIETClassifier"
      }
    ],
  }

// Функция передачи предмета
function give_item(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];
    const locs = entities.location || [];
    const sublocs = entities.sublocation || [];

    // 1. Проверка на "Messy" (Неправильные сущности или Self)
    // Если указаны локации/сублокации ИЛИ персонаж - это "Me"
    const isSelf = chars.some(c => c.toLowerCase() === "me");
    if (isSelf || locs.length > 0 || sublocs.length > 0) {
        return "False. I dont know what to do... it is so messy in my head";
    }

    // 2. Только предмет (Only Item)
    if (items.length > 0 && chars.length === 0) {
        const itemID = items[0];
        // Проверяем, есть ли он у нас, чтобы сказать "кому дать?"
        if (actor.init_items.includes(itemID)) {
            return `False. I need to give ${itemID} to someone, but who to? I need to think fully....`;
        }
        // Если предмета нет у нас, сработает логика ниже (или дефолт)
    }

    // 3. Основная логика (Персонаж + Предмет)
    if (chars.length > 0) {
        const targetName = chars[0];
        const currentLoc = GameControl.current_location;
        
        // Ищем персонажа в текущей локации
        const targetCharObj = currentLoc.characters.find(c => 
            c.name.toLowerCase() === targetName.toLowerCase() || 
            (c.tokens && c.tokens.includes(targetName))
        );

        // Если персонажа нет рядом -> это тоже подходит под категорию "не могу дать"
        // Но для точности лучше сказать, что его нет. 
        // Однако по вашему условию: "если указан персонаж и предмет ... не подходит по проверкам ... возвращаем false + I think I dont have anything"
        // Допустим, если персонажа нет, мы не можем ему ничего дать.
        if (!targetCharObj) {
             return `False. ${targetName} is not here.`;
        }

        // Проверяем предмет
        let itemID = null;
        if (items.length > 0) itemID = items[0];

        // УСЛОВИЕ 3: Предмет не указан ИЛИ Предмета нет в инвентаре
        if (!itemID || !actor.init_items.includes(itemID)) {
            return `False. I think I dont have anything with me that I give to ${targetName}`;
        }

        // 4. УСПЕХ (Все проверки пройдены)
        
        // Удаляем у себя
        const itemIndex = actor.init_items.indexOf(itemID);
        actor.init_items.splice(itemIndex, 1);

        // Добавляем персонажу
        targetCharObj.init_items.push(itemID);

        // Реакция (Verbal Reaction "give")
        let reaction = "Thanks.";
        // Используем геттер verbal_reactions
        const giveReactions = targetCharObj.verbal_reactions?.["give"] || [];
        
        if (giveReactions.length > 0) {
            reaction = giveReactions[Math.floor(Math.random() * giveReactions.length)];
        } else {
            // Если реакции "give" нет, можно использовать "warm" или дефолт
            const fallback = targetCharObj.verbal_reactions?.["warm"] || ["Nodes respectfully."];
            reaction = fallback[0]; 
        }

        return `True. I gave ${itemID} to ${targetCharObj.name}. "${reaction}"`;
    }

    return "False. I need to know what and who.";
}


  // Функция для поедания/питья
function consume_item(entities, actor) {
    const items = entities.item || [];
    
    // Если предмета нет в entities, ищем "food" в инвентаре (авто-выбор) 
    // или ругаемся, если игрок не уточнил.
    let targetItemID = null;

    if (items.length > 0) {
        targetItemID = items[0];
    } else {
        return "False. Eat what? I need to specify the food.";
    }

    // 1. Проверяем наличие (в инвентаре или в локации?)
    // Обычно едим то, что в руках (инвентарь).
    // Но если лежит на столе, можно тоже съесть.
    
    let itemSource = "inventory";
    let itemIndex = actor.init_items.indexOf(targetItemID);

    // Если нет в инвентаре, ищем в комнате (упрощенно: если доступно в парсере, значит рядом)
    // Но для механики потребления лучше требовать наличие в инвентаре или явное взаимодействие.
    // Допустим, мы проверяем только инвентарь для надежности.
    if (itemIndex === -1) {
        return `False. I don't have ${targetItemID} with me.`;
    }

    // 2. Получаем данные предмета
    const foodItem = new item(targetItemID); // Создаем экземпляр для доступа к свойствам

    // 3. Проверка типа
    if (foodItem.type !== "food" && foodItem.type !== "drink") { // Добавил drink на всякий случай
        return `False. I can't eat or drink ${targetItemID}.`;
    }

    // 4. Логика потребления
    const nv = foodItem.NV || 0;
    
    // Удаляем предмет
    actor.init_items.splice(itemIndex, 1);

    // Восстанавливаем статы
    let restoreText = "";
    if (nv > 100) {
        actor.endurance = 100;
        actor.health = 100;
        restoreText = "I feel completely revitalized!";
    } else {
        // Восстанавливаем Endurance
        actor.endurance = (actor.endurance || 0) + nv;
        if (actor.endurance > 100) actor.endurance = 100;
        
        // Восстанавливаем Health (бонус от еды)
        actor.health = (actor.health || 0) + nv; 
        if (actor.health > 100) actor.health = 100;
        
        restoreText = `I feel better.`;
    }

    return `True. I consumed ${targetItemID}. ${restoreText}`;
}


// Функция для поедания/питья
function consume_item(entities, actor) {
    const items = entities.item || [];
    
    // Если предмета нет в entities, ищем "food" в инвентаре (авто-выбор) 
    // или ругаемся, если игрок не уточнил.
    let targetItemID = null;

    if (items.length > 0) {
        targetItemID = items[0];
    } else {
        return "False. Eat what? I need to specify the food.";
    }

    // 1. Проверяем наличие (в инвентаре или в локации?)
    // Обычно едим то, что в руках (инвентарь).
    // Но если лежит на столе, можно тоже съесть.
    
    let itemSource = "inventory";
    let itemIndex = actor.init_items.indexOf(targetItemID);

    // Если нет в инвентаре, ищем в комнате (упрощенно: если доступно в парсере, значит рядом)
    // Но для механики потребления лучше требовать наличие в инвентаре или явное взаимодействие.
    // Допустим, мы проверяем только инвентарь для надежности.
    if (itemIndex === -1) {
        return `False. I don't have ${targetItemID} with me.`;
    }

    // 2. Получаем данные предмета
    const foodItem = new item(targetItemID); // Создаем экземпляр для доступа к свойствам

    // 3. Проверка типа
    if (foodItem.type !== "food" && foodItem.type !== "drink") { // Добавил drink на всякий случай
        return `False. I can't eat or drink ${targetItemID}.`;
    }

    // 4. Логика потребления
    const nv = foodItem.NV || 0;
    
    // Удаляем предмет
    actor.init_items.splice(itemIndex, 1);

    // Восстанавливаем статы
    let restoreText = "";
    if (nv > 100) {
        actor.endurance = 100;
        actor.health = 100;
        restoreText = "I feel completely revitalized!";
    } else {
        // Восстанавливаем Endurance
        actor.endurance = (actor.endurance || 0) + nv;
        if (actor.endurance > 100) actor.endurance = 100;
        
        // Восстанавливаем Health (бонус от еды)
        actor.health = (actor.health || 0) + nv; 
        if (actor.health > 100) actor.health = 100;
        
        restoreText = `I feel better.`;
    }

    return `True. I consumed ${targetItemID}. ${restoreText}`;
}

// Функция надевания / утепления
function wear_item(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];
    const currentLoc = GameControl.current_location;

    // 1. ОПРЕДЕЛЕНИЕ ПРЕДМЕТА
    // Ищем первый предмет в entities
    if (items.length === 0) {
        return "False. Wear what?";
    }
    const targetItemID = items[0];

    // 2. ОПРЕДЕЛЕНИЕ ЦЕЛИ (На кого надеваем)
    // Если персонаж не указан, или указан "Me" -> цель Игрок
    let targetCharObj = actor;
    let isTargetMe = true;

    if (chars.length > 0) {
        const charName = chars[0];
        if (charName.toLowerCase() !== "me") {
            // Ищем NPC в текущей локации
            const foundChar = currentLoc.characters.find(c => 
                c.name.toLowerCase() === charName.toLowerCase() || 
                (c.tokens && c.tokens.includes(charName))
            );
            
            if (!foundChar) {
                return `False. I can't dress ${charName} in ${targetItemID} though they might be nearby, I don't see them.`;
            }
            targetCharObj = foundChar;
            isTargetMe = false;
        }
    }

    // 3. ПРОВЕРКА ФУНКЦИОНАЛА ПРЕДМЕТА
    // Нам нужно убедиться, что предмет можно надеть или он греет.
    let itemData = null;
    try {
        itemData = new item(targetItemID);
    } catch (e) {
        return `False. I don't know what ${targetItemID} is.`;
    }

    // Разрешенные типы или функционал
    const validTypes = ["clothing", "comfort", "hygiene", "armor"];
    const validFuncs = ["wear", "warm", "equip"];

    const isValid = validTypes.includes(itemData.type) || validFuncs.includes(itemData.functionality);

    if (!isValid) {
        return "False. I can't dress anyone with that.";
    }

    // 4. ПОИСК ПРЕДМЕТА (Инвентарь или Окружение)
    let source = "none"; // 'inventory', 'environment'
    let containerFound = null; // Если нашли в контейнере

    // А) Проверка инвентаря ИГРОКА (мы всегда берем предмет сами, даже чтобы одеть другого)
    if (actor.init_items.includes(targetItemID)) {
        source = "inventory";
    } 
    // Б) Проверка окружения (как в cut_item)
    else if (currentLoc.sub_locations) {
        for (let subLoc of currentLoc.sub_locations) {
            const setId = subLoc.items_id;
            const itemSet = ITEMSdata.sets.find(s => s.id === setId);
            if (itemSet && itemSet.containers) {
                // Ищем контейнер, содержащий itemID в своем списке items
                // Внимание: ITEMSdata.containers хранит наполнение. itemSet хранит ссылки на ID контейнеров.
                
                // Пробегаем по контейнерам этого сета
                for (let contRef of itemSet.containers) {
                    // Находим реальный объект контейнера в базе данных
                    const realContainer = ITEMSdata.containers.find(c => c.id === contRef.id);
                    if (realContainer && realContainer.items) {
                        const itemInCont = realContainer.items.find(it => it.id === targetItemID);
                        if (itemInCont) {
                            source = "environment";
                            containerFound = realContainer;
                            break;
                        }
                    }
                }
            }
            if (source === "environment") break;
        }
    }

    if (source === "none") {
        return `False. I don't have ${targetItemID} and I don't see it nearby.`;
    }

    // 5. ВЫПОЛНЕНИЕ ДЕЙСТВИЯ

    // Если предмет был в окружении, удаляем его оттуда
    if (source === "environment" && containerFound) {
        const idx = containerFound.items.findIndex(it => it.id === targetItemID);
        if (idx > -1) containerFound.items.splice(idx, 1);
    }
    // Если предмет был в инвентаре ИГРОКА, и мы одеваем NPC, удаляем у игрока
    if (source === "inventory" && !isTargetMe) {
        const idx = actor.init_items.indexOf(targetItemID);
        if (idx > -1) actor.init_items.splice(idx, 1);
    }

    // ДОБАВЛЕНИЕ ПРЕДМЕТА ЦЕЛИ
    // Если цель уже имеет этот предмет (например, надели то, что и так в кармане), дублировать не обязательно,
    // но по логике "wear" мы просто меняем статус. Здесь мы добавляем в инвентарь (если его там не было).
    if (!targetCharObj.init_items.includes(targetItemID)) {
        targetCharObj.init_items.push(targetItemID);
    }

    // 6. ВЫВОД РЕЗУЛЬТАТА
    if (isTargetMe) {
        // Логика для игрока
        return `True. I have dressed the ${targetItemID}.`;
    } else {
        // Логика для NPC (Реакция)
        let reaction = "...";
        // Геттер verbal_reactions уже добавлен в класс character
        const warmReactions = targetCharObj.verbal_reactions?.["warm"] || [];
        
        if (warmReactions.length > 0) {
            // Берем случайную реакцию
            reaction = warmReactions[Math.floor(Math.random() * warmReactions.length)];
        } else {
            reaction = "Thanks.";
        }
        
        return `True. ${reaction}`;
    }
}
// ... (ignite_item, attack_target, go_to остаются без изменений) ...

// --- НОВАЯ ФУНКЦИЯ CUT ---
function cut_item(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];
    // Инструменты, которыми можно резать
    const cuttingTools = ["knife", "hunting_knife", "razor_blades", "keys"];
    // Типы предметов, которые можно резать
    const cuttableTypes = ["document", "junk", "food", "comfort", "clothing", "sentimental", "hygiene", "valuable"];

    // СЦЕНАРИЙ 1: ДВА ПРЕДМЕТА (Инструмент + Цель)
    if (items.length === 2 && chars.length === 0) {
        // 1. Находим инструмент и цель
        // Ищем, есть ли среди предметов инструмент резки по ID
        let toolID = items.find(id => cuttingTools.includes(id));
        let targetID = items.find(id => id !== toolID);

        // Если не нашли инструмент или оба предмета инструменты (берем первый попавшийся как инструмент)
        if (!toolID) {
             // Если инструмента нет в списке разрешенных
             return { 
                 success: false, 
                 text: `False. I think the ${items[1]} is impossible to cut with the ${items[0]}.` 
             };
        }

        // 2. Проверка: есть ли инструмент у игрока
        if (!actor.init_items.includes(toolID)) {
            return {
                success: false,
                text: `False. I don't have the ${toolID} with me to cut anything.`
            };
        }

        const targetItemObj = new item(targetID);

        // 3. Проверка типа цели
        if (cuttableTypes.includes(targetItemObj.type)) {
            
            // ПУТЬ А: КОНТЕЙНЕР (Проверка предыдущего лога)
            const lastLog = Logger.get_last_log();
            // Проверяем, была ли предыдущая команда inspect/open
            if (lastLog && 
               (lastLog.Command_formated.action === "inspect" || lastLog.Command_formated.action === "open")) {
                
                // Получаем ID контейнера из прошлого лога (предполагаем, что он был в entities)
                // В Command_formated.entities или просто ищем ID контейнера в прошлом items списке
                // Для упрощения, допустим, мы ищем совпадение среди items прошлого лога
                // Но лучше проверить логику "inspect".
                // Допустим, в entities прошлого лога был контейнер.
                
                // Ищем контейнер в текущей сублокации
                const currentLoc = GameControl.current_location;
                if (currentLoc.sub_locations) {
                    for (let subLoc of currentLoc.sub_locations) {
                        const set = ITEMSdata.sets.find(s => s.id === subLoc.items_id);
                        if (set && set.containers) {
                            // Находим контейнер, который фигурировал в прошлом логе (по ID)
                            // lastLog.Command_formated.entity должен содержать список entities. 
                            // Проверяем, есть ли там ID контейнера, в котором лежит наш targetID
                            
                            // Упрощение: ищем контейнер в текущем сете, который содержит targetID
                            const containerWithItem = ITEMSdata.containers.find(c => c.items && c.items.some(it => it.id === targetID));
                            
                            if (containerWithItem) {
                                // Удаляем предмет из контейнера (Splice)
                                const itemIndex = containerWithItem.items.findIndex(it => it.id === targetID);
                                if (itemIndex > -1) {
                                    containerWithItem.items.splice(itemIndex, 1);
                                    return {
                                        success: true,
                                        text: `True. I looked at ${containerWithItem.id}. I took out my ${toolID} and cut the ${targetID}.`
                                    };
                                }
                            }
                        }
                    }
                }
            }

            // ПУТЬ Б: ИНВЕНТАРЬ
            if (actor.init_items.includes(targetID)) {
                // Удаляем из инвентаря (разрезали = уничтожили?)
                // Или заменяем на "pieces"? Пока просто удаляем или оставляем с пометкой.
                // По инструкции: "cut it using my..."
                // Допустим, предмет уничтожается или трансформируется.
                // Для MVP просто выводим текст.
                return {
                    success: true,
                    text: `True. I took the ${targetID} out of my pocket and cut it using my ${toolID}.`
                };
            }

            return {
                success: false,
                text: `False. I don't see the ${targetID} here.`
            };

        } else {
             return {
                 success: false,
                 text: `False. I can't cut ${targetID}, it's too tough or useless to cut.`
             };
        }
    }

    // СЦЕНАРИЙ 2: ПРЕДМЕТ + ПЕРСОНАЖ
    if (items.length === 1 && chars.length === 1) {
        const toolID = items[0];
        const targetCharName = chars[0];

        // 1. Проверка инструмента (ID)
        if (!cuttingTools.includes(toolID)) {
             return {
                 success: false,
                 text: `False. I don't know whether it is possible to harm ${targetCharName} with ${toolID}.`
             };
        }

        // 2. Проверка: есть ли инструмент у игрока
        if (!actor.init_items.includes(toolID)) {
             return {
                 success: false,
                 text: `False. I don't have ${toolID}.`
             };
        }

        // 3. Проверка: персонаж рядом?
        const currentLocation = GameControl.current_location;
        const targetCharObj = currentLocation.characters.find(c => 
            c.name.toLowerCase() === targetCharName.toLowerCase() || 
            (c.tokens && c.tokens.includes(targetCharName))
        );

        if (!targetCharObj) {
            return {
                success: false,
                text: `False. ${targetCharName} is not here.`
            };
        }

        // 4. Действие: Нанесение урона
        const toolObj = new item(toolID);
        const damage = toolObj.HarmRate || 10;
        
        if (targetCharObj.health !== null) {
            targetCharObj.health -= damage;
            if (targetCharObj.health < 0) targetCharObj.health = 0;
        }

        // Реакция
        // Проверяем, есть ли reactions (с учетом добавленного геттера)
        let reaction = "...";
        // Используем 'cut', если нет - 'attack'
        const reactionsList = targetCharObj.verbal_reactions?.["cut"] || targetCharObj.verbal_reactions?.["attack"] || [];
        if (reactionsList.length > 0) {
             reaction = reactionsList[Math.floor(Math.random() * reactionsList.length)];
        }

        return {
            success: true,
            text: `True. I took my ${toolID} and stabbed ${targetCharObj.name}. "${reaction}"`
        };
    }

    return { success: false, text: "False. I need a tool and something to cut." };
}

// ... (task_processor и textprocess остаются) ...

// Функция стрельбы
function shoot_target(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];

    // 1. ПОИСК ОРУЖИЯ
    // Сначала ищем оружие, упомянутое игроком (entities)
    let weaponID = items.find(id => {
        try { return new item(id).type === "weapon"; } catch (e) { return false; }
    });

    // Если игрок не указал оружие, ищем любое оружие в инвентаре (авто-выбор)
    if (!weaponID) {
        weaponID = actor.init_items.find(id => {
            try { return new item(id).type === "weapon"; } catch (e) { return false; }
        });
    }

    // Если оружия нет нигде
    if (!weaponID) {
        return { success: false, text: "False. I don't have a weapon to shoot with." };
    }

    // Проверяем, есть ли выбранное оружие физически у игрока
    if (!actor.init_items.includes(weaponID)) {
        return { success: false, text: `False. I don't have the ${weaponID} with me.` };
    }

    const weaponObj = new item(weaponID);

    // 2. ВЫБОР ЦЕЛИ
    
    // А) Если цель — ПЕРСОНАЖ
    if (chars.length > 0) {
        const targetName = chars[0];
        const currentLoc = GameControl.current_location;
        const targetChar = currentLoc.characters.find(c => 
            c.name.toLowerCase() === targetName.toLowerCase() || 
            (c.tokens && c.tokens.includes(targetName))
        );

        if (!targetChar) {
            return { success: false, text: `False. ${targetName} is not here.` };
        }

        // Наносим урон
        const damage = weaponObj.HarmRate || 30;
        if (targetChar.health !== null) {
            targetChar.health -= damage;
        }

        // Вербальная реакция (shoot)
        let reaction = "...";
        const reactionsList = targetChar.verbal_reactions?.["shoot"] || [];
        if (reactionsList.length > 0) {
            // Берем случайную реакцию
            reaction = reactionsList[Math.floor(Math.random() * reactionsList.length)];
        }

        return {
            success: true,
            text: `True. I fired my ${weaponID} at ${targetChar.name}. "${reaction}"`
        };
    }

    // Б) Если цель — ПРЕДМЕТ (который не является самим оружием)
    const targetItemID = items.find(id => id !== weaponID);
    if (targetItemID) {
        // Логика "shot state" как у ignite
        if (!GameControl.shot_objects) GameControl.shot_objects = [];
        
        // Добавляем в список простреленных, если еще нет
        if (!GameControl.shot_objects.includes(targetItemID)) {
            GameControl.shot_objects.push(targetItemID);
        }

        return {
            success: true,
            text: `True. I shot the ${targetItemID}. It definitely has a hole in it now.`
        };
    }

    return { success: false, text: "False. Shoot at what?" };
}

function ignite_item(entities, intended_character) {
    // 0. Извлекаем списки из entities (если они есть)
    const locs = [...(entities.location || []), ...(entities.sublocation || [])];
    const items = entities.item || [];
    const chars = entities.characters || [];

    // --- СЛУЧАЙ 1: Только локации/сублокации ---
    if (items.length === 0 && chars.length === 0) {
        if (locs.length > 0) {
            // Берем первую найденную локацию для вывода
            return `False. I cant ignite ${locs[0]}.`;
        }
        return false; // Если вообще ничего не найдено
    }

    const currentLocation = GameControl.current_location;

    // --- СЛУЧАЙ 2: Предметы ---
    if (items.length > 0) {
        const targetItemID = items[0]; // Берем первый предмет

        // A. Проверка контекста локации (если пользователь упомянул локацию)
        if (locs.length > 0) {
            // Проверяем, совпадает ли упомянутая локация с текущей (или её сублокациями)
            // Приводим к lowercase для сравнения, если токены отличаются регистром
            const isCurrentLoc = locs.some(l => 
                l === currentLocation.location_id || 
                currentLocation.sub_locations.some(sub => sub.name === l || sub.tokens.includes(l))
            );

            if (!isCurrentLoc) {
                return "Ahh, i dont know what to do, i need to be more specific.";
            }
        }

        // B. Поиск в окружении (Контейнеры в сублокациях)
        if (currentLocation && currentLocation.sub_locations) {
            for (let subLoc of currentLocation.sub_locations) {
                // Находим ID сета предметов для этой сублокации (например, "kitchen_set")
                const setId = subLoc.items_id; 
                
                // Ищем этот сет в глобальной базе ITEMSdata
                const itemSet = ITEMSdata.sets.find(s => s.id === setId);
                
                if (itemSet && itemSet.containers) {
                    // Ищем контейнер, внутри которого есть наш предмет
                    // В items.json структура: containers -> id: "shelf", items: [{id: "water_bottle"}]
                    // Нам нужно найти контейнер в базе items.json "containers", который содержит itemID
                    // ИЛИ (согласно вашему json) items.json -> sets -> containers (список ID контейнеров)
                    // А содержимое контейнеров лежит в items.json -> containers (отдельный массив)
                    
                    // 1. Ищем определение контейнера, содержащего предмет
                    const containerDef = ITEMSdata.containers.find(c => c.items && c.items.some(it => it.id === targetItemID));
                    
                    if (containerDef) {
                        // 2. Проверяем, есть ли этот контейнер в текущем сете сублокации
                        const containerInSetIndex = itemSet.containers.findIndex(c => c.id === containerDef.id);
                        
                        if (containerInSetIndex !== -1) {
                            // ЛОГИКА СЖИГАНИЯ
                            // Удаляем контейнер из текущего сета
                            const burnedContainer = itemSet.containers[containerInSetIndex];
                            itemSet.containers.splice(containerInSetIndex, 1);
                            
                            // Добавляем в список "burning" (если нужно хранить состояние где-то глобально)
                            if (!GameControl.burning_objects) GameControl.burning_objects = [];
                            GameControl.burning_objects.push(burnedContainer.id);

                            return `I have ignited the ${targetItemID} inside the ${burnedContainer.id}. The fire spread quickly, destroying everything inside.`;
                        }
                    }
                }
            }
        }

        // C. Поиск в инвентаре игрока
        if (intended_character && intended_character.init_items) {
            const itemIndex = intended_character.init_items.indexOf(targetItemID);
            if (itemIndex !== -1) {
                // Удаляем предмет из инвентаря
                intended_character.init_items.splice(itemIndex, 1);
                return `I have ignited the ${targetItemID}.`;
            }
        }

        // D. Предмет не найден нигде
        return "But i dont have this one near or with me...";
    }

    // --- СЛУЧАЙ 3: Персонажи ---
    if (chars.length > 0) {
        const targetCharName = chars[0]; // Имя персонажа (ID)

        // A. Проверка наличия персонажа в локации
        // В location.json characters - это массив строк ["Tom", "Derick"] или объектов?
        // В initializeGame они преобразуются в объекты new character(name).
        const targetCharObj = currentLocation.characters.find(c => 
            c.name.toLowerCase() === targetCharName.toLowerCase() || 
            (c.tokens && c.tokens.includes(targetCharName))
        );

        if (!targetCharObj) {
            return `Looks like i am going nuts, why am i thinking of ${targetCharName}? No one with this name near me..`;
        }

        // B. Логика урона и реакции
        // Наносим урон (больше половины, допустим -50 HP)
        if (targetCharObj.health) {
            targetCharObj.health -= 50;
            if (targetCharObj.health < 0) targetCharObj.health = 0;
        }

        // Получаем вербальную реакцию
        let reaction = "...";
        // Проверяем, есть ли реакция на "ignite", если нет - берем "attack", иначе дефолт
        if (targetCharObj.verbal_reactions) { // Обращаемся к приватному полю через геттер или напрямую если JSON
             // Примечание: В вашем классе character поля приватные (#), но они загружаются из JSON.
             // Допустим, мы обращаемся к сырым данным или геттерам. 
             // В characters.json структура: verbal_reactions: { "attack": [...] }
             // В классе character (objective_export.js) нет геттера для verbal_reactions.
             // ВАЖНО: Вам нужно добавить геттер `get verbal_reactions()` в класс Character в objective_export.js 
             // или убедиться, что свойство доступно. Предположим, оно доступно.
             
             // Т.к. в JSON нет ключа "ignite", используем "attack" как fallback
             const reactionsList = targetCharObj.verbal_reactions["ignite"] || targetCharObj.verbal_reactions["attack"];
             if (reactionsList && reactionsList.length > 0) {
                 reaction = reactionsList[0]; // Берем первую или случайную
             } else {
                 reaction = "AAAAHH!!!";
             }
        }

        return `True. You set ${targetCharObj.name} on fire! They screamed: "${reaction}"`;
    }
    return false;
}
function attack_target(entities = [], actor) {
    const chars = entities.characters || [];
    const items = entities.item || [];
    // 1) Проверка количества персонажей
    if (chars.length === 2) {
        return "False. I have only two arms...";
    }
    // Проверка условий для атаки: 1 персонаж и 1 предмет
    if (chars.length === 1 && items.length === 1) {
        const targetName = chars[0];
        const weaponId = items[0];
        const currentLocation = GameControl.current_location;
        // 2.1) Проверка: находится ли персонаж в текущей локации
        const targetChar = currentLocation.characters.find(c => 
            c.name.toLowerCase() === targetName.toLowerCase() || 
            (c.tokens && c.tokens.includes(targetName))
        );
        if (!targetChar) {
            return "False. He is not here... I'd better drink some water.";
        }
        // 2.2) Проверка: есть ли предмет у нас в инвентаре
        // Используем actor.init_items (массив ID предметов)
        if (!actor.init_items.includes(weaponId)) {
            return `False. I don't have the ${weaponId} with me.`;
        }
        // 2.3) Проверка типа предмета (Weapon)
        const weaponObj = new item(weaponId); // Создаем экземпляр, чтобы получить свойства
        
        if (weaponObj.type === "weapon") {
            // АТАКУЕМ
            
            // Наносим урон
            const damage = weaponObj.HarmRate || 0;
            if (targetChar.health !== null) {
                targetChar.health -= damage;
            }

            // Формируем реакцию
            let reactionText = "...";
            // Используем геттер verbal_reactions, добавленный на предыдущем шаге
            // Берем массив реакций для "attack"
            const reactions = targetChar.verbal_reactions?.["attack"] || [];
            
            if (reactions.length > 0) {
                // Берем случайную реакцию из первых двух (или единственную, если она одна)
                // Math.random() < 0.5 ? 0 : 1 — простой рандом для двух вариантов
                const limit = Math.min(reactions.length, 2);
                const randomIndex = Math.floor(Math.random() * limit);
                reactionText = reactions[randomIndex];
            }

            let output = `True. I attacked ${targetChar.name} with ${weaponId} and caused them merciless pain. 
            
            ${targetChar}:"${reactionText}"`;

            // Проверка на смерть
            if (targetChar.health <= 0) {
                // Удаляем персонажа с локации
                const index = currentLocation.characters.indexOf(targetChar);
                if (index > -1) {
                    currentLocation.characters.splice(index, 1);
                }
                output += ` ${targetChar.name} falls to the ground, motionless.`;
            }

            return output;
        } else {
            // Если предмет не оружие (например, попытался атаковать с "apple")
            return `False. Using ${weaponId} as a weapon is not a good idea.`;
        }
    }
    // Если условия (1 char & 1 item) не соблюдены
    return "False. I have to decide who to attack and how... Yet it doesn't make sense...";
}
function go_to(entities, actor) {
    const locs = [...(entities.location || []), ...(entities.sublocation || [])];
    const items = entities.item || [];
    const chars = entities.characters || [];

    // 1) Проверка: только ли локации в entities?
    // Если есть предметы или персонажи — паника.
    if (items.length > 0 || chars.length > 0) {
        return "False. I dont know what to do.... Inhale, Exhale... i have to keep concioousness....";
    }

    if (locs.length === 0) {
        return "False. Go where?";
    }
    const currentLocObj = GameControl.current_location;
    const currentLocID = currentLocObj.location_id;
    // Предполагаем, что текущая сублокация хранится в GameControl.active_sub_location
    // Если null, значит мы в "общей зоне" локации
    const currentSubLocID = GameControl.active_sub_location || null; 

    // Хелпер для смены локации (выход из сцены или переход по списку)
    const moveSceneLocation = () => {
        const sceneLocs = GameControl.scene.scene_locations; // Список локаций сцены
        // Ищем индекс текущей локации в списке сцены
        const currentIndex = sceneLocs.findIndex(l => l.location_id === currentLocID);
        
        if (currentIndex === -1) return "False. I am lost.";

        let nextIndex = currentIndex + 1;
        
        // Если +1 никак (последний элемент), идем назад
        if (nextIndex >= sceneLocs.length) {
            nextIndex = currentIndex - 1;
        }

        // Если и назад никак (всего 1 локация), то выходить некуда
        if (nextIndex < 0) {
            return "False. There is nowhere else to go.";
        }

        const nextLocData = sceneLocs[nextIndex];
        
        // ПЕРЕМЕЩЕНИЕ:
        // 1. Обновляем локацию
        // Нам нужно создать новый объект location, но для этого нужен импорт класса location.
        // Поскольку GameControl хранит инстанс, мы можем попробовать обновить его или (лучше) 
        // предполагаем, что initializeGame перезагрузит или мы просто меняем ID.
        // Для простоты здесь мы имитируем смену:
        
        // ВАЖНО: В реальном коде вам нужно пересоздать объект location:
        // GameControl.current_location = new location(nextLocData.location_id);
        // Но так как у нас нет доступа к конструктору внутри этой функции без импорта, 
        // мы вернем специальную строку-инструкцию или изменим объект напрямую, если структура позволяет.
        
        // Хак для изменения текущей локации "на лету" (требует, чтобы entity_export был доступен):
        // GameControl.current_location = new location(nextLocData.location_id); 
        // Так как мы внутри модуля, где location импортирован (см. начало файла action_engine), мы можем это сделать?
        // В начале файла action_engine импортируется { item, GameControl }. Класс location НЕ импортирован.
        // НУЖНО ДОБАВИТЬ location В ИМПОРТЫ.
        
        return { 
            success: true, 
            type: "scene_move", 
            target_id: nextLocData.location_id, 
            sub_target: nextLocData.sub_locations_id || null // Дефолтная сублокация из сцены
        };
    };

    // --- ЛОГИКА ДЛЯ 2 СУЩНОСТЕЙ ---
    if (locs.length === 2) {
        // Один из них должен быть равен текущей локации или сублокации
        const isLoc0_Current = (locs[0] === currentLocID || locs[0] === currentSubLocID);
        const isLoc1_Current = (locs[1] === currentLocID || locs[1] === currentSubLocID);

        if (!isLoc0_Current && !isLoc1_Current) {
            return "False. I am not near any of these places.";
        }

        // Определяем цель (target) - это тот, кто НЕ является текущим
        // Если оба текущие (например "Go form kitchen to kitchen"), берем второй как цель, но это глупо.
        // Логичнее:
        let target = isLoc0_Current ? locs[1] : locs[0];

        // 1. Проверка на EXIT
        if (target.includes("exit") || target === "exit") { // Упрощенная проверка на токен exit
             const result = moveSceneLocation();
             if (typeof result === "string") return result; // Ошибка
             
             // Применяем перемещение (возвращаем инструкции для контроллера или меняем state тут)
             // Допустим, мы возвращаем текст успеха, а state меняем через GameControl (если есть доступ к сеттерам)
             // Или возвращаем спец объект, который обработает gameprocess.
             // Для совместимости с текущим action_identifier, мы вернем строку, но сперва обновим состояние.
             
             // ВРЕМЕННОЕ РЕШЕНИЕ: Возвращаем строку с инструкцией, которую надо распарсить? 
             // Нет, лучше изменим GameControl здесь, если можем.
             // Но у нас нет конструктора location.
             // Поэтому просто вернем True и опишем действие, предполагая, что движок обновит UI.
             
             // *ВАЖНО*: Для полной работы нужно импортировать `location` в action_engine.js.
             return `True. Leaving ${currentLocID}... Moving to ${result.target_id}.`;
        }

        // 2. Проверка: является ли target сублокацией текущей локации?
        const isSubLoc = currentLocObj.sub_locations.some(sub => sub.name === target || sub.tokens.includes(target));
        
        if (isSubLoc) {
            GameControl.active_sub_location = target;
            return `True. Moved to ${target}.`;
        }
        
        // 3. Проверка: является ли target локацией из Scene Data?
        const sceneLocs = GameControl.scene.scene_locations;
        const isSceneLoc = sceneLocs.some(l => l.location_id === target);
        
        if (isSceneLoc) {
             // Это перемещение в другую комнату (но она должна быть в списке сцены)
             // Если это соседняя комната или доступная - переходим.
             // Но по вашему правилу "Если второй равен сублокации... ИЛИ локации в списке... даем перемещение".
             // Значит, если target - это ID локации (например "Init_house"), мы идем туда?
             // Если мы уже в Init_house, то ничего не меняется, только sub_loc сбрасывается.
             
             if (target === currentLocID) {
                 GameControl.active_sub_location = null;
                 return `True. I am in the main area of ${target} now.`;
             } else {
                 // Переход в другую локацию сцены (телепортация или дверь?)
                 // Если логика разрешает прыгать по локациям сцены:
                 return `True. Moved to location ${target}.`;
             }
        }

        return "False. I can't go there from here.";
    }

    // --- ЛОГИКА ДЛЯ 1 СУЩНОСТИ ---
    if (locs.length === 1) {
        const target = locs[0];

        // 1. Sub-location entity is EXIT
        if (target.includes("exit") || target === "exit") {
             const result = moveSceneLocation();
             if (typeof result === "string") return result;
             return `True. Leaving area... Moving to ${result.target_id}.`;
        }

        // 2. Является сублокацией текущей локации?
        const subLocObj = currentLocObj.sub_locations.find(sub => sub.name === target || sub.tokens.includes(target));
        
        if (subLocObj) {
            // Двигаемся в сублокацию
            GameControl.active_sub_location = target; // Или subLocObj.name
            return `True. Moved to ${subLocObj.name}.`;
        }
        
        // 3. ВАЖНОЕ ПРАВИЛО: Если target равен текущей локации (или просто локация), сбрасываем sub_location в null
        // Проверяем, это имя текущей локации?
        if (target === currentLocID || currentLocObj.location_n === target) {
            GameControl.active_sub_location = null;
            return `True. I stepped back to the main area of ${target}.`;
        }

        return "False. I don't see that place here.";
    }
}


// ОБНОВЛЕННЫЙ ACTION_IDENTIFIER
export function action_identifier(intent_object = AP_operator.Aintent, entities = AP_operator.entities){
  const actor = GameControl.player ?? GameControl.getChar("Me");
  let result = null;
  let logStatus = {};

  // 1. ВЫПОЛНЕНИЕ ОСНОВНОГО ДЕЙСТВИЯ
  switch(intent_object){
    case "ignite": {
        const res = ignite_item(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    case "attack": {
        const res = attack_target(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    case "go": {
        const res = go_to(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    case "cut": {
        const resObj = cut_item(entities, actor);
        result = resObj.text;
        logStatus = { success: resObj.success, reason: resObj.text };
        break;
    }
    case "eat": 
    case "drink": {
        const res = consume_item(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    // ДОБАВЛЕН SHOOT
    case "shoot": {
        const resObj = shoot_target(entities, actor);
        result = resObj.text;
        logStatus = { success: resObj.success, reason: resObj.text };
        break;
    }
    case "wear": {
        const res = wear_item(entities, actor);
        result = res;
        logStatus = { success: res.startsWith("True"), reason: res };
        break;
    }
    case "give": {
    const res = give_item(entities, actor);
    result = res;
    logStatus = { success: res.startsWith("True"), reason: res };
    break;
    }
    default:
        result = false;
        logStatus = { success: false, reason: "Unknown intent" };
  }

  // 2. ПРОВЕРКА СМЕРТЕЙ (CHECK DEATHS)
  // Проверяем только если действие прошло успешно и вернуло текст
  if (result && typeof result === 'string' && !result.startsWith("False")) {
      const currentLoc = GameControl.current_location;
      
      // Проходимся циклом с конца, чтобы безопасно удалять элементы (splice)
      if (currentLoc && currentLoc.characters) {
          for (let i = currentLoc.characters.length - 1; i >= 0; i--) {
              const char = currentLoc.characters[i];
              
              // Не удаляем самого игрока здесь (это логика Game Over)
              if (char.name !== "Me") {
                  // Если здоровье упало до 0 или ниже
                  if (char.health !== null && char.health <= 0) {
                      // 1. Удаляем персонажа из локации
                      currentLoc.characters.splice(i, 1);
                      
                      // 2. Добавляем текст смерти к ответу
                      result += ` ${char.name} falls to the ground, motionless. They are dead.`;
                      
                      // Опционально: можно добавить запись в лог
                      if (logStatus) logStatus.death = char.name;
                  }
              }
          }
      }
  }

  // 3. ЗАПУСК ЦИКЛА ГОЛОДА
  if (intent_object) {
      const hungerReport = update_hunger_state();
      
      if (hungerReport && hungerReport.length > 0) {
          if (result === false) result = "I couldn't do that, but time passes...";
          result = result + "\n\n" + hungerReport;
      }
  }

  // 4. ЛОГИРОВАНИЕ
  if (result) {
      Logger.add_log({
          command_raw: AP_operator.RawTXT || "Unknown command",
          command_formatted: { 
              action: intent_object, 
              entity: entities 
          },
          status: logStatus
      });
  }

  return result;
}


class task_processor{
    constructor(RawTXT = null, PurePMT = null, entities=[], intent=null){
        this.RawTXT = RawTXT;
        this.PurePMT = PurePMT;
        this.Aintent = intent;
        this.entities = entities
    }
    async main(input) {
        if (!input || typeof input !== "string") {
            return null;
        }
        try {
            const response = await fetch("http://144.21.63.243:8000/parse", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text: input })
            });
            const data = await response.json();
            const intentName = data?.intent?.name ?? null;
            const confidence = data?.intent?.confidence ?? 0;
            this.Aintent = intentName;
            this.confidence = confidence;
            this.entities = data?.entities ?? [];
            return {
                intent: intentName,
                confidence
            };
        } catch (error) {
            console.warn(
                "[action_engine] Rasa unavailable, using fallback.",
                error
            );
            this.Aintent = inpsample.intent.name;
            this.entities = inpsample.entities;
            return {
                intent: inpsample.intent.name,
                confidence: inpsample.intent.confidence ?? 0
            };
        }
    }
    get_entities(text){
      this.entities = match_items(text);
      return this.entities;

    }
}

export async function textprocess(text){
  if (!text) {
    return null;
  }
  AP_operator.RawTXT = text.trim()
  AP_operator.PurePMT = await AP_operator.main(AP_operator.RawTXT)
  AP_operator.get_entities(AP_operator.RawTXT)
  return AP_operator.PurePMT
}


const AP_operator = new task_processor()

/*
--------------------------------------------------------------
СПРАВОЧНИК ДЛЯ ACTION ENGINE:
- Получение персонажа:
    const actor = GameControl.player ?? GameControl.getChar("Me");
    const ally = GameControl.getChar("Dominic");

- Работа с инвентарём:
    actor.getInventory();     // массив id предметов
    actor.hasItem("knife");   // true/false
    actor.addItem("torch");   // добавить
    actor.removeItem("torch");// удалить

- Обращение к классу предмета:
    const torch = new item("lighter");
    torch.functionality;   // действие
    torch.ignitable;       // поведение при поджоге
    torch.movable.access;  // можно ли поднять

- Обновление состояния:
    GameControl.setLocation("Init_house", "kitchen");
    GameControl.setChar("NewGuy", new character("Tom")); // требует import { character }
--------------------------------------------------------------
*/
