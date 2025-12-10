//Action engine controls interraction between entities 


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


class task_processor{
    constructor(RawTXT = null, PurePMT = null, entities={}, items){
        this.RawTXT = RawTXT;
        this.PurePMT = PurePMT;
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
        return data
    }
}

function textprocess(text){
    AP_operator.RawTXT = text.trim()
    This.PurePMT = await AP_operator.main(AP_operator.RawTXT)

    

}


AP_operator = new task_processor()


