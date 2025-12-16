// Game_Visual/script.js

let rooms = [], roomNum;
const MAPWIDTH = 2;

// --- ДОБАВЛЕНО: Переменная для промиса ---
let inputResolve = null; 

class GameWindow {
    constructor(text = null) {
        this.text = text;
    }
}

const globalObj = typeof window !== "undefined" ? window : globalThis;

// Export Gwindow early so it's available throughout the module
export const Gwindow = globalObj.Gwindow || (globalObj.Gwindow = new GameWindow());

// --- НОВАЯ ФУНКЦИЯ: Ожидание ввода ---
export function waitForInput() {
    return new Promise((resolve) => {
        inputResolve = resolve; // Сохраняем "ключ" к запуску кода в переменную
    });
}

// --- ОБНОВЛЕННАЯ ФУНКЦИЯ: checkInput ---
function checkInput(e) { // Делаем глобальной для HTML
    if (e.key == "Enter") {
        e.preventDefault();
        let cli = document.getElementById('cli');
        let content = cli.innerText || cli.textContent; // Или textContent
        cli.innerHTML = "";
        
        // Set Gwindow.text for synchronous access
        Gwindow.text = content;
        
        // Если игра ждет ввода (inputResolve существует), отдаем текст и размораживаем её
        if (inputResolve) {
            inputResolve(content);
            inputResolve = null; // Сбрасываем
        }
    }
}

function parser(cmd = "") {
    const trimmed = cmd.trim();
    if (!trimmed) return { verb: "", noun: "" };
    const cmdWords = trimmed.toUpperCase().split(/\s+/);
    const verb = cmdWords[0];
    const noun = cmdWords.slice(1).join(" ");
    return { verb, noun };
}

function showRoom() {
    if (!rooms[roomNum]) return;
    outputText(rooms[roomNum].name);
    outputText("You can go " + rooms[roomNum].exits);
}


function initDOM() {
    cli = document.getElementById("cli");
    outputPane = document.getElementById("output");

    cli.addEventListener("keydown", checkInput);
}


function initGame() {
    cli = document.getElementById("cli")
    output = document.getElementById("output")
    if (!cli || !output) {
        console.error("Required DOM elements are missing")
        return
    }
    rooms = []
}

export function outputText(txt) {
    let newPara = document.createElement("p");
    newPara.innerHTML = txt;
    let output = document.getElementById('output'); // Добавил получение элемента
    output.appendChild(newPara);
    newPara.scrollIntoView();
}



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Export HelloWorld function to display intro text


// Make functions globally accessible
globalObj.checkInput = checkInput;
globalObj.initGame = initGame;
