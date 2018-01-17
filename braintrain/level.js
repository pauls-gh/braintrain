import {Station, Switch, Train, Tunnel} from "./gameObjects.js";
import {SPRITE_HEIGHT,
    SPRITE_WIDTH, INTER_SPRITE_GAP, colors
} from "./constants.js";
import {Node} from "./binarytree.js";
import {game} from "./game.js";


export class Level {
    constructor(numStations, numSwitches) {
        this.numStations = numStations;
        this.numSwitches = numSwitches;
        this.root = null;
        this.train = null;
        this.groupStations = null;
        this.scoreText = null;
        this.score = 0;
        this.total = 0;
        this.stationColor = 0;
    }

    create() {
        game.stage.backgroundColor = "rgb(0, 128, 0)";

        // Generate Level
        this.generateLevel();

        // Calculate positions
        this.computeSpritePositions();

        /*
         * Calculate train track positions
         * (control points used for interpolation)
         */
        this.computeTrackPositions();

        // Create sprites (tunnel, switches, stations)
        this.createSprites();

        // Create train tracks
        this.createTracks();

        // Create train object
        const timer = game.time.create(false);
        timer.loop(4000, () => {
            const train = new Train();
            const color = colors[Math.floor(Math.random() * this.stationColor)];
            train.create(this, color);

            // Bring tunnel to foreground so the train is rendered behind tunnel
            const tunnel = this.root.value;
            tunnel.sprite.bringToTop();

            // Bring stations to foreground so the train is rendered behind stations
            game.world.bringToTop(this.groupStations);
        });
        timer.start();

        this.scoreText = game.add.text(100, 16, "Score: 0 / 0", {
            fontSize: "16px",
            fill: "#FFF"
        });

    }

    generateLevel() {
        // Level stored as binary tree
        this.root = new Node(new Tunnel());

        this.root.left = new Node(new Switch(1));
        this.root.right = null;

        this.generateLevelRecurse(this.root.left, 2);
    }

    generateLevelRecurse(node, treeHeight) {
        if (treeHeight === 0) {
            node.left = new Node(new Station(colors[this.stationColor]));
            this.stationColor++;
            node.right = new Node(new Station(colors[this.stationColor]));
            this.stationColor++;

            return;
        }

        node.left = new Node(new Switch(1));
        this.generateLevelRecurse(node.left, treeHeight - 1);
        node.right = new Node(new Switch(0));
        this.generateLevelRecurse(node.right, 0);

    }

    createSprites() {
        game.add.sprite(0, 0, "tunnel");

        // Group stations sprites
        this.groupStations = game.add.group();

        this.createSpritesTraverseTree(this.root);
    }

    createSpritesTraverseTree(root) {
        if (root !== null) {
            const obj = root.value;
            obj.create();
            // Group stations
            if (obj instanceof Station) {
                this.groupStations.add(obj.sprite);
            }
            this.createSpritesTraverseTree(root.left);
            this.createSpritesTraverseTree(root.right);
        }
    }

    computeSpritePositions() {
        const indexX = 0;
        const indexY = 0;

        const tunnel = this.root.value;
        const {x, y} = Level.indexToCoord(indexX, indexY);
        tunnel.x = x;
        tunnel.y = y;

        this.computeSpritePositionsTraverseTree(this.root.left, 1, indexX, indexY + 1);
    }

    computeSpritePositionsTraverseTree(root, left, indexX, indexY) {
        if (root !== null) {
            let yInc = 0;
            const value = root.value;

            // Skip extra index vertically when traversing left node
            if (left && (value instanceof Switch)) {
                yInc = 1;
            }
            const {x, y} = Level.indexToCoord(indexX, indexY + yInc);
            value.x = x;
            value.y = y;

            this.computeSpritePositionsTraverseTree(root.left, 1, indexX, indexY + 1 + yInc);
            this.computeSpritePositionsTraverseTree(root.right, 0, indexX + 1, indexY + yInc);
        }
    }

    createTracks() {
        this.createTracksTraverseTree(this.root);
    }

    createTracksTraverseTree(root) {
        if (root !== null) {
            Level.drawTrack(root.leftTrackControlPoints);
            Level.drawTrack(root.rightTrackControlPoints);

            this.createTracksTraverseTree(root.left);
            this.createTracksTraverseTree(root.right);
        }
    }

    static drawTrack(controlPoints) {
        if (controlPoints.x.length === 0) {
            return null;
        }
        const track = game.add.graphics();
        track.lineStyle(1, 0x000000, 1);
        track.moveTo(controlPoints.x[0], controlPoints.y[0]);

        // Interpolate track using control points
        let i = 0.0;
        for (i = 0.0; i <= 1; i += 0.1) {
            const x = game.math.catmullRomInterpolation(controlPoints.x, i);
            const y = game.math.catmullRomInterpolation(controlPoints.y, i);
            track.lineTo(x, y);
        }

        // Convert graphic to sprite
        // (better performance when repeatedly redrawn)
        const sprite = game.add.sprite(controlPoints.x[0], controlPoints.y[0], track.generateTexture());

        // Destroy original graphic
        track.destroy();

        return sprite;
    }

    computeTrackPositions() {
        // Compute track positions of game objects (tree)
        this.computeTrackPositionsTraverseTree(this.root);
    }

    computeTrackPositionsTraverseTree(root) {
        if (root !== null) {
            const obj = root.value;
            // Track (left)
            if (root.left) {
                const objleft = root.left.value;
                root.leftTrackControlPoints.x.push(obj.x + (SPRITE_WIDTH / 2));
                root.leftTrackControlPoints.y.push(obj.y + SPRITE_HEIGHT);
                root.leftTrackControlPoints.x.push(objleft.x + (SPRITE_WIDTH / 2));
                root.leftTrackControlPoints.y.push(objleft.y);
            }
            // Track (right)
            if (root.right) {
                const objright = root.right.value;
                root.rightTrackControlPoints.x.push(obj.x + SPRITE_WIDTH);
                root.rightTrackControlPoints.y.push(obj.y + (SPRITE_HEIGHT / 2));
                root.rightTrackControlPoints.x.push(objright.x);
                root.rightTrackControlPoints.y.push(objright.y + (SPRITE_HEIGHT / 2));
            }

            this.computeTrackPositionsTraverseTree(root.left);
            this.computeTrackPositionsTraverseTree(root.right);
        }
    }

    static indexToCoord(indexX, indexY) {
        const x = indexX * (SPRITE_WIDTH + INTER_SPRITE_GAP);
        const y = indexY * (SPRITE_HEIGHT + INTER_SPRITE_GAP);

        return {
            x,
            y
        };
    }
}
