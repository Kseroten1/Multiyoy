import vertexShaderString from './shaders/vertexShader.glsl?raw';
import fragmentShaderString from './shaders/fragmentShader.glsl?raw';
import textureVertexShader from './shaders/texture.vert?raw';
import textureFragmentShader from './shaders/texture.frag?raw';

import { createHexLayer } from './utils/createHexLayer.js';
import { createSpriteLayer } from './utils/createSpriteLayer.js';
import { CONFIG, EDGE_MASKS } from './utils/config.js';
import {generateAxialHexCenters, makeMask, makeHexColorMask } from './utils/math.js';
import {setupEventHandlers} from "./core/inputHandler.js";
import {gl, gl2, resize, updateHexColors} from "./core/renderer.js";
import {layers} from "./core/state.js";
import {updateGameEntities} from "./core/mapLogic.js";
import {createAtlasTexture} from "./utils/glUtils.js";

async function init() {
    const centersVec2 = generateAxialHexCenters(CONFIG.hexRadius, CONFIG.hexSize);
    const centersData = new Float32Array(centersVec2.flat());
    const edgeMaskData = new Int32Array(centersVec2.map(() => makeMask(EDGE_MASKS[0])));
    const fillMaskData = new Int32Array(centersVec2.map(() => makeHexColorMask(1, 1, 0)));

    const atlasImage = new Image();
    atlasImage.src = './assets/atlas.png';
    await new Promise((resolve) => atlasImage.onload = resolve);
    const atlasTexture = createAtlasTexture(gl, atlasImage);
    const atlasTextureHighlight = createAtlasTexture(gl2, atlasImage);

    layers.hex = createHexLayer(gl, vertexShaderString, fragmentShaderString, {
        centers: centersData,
        edgeMasks: edgeMaskData,
        fillMasks: fillMaskData,
        count: centersVec2.length
    });

    layers.units = createSpriteLayer(gl, textureVertexShader, textureFragmentShader, atlasTexture);

    layers.highlight = createHexLayer(gl2, vertexShaderString, fragmentShaderString, {
        centers: new Float32Array(14),
        edgeMasks: new Int32Array(7).fill(makeMask(EDGE_MASKS[0])),
        fillMasks: new Int32Array(7).fill(makeHexColorMask(2, 2, 0)),
        count: 7,
    });

    layers.highlightUnits = createSpriteLayer(gl2, textureVertexShader, textureFragmentShader, atlasTextureHighlight);

    updateHexColors();
    updateGameEntities();
    resize();
}

await init();
await setupEventHandlers();