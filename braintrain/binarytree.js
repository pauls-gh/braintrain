export class Node {
    constructor(value) {
        this.value = value;
        this.leftTrackControlPoints = {
            x: [],
            y: []
        };
        this.rightTrackControlPoints = {
            x: [],
            y: []
        };
        this.left = null;
        this.right = null;
    }
}

export function preorderTraversal(root) {
    if (root !== null) {
        console.log("value = " + root.value);
        preorderTraversal(root.left);
        preorderTraversal(root.right);
    }
}
