import vertexShaderString from './vertexShader.glsl?raw'
import fragmentShaderString from './fragmentShader.glsl?raw'

const canvas = document.getElementById("main");
const gl = canvas.getContext("webgl2"); // ask for WebGL2 (newer GL). Required for gl_VertexID.

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
const onePoint = new Float32Array([0, 0]);
const posBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
gl.bufferData(gl.ARRAY_BUFFER, onePoint, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

// Look up uniform locations we will set each frame
const uMvpLoc = gl.getUniformLocation(program, "u_mvp"); // mat3
const uCenterLoc = gl.getUniformLocation(program, "u_center");
const uColorALoc = gl.getUniformLocation(program, 'u_colorA');
const uColorBLoc = gl.getUniformLocation(program, 'u_colorB');

const colorA = [1.0, 1.0, 1.0]; // polska
const colorB = [0.9, 0.2, 0.2]; // gurom
const backgroundColor = [0.07, 0.07, 0.07, 1]

const centers = [
    [-0.8660254, 0.0],
    [ 0.8660254, 0.0],
];
let panOffset = { x: 0.0, y: 0.0 };
let scale = 0.2;
let angle = 0.0;

// DOMMatrix -> mat3 column-major for GLSL
function makeModelMat3(pan, scale, angle) {
    const aspect = canvas.width / canvas.height; // w pikselach
    const dm = new DOMMatrix()
        .scale(1, aspect)
        .scale(scale, scale)
        .rotate((angle * 180) / Math.PI)
        .translate(pan.x, pan.y);
        
        

    const m = new Float32Array(9);
    m[0] = dm.a;
    m[1] = dm.b;
    m[2] = 0;

    m[3] = dm.c;
    m[4] = dm.d;
    m[5] = 0;

    m[6] = dm.e;
    m[7] = dm.f;
    m[8] = 1;
    return m;
}

function updateUniforms() {
    const M = makeModelMat3(panOffset, scale, angle);
    gl.uniformMatrix3fv(uMvpLoc, false, M);
    gl.uniform3fv(uColorALoc, colorA);
    gl.uniform3fv(uColorBLoc, colorB);
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

    const vertexCount = 8; //N rim + 1 closing + rim center
    for (let i = 0; i < centers.length; i++) {
        gl.uniform2fv(uCenterLoc, new Float32Array(centers[i]));
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 8);
    }
}

draw(); // initial draw

let dragging = false; //needed for logic of 'dragging' the hexagon
let lastX = 0.0;
let lastY = 0.0;
let activePointerId = -1;

// converting canvas pixel position of mouse to webgl clip range (-1:1) 
function pxPosToClip(pixelX, pixelY) {
    const clipX = (pixelX / rect.width) * 2.0 - 1;
    const clipY = -((pixelY / rect.height) * 2.0 - 1); //negation because the pixel Y grows the "lower" the mouse is on the screen and clip Y grows the "higher" the mouse is
    return {x: clipX,y: clipY };
}

canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
canvas.addEventListener("pointermove", onPointerMove, { passive: false });
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("pointerleave", endPointer);
canvas.addEventListener("wheel", wheelMove);

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

    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    const clipDeltaX = (dx / rect.width) * 2.0;
    const clipDeltaY = -((dy / rect.height) * 2.0);
    
    panOffset.x += clipDeltaX;
    panOffset.y += clipDeltaY;

    draw();
}

function wheelMove(e) {
    e.preventDefault();
    
    const zoom = Math.exp(-e.deltaY * 0.001);
    const newScale = Math.max(0.05, Math.min(8.0, scale * zoom));

    scale = newScale;
    draw();
}