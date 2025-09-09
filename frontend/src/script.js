import vertexShaderString from './vertexShader.glsl?raw'
import fragmentShaderString from './fragmentShader.glsl?raw'

const canvas = document.getElementById("main");
const gl = canvas.getContext("webgl2"); // ask for WebGL2 (newer GL). Required for gl_VertexID.

const vertexShaderSource = vertexShaderString;
const fragmentShaderSource = fragmentShaderString;

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

let center = [0.0, 0.0];
let scale = 1.0;
let angle = 0.0;

// DOMMatrix -> mat3 column-major for GLSL
function makeModelMat3(center, scale, angle) {
    const aspect = canvas.width / canvas.height; // w pikselach
    const dm = new DOMMatrix()
        .scale(1 / aspect, 1)
        .translate(center[0], center[1])
        .rotate((angle * 180) / Math.PI)
        .scale(scale, scale);

    // DOMMatrix 2D affine: [ a c e; b d f; 0 0 1 ]
    const a = dm.a,
        b = dm.b,
        c = dm.c,
        d = dm.d,
        e = dm.e,
        f = dm.f;

    const m = new Float32Array(9);
    m[0] = a;
    m[1] = b;
    m[2] = 0;

    m[3] = c;
    m[4] = d;
    m[5] = 0;

    m[6] = e;
    m[7] = f;
    m[8] = 1;
    return m;
}

function updateUniforms() {
    const M = makeModelMat3(center, scale, angle);
    gl.uniformMatrix3fv(uMvpLoc, false, M);
    gl.uniform3fv(uColorALoc, colorA);
    gl.uniform3fv(uColorBLoc, colorB);
    gl.uniform2fv(uCenterLoc, center);
}

function draw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(...backgroundColor);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindVertexArray(vao); // bind VAO (no attributes needed)
    updateUniforms();

    const vertexCount = 8; //N rim + 1 closing + rim center
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);
}

draw(); // initial draw

let dragging = false; //needed for logic of 'dragging' the hexagon
let lastX = 0.0; 
let lastY = 0.0;

// converting canvas pixel position of mouse to webgl clip range (-1:1) 
function pxToClip(pixelX, pixelY) {
    const clipX = (pixelX / canvas.width) * 2.0;
    const clipY = -((pixelY / canvas.height) * 2.0); //negation because the pixel Y grows the "lower" the mouse is on the screen and clip Y grows the "higher" the mouse is
    return {x: clipX,y: clipY };
}

canvas.addEventListener("mousedown", mouseDown);
canvas.addEventListener("mouseup", mouseUp);
canvas.addEventListener("mousemove", mouseMove);
canvas.addEventListener("wheel", wheelMove)

function mouseDown(e) {
    dragging = true; // if mouse pressed user is 'dragging'
    lastX = e.clientX; 
    lastY = e.clientY;
}

function mouseUp(e) {
    dragging = false; // if mouse is released user is not 'dragging'
}

function mouseMove(e) {
    if (!dragging) return; // if mouse 'released' or 'not clicked' we are not interested in its movement
    let mouseDeltaX = e.clientX - lastX;
    let mouseDeltaY = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    let clipDelta = pxToClip(mouseDeltaX, mouseDeltaY);
    center[0] += clipDelta.x;
    center[1] += clipDelta.y;
    draw()
}

function wheelMove(e) {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const mouseClipXY = pxToClip(mouseX, mouseY);
    const mouseClipX = mouseClipXY.x - 1;  //we need to substract here and add in the y to convert from delta to absolute position
    const mouseClipY = mouseClipXY.y + 1;

    const zoom = Math.exp(-e.deltaY * 0.001);
    const newScale = Math.max(0.05, Math.min(8.0, scale * zoom));

    const k = newScale / scale;
    center[0] = mouseClipX + (center[0] - mouseClipX) * k;
    center[1] = mouseClipY + (center[1] - mouseClipY) * k;

    scale = newScale;
    draw();
}