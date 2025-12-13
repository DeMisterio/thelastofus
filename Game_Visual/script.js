const cli = document.getElementById("cli");
const output = document.getElementById("output");

let rooms = [],
    roomNum
const MAPWIDTH = 2

export class GameWindow {
    constructor(text = null) {
        this.text = text
    }
    get_text(){
        this.text = parser()
    }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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



const INTRO_TEXT = [
  "Welcome.",
  "Take a breath.",

  "This is a story-driven game.",
  "And to play it,",

  "you can just type what you want to do.",
  "Simple words are enough.",
  "If it sounds human — it usually works. No need to type 'Go north', or 'Go south'",
   "Be creative, and use a power of your language.",
  "There is no perfect way to play.",
  "You don’t need to guess the right command.",
  "Just say what feels natural.",
    "For example: Go to the kitchen / Pick up the passport / Leave the house",
  "You are not a hero here.",
  "You are just a person in a bad situation.",
  "Trying to make it through.",

  "The world outside is unstable.",
  "People are scared.",
  "Things happen fast.",

  "Some choices matter.",
  "Some mistakes are okay.",
  "The game will adapt to you.",

  "You can finish this game in about 10 minutes.",
  "But you can also slow down and explore.",

  "The game won’t always guide you.",
  "But it will try to understand you.",
    "You can skip the intro textes by pressing the space key, but it will not give you any privilege except the time, thich is what really MATTERS.",
  "Be yourself.",
  "Be human.",
  "Be the last of us.",
  "Let’s begin."
];

async function  HelloWorld() {
    for(let i=0; i< INTRO_TEXT.length(); i++){
        outputText(INTRO_TEXT[i])
        await sleep(676);
    }
}

export const Gwindow = new GameWindow();
HelloWorld()

