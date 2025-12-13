//Action engine controls interraction between entities 
import { match_items } from 'event_control/action control/parse_engine.js/semantic_parser.js'
import { character } from 'event_control/entity system/entity_init/objective_export.js'

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



function ignite_item(entities){
    for(let i = 0; i<entities.length(), i++){  
      if(!(intented_character.init_items).includes(entities.characters[i])){
        return
      }
    }
 

}


function action_identifier(intent_object=this.Aintent, entities = this.entities){
  switch(Aintent){
    case "ignite":
        const intented_character = character("Me")
        ignite_item(this.entities, intented_character)
    
  }



}


class task_processor{
    constructor(RawTXT = null, PurePMT = null, entities={}, intent=null){
        this.RawTXT = RawTXT;
        this.PurePMT = PurePMT;
        this.Aintent = Aintent;
        this.entities = entities
    }
    async main(string) {
        const response = await fetch('myAPI', {
          method: 'POST',
          headers: {
            'User-Agent': 'undici-stream-example',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        console.log(data);
        this.Aintent = data.intent.name
        return data
    }
    get_entities(text){
      this.entities = match_items(text);

    }
}

function textprocess(text){
  AP_operator.RawTXT = text.trim()
  this.PurePMT = await AP_operator.main(AP_operator.RawTXT)
  task_processor.get_entities(this.RawTXT)

    

}


AP_operator = new task_processor()


