import { Gwindow, outputText, waitForInput } from './script.js'
export async function get_user_input_async(){
    // Ждем, пока юзер нажмет Enter и Promise разрешится
    const text = await waitForInput(); 
    return text;
}

export function send_text(text){
    outputText(text)
}