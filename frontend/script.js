// Get the DPR and size of the canvas
const dpr = window.devicePixelRatio;
const canvas = document.getElementById("main");
const gl = canvas.getContext('webgl');

// language=glsl
const vertexShaderSource = `
  attribute vec2 a_pos;
  attribute vec3 a_col;   // NOWE: kolor przychodzi razem z wierzchołkiem
  varying vec3 v_col;     // NOWE: "kabel" do fragment shadera

  void main() {
    v_col = a_col;        // przekaż kolor dalej
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  varying vec3 v_col;           // NOWE: kolor z vertex shadera

  void main() {
    gl_FragColor = vec4(v_col, 1.0); // użyj interpolowanego koloru
  }
`;
function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);   // attach source code
    gl.compileShader(shader);          // compile it
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

// Parametry "kanciastego koła"
const cx = 0.0;
const cy = 0.0;
const radius = 0.9;

// Uchwyt na bufor i liczba wierzchołków
let vertexBuffer = null;
let vertCount = 0;

// Generator fan’a
function generateCircleFan(segments) {
    const count = 1 + segments + 1; // center + ring + closing
    const data = new Float32Array(count * 5);
    let o = 0;

    // center (white)
    data[o++] = cx;
    data[o++] = cy;
    data[o++] = 1.0;
    data[o++] = 1.0;
    data[o++] = 1.0;

    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = cx + radius * Math.cos(t);
        const y = cy + radius * Math.sin(t);

        data[o++] = x;
        data[o++] = y;

        const r = 0.5 + 0.5 * Math.cos(t);
        const g = 0.5 + 0.5 * Math.cos(t + 2.09439510239);
        const b = 0.5 + 0.5 * Math.cos(t + 4.18879020479);
        data[o++] = r;
        data[o++] = g;
        data[o++] = b;
    }
    return { data, count };
}

function uploadVertices(data) {
    if (!vertexBuffer) vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
}

// Slider refs
const segInput = document.getElementById("seg");
const segVal = document.getElementById("segVal");
let segments = parseInt(segInput.value, 10);

// Inicjalne dane
{
    const { data, count } = generateCircleFan(segments);
    uploadVertices(data);
    vertCount = count;
}

// Atrybuty
const aPosLoc = gl.getAttribLocation(program, "a_pos");
gl.enableVertexAttribArray(aPosLoc);
const stride = 5 * 4;
gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, stride, 0);

const aColLoc = gl.getAttribLocation(program, "a_col");
gl.enableVertexAttribArray(aColLoc);
gl.vertexAttribPointer(aColLoc, 3, gl.FLOAT, false, stride, 2 * 4);

// Rysowanie
gl.clearColor(0.07, 0.07, 0.07, 1);

function draw() {
    canvas.width = 700;
    canvas.height = 700;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertCount);
}

draw();

// Reakcja na suwak
segInput.addEventListener("input", () => {
    segments = parseInt(segInput.value, 10);
    segVal.textContent = segments;

    const { data, count } = generateCircleFan(segments);
    uploadVertices(data);
    vertCount = count;

    draw();
});
