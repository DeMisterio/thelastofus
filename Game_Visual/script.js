let rooms = [],
    roomNum
const MAPWIDTH = 2

class window {
    constructor(text = null) {
        this.text = text
    }
}

export function checkInput(e) {
    if (e.key == "Enter") {
        content = cli.textContent; // use the typed command
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
    cli.focus()
    showRoom()
}

export function outputText(txt) {
    // add txt to a new paragraph
    let newPara = document.createElement("p")
    newPara.innerHTML = txt
    output.appendChild(newPara)
    newPara.scrollIntoView()
}

export const Gwindow = new Window();
