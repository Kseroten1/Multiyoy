import {axialToCenter, hexRound, pixelToAxial} from "../utils/math.js";
import { CONFIG } from "../utils/config.js";
import { layers, state, mapState } from "./state.js";
import { canvas } from "./renderer.js";
import {mapWidth} from "../script.js";

// export function getHexIndex(q, r) {
//     const R = CONFIG.hexRadius;
//     return (q + R) + (r + R) * (2 * R + 1);
// }

// export function updateGameEntities() {
//     for (let i = 0; i < mapState.hexCount; i++) {
//         if (Math.random() > 0.95) {
//             mapState.setHexState(i, Math.floor(Math.random() * 13)); // Losowa jednostka (0-12)
//         } else {
//             mapState.setHexState(i, 255); // 255 oznacza pusto
//         }
//     }
//     syncWorldObjectsToLayer();
// }

// export function syncWorldObjectsToLayer() {
//     const posArray = [];
//     const texArray = [];
//     const R = CONFIG.hexRadius;
//
//     // Iterujemy po wszystkich możliwych q, r w promieniu R
//     for (let q = -R; q <= R; q++) {
//         for (let r = -R; r <= R; r++) {
//             if (Math.abs(q + r) > R) continue;
//
//             const idx = getHexIndex(q, r);
//             const unitID = mapState.getHexState(idx);
//
//             if (unitID !== 255) { // Jeśli heks nie jest pusty
//                 const [x, y] = axialToCenter(q, r, CONFIG.hexSize);
//                 posArray.push(x, y);
//                 texArray.push(unitID);
//             }
//         }
//     }
//
//     layers.units.updateData(new Float32Array(posArray), new Float32Array(texArray));
// }

export function toggleUnitAtPointer() {

}

export function updateUnderPointerSelection() {
    const aspect = canvas.width / canvas.height;
    const normX = (state.mouseX / canvas.width) * 2 - 1;
    const normY = -((state.mouseY / canvas.height) * 2 - 1);
    const worldX = (normX - state.panOffset.x) / (state.scale / aspect);
    const worldY = (normY - state.panOffset.y) / state.scale;
    const [q, r] = hexRound(...pixelToAxial(worldX, worldY, CONFIG.hexSize));
    
    const index = r * mapWidth + q
    mapState.setHexState(index, 5);
    layers.hex.updateCenters(mapState.arrayForHexRenderer);
    
    
    // const neighborOffsets = [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    // const hlCenters = [];
    // const hlUnitPos = [];
    // const hlUnitTex = [];
    // for (const [dq, dr] of neighborOffsets) {
    //     const curQ = q + dq;
    //     const curR = r + dr;
    //     const idx = getHexIndex(curQ, curR);
    //     // OBLICZAMY ŚRODEK NAWET JEŚLI NIE MA JEDNOSTKI (dla siatki podświetlenia)
    //     const [cx, cy] = axialToCenter(curQ, curR, CONFIG.hexSize);
    //     hlCenters.push(cx, cy);
    //     // SPRAWDZAMY CZY INDEKS JEST PRAWIDŁOWY I CZY JEST TAM JEDNOSTKA
    //     if (idx !== -1) {
    //         const unitID = mapState.getHexState(idx);
    //         // 255 to nasza wartość dla "pustego" heksa
    //         if (unitID !== 255) {
    //             hlUnitPos.push(cx, cy);
    //             hlUnitTex.push(unitID);
    //         }
    //     }
    // }
    // state.hlCenters = hlCenters;
    // state.hlUnitPos = hlUnitPos;
    // state.hlUnitTex = hlUnitTex;
}