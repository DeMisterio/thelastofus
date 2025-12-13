//Action engine controls interraction between entities 
import { match_items } from 'event_control/action control/parse_engine.js/semantic_parser.js'
import { item, GameControl } from 'event_control/entity system/entity_init/objective_export.js'

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



function ignite_item(entities = [], intended_character) {
    if (!intended_character) {
        return false;
    }

    const targetItems = entities
        .filter((entity) => entity.entity === "item")
        .map((entity) => entity.value);

    if (targetItems.length === 0) {
        return false;
    }

    const missingItem = targetItems.find((itemId) => !intended_character.hasItem(itemId));
    if (missingItem) {
        return false;
    }

    const ignitableItems = targetItems.map((itemId) => new item(itemId));
    return ignitableItems.every((itm) => {
        const ignitionDescriptor = itm.ignitable ?? [];
        const flag = Array.isArray(ignitionDescriptor) ? ignitionDescriptor[0] : ignitionDescriptor;
        return flag === true || flag === "true";
    });
}


export function action_identifier(intent_object = AP_operator.Aintent, entities = AP_operator.entities){
  switch(intent_object){
    case "ignite": {
        const intended_character = GameControl.player ?? GameControl.getChar("Me");
        return ignite_item(entities, intended_character);
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
    async main(string) {
        if (!string) {
            return null;
        }
        const payload = { text: string };
        try {
            const response = await fetch('myAPI', {
              method: 'POST',
              headers: {
                'User-Agent': 'undici-stream-example',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });
            const data = await response.json();
            this.Aintent = data.intent?.name ?? null;
            this.entities = data.entities ?? [];
            return data;
        } catch (error) {
            console.warn('[action_engine] Falling back to local sample due to request error.', error);
            this.Aintent = inpsample.intent.name;
            this.entities = inpsample.entities;
            return inpsample;
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
