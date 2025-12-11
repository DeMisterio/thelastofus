export const tokenized = (sentence) => {
    rubbish_set = [
        "a", "the", "on", "in", "for", "out", "of", "to", "and", "is", "it", 
        "at", "with", "as", "by", "from", "up", "about", "into", "over", 
        "after", "under", "again", "further", "then", "once", "here", 
        "there", "when", "where", "why", "how", "all", "any", "both", 
        "each", "few", "more", "most", "other", "some", "such", "no", 
        "nor", "not", "only", "own", "same", "so", "too", "very", "can", 
        "will", "just", "please", "could", "give", "me"
    ]
    const tokens = sentence.split(" ");
    for(let i = 0; i< rubbish_set.length(); i++){
        if(rubbish_set.includes(tokens[i])){
            delete tokens[i]
        }
    }
    return tokens
}
