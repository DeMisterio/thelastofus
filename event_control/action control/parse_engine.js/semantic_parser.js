export const LOCATIONdata = JSON.parse("event_control/entity system/entities/locations/location.json", "utf-8")
export const CHARACTERdata = JSON.parse("event_control/entity system/entities/Characters/characters.json", "utf-8")
export const ITEMSdata = JSON.parse("event_control/entity system/entities/items/items.json", "utf-8")
import { levenshteinDistance } from 'event_control/action control/parse_engine.js/livenstein.js'
import { tokenized } from 'event_control/action control/parse_engine.js/tokenizer.js'


export function typisation_init(LOCATIONdata=LOCATIONdata, CHARACTERdata = CharacterData, ITEMSdata = ITEMSdata){
    // Will basically conver the database
    let entity_db = {}
    //Converting locations
    let location_db = {}
    for (let i = 0; i < LOCATIONdata.length; i++) {
        let sub_loc_data = {}

        for (let z = 0; z < LOCATIONdata[i].sub_locations.length; z++) {
            const sub = LOCATIONdata[i].sub_locations[z]
            sub_loc_data[sub.name] = sub.tokens
        }

        location_db[LOCATIONdata[i].id] = sub_loc_data
    }
    //converting characters
    let characters_db = {}
    for (let i = 0; i < CHARACTERdata.length; i++) {
        characters_db[CHARACTERdata[i].name] = CHARACTERdata[i].tokens
    }
    //converting items containters
    let items_db = {}

    // convert containers
    let containers_obj = {}
    for (let i = 0; i < ITEMSdata.containers.length; i++) {
        const c = ITEMSdata.containers[i]
        containers_obj[c.id] = c.tokens
    }

    // convert items
    let items_obj = {}
    for (let i = 0; i < ITEMSdata.items.length; i++) {
        const it = ITEMSdata.items[i]
        items_obj[it.id] = it.tokens
    }

    // assemble
    items_db["containers"] = containers_obj
    items_db["items"] = items_obj
    items_db["containers"] = contairer_list
    item_db["items"] = items_list
    
    entity_db["locations"] = location_db
    entity_db["characters"] = characters_db
    entity_db['items']= items_db
    return entity_db
}


let test_data = {


  "characters": {
    "Nolan": ["nolan"],
    "Father": ["father", "dad"],
    "Guard": ["guard"]
  },

  "items": {
    "containers": {
      "backpack": ["backpack"],
      "drawer": ["drawer"],
      "cabinet": ["cabinet"]
    },

    "items": {
      "passport": ["passport"],
      "pistol": ["pistol"],
      "razor_blades": ["razor", "blades"],
      "hunting_knife": ["hunting", "knife"],
      "fishing_rod": ["fishing", "rod"],
      "toothbrush": ["toothbrush"],
      "stale_bread": ["stale", "bread"]
    }
  },
    locations: {
    Init_house: {
        tokens: ["init", "house"],
        sublocations: {
        kitchen: {
            tokens: ["kitchen"]
        },
        living_room: {
            tokens: ["living", "room"]
        }
        }
    },

    Forest: {
        tokens: ["forest"],
        sublocations: {
        deep_forest: {
            tokens: ["deep", "forest"]
        },
        clearing: {
            tokens: ["clear", "area"]
        }
        }
    }
    }
}

