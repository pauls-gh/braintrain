import {WINDOW_WIDTH, WINDOW_HEIGHT} from "./constants.js";
import {Level} from "./level.js";

// GLOBALS
export let game = null;

// INIT
function init() {
    game = new Phaser.Game(WINDOW_WIDTH, WINDOW_HEIGHT, Phaser.AUTO, "",
        {
            preload,
            create,
            update
        }
    );
}

init();

// PHASER.IO
function preload() {
    game.load.image("switch", "assets/switch.png");
    game.load.image("station", "assets/station.png");
    game.load.image("tunnel", "assets/tunnel.png");
    game.load.image("train_front", "assets/train_front.png");
    game.load.image("train_back", "assets/train_back.png");
}

function create() {
    const level = new Level();
    level.create();
}

function update() {
}

