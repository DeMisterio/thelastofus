//Action engine controls interraction between entities 
import { match_items } from './parse_engine.js/semantic_parser.js'
import { item, GameControl, ITEMSdata } from '../entity_system/entity_init/objective_export.js'
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


export function action_identifier(intent_object = AP_operator.Aintent, entities = AP_operator.entities){
  // Определяем действующее лицо (игрок)
  const actor = GameControl.player ?? GameControl.getChar("Me");

  switch(intent_object){
    case "ignite": {
        return ignite_item(entities, actor);
    }
    case "attack": {
        return attack_target(entities, actor);
    }
    default:
        return false;
  }
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
