let rooms = [],
    roomNum
const MAPWIDTH = 2

export class window {
    constructor(text = null) {
        this.text = text
    }
}

// Make checkInput globally accessible
window.checkInput = function(e) {
    if (e.key == "Enter") {
        const cli = document.getElementById('cli');
        const content = cli.textContent; // use the typed command
        cli.innerHTML = ""
        e.preventDefault()
        Gwindow.text = content
    }
}

function parser(cmd) {
    let cmdWords = cmd.trim().toUpperCase().split(" ")
    let verb = cmdWords[0] // first word is the verb
    let noun = cmdWords.slice(1).join(" ") // rest of it
}

function showRoom() {
    outputText(rooms[roomNum].name)
    outputText("You can go " + rooms[roomNum].exits)
}

function initGame() {
    rooms[0] = { name: "NW room", exits: "E" }
    rooms[1] = { name: "NE room", exits: "SW" }
    rooms[2] = { name: "SW room", exits: "SE" }
    rooms[3] = { name: "SE room", exits: "NW" }
    rooms[4] = { name: "Garden", exits: "NE" }
    rooms[5] = { name: "Pond", exits: "W" }
    roomNum = 4
    const cli = document.getElementById('cli');
    if (cli) {
        cli.focus()
    }
    showRoom()
}

export function outputText(txt) {
    // add txt to a new paragraph
    const output = document.getElementById('output');
    if (!output) {
        console.error("Output element not found");
        return;
    }
    let newPara = document.createElement("p")
    newPara.innerHTML = txt
    output.appendChild(newPara)
    newPara.scrollIntoView()
}

export const Gwindow = new window();