function match_items(sentence, entity_db){
    let user_tokens = sentence
    let all_candidates = []
    let sentence_token_winners = {}
    let responce = {}
    for(let i = 0; i < entity_db.length(); i++){
        
        if(Object.keys(entity_db[i]) == "locations"){
            
            for(let z = 0; z < Object.values(entity_db[i]).length(); z++){
                let entity_id = Object.keys(entity_db[i][z])
                for(let u = 0; u < Object.valued(entity_db[i][z]).length; u++){
                    if(Object.keys(entity_db[i][z][u]) == "tokens"){
                        let entity_token = Object.values(Object.values(entity_db[i])[z][u])
                        let entity_name = entity_id
                        //like Forest for tokens inside 
                        let match_data = {
                        "id": entity_name,
                        "is_complex": entity_token.length() > 1 ? true : false,
                        "token_matches": [],
                        "probability": 0.0,
                        'max_single_token_score': 0.0
                        } 
                        let total_token_prob = 0
                        let matched_indices_in_sentence =[]
                        for(let e_tok = 0; e_tok < entity_token.length(); e_tok++){
                            let best_word_score = -1;
                            let best_word_index = -1;
                            let best_word_match = "";
                            for(let s_tok = 0; s_tok < sentence.length(); s_tok++){
                                let score = levenshteinDistance(entity_token[e_tok], sentence[s_tok].word)
                                if(score > best_word_score){
                                    best_word_score = score;
                                    best_word_match = sentence[s_tok].word;
                                    best_word_index = sentence[s_tok].orig_index
                                }
                            }
                            if (best_word_score > match_data.max_single_token_score){
                                match_data.max_single_token_score = best_word_score
                            }

                            match_data.token_matches.push({
                                'token': entity_token[e_tok],
                                'matched_with': best_word_score,
                                'index_in_sentence': best_word_index
                            })
                            total_token_prob += best_word_score;
                            matched_indices_in_sentence.push(best_word_index)
                        }
                        let avg_token_prob = total_token_prob / entity_token.length()
                        if(!match_data.is_complex){
                            match_data.probability = avg_token_prob
                        }else{
                            let sorted_indices = matched_indices_in_sentence.sort()
                            let dist_sum = 0
                            let comparisons = 0
                            if(sorted_indices.length() > 1){
                                for(let k = 0;  k < sorted_indices.length(); k++){
                                    dist_sum += (sorted_indices[k+1]-sorted_indices[k])
                                    comparisons +=1
                                }
                                avg_index_distance = 1
                            }
                            let compactness = 1.0 / (avg_index_distance > 0 ? avg_index_distance : 1)
                            match_data.probability = avg_token_prob * compactness

                        }
                        all_candidates.push(match_data)
                        for(let tm = 0; tm<match_data.token_matches.length(); tm++){
                            let idx = match_data.token_matches[tm].index_in_sentence
                            let score = match_data.token_matches[tm].distance_score
                            if(!sentence_token_winners.includes(idx) || score > sentence_token_winners[idx].score){
                                sentence_token_winners[idx] = {
                                    'item_id': entity_id,
                                    'score':score,
                                    'token_used': match_data.token_matches[tm].token
                                }
                            }
                        }
                    }else {
                        for(let y = 0; y<Object.values(entity_db[i][z]).length(); y++){

                        }}
                    

                    
                
            }}
            
        all_candidates.sort((a, b) => b.probability - a.probability)
        let top_candidates = all_candidates.slice(0, 3)
        
        
        let final_winner = null
        let complex_candidates = top_candidates.filter(c => c.is_complex)
        let potential_complex_winner =null
        for(let cand = 0; cand < complex_candidates.length(); cand++){
            let has_support = false;
            for(let tm = 0; tm < complex_candidates[cand].token_matches; tm++){
                let idx = complex_candidates[cand].token_matches[tm].index_in_sentence
                if(sentence_token_winners.includes(idx)){
                    if(sentence_token_winners.idx.item_id == complex_candidates[cand].id){
                        has_support = true
                        break
                    }
                }
            }
            if(has_support){
                potential_complex_winner = cand
                break
            }
        }
        if(potential_complex_winner){
            let best_overall = top_candidates[0]
            if(potential_complex_winner.probability >= best_overall.probability){
                final_winner = potential_complex_winner
            }else{ final_winner= best_overall}
        }else{ final_winner = top_candidates[0]}
        let result = []
        STRICT_THRESHOLD = 0.85;
        SOFT_THRESHOLD = 0.65;
        function check_worthiness(cand){
            if(cand.probability > STRICT_THRESHOLD){
                return true, "High Provavility"
            }
            if((cand.probability) > SOFT_THRESHOLD && cand.max_single_token_score >=0.9){
                return True, 'Soft Threshold + strong token support'
            }
            return false, "Low Probability"
        }    
        is_worthy, reason = check_worthiness(final_winner)
        if(is_worthy){
            result.push(final_winner)
            for(let cand = 0; canc < top_candidates.length(); cand++){
                if(top_candidates[cand].id != final_winner.id){
                    card_worthy, cand_reason = check_worthiness(top_candidates[cand])
                    if(card_worthy){
                        result.push(top_candidates[cand])
                    }
                }
            }
        }
    
    responce['locations'] = result
    result = []
    }
        }













}
















