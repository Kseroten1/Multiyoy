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

const vertices = new Float32Array([
    //   x,     y,     r,   g,   b
    // Trójkąt 1: lewy-dolny, lewy-górny, prawy-górny
    -0.5, -0.5,  1.0, 0.0, 0.0,  // LB - czerwony
    -0.5,  0.5,  0.0, 1.0, 0.0,  // LG - zielony
    0.5,  0.5,  0.0, 0.0, 1.0,  // PG - niebieski

    // Trójkąt 2: lewy-dolny, prawy-górny, prawy-dolny
    -0.5, -0.5,  1.0, 0.0, 0.0,  // LB - czerwony
    0.5,  0.5,  0.0, 0.0, 1.0,  // PG - niebieski
    0.5, -0.5,  1.0, 1.0, 0.0   // PD - żółty
]);

const vertexBuffer = gl.createBuffer();                // make an empty GPU buffer
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);          // select it as current
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const aPosLoc = gl.getAttribLocation(program, 'a_pos');
gl.enableVertexAttribArray(aPosLoc);

const stride = 5 * 4; // 5 floatów * 4 bajty = 20 bajtów na wierzchołek
gl.vertexAttribPointer(
    aPosLoc,
    2,            // a_pos: 2 liczby (x,y)
    gl.FLOAT,
    false,
    stride,       // NOWE: odstęp między kolejnymi wierzchołkami
    0             // offset pozycji = 0 bajtów od początku
);

const aColLoc = gl.getAttribLocation(program, 'a_col');
gl.enableVertexAttribArray(aColLoc);
gl.vertexAttribPointer(
    aColLoc,
    3,            // a_col: 3 liczby (r,g,b)
    gl.FLOAT,
    false,
    stride,       // ten sam stride: 20 bajtów na wierzchołek
    2 * 4         // offset koloru = po 2 floatach pozycji = 8 bajtów
);


gl.clearColor(0.07, 0.07, 0.07, 1); // background color

function draw() {
    //const rect = canvas.getBoundingClientRect();
    canvas.width = 700;
    canvas.height = 700;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);    // paint the background
    gl.drawArrays(gl.TRIANGLES, 0, 6);// draw 1 triangle from 3 points
}

draw()
/*window.addEventListener('resize', () => {
    draw()
});*/
