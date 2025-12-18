import { match_items } from './parse_engine.js/semantic_parser.js'
import { item, GameControl, ITEMSdata, location, character } from '../entity_system/entity_init/objective_export.js'
import { Logger } from '../../log_system/log_it.js'

function prettifyName(raw) {
    if (!raw) return '';
    return raw.toString().replace(/_/g, ' ');
}

export function location_descr_generator(subLocationInput, locationObj = GameControl?.current_location) {
    const activeLocation = locationObj || GameControl?.current_location;
    const subLocation = typeof subLocationInput === 'string'
        ? activeLocation?.sub_locations?.find(sl => sl.name === subLocationInput)
        : subLocationInput;

    if (!subLocation) {
        return '';
    }

    const initDescription = subLocation.init_description || `I am now in ${prettifyName(subLocation.name)}`;
    const itemsSet = ITEMSdata?.sets?.find(set => set.id === subLocation.items_id);
    const containers = itemsSet?.containers || [];

    const containerNames = containers.map(cont => prettifyName(cont.id)).filter(Boolean);
    const containerListText = containerNames.length ? containerNames.join(', ') : 'nothing notable';

    const surfaceContainers = containers.filter(cont => cont.verbs?.some(v => v === 'on the' || v === 'under the')).slice(0, 2);
    const itemPhrases = [];

    for (const cont of surfaceContainers) {
        const verb = cont.verbs.find(v => v === 'on the' || v === 'under the') || cont.verbs?.[0] || '';
        const baseContainer = ITEMSdata?.containers?.find(c => c.id === cont.id);
        const items = baseContainer?.items || [];
        if (!items.length) continue;

        const itemNames = items.map(it => prettifyName(it.name || it.id)).filter(Boolean);
        if (!itemNames.length) continue;

        itemPhrases.push(`the ${itemNames.join(', ')} ${verb} ${prettifyName(cont.id)}`);
    }

    const itemText = itemPhrases.length ? itemPhrases.join('; ') : 'nothing else of note';

    const characters = (activeLocation?.characters || []).filter(ch => {
        if (!ch) return false;
        if (typeof ch === 'string') return true;
        if (typeof ch.health === 'number') return ch.health > 0;
        return true;
    }).map(ch => typeof ch === 'string' ? prettifyName(ch) : prettifyName(ch.name));

    const charVerb = characters.length === 1 ? 'is' : 'are';
    const characterText = characters.length ? characters.join(', ') : 'no one else';

    return `${initDescription}. Here, I see ${containerListText}. I also see ${itemText}. There ${charVerb} ${characterText}.`;
}


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

function give_item(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];
    const locs = entities.location || [];
    const sublocs = entities.sublocation || [];

    const isSelf = chars.some(c => c.toLowerCase() === "me");
    if (isSelf || locs.length > 0 || sublocs.length > 0) {
        return "False. I dont know what to do... it is so messy in my head";
    }

    if (items.length > 0 && chars.length === 0) {
        const itemID = items[0];
        if (actor.init_items.includes(itemID)) {
            return `False. I need to give ${itemID} to someone, but who to? I need to think fully....`;
        }
    }

    if (chars.length > 0) {
        const targetName = chars[0];
        const currentLoc = GameControl.current_location;
        
        const targetCharObj = currentLoc.characters.find(c => 
            c.name.toLowerCase() === targetName.toLowerCase() || 
            (c.tokens && c.tokens.includes(targetName))
        );

        if (!targetCharObj) {
             return `False. ${targetName} is not here.`;
        }

        let itemID = null;
        if (items.length > 0) itemID = items[0];

        if (!itemID || !actor.init_items.includes(itemID)) {
            return `False. I think I dont have anything with me that I give to ${targetName}`;
        }

        
        const itemIndex = actor.init_items.indexOf(itemID);
        actor.init_items.splice(itemIndex, 1);

        targetCharObj.init_items.push(itemID);

        let reaction = "Thanks.";
        const giveReactions = targetCharObj.verbal_reactions?.["give"] || [];
        
        if (giveReactions.length > 0) {
            reaction = giveReactions[Math.floor(Math.random() * giveReactions.length)];
        } else {
            const fallback = targetCharObj.verbal_reactions?.["warm"] || ["Nodes respectfully."];
            reaction = fallback[0]; 
        }

        return `True. I gave ${itemID} to ${targetCharObj.name}. "${reaction}"`;
    }

    return "False. I need to know what and who.";
}


