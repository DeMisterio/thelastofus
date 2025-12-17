// thelastofus/log_system/log_it.js

import { GameControl } from '../event_control/entity_system/entity_init/objective_export.js';

export class Logs {
    constructor() {
        this.logs = [];
    }

    // Метод добавления лога
    add_log(action_data) {
        // Формируем структуру лога согласно документации
        // action_data ожидается как объект с полями: 
        // { command_raw, command_formatted, status, success_bool }
        
        const actor = GameControl.player ?? GameControl.getChar("Me");
        const currentLoc = GameControl.current_location;
        const currentSub = GameControl.active_sub_location || "main_area";

        const now = new Date();
        const timeString = now.toLocaleTimeString('en-GB', { hour12: false }); // 14:35:12

        const logEntry = {
            "scene": [GameControl.scene ? GameControl.scene.scene_title : "Unknown"],
            "location": [currentLoc.location_id, currentSub],
            "Command_RAW": action_data.command_raw,
            "Command_formated": action_data.command_formatted, // { action: "go", entity: [...] }
            "RTA": timeString,
            "CID": [
                { "health": actor.health },
                { "action_speed": actor.action_speed },
                { "endurance": actor.endurance },
                { "strength": actor.strength },
                { "init_items": [...actor.init_items] } // Копия массива
            ],
            "Status": action_data.status // {"success": "...", "reason": "..."}
        };

        this.logs.push(logEntry);
        // console.log("LOG ADDED:", logEntry); // Для отладки
    }

    // Метод для получения последнего лога (нужен для контекста, например при Cut)
    get_last_log() {
        if (this.logs.length === 0) return null;
        return this.logs[this.logs.length - 1];
    }
}

// Экспортируем единственный экземпляр логгера (Singleton)
export const Logger = new Logs();