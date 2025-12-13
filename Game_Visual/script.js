const hasDOM = typeof document !== "undefined";
let cli = null;
let outputPane = null;

let rooms = [];
let roomNum = 0;
const MAPWIDTH = 2;

function ensureDOMRefs() {
    if (!hasDOM) {
        return;
    }
    if (!cli) {
        cli = document.getElementById("cli");
    }
    if (!outputPane) {
        outputPane = document.getElementById("output");
    }
}

export class GameWindow {
    constructor(text = "") {
        this.text = text;
    }
    get_text() {
        return this.text;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function checkInput(e) {
    if (!hasDOM) return;
    if (e.key === "Enter") {
        e.preventDefault();
        ensureDOMRefs();
        const content = (cli?.textContent ?? "").trim();
        if (cli) {
            cli.innerHTML = "";
        }
        Gwindow.text = content;
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

function initGame() {
    ensureDOMRefs();
    rooms = [
        { name: "NW room", exits: "E" },
        { name: "NE room", exits: "SW" },
        { name: "SW room", exits: "SE" },
        { name: "SE room", exits: "NW" },
        { name: "Garden", exits: "NE" },
        { name: "Pond", exits: "W" }
    ];
    roomNum = 4;
    if (cli) {
        cli.focus();
    }
    showRoom();
}

export function outputText(txt = "") {
    if (!hasDOM) return;
    ensureDOMRefs();
    if (!outputPane) return;
    const newPara = document.createElement("p");
    newPara.textContent = txt;
    outputPane.appendChild(newPara);
    newPara.scrollIntoView({ behavior: "smooth", block: "end" });
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

async function HelloWorld() {
    if (!hasDOM) return;
    ensureDOMRefs();
    for (const line of INTRO_TEXT) {
        outputText(line);
        await sleep(676);
    }
}

export const Gwindow = new GameWindow();

if (hasDOM) {
    window.checkInput = checkInput;
    window.initGame = initGame;
    const boot = () => {
        ensureDOMRefs();
        initGame();
        HelloWorld();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
}

