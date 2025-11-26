import vertexShaderString from './vertexShader.glsl?raw'
import fragmentShaderString from './fragmentShader.glsl?raw'
import * as culori from 'https://cdn.jsdelivr.net/npm/culori@4.0.2/+esm'

const canvas = document.getElementById("main");
const gl = canvas.getContext("webgl2", {
        colorSpace: "display-p3"
    }); // ask for WebGL2 (newer GL). Required for gl_VertexID.

const vertexShaderSource = vertexShaderString;
const fragmentShaderSource = fragmentShaderString;
const rect = canvas.getBoundingClientRect();

function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); // attach source code
    gl.compileShader(shader); // compile it
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('Shader compile failed: ' + info);
    }
    return shader;
}

const vertShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
const fragShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = gl.createProgram();
gl.attachShader(program, vertShader);
gl.attachShader(program, fragShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('Program link failed: ' + info);
}
gl.useProgram(program);

const vao = gl.createVertexArray(); //GPU-state object that remembers how your vertex data is provided to the shader, not functional in this implementation, but still needed
gl.bindVertexArray(vao);

// Look up uniform locations we will set each frame
const uMvpLoc = gl.getUniformLocation(program, "u_mvp"); // mat3
const uCenterLoc = gl.getAttribLocation(program, "u_center");
const uEdgeMaskLoc = gl.getAttribLocation(program, "u_edgeMask");
const uBorderLoc = gl.getUniformLocation(program, "u_borderWidth");
const uFillColorMaskLoc = gl.getAttribLocation(program, "u_fillColorMask");
let brightness = 1.0;
let saturation = 1.0;

gl.uniform1f(uBorderLoc, 0.1);
const colorTableHex = [
    "#001f3f",
    "#0074D9",
    "#7FDBFF",
    "#39CCCC",
    "#B10DC9",
    "#F012BE",
    "#85144B",
    "#FF4136",
    "#FF851B",
    "#FFDC00",
    "#3D9970",
    "#2ECC40",
    "#01FF70",
    "#AAAAAA"
];
const colorTableEdge = [
    "#ff0000",
    "#ff8000",
    "#ffff00",
    "#00ff00",
    "#0080ff",
    "#9900ff"
];

const baseOklch = {
    fill: colorTableHex.map((h) => culori.oklch(culori.rgb(h))),
    edge: colorTableEdge.map((h) => culori.oklch(culori.rgb(h))),
};

function scaleOklch(colors, bright, chroma) {
    return colors.map((c) => ({
        mode: "oklch",
        l: Math.min(1, c.l * bright),
        c: c.c * chroma,
        h: c.h,
    }));
}

function toRgbArray(oklchColors) {
    return new Float32Array(
        oklchColors
            .map((ok) => {
                const rgb = culori.rgb(ok, "p3");
                const max = Math.max(rgb.r, rgb.g, rgb.b, 1);
                return [rgb.r / max, rgb.g / max, rgb.b / max].map((v) =>
                    Math.min(1, Math.max(0, v))
                );
            })
            .flat()
    );
}

function colorToP3Rgb(color){
    const x=document.createElement("canvas").getContext(
        "2d",
        { colorSpace: "display-p3" }
    );
    x.fillStyle=color;
    x.fillRect(0,0,1,1);
    const d=x.getImageData(0,0,1,1, {colorSpace: "display-p3", pixelFormat: "rgba-float16"}).data;
    return [d[0],d[1],d[2]];
}

colorToP3Rgb('color(oklch 0.2 1 0)');

function testColorConversion() {
    const cssColor = "oklch(50% 0.2 40)";
    const expected = culori.p3(culori.oklch(cssColor)); // <<- referencja
    const [r, g, b] = colorToP3Rgb(cssColor);

    console.log("Canvas →", r, g, b);
    console.log("Culori →", expected.r, expected.g, expected.b);
}
testColorConversion();

// function updateAllColors(brightness, saturation) {
//     const fillRGB = toRgbArray(scaleOklch(baseOklch.fill, brightness, saturation));
//     const edgeRGB = toRgbArray(scaleOklch(baseOklch.edge, brightness, saturation));
//
//     gl.useProgram(program);
//     gl.uniform3fv(gl.getUniformLocation(program, "FILL_COLORS"), fillRGB);
//     gl.uniform3fv(gl.getUniformLocation(program, "EDGE_COLORS"), edgeRGB);
//}

const backgroundColor = [...colorToP3Rgb('oklch(30% 0.2 100)'), 1]
const edgeMasks = [
    [1,1,1,1,1,1],
    [1,1,0,0,0,1],
    [1,1,1,0,0,0],
    [0,1,1,1,0,0],
    [0,0,1,1,1,0],
    [0,0,0,1,1,1],
    [1,0,0,0,1,1]
];
const fillColorMask = [
    [0b0000,0b0001, 1],
    [0b0010,0b0011, 1],
    [0b0100,0b0101, 0],
    [0b0110,0b0111, 0],
    [0b1000,0b1001, 1],
    [0b1010,0b1010, 0],
    [0b1100,0b1100, 1]
]

function axialToCenter(q, r, size) {
    const x = size * Math.sqrt(3) * (q + r / 2);
    const y = size * (3 / 2) * r;
    return [x, y];
}

