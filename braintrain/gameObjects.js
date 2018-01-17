import {game} from "./game.js";
import {Level} from "./level.js";
import {SPRITE_HEIGHT,
    SPRITE_WIDTH} from "./constants.js";

export class Train {
    constructor() {
        this.color = null;
        this.level = null;
        this.trainSegments = [
            null,
            null
        ];
        this.station = null;
    }

    destroy() {
        this.trainSegments[0].sprite.destroy();
        this.trainSegments[0].sprite = null;
        this.trainSegments[1].sprite.destroy();
        this.trainSegments[1].sprite = null;

        // Update score
        this.level.total += 1;
        if (this.color === this.station.color) {
            this.level.score += 1;
        }
        this.level.scoreText.text = "Score: " + this.level.score +
            " / " + this.level.total;
    }

    create(level, color) {
        let i = 0;

        this.level = level;
        this.color = color;

        for (i = 0; i < 2; i++) {
            // Train Segments: Front = 0, Back = 1
            this.trainSegments[i] = {
                x: 0,
                y: 0,
                sprite: null,
                // For tweening animation, track curr obj
                currNode: null,
                inSwitch: false
            };
        }

        const front = this.trainSegments[0];
        front.currNode = level.root;
        front.x = level.root.leftTrackControlPoints.x[0];
        front.y = level.root.leftTrackControlPoints.y[0];
        front.sprite = game.add.sprite(front.x, front.y, "train_front");
        front.sprite.tint = color;
        // Sprite rotates around center point
        front.sprite.anchor.setTo(0.5, 0.5);

        const back = this.trainSegments[1];
        back.currNode = level.root;
        back.x = level.root.leftTrackControlPoints.x[0];
        back.y = level.root.leftTrackControlPoints.y[0];
        back.sprite = game.add.sprite(back.x, back.y, "train_back");
        back.sprite.tint = color;
        // Sprite rotates around center point
        back.sprite.anchor.setTo(0.5, 0.5);

        // Train sprite motion for both segments (front/back)
        for (const seg of this.trainSegments) {
            this.updateTween(seg.sprite);
        }
    }

    // Called at game "create" time and then when tween is completed
    updateTween(spriteOrig, tweenOrig) {
        let controlPointsX = null;
        let controlPointsY = null;
        let delay = 0;

        let seg = this.trainSegments[0];
        if (spriteOrig !== seg.sprite) {
            seg = this.trainSegments[1];
            // Delay rear train segment for first tween
            if (seg.currNode === this.level.root) {
                delay = 600;
            }
        }

        if (seg.currNode) {

            if (seg.currNode.value instanceof Station) {
                // Record final station so we can compare train color
                // To station color
                this.station = seg.currNode.value;
            }

            if (seg.currNode.value instanceof Switch) {
                const sw = seg.currNode.value;
                if (seg.inSwitch) {
                    // Train segment exited switch, update to next node
                    seg.inSwitch = false;
                    sw.objRefCount--;

                    if (sw.position) {
                        controlPointsX = seg.currNode.rightTrackControlPoints.x;
                        controlPointsY = seg.currNode.rightTrackControlPoints.y;

                        // Update current node
                        seg.currNode = seg.currNode.right;
                    } else {
                        controlPointsX = seg.currNode.leftTrackControlPoints.x;
                        controlPointsY = seg.currNode.leftTrackControlPoints.y;

                        // Update current node
                        seg.currNode = seg.currNode.left;
                    }
                } else {
                    // Train segment entered switch, use switch control points
                    seg.inSwitch = true;
                    sw.objRefCount++;

                    const cp = sw.getCurrentControlPoints();
                    controlPointsX = cp.x;
                    controlPointsY = cp.y;

                }
            } else {
                controlPointsX = seg.currNode.leftTrackControlPoints.x;
                controlPointsY = seg.currNode.leftTrackControlPoints.y;

                // Update current node
                seg.currNode = seg.currNode.left;
            }
        }

        if (controlPointsX.length > 1) {
            // Estimate time for the spline to maintain a constant speed.
            // Speed = pixels/sec
            // Distance = rough estimate between first control point and last
            // Time = msec
            const speed = 25;
            const distance = Math.hypot(
                controlPointsX[controlPointsX.length - 1] - controlPointsX[0],
                controlPointsY[controlPointsY.length - 1] - controlPointsY[0]);
            const time = (distance * 1000 / speed);

            // Create new tween each time
            const tween = game.add.tween(seg.sprite).to(
                {
                    x: controlPointsX.slice(1),
                    y: controlPointsY.slice(1)
                }, time, Phaser.Easing.Linear.None, false, delay);

            // Use Bezier interpolation as it updates at a constant rate.
            // With catmull/Rom, the train would slow at each end of the spline.
            // Removed - tween.interpolation(Phaser.Math.catmullRomInterpolation);
            tween.interpolation(Phaser.Math.bezierInterpolation);
            tween.onUpdateCallback(this.tweenUpdateCallback, seg);
            tween.onComplete.add(this.updateTween, this);
            tween.start();
        } else {
            // Front segment reached last station
            if (seg === this.trainSegments[0]) {
                // Nothing for now
            }
            // Rear segment reached station - remove train
            if (seg === this.trainSegments[1]) {
                this.destroy();
            }
        }

    }

    // Called at game update time
    tweenUpdateCallback() {
        // Ensure correct train rotation as it traverses the spline
        // (this == train segment)
        this.sprite.rotation = Phaser.Math.angleBetweenPoints(
            {
                x: this.x,
                y: this.y
            },
            this.sprite.position);

        this.x = this.sprite.x;
        this.y = this.sprite.y;
    }
}

export class Tunnel {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.sprite = null;
    }

    create() {
        this.sprite = game.add.sprite(this.x, this.y, "tunnel");
    }
}


export class Switch {
    constructor(left) {
        this.left = left;
        this.x = 0;
        this.y = 0;
        this.position = 0;
        this.controlPoints0 = {
            x: [],
            y: []
        };
        this.controlPoints1 = {
            x: [],
            y: []
        };
        this.sprite0 = null;
        this.sprite1 = null;
        this.sprite = null;

        // Reference count for objects traversing switch
        this.objRefCount = 0;
    }

    create() {
        this.sprite = game.add.sprite(this.x, this.y, "switch");
        const sw = this.sprite;

        if (this.left) {
            // Compute track entry (x,y) into switch from parent node
            // Top of switch
            const entryX = this.x + (SPRITE_WIDTH / 2);
            const entryY = this.y;

            // Compute control points for switch position 0
            this.controlPoints0.x.push(entryX);
            this.controlPoints0.y.push(entryY);
            this.controlPoints0.x.push(entryX);
            this.controlPoints0.y.push(this.y + SPRITE_HEIGHT);

            // Compute control points for switch position 1
            this.controlPoints1.x.push(entryX);
            this.controlPoints1.y.push(entryY);
            this.controlPoints1.x.push(entryX + 3);
            this.controlPoints1.y.push(entryY + (SPRITE_HEIGHT / 2) - 3);
            this.controlPoints1.x.push(this.x + SPRITE_WIDTH);
            this.controlPoints1.y.push(this.y + (SPRITE_HEIGHT / 2));
        } else {
            // Compute track entry (x,y) into switch from parent node
            // Left side of switch
            const entryX = this.x;
            const entryY = this.y + (SPRITE_HEIGHT / 2);

            // Compute control points for switch position 0
            this.controlPoints0.x.push(entryX);
            this.controlPoints0.y.push(entryY);
            this.controlPoints0.x.push(entryX + (SPRITE_WIDTH / 2) - 3);
            this.controlPoints0.y.push(entryY + 3);
            this.controlPoints0.x.push(this.x + (SPRITE_WIDTH / 2));
            this.controlPoints0.y.push(this.y + SPRITE_HEIGHT);

            // Compute control points for switch position 1
            this.controlPoints1.x.push(entryX);
            this.controlPoints1.y.push(entryY);
            this.controlPoints1.x.push(this.x + SPRITE_WIDTH);
            this.controlPoints1.y.push(entryY);
        }

        // Create two sprites for each switch position (0 and 1)
        this.sprite0 = Level.drawTrack(this.controlPoints0);
        this.sprite1 = Level.drawTrack(this.controlPoints1);

        // Display "position 0" as default
        this.sprite0.visible = true;
        this.sprite1.visible = false;

        // Switch clicked => toggle track position
        sw.inputEnabled = true;
        sw.events.onInputDown.add(this.togglePosition, this);
    }

    togglePosition() {
        if (this.objRefCount) {
            return;
        }
        if (this.position) {
            this.position = 0;
            this.sprite0.visible = true;
            this.sprite1.visible = false;
        } else {
            this.position = 1;
            this.sprite0.visible = false;
            this.sprite1.visible = true;
        }
    }

    getCurrentControlPoints() {
        if (this.position) {
            return this.controlPoints1;
        }

        return this.controlPoints0;
    }
}

export class Station {
    constructor(color) {
        this.x = 0;
        this.y = 0;
        this.color = color;
        this.sprite = null;
    }

    create() {
        this.sprite = game.add.sprite(this.x, this.y, "station");
        this.sprite.tint = this.color;
    }
}
