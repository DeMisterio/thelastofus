export const LOCATIONdata = JSON.parse("event_control/entity system/entities/locations/location.json", "utf-8")
export const CHARACTERdata = JSON.parse("event_control/entity system/entities/Characters/characters.json", "utf-8")
export const ITEMSdata = JSON.parse("event_control/entity system/entities/items/items.json", "utf-8")


def match_items(sentence, item_db):
    user_tokens = clean_and_tokenize(sentence)
    all_candidates = []
    sentence_token_winners = {} 


    for item in item_db:
        item_tokens = item["tokens"]
        match_data = {
            "id": item["id"],
            "is_complex": len(item_tokens) > 1,
            "token_matches": [],
            "probability": 0.0,
            "max_single_token_score": 0.0 
        }
        total_token_prob = 0
        matched_indices_in_sentence = []
        for i_tok in item_tokens:
            best_word_score = -1
            best_word_index = -1
            best_word_match = ""   
            for u_tok in user_tokens:
                score = levenshtein_similarity(i_tok, u_tok["word"])
                if score > best_word_score:
                    best_word_score = score
                    best_word_match = u_tok["word"]
                    best_word_index = u_tok["orig_index"]
            
            if best_word_score > match_data["max_single_token_score"]:
                match_data["max_single_token_score"] = best_word_score

            match_data["token_matches"].append({
                "token": i_tok,
                "matched_with": best_word_match,
                "distance_score": best_word_score,
                "index_in_sentence": best_word_index
            })
            
            total_token_prob += best_word_score
            matched_indices_in_sentence.append(best_word_index)

        avg_token_prob = total_token_prob / len(item_tokens)

        if not match_data["is_complex"]:
            match_data["probability"] = avg_token_prob
        else:
            sorted_indices = sorted(matched_indices_in_sentence)
            dist_sum = 0
            comparisons = 0
            if len(sorted_indices) > 1:
                for k in range(len(sorted_indices) - 1):
                    dist_sum += (sorted_indices[k+1] - sorted_indices[k])
                    comparisons += 1
                avg_index_distance = dist_sum / comparisons
            else:
                avg_index_distance = 1 
            
            compactness = 1.0 / (avg_index_distance if avg_index_distance > 0 else 1)
            match_data["probability"] = avg_token_prob * compactness

        all_candidates.append(match_data)
        
        for tm in match_data["token_matches"]:
            idx = tm["index_in_sentence"]
            score = tm["distance_score"]
            if idx not in sentence_token_winners or score > sentence_token_winners[idx]["score"]:
                sentence_token_winners[idx] = {
                    "item_id": item["id"], 
                    "score": score,
                    "token_used": tm["token"]
                }

    all_candidates.sort(key=lambda x: x["probability"], reverse=True)
    top_candidates = all_candidates[:3]

    
    final_winner = None
    complex_candidates = [c for c in top_candidates if c["is_complex"]]
    potential_complex_winner = None
    
    
    for cand in complex_candidates:
        has_support = False
        for tm in cand["token_matches"]:
            idx = tm["index_in_sentence"]
            if idx in sentence_token_winners:
                if sentence_token_winners[idx]["item_id"] == cand["id"]:
                    has_support = True
                    break
        if has_support:
            potential_complex_winner = cand
            break 
            
    
    if potential_complex_winner:
        best_overall = top_candidates[0]
        if potential_complex_winner["probability"] >= best_overall["probability"]:
            final_winner = potential_complex_winner
        else:
             final_winner = best_overall
    else:
        final_winner = top_candidates[0]

    -
    print("\n" + "="*40)
    print(f"DEBUG LOG FOR: '{sentence}'")
    print(f"Cleaned Tokens: {[t['word'] for t in user_tokens]}")
    print("-" * 20)
    print("TOP 3 Candidates:")
    for c in top_candidates:
        print(f"  > {c['id']}: Prob {c['probability']:.2f} | MaxToken {c['max_single_token_score']:.2f} | Complex? {c['is_complex']}")
    
    print("-" * 20)
    print("Sentence Token Winners (Word Context):")
    for idx in sorted(sentence_token_winners.keys()):
        win = sentence_token_winners[idx]
        word = [u['word'] for u in user_tokens if u['orig_index'] == idx][0]
        print(f"  Word '{word}' (idx {idx}) -> Won by '{win['item_id']}' (Score: {win['score']:.2f})")
    
    print("-" * 20)
    print(f"Potential Complex Winner: {potential_complex_winner['id'] if potential_complex_winner else 'None'}")
    print(f"Selected Candidate (Pre-Filter): {final_winner['id']}")

   
    result = []
    STRICT_THRESHOLD = 0.85
    SOFT_THRESHOLD = 0.65 
    
    def check_worthiness(cand):
        
        if cand["probability"] > STRICT_THRESHOLD:
            return True, "High Probability"
        
        if cand["probability"] > SOFT_THRESHOLD and cand["max_single_token_score"] >= 0.9:
            return True, "Soft Threshold + Strong Token Support"
        return False, "Low Probability"

    is_worthy, reason = check_worthiness(final_winner)
    
    if is_worthy:
        print(f"Decisison: ACCEPTED '{final_winner['id']}' ({reason})")
        result.append(final_winner)
        
        
        for cand in top_candidates:
            if cand["id"] != final_winner["id"]:
                cand_worthy, cand_reason = check_worthiness(cand)
                if cand_worthy:
                    result.append(cand)
                    break 
    else:
        print(f"Decisison: REJECTED '{final_winner['id']}' ({reason})")

    print("="*40 + "\n")
    return result



function typisation(LOCATIONdata=LOCATIONdata, CHARACTERdata = CharacterData, ITEMSdata = ITEMSdata){
    let location_db = {}
    for(let i = 0; i< LOCATIONdata.lenght(), i++){
        let sub_loc_data = {}
        for(let z = 0; z < LOCATIONdata[i].sub_locations.length(); z++){
            sub_loc_data[LOCATIONdata[i].sub_locations[z].name] = LOCATIONdata[i].sub_locations[z].tokens 
        }
        location_db[LOCATIONdata[i].id] = sub_loc_data
    }
    let characters_db = {}
    for(let i = 0; i< CHARACTERdata.lenght(), i++){
        let sub_loc_data = {}
        for(let z = 0; z < LOCATIONdata[i].sub_locations.length(); z++){
            sub_loc_data[LOCATIONdata[i].sub_locations[z].name] = LOCATIONdata[i].sub_locations[z].tokens 
        }
        location_db[LOCATIONdata[i].id] = sub_loc_data
    }
    


}
export function match(sentence, item)