function generateAxialHexCenters(radius, size) {
    const centers = [];
    for (let q = -radius; q <= radius; q++) {
        for (let r = -radius; r <= radius; r++) {
            if (Math.abs(q + r) > radius) continue;
            centers.push(axialToCenter(q, r, size));
        }
    }
    return centers;
}

const centers = generateAxialHexCenters(600, 1.0);

let panOffset = { x: 0.0, y: 0.0 };
let scale = 0.2;
let angle = 0.0;

function makeModelMat3(pan, scale, angle) {
    const aspect = canvas.width / canvas.height; // w pikselach
    const domMatrix = new DOMMatrix()
        .translate(pan.x, pan.y)
        .scale(scale / aspect, scale)
        .rotate((angle * 180) / Math.PI);

    const modelMat3 = new Float32Array(9);
    modelMat3[0] = domMatrix.a;
    modelMat3[1] = domMatrix.b;
    modelMat3[2] = 0;
    modelMat3[3] = domMatrix.c;
    modelMat3[4] = domMatrix.d;
    modelMat3[5] = 0;
    modelMat3[6] = domMatrix.e;
    modelMat3[7] = domMatrix.f;
    modelMat3[8] = 1;
    return modelMat3;
}

function updateUniforms() {
    const modelMat = makeModelMat3(panOffset, scale, angle);
    gl.uniformMatrix3fv(uMvpLoc, false, modelMat);
//    updateAllColors(brightness, saturation);
}

function makeMask(edgesEnabled) {
    let mask = 0;
    for (let index = 0; index < 6; index++) {
        if (edgesEnabled[index]) {
            const singleBitMask = 1 << index;
            mask = mask | singleBitMask;
        }
    }
    return mask;
}
function makeHexColorMask(color1, color2, isVertical) {
    const orientationBit = isVertical ? 1 : 0;
    return (orientationBit << 8) | (color2 << 4) | color1;
}

const centerData = new Float32Array(centers.flat());
const centerBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, centerBuffer);
gl.bufferData(gl.ARRAY_BUFFER, centerData, gl.STATIC_DRAW);
gl.enableVertexAttribArray(uCenterLoc);
gl.vertexAttribPointer(uCenterLoc, 2, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(uCenterLoc, 1);

const edgeMaskData = new Int32Array(
    centers.map((_, i) => makeMask(edgeMasks[i % edgeMasks.length]))
);
const edgeMaskBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, edgeMaskBuffer);
gl.bufferData(gl.ARRAY_BUFFER, edgeMaskData, gl.STATIC_DRAW);
if (uEdgeMaskLoc !== -1) {
    gl.enableVertexAttribArray(uEdgeMaskLoc);
    gl.vertexAttribIPointer(uEdgeMaskLoc, 1, gl.INT, 0, 0);
    gl.vertexAttribDivisor(uEdgeMaskLoc, 1);
}

const fillMaskData = new Int32Array(
    centers.map(() => {
        const c1 = Math.floor(Math.random() * 14);
        const c2 = Math.floor(Math.random() * 14);
        const v  = Math.random() > 0.5 ? 1 : 0; // random split orientation
        return makeHexColorMask(c1, c2, v);
    })
);
const fillMaskBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, fillMaskBuffer);
gl.bufferData(gl.ARRAY_BUFFER, fillMaskData, gl.STATIC_DRAW);
if (uFillColorMaskLoc !== -1) {
    gl.enableVertexAttribArray(uFillColorMaskLoc);
    gl.vertexAttribIPointer(uFillColorMaskLoc, 1, gl.INT, 0, 0);
    gl.vertexAttribDivisor(uFillColorMaskLoc, 1);
}
function draw() {
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(...backgroundColor);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindVertexArray(vao); // bind VAO (no attributes needed)
    updateUniforms();

    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, centers.length);
}

draw(); // initial draw

let dragging = false; //needed for logic of 'dragging' the hexagon
let lastX = 0.0;
let lastY = 0.0;
let activePointerId = -1;

canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
canvas.addEventListener("pointermove", onPointerMove, { passive: false });
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("pointerleave", endPointer);
canvas.addEventListener("wheel", wheelMove);
document.getElementById("brightness").addEventListener("input", (e) => {
        brightness = parseFloat(e.target.value);
        draw();
});
document.getElementById("saturation").addEventListener("input", (e) => {
        saturation = parseFloat(e.target.value);
        draw();
});

function endPointer(e) {
    if (!dragging || e.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = -1;
    canvas.releasePointerCapture(e.pointerId);
}

function onPointerDown(e) {
    if (dragging) return;
    e.preventDefault();
    activePointerId = e.pointerId;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(activePointerId);
}

function onPointerMove(e) {
    if (!dragging) return;
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();
    var deltaX = e.clientX - lastX;
    var deltaY = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    const clipDeltaX = (deltaX / rect.width) * 2.0;
    const clipDeltaY = -((deltaY / rect.height) * 2.0);
    panOffset.x += clipDeltaX;
    panOffset.y += clipDeltaY;
    draw();
}

function wheelMove(e) {
    e.preventDefault();
    const zoom = Math.exp(-e.deltaY * 0.001);
    const newScale = Math.max(0.000001, Math.min(500.0, scale * zoom));
    scale = newScale;
    draw();
}