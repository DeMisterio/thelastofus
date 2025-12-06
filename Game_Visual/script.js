let rooms = [],
    roomNum
const MAPWIDTH = 2

function checkInput(e) {
    if (e.key == "Enter") {
        command = cli.textContent; // use the typed command
        cli.innerHTML = ""
        parser(command)
        e.preventDefault()
    }
}

function parser(cmd) {
    let cmdWords = cmd.trim().toUpperCase().split(" ")
    let verb = cmdWords[0] // first word is the verb
    let noun = cmdWords.slice(1).join(" ") // rest of it
    switch (verb) {
        case "NORTH":
        case "N": // heading north
            if (rooms[roomNum].exits.includes("N")) {
                roomNum -= MAPWIDTH // move up a map row
                showRoom()
            } else {
                outputText("You can't go that way")
            }
            break;
            // deal with other commands here
    }
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

function outputText(txt) {
    // add txt to a new paragraph
    let newPara = document.createElement("p")
    newPara.innerHTML = txt
    output.appendChild(newPara)
    newPara.scrollIntoView()
}