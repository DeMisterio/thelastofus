



mydict = [{
        "id": "ac_remote",
        "tokes":["ac", "remote"],
        "type": "device",
        "NV": None,
        "Eating_speed": None,
        "effect": None,
        "functionality": None,
        "HarmRate": None,
        "movable": {"access": True, "weight": 1}
    },
    {
        "id": "passport",
        "tokes":["passport"],
        "type": "document",
        "NV": None,
        "Eating_speed": None,
        "effect": None,
        "functionality": "verify_identity",
        "HarmRate": None,
        "movable": {"access": True, "weight": 1}
    },
    {
        "id": "cash",
        "tokes":["cash"],
        "type": "valuable",
        "NV": None,
        "Eating_speed": None,
        "effect": None,
        "functionality": "trade",
        "HarmRate": None,
        "movable": {"access": True, "weight": 1}
    },
    {
        "id": "stale_bread",
        "tokes":["stale", "bread"],
        "type": "food",
        "NV": 80,
        "Eating_speed": 4,
        "effect": "poisonous",
        "functionality": None,
        "HarmRate": 5,
        "movable": {"access": True, "weight": 1}
    },
    {
        "id": "nolan_father_photo",
        "tokes":["nolan", "mother", "photo"],
        "type": "sentimental",
        "NV": None,
        "Eating_speed": None,
        "effect": None,
        "functionality": "cry",
        "HarmRate": None,
        "movable": {"access": True, "weight": 1}
    },
    {
        "id": "hunting_knife",
        "tokes":["hunting", "knife"],
        "type": "weapon",
        "NV": None,
        "Eating_speed": None,
        "effect": None,
        "functionality": "attack",
        "HarmRate": 40,
        "movable": {"access": True, "weight": 3}
    },
    {
        "id": "fishing_rod",
        "tokes":["fishing", "rod"],
        "type": "tool",
        "NV": None,
        "Eating_speed": None,
        "effect": None,
        "functionality": "hook",
        "HarmRate": 4,
        "movable": {"access": True, "weight": 4}
    },
    {
        "id": "pistol",
        "tokes":["pistol"],
        "type": "weapon",
        "NV": None,
        "Eating_speed": None,
        "effect": None,
        "functionality": "shoot",
        "HarmRate": 90,
        "movable": {"access": True, "weight": 5}
    },
    {
        "id": "letter",
        "tokes":["letter"],
        "type": "document",
        "NV": None,
        "Eating_speed": None,
        "effect": None,
        "functionality": "read",
        "HarmRate": None,
        "movable": {"access": True, "weight": 1}
    },
        {
      "id": "sponge",
      "tokes":["sponge"],
      "type": "tool",
      "NV": None,
      "Eating_speed": None,
      "effect": None,
      "functionality": "clean",
      "HarmRate": 0,
      "movable": { "access": True, "weight": 1 }
    },
    {
      "id": "toothbrush",
      "tokes":["toothbrush"],
      "type": "hygiene",
      "NV": None,
      "Eating_speed": None,
      "effect": None,
      "functionality": None,
      "HarmRate": 0,
      "movable": { "access": True, "weight": 1 }
    },
    {
      "id": "razor_blades",
      "tokes":["razor", "blades"],
      "type": "tool",
      "NV": None,
      "Eating_speed": None,
      "effect": None,
      "functionality": "attack",
      "HarmRate": 40,
      "movable": { "access": True, "weight": 1 }
    },
    {
      "id": "toothpaste",
      "tokes":["toothpaste"],
      "type": "hygiene",
      "NV": None,
      "Eating_speed": None,
      "effect": None,
      "functionality": None,
      "HarmRate": 0,
      "movable": { "access": True, "weight": 1 }
    },
    {
        "id": "pillow",
        "tokes":["pillow"],
        "type": "comfort",
        "NV": None,
        "Eating_speed": None,
        "effect": None,
        "functionality": None,
        "HarmRate": 1,
        "movable": {"access": True, "weight": 1}
    }]


def index_closure(indexes: list[int]) -> float:
    n = len(indexes)
    if n<2:
        return 0.0
    distances = []
    for i in range(n):
        for j in range(i+1, n):
            distances.append(abs(indexes[i] - indexes[j]))
    return sum(distances)/len(distances)
def levenshtein_distance(str1, str2):
    len_str1 = len(str1) + 1
    len_str2 = len(str2) + 1
    matrix = [[0] * len_str2 for _ in range(len_str1)]


    for i in range(len_str1):
        matrix[i][0] = i
    for j in range(len_str2):
        matrix[0][j] = j

    # Fill in the matrix
    for i in range(1, len_str1):
        for j in range(1, len_str2):
            if str1[i - 1] == str2[j - 1]:
                cost = 0
            else:
                cost = 1

            matrix[i][j] = min(
                matrix[i - 1][j] + 1,   # Deletion
                matrix[i][j - 1] + 1,   # Insertion
                matrix[i - 1][j - 1] + cost  # Substitution
            )

    return matrix[len_str1 - 1][len_str2 - 1]

def closure_counter(tokenized_sentence):
    full_item_list = {}
    rubbish_list = [
    "a", "the", "on", "in", "for", "out",
    "of", "to", "and", "is", "it", "at",
    "with", "as", "by", "from", "up", "about",
    "into", "over", "after", "under", "again",
    "further", "then", "once", "here", "there",
    "when", "where", "why", "how", "all", "any",
    "both", "each", "few", "more", "most", "other",
    "some", "such", "no", "nor", "not", "only",
    "own", "same", "so", "too", "very", "can",
    "will", "just","please", "could"
    ]
    check_index = 0
    for checker in tokenized_sentence:
        if checker in rubbish_list:
            del tokenized_sentence[check_index]
        check_index +=1
    log_list =[]                                                                                                                 
    for item in mydict:
        #Going for each item in item list
        item_tokens = item["tokens"]
        item_id = item['id']
        item_dict = {}
        for word in tokenized_sentence:
            #Going through each word in our sentence
            
            counter = 0
            for token in item_tokens:
                tokens_list = []
                #going through each token in our item tokens 
                token_dict= {}
                token_dict[token] = levenshtein_distance(token, word)
                init_index = counter
                token_dict["index"] = counter
                tokens_list.append(token_dict)
                counter +=1
            counter = 0
            if len(item_tokens) >1:
                indecies = []
                for z in tokens_list:
                    token = z
                    indecies.append(token["index"])
                item_dict["closure"] = index_closure(indecies)
        item_dict[item_id] = tokens_list
        log_list.append[item_dict]
        

                   
                
                  





word = input("Enter the text")
words = word.split()




