// Get the DPR and size of the canvas
const dpr = window.devicePixelRatio;
const canvas = document.getElementById("main");
const ctx = canvas.getContext("2d");


function draw() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.font = "48px serif";
    ctx.fillText("testowe okno", canvas.width/2, canvas.height/2);
}

draw()
window.addEventListener('resize', () => {
    draw()
});
