import { Gwindow, outputText } from './script.js'


export function get_text(){
    return Gwindow.text
}


export function send_text(text){
    outputText(text)
}
