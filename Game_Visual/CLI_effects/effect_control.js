import { Gwindow, outputText } from 'Game_Visual/script.js'


export function get_text(){
    return Gwindow.text
}


export function send_text(text){
    outputText(text)
}