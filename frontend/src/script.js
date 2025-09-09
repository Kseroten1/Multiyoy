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

function makeCircleFanVertices(segments) {
    const twoPi = Math.PI * 2;
    const verts = [];
    // center at (0,0) for TRIANGLE_FAN start
    verts.push(0, 0);
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const ang = t * twoPi;
        verts.push(Math.cos(ang), Math.sin(ang)); // unit circle
    }
    return new Float32Array(verts);
}

const segments = 128;
const circleVerts = makeCircleFanVertices(segments);

const vao = gl.createVertexArray(); //GPU-state object that remembers how your vertex data is provided to the shader, not functional in this implementation, but still needed 
gl.bindVertexArray(vao);

const posBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
gl.bufferData(gl.ARRAY_BUFFER, circleVerts, gl.STATIC_DRAW);

// location 0 must match layout(location = 0) in vertex shader
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

// Look up uniform locations we will set each frame
const uMvpLoc = gl.getUniformLocation(program, "u_mvp"); // mat3
const uCenterLoc = gl.getUniformLocation(program, "u_center");
const uRadiusLoc = gl.getUniformLocation(program, "u_radius");
const uColorALoc = gl.getUniformLocation(program, 'u_colorA');
const uColorBLoc = gl.getUniformLocation(program, 'u_colorB');

const colorA = [1.0, 1.0, 1.0]; // polska
const colorB = [0.9, 0.2, 0.2]; // gurom
const backgroundColor = [0.07, 0.07, 0.07, 1]

const radius = 0.8;
const center = [0.0, 0.0];
let angle = 0.0;

// ---- Minimal 2D mat3 utilities (column-major, GLSL-compatible) ----
function mat3Identity() {
    const m = new Float32Array(9);
    m[0] = 1;
    m[4] = 1;
    m[8] = 1;
    return m;
}
function mat3Mul(a, b) {
    const r = new Float32Array(9);
    // r = a * b (column-major)
    r[0] = a[0] * b[0] + a[3] * b[1] + a[6] * b[2];
    r[3] = a[0] * b[3] + a[3] * b[4] + a[6] * b[5];
    r[6] = a[0] * b[6] + a[3] * b[7] + a[6] * b[8];

    r[1] = a[1] * b[0] + a[4] * b[1] + a[7] * b[2];
    r[4] = a[1] * b[3] + a[4] * b[4] + a[7] * b[5];
    r[7] = a[1] * b[6] + a[4] * b[7] + a[7] * b[8];

    r[2] = a[2] * b[0] + a[5] * b[1] + a[8] * b[2];
    r[5] = a[2] * b[3] + a[5] * b[4] + a[8] * b[5];
    r[8] = a[2] * b[6] + a[5] * b[7] + a[8] * b[8];
    return r;
}
function mat3Translate(tx, ty) {
    const m = mat3Identity();
    m[6] = tx;
    m[7] = ty;
    return m;
}
function mat3Scale(sx, sy) {
    const m = mat3Identity();
    m[0] = sx;
    m[4] = sy;
    return m;
}
function mat3Rotate(theta) {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const m = mat3Identity();
    m[0] = c;
    m[3] = -s;
    m[1] = s;
    m[4] = c;
    return m;
}
function makeModel(centerXY, r, angleRad = 0) {
    const T = mat3Translate(centerXY[0], centerXY[1]);
    const R = mat3Rotate(angleRad);
    const S = mat3Scale(r, r);
    // M = T * R * S
    return mat3Mul(T, mat3Mul(R, S));
}

function updateUniforms() {
    const M = makeModel(center, radius, angle);
    gl.uniformMatrix3fv(uMvpLoc, false, M);
    gl.uniform3fv(uColorALoc, colorA);
    gl.uniform3fv(uColorBLoc, colorB);
    gl.uniform2fv(uCenterLoc, center);
    gl.uniform1f(uRadiusLoc, radius);
}

function draw() {
    canvas.width = 700;
    canvas.height = 700;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(...backgroundColor);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindVertexArray(vao); // bind VAO (no attributes needed)
    updateUniforms();

    const vertexCount = segments + 2; //N rim + 1 closing + rim center
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);
}

draw(); // initial draw