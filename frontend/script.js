import {generateCircleFan} from "./generateCircleFan.js";

const canvas = document.getElementById("main");
const gl = canvas.getContext('webgl');

const vertexShaderSource = `
  attribute vec2 a_pos;
  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec3 v_col;
  void main() {
    gl_FragColor = vec4(v_col, 1.0);
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

const aPosLoc = gl.getAttribLocation(program, 'a_pos');
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.enableVertexAttribArray(aPosLoc);

export const ELEMENTS_PER_VERTEX = 2;

gl.vertexAttribPointer(
    aPosLoc,
    ELEMENTS_PER_VERTEX,            // a_pos: 2 liczby (x,y)
    gl.FLOAT,
    false,
    0,          // zgodnie z dokumentacją ustawienie 0 pozwala na "ciasne upakowanie", nie trzeba ręcznie liczyć najmniejszej liczby
    0             // offset pozycji = 0 bajtów od początku
);

const vColLoc = gl.getUniformLocation(program, 'v_col');

const segSlider = document.getElementById("seg");
const segLabel = document.getElementById("segVal");
let segments = parseInt(segSlider.value, 10);
const circleColor = [0.2, 0.5, 1.0];
const radius = 0.8;

gl.clearColor(0.07, 0.07, 0.07, 1); // background color

function draw() {
    canvas.width = 700;
    canvas.height = 700;
    gl.viewport(0, 0, canvas.width, canvas.height)
    const positions = generateCircleFan({cx: 0.0, cy: 0.0, radius: radius, segments: segments});
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3fv(vColLoc, circleColor);
    const vertexCount = positions.length / ELEMENTS_PER_VERTEX; //dzielimy przez liczbe elementów wierzchołka (w tym przypadku x,y czyli 2)
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);
    
}
segSlider.addEventListener("input", () => {
    segments = Math.max(3, parseInt(segSlider.value, 10) || 3);
    segLabel.textContent = segments;
    draw();
});

draw()
/*window.addEventListener('resize', () => {
    draw()
});*/