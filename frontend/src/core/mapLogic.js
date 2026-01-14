import {axialToCenter, hexRound, pixelToAxial} from "../utils/math.js";
import {CONFIG} from "../utils/config.js";
import {layers, state, worldObjects} from "./state.js";

export function updateGameEntities() {
    worldObjects.clear();

    for (const i of Array.from({ length: 100_000 }, (_, i) => i)) {
        const x = Math.ceil(Math.random() * 100 - 50)
        const y = Math.ceil(Math.random() * 100 - 50)
        worldObjects.set(`${x},${y}`, i % 13);
    }

    const posArray = [];
    const texArray = [];

    for (const [key, texID] of worldObjects) {
        const [q, r] = key.split(',').map(Number);
        const [x, y] = axialToCenter(q, r, CONFIG.hexSize);
        posArray.push(x, y);
        texArray.push(texID);
    }

    layers.units.updateData(new Float32Array(posArray), new Float32Array(texArray));
}

export function updateUnderPointerSelection() {
    const canvas = document.getElementById("main");
    const aspect = canvas.width / canvas.height;
    const normX = (state.mouseX / canvas.width) * 2 - 1;
    const normY = -((state.mouseY / canvas.height) * 2 - 1);
    const worldX = (normX - state.panOffset.x) / (state.scale / aspect);
    const worldY = (normY - state.panOffset.y) / state.scale;
    const [q, r] = hexRound(...pixelToAxial(worldX, worldY, CONFIG.hexSize));
    const neighborOffsets = [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const hlCenters = [];
    const hlUnitPos = [];
    const hlUnitTex = [];
    for (const [dq, dr] of neighborOffsets) {
        const curQ = q + dq;
        const curR = r + dr;
        const [cx, cy] = axialToCenter(curQ, curR, CONFIG.hexSize);

        hlCenters.push(cx, cy);

        const key = `${curQ},${curR}`;
        if (worldObjects.has(key)) {
            hlUnitPos.push(cx, cy);
            hlUnitTex.push(worldObjects.get(key));
        }
    }
    state.hlCenters = hlCenters;
    state.hlUnitPos = hlUnitPos;
    state.hlUnitTex = hlUnitTex;
}