function consume_item(entities, actor) {
    const items = entities.item || [];
    
    let targetItemID = null;

    if (items.length > 0) {
        targetItemID = items[0];
    } else {
        return "False. Eat what? I need to specify the food.";
    }

    
    let itemSource = "inventory";
    let itemIndex = actor.init_items.indexOf(targetItemID);

    if (itemIndex === -1) {
        return `False. I don't have ${targetItemID} with me.`;
    }

    const foodItem = new item(targetItemID);

    if (foodItem.type !== "food" && foodItem.type !== "drink") {
        return `False. I can't eat or drink ${targetItemID}.`;
    }

    const nv = foodItem.NV || 0;
    
    actor.init_items.splice(itemIndex, 1);

    let restoreText = "";
    if (nv > 100) {
        actor.endurance = 100;
        actor.health = 100;
        restoreText = "I feel completely revitalized!";
    } else {
        actor.endurance = (actor.endurance || 0) + nv;
        if (actor.endurance > 100) actor.endurance = 100;
        
        actor.health = (actor.health || 0) + nv; 
        if (actor.health > 100) actor.health = 100;
        
        restoreText = `I feel better.`;
    }

    return `True. I consumed ${targetItemID}. ${restoreText}`;
}

function wear_item(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];
    const currentLoc = GameControl.current_location;

    if (items.length === 0) {
        return "False. Wear what?";
    }
    const targetItemID = items[0];

    let targetCharObj = actor;
    let isTargetMe = true;

    if (chars.length > 0) {
        const charName = chars[0];
        if (charName.toLowerCase() !== "me") {
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

    let itemData = null;
    try {
        itemData = new item(targetItemID);
    } catch (e) {
        return `False. I don't know what ${targetItemID} is.`;
    }

    const validTypes = ["clothing", "comfort", "hygiene", "armor"];
    const validFuncs = ["wear", "warm", "equip"];

    const isValid = validTypes.includes(itemData.type) || validFuncs.includes(itemData.functionality);

    if (!isValid) {
        return "False. I can't dress anyone with that.";
    }

    let source = "none";
    let containerFound = null;

    if (actor.init_items.includes(targetItemID)) {
        source = "inventory";
    } 
    else if (currentLoc.sub_locations) {
        for (let subLoc of currentLoc.sub_locations) {
            const setId = subLoc.items_id;
            const itemSet = ITEMSdata.sets.find(s => s.id === setId);
            if (itemSet && itemSet.containers) {
                
                for (let contRef of itemSet.containers) {
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


    if (source === "environment" && containerFound) {
        const idx = containerFound.items.findIndex(it => it.id === targetItemID);
        if (idx > -1) containerFound.items.splice(idx, 1);
    }
    if (source === "inventory" && !isTargetMe) {
        const idx = actor.init_items.indexOf(targetItemID);
        if (idx > -1) actor.init_items.splice(idx, 1);
    }

    if (!targetCharObj.init_items.includes(targetItemID)) {
        targetCharObj.init_items.push(targetItemID);
    }

    if (isTargetMe) {
        return `True. I have dressed the ${targetItemID}.`;
    } else {
        let reaction = "...";
        const warmReactions = targetCharObj.verbal_reactions?.["warm"] || [];
        
        if (warmReactions.length > 0) {
            reaction = warmReactions[Math.floor(Math.random() * warmReactions.length)];
        } else {
            reaction = "Thanks.";
        }
        
        return `True. ${reaction}`;
    }
}

function cut_item(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];
    const cuttingTools = ["knife", "hunting_knife", "razor_blades", "keys"];
    const cuttableTypes = ["document", "junk", "food", "comfort", "clothing", "sentimental", "hygiene", "valuable"];

    if (items.length === 2 && chars.length === 0) {
        let toolID = items.find(id => cuttingTools.includes(id));
        let targetID = items.find(id => id !== toolID);

        if (!toolID) {
             return { 
                 success: false, 
                 text: `False. I think the ${items[1]} is impossible to cut with the ${items[0]}.` 
             };
        }

        if (!actor.init_items.includes(toolID)) {
            return {
                success: false,
                text: `False. I don't have the ${toolID} with me to cut anything.`
            };
        }

        const targetItemObj = new item(targetID);

        if (cuttableTypes.includes(targetItemObj.type)) {
            
            const lastLog = Logger.get_last_log();
            if (lastLog && 
               (lastLog.Command_formated.action === "inspect" || lastLog.Command_formated.action === "open")) {
                
                
                const currentLoc = GameControl.current_location;
                if (currentLoc.sub_locations) {
                    for (let subLoc of currentLoc.sub_locations) {
                        const set = ITEMSdata.sets.find(s => s.id === subLoc.items_id);
                        if (set && set.containers) {
                            
                            const containerWithItem = ITEMSdata.containers.find(c => c.items && c.items.some(it => it.id === targetID));
                            
                            if (containerWithItem) {
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

            if (actor.init_items.includes(targetID)) {
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

    if (items.length === 1 && chars.length === 1) {
        const toolID = items[0];
        const targetCharName = chars[0];

        if (!cuttingTools.includes(toolID)) {
             return {
                 success: false,
                 text: `False. I don't know whether it is possible to harm ${targetCharName} with ${toolID}.`
             };
        }

        if (!actor.init_items.includes(toolID)) {
             return {
                 success: false,
                 text: `False. I don't have ${toolID}.`
             };
        }

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

        const toolObj = new item(toolID);
        const damage = toolObj.HarmRate || 10;
        
        if (targetCharObj.health !== null) {
            targetCharObj.health -= damage;
            if (targetCharObj.health < 0) targetCharObj.health = 0;
        }

        let reaction = "...";
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


function shoot_target(entities, actor) {
    const items = entities.item || [];
    const chars = entities.characters || [];

    let weaponID = items.find(id => {
        try { return new item(id).type === "weapon"; } catch (e) { return false; }
    });

    if (!weaponID) {
        weaponID = actor.init_items.find(id => {
            try { return new item(id).type === "weapon"; } catch (e) { return false; }
        });
    }

    if (!weaponID) {
        return { success: false, text: "False. I don't have a weapon to shoot with." };
    }

    if (!actor.init_items.includes(weaponID)) {
        return { success: false, text: `False. I don't have the ${weaponID} with me.` };
    }

    const weaponObj = new item(weaponID);

    
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

        const damage = weaponObj.HarmRate || 30;
        if (targetChar.health !== null) {
            targetChar.health -= damage;
        }

        let reaction = "...";
        const reactionsList = targetChar.verbal_reactions?.["shoot"] || [];
        if (reactionsList.length > 0) {
            reaction = reactionsList[Math.floor(Math.random() * reactionsList.length)];
        }

        return {
            success: true,
            text: `True. I fired my ${weaponID} at ${targetChar.name}. "${reaction}"`
        };
    }

    const targetItemID = items.find(id => id !== weaponID);
    if (targetItemID) {
        if (!GameControl.shot_objects) GameControl.shot_objects = [];
        
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
    const locs = [...(entities.location || []), ...(entities.sublocation || [])];
    const items = entities.item || [];
    const chars = entities.characters || [];

    if (items.length === 0 && chars.length === 0) {
        if (locs.length > 0) {
            return `False. I cant ignite ${locs[0]}.`;
        }
        return false;
    }

    const currentLocation = GameControl.current_location;

    if (items.length > 0) {
        const targetItemID = items[0];

        if (locs.length > 0) {
            const isCurrentLoc = locs.some(l => 
                l === currentLocation.location_id || 
                currentLocation.sub_locations.some(sub => sub.name === l || sub.tokens.includes(l))
            );

            if (!isCurrentLoc) {
                return "Ahh, i dont know what to do, i need to be more specific.";
            }
        }

        if (currentLocation && currentLocation.sub_locations) {
            for (let subLoc of currentLocation.sub_locations) {
                const setId = subLoc.items_id; 
                
                const itemSet = ITEMSdata.sets.find(s => s.id === setId);
                
                if (itemSet && itemSet.containers) {
                    
                    const containerDef = ITEMSdata.containers.find(c => c.items && c.items.some(it => it.id === targetItemID));
                    
                    if (containerDef) {
                        const containerInSetIndex = itemSet.containers.findIndex(c => c.id === containerDef.id);
                        
                        if (containerInSetIndex !== -1) {
                            const burnedContainer = itemSet.containers[containerInSetIndex];
                            itemSet.containers.splice(containerInSetIndex, 1);
                            
                            if (!GameControl.burning_objects) GameControl.burning_objects = [];
                            GameControl.burning_objects.push(burnedContainer.id);

                            return `I have ignited the ${targetItemID} inside the ${burnedContainer.id}. The fire spread quickly, destroying everything inside.`;
                        }
                    }
                }
            }
        }

        if (intended_character && intended_character.init_items) {
            const itemIndex = intended_character.init_items.indexOf(targetItemID);
            if (itemIndex !== -1) {
                intended_character.init_items.splice(itemIndex, 1);
                return `I have ignited the ${targetItemID}.`;
            }
        }

        return "But i dont have this one near or with me...";
    }

    if (chars.length > 0) {
        const targetCharName = chars[0];

        const targetCharObj = currentLocation.characters.find(c => 
            c.name.toLowerCase() === targetCharName.toLowerCase() || 
            (c.tokens && c.tokens.includes(targetCharName))
        );

        if (!targetCharObj) {
            return `Looks like i am going nuts, why am i thinking of ${targetCharName}? No one with this name near me..`;
        }

        if (targetCharObj.health) {
            targetCharObj.health -= 50;
            if (targetCharObj.health < 0) targetCharObj.health = 0;
        }

        let reaction = "...";
        if (targetCharObj.verbal_reactions) {
             
             const reactionsList = targetCharObj.verbal_reactions["ignite"] || targetCharObj.verbal_reactions["attack"];
             if (reactionsList && reactionsList.length > 0) {
                 reaction = reactionsList[0];
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
    if (chars.length === 2) {
        return "False. I have only two arms...";
    }
    if (chars.length === 1 && items.length === 1) {
        const targetName = chars[0];
        const weaponId = items[0];
        const currentLocation = GameControl.current_location;
        const targetChar = currentLocation.characters.find(c => 
            c.name.toLowerCase() === targetName.toLowerCase() || 
            (c.tokens && c.tokens.includes(targetName))
        );
        if (!targetChar) {
            return "False. He is not here... I'd better drink some water.";
        }
        if (!actor.init_items.includes(weaponId)) {
            return `False. I don't have the ${weaponId} with me.`;
        }
        const weaponObj = new item(weaponId);
        
        if (weaponObj.type === "weapon") {
            
            const damage = weaponObj.HarmRate || 0;
            if (targetChar.health !== null) {
                targetChar.health -= damage;
            }

            let reactionText = "...";
            const reactions = targetChar.verbal_reactions?.["attack"] || [];
            
            if (reactions.length > 0) {
                const limit = Math.min(reactions.length, 2);
                const randomIndex = Math.floor(Math.random() * limit);
                reactionText = reactions[randomIndex];
            }

            let output = `True. I attacked ${targetChar.name} with ${weaponId} and caused them merciless pain. 
            
            ${targetChar}:"${reactionText}"`;

            if (targetChar.health <= 0) {
                const index = currentLocation.characters.indexOf(targetChar);
                if (index > -1) {
                    currentLocation.characters.splice(index, 1);
                }
                output += ` ${targetChar.name} falls to the ground, motionless.`;
            }

            return output;
        } else {
            return `False. Using ${weaponId} as a weapon is not a good idea.`;
        }
    }
    return "False. I have to decide who to attack and how... Yet it doesn't make sense...";
}
function go_to(entities, actor) {
    const locs = [...(entities.location || []), ...(entities.sublocation || [])];
    const items = entities.item || [];
    const chars = entities.characters || [];

    if (items.length > 0 || chars.length > 0) {
        return "False. I dont know what to do.... Inhale, Exhale... i have to keep concioousness....";
    }

    if (locs.length === 0) {
        return "False. Go where?";
    }

    const currentLocObj = GameControl.current_location;
    const currentLocID = currentLocObj.location_id;
    const currentSubLocID = GameControl.active_sub_location || null; 

    const describeAndReturn = (subLocObj, locObj) => {
        const text = location_descr_generator(subLocObj, locObj || currentLocObj);
        return text ? `True. ${text}` : "True.";
    };

    const setLocation = (locId) => {
        const newLoc = new location(locId);
        if (newLoc.characters && Array.isArray(newLoc.characters)) {
            newLoc.characters = newLoc.characters.map(name => new character(name));
        }
        GameControl.current_location = newLoc;
        const firstSub = newLoc.sub_locations?.[0];
        GameControl.active_sub_location = firstSub?.name || null;
        if (firstSub) {
            return describeAndReturn(firstSub, newLoc);
        }
        const baseText = `I am now in ${prettifyName(newLoc.location_n || locId)}`;
        return `True. ${baseText}.`;
    };

    const moveSceneLocation = () => {
        const sceneLocs = GameControl.scene.scene_locations;
        const currentIndex = sceneLocs.findIndex(l => l.location_id === currentLocID);
        
        if (currentIndex === -1) return "False. I am lost.";

        let nextIndex = currentIndex + 1;
        if (nextIndex >= sceneLocs.length) {
            nextIndex = currentIndex - 1;
        }
        if (nextIndex < 0) {
            return "False. There is nowhere else to go.";
        }

        return setLocation(sceneLocs[nextIndex].location_id);
    };

    const moveToSubLocation = (target) => {
        const subLocObj = currentLocObj.sub_locations.find(sub => sub.name === target || sub.tokens.includes(target));
        if (!subLocObj) return null;
        GameControl.active_sub_location = subLocObj.name;
        return describeAndReturn(subLocObj, currentLocObj);
    };

    if (locs.length === 2) {
        const isLoc0_Current = (locs[0] === currentLocID || locs[0] === currentSubLocID);
        const isLoc1_Current = (locs[1] === currentLocID || locs[1] === currentSubLocID);

        if (!isLoc0_Current && !isLoc1_Current) {
            return "False. I am not near any of these places.";
        }

        const target = isLoc0_Current ? locs[1] : locs[0];

        if (target.includes("exit") || target === "exit") {
             return moveSceneLocation();
        }

        const subMove = moveToSubLocation(target);
        if (subMove) {
            return subMove;
        }
        
        const sceneLocs = GameControl.scene.scene_locations;
        const isSceneLoc = sceneLocs.some(l => l.location_id === target);
        
        if (isSceneLoc) {
             if (target === currentLocID) {
                 GameControl.active_sub_location = null;
                 const firstSub = currentLocObj.sub_locations?.[0];
                 return describeAndReturn(firstSub, currentLocObj);
             } else {
                 return setLocation(target);
             }
        }

        return "False. I can't go there from here.";
    }

    if (locs.length === 1) {
        const target = locs[0];

        if (target.includes("exit") || target === "exit") {
             return moveSceneLocation();
        }

        const subMove = moveToSubLocation(target);
        if (subMove) {
            return subMove;
        }
        
        if (target === currentLocID || currentLocObj.location_n === target) {
            GameControl.active_sub_location = null;
            const firstSub = currentLocObj.sub_locations?.[0];
            return describeAndReturn(firstSub, currentLocObj);
        }

        const sceneLocs = GameControl.scene.scene_locations;
        if (sceneLocs.some(l => l.location_id === target)) {
            return setLocation(target);
        }

        return "False. I don't see that place here.";
    }
}


export function action_identifier(intent_object = AP_operator.Aintent, entities = AP_operator.entities){
  const actor = GameControl.player ?? GameControl.getChar("Me");
  let result = null;
  let logStatus = {};

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

  if (result && typeof result === 'string' && !result.startsWith("False")) {
      const currentLoc = GameControl.current_location;
      
      if (currentLoc && currentLoc.characters) {
          for (let i = currentLoc.characters.length - 1; i >= 0; i--) {
              const char = currentLoc.characters[i];
              
              if (char.name !== "Me") {
                  if (char.health !== null && char.health <= 0) {
                      currentLoc.characters.splice(i, 1);
                      
                      result += ` ${char.name} falls to the ground, motionless. They are dead.`;
                      
                      if (logStatus) logStatus.death = char.name;
                  }
              }
          }
      }
  }

  if (intent_object) {
      const hungerReport = update_hunger_state();
      
      if (hungerReport && hungerReport.length > 0) {
          if (result === false) result = "I couldn't do that, but time passes...";
          result = result + "\n\n" + hungerReport;
      }
  }

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
