import vertexShaderString from './shaders/vertexShader.glsl?raw';
import fragmentShaderString from './shaders/fragmentShader.glsl?raw';

import {createHexLayer} from './utils/createHexLayer.js';
import {EDGE_MASKS} from './utils/config.js';
import {makeMask, makeHexColorMask, axialToCenter} from './utils/math.js';
import {setupEventHandlers} from "./core/inputHandler.js";
import {gl, resize, updateHexColors} from "./core/renderer.js";
import {layers, mapState} from "./core/state.js";

export const mapWidth = Math.sqrt(mapState.hexCount);

async function init() {
    

    console.log(mapWidth);
    
    mapState.setHexState(0, 1);
    mapState.setHexState(1, 2);
    mapState.setHexState(2, 3);
    mapState.setHexState(3, 4);
    mapState.setHexState(4, 5);
    mapState.setHexState(5, 6);
    mapState.setHexState(6, 7);
    mapState.setHexState(7, 8);
    mapState.setHexState(8, 9);
    mapState.setHexState(9, 10);
    mapState.setHexState(10, 11);
    mapState.setHexState(11, 12);
    mapState.setHexState(20, 13);
    mapState.setHexState(40, 14);
    
    const centersVec2 = []
    const posArray = [];
    const texArray = [];
    
    for (let q = 0; q < mapWidth; q++) {
        for (let r = 0; r < mapWidth; r++) {
            const currState = mapState.getHexState(q * mapWidth + r);
            if (currState !== 0) {
                const curCenter = axialToCenter(q, r, 1);
                centersVec2.push(curCenter);
                posArray.push(...curCenter);
                texArray.push(currState);
            }
        }
    }

    // tu

    const indexPodMyszka = 547;
    const newOne = axialToCenter(Math.floor(indexPodMyszka/mapWidth), indexPodMyszka % mapWidth, 1);
    centersVec2.push(newOne);
    
    
    // const centersData = new Float32Array(centersVec2.flat());
    const edgeMaskData = new Int32Array(centersVec2.map(() => makeMask(EDGE_MASKS[0])));
    const fillMaskData = new Int32Array(centersVec2.map(() => makeHexColorMask(1, 1, 0)));
    

    layers.hex = createHexLayer(gl, vertexShaderString, fragmentShaderString, {
        centers: mapState.arrayForHexRenderer,
        edgeMasks: edgeMaskData,
        fillMasks: fillMaskData,
        count: centersVec2.length
    });

    // const atlasImage = new Image();
    // atlasImage.src = './assets/atlas.png';
    // await new Promise((resolve) => atlasImage.onload = resolve);
    // const atlasTexture = createAtlasTexture(gl, atlasImage);
    // const atlasTextureHighlight = createAtlasTexture(gl2, atlasImage);
    // layers.units = createSpriteLayer(gl, textureVertexShader, textureFragmentShader, atlasTexture);
    // layers.units.updateData(new Float32Array(posArray), new Float32Array(texArray));
    //
    //
    // layers.highlight = createHexLayer(gl2, vertexShaderString, fragmentShaderString, {
    //     centers: new Float32Array(14),
    //     edgeMasks: new Int32Array(7).fill(makeMask(EDGE_MASKS[0])),
    //     fillMasks: new Int32Array(7).fill(makeHexColorMask(2, 2, 0)),
    //     count: 7,
    // });

 //   layers.highlightUnits = createSpriteLayer(gl2, textureVertexShader, textureFragmentShader, atlasTextureHighlight);

    updateHexColors();
    // updateGameEntities();
    resize();
}

await init();
await setupEventHandlers();