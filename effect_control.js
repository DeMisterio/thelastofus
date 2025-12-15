// Game_Visual/CLI_effects/effect_control.js
import { Gwindow, outputText, waitForInput } from './script.js'

// Старая синхронная функция (можно оставить для совместимости, но лучше не юзать)
export function get_text(){
    return Gwindow.text
}

// --- НОВАЯ АСИНХРОННАЯ ФУНКЦИЯ ---
export async function get_user_input_async(){
    // Эта строчка "заморозит" выполнение кода, пока в script.js не сработает inputResolve
    const text = await waitForInput(); 
    return text;
}

export function send_text(text){
    outputText(text)
}