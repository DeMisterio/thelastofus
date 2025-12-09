//Event controller will send the VFX 
//effects to this js which will be controlling HTML elements
import { outputText, Gwindow } from 'Game_Visual/script.js'

export function send_text(text) {
    outputText(text);
    return
}

export function get_input() {
    return Gwindow.text
}

