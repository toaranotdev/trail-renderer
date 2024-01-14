function disgusting(seconds) {
    const now = Date.now() / 1000;
    
    while (true) { 
        const future = Date.now() / 1000;
        if (future - now >= seconds) {
            break;
        }
    }
    
}

const canvas = document.querySelector("canvas");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gl = canvas.getContext("webgl");
const program = gl.createProgram();

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexSrc);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentSrc);

gl.compileShader(vertexShader);
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
}
gl.compileShader(fragmentShader);
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(fragmentShader));
}

gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);

gl.linkProgram(program);
gl.useProgram(program);

let texture = gl.createTexture();
const textureImage = new Image();
gl.bindTexture(gl.TEXTURE_2D, texture);
textureImage.src = "./texture.png";
textureImage.decode().then(() => {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, textureImage);
        gl.generateMipmap(gl.TEXTURE_2D);
    }
);
disgusting(1);
gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);

let positionBuffer = gl.createBuffer();
let inputTextureCoordBuffer = gl.createBuffer();

const trailWidth = 20;
const segmentLength = 10;

let mousePosition = { 
    x: canvas.width / 2, 
    y: canvas.height / 2 
};

let lastMousePosition = {
    x: canvas.width / 2,
    y: canvas.height / 2
};

let headGeometry = [];
updateHead(); // This will initialize the headGeometry

let textureCoords = new Float32Array([]);
let trailGeometry = [];

let mousePath = [
    mousePosition.x, mousePosition.y
];


const positionALoc = gl.getAttribLocation(program, "vertexPosition");
const inputTextureCoordALoc = gl.getAttribLocation(program, "inputTextureCoord");

// 2 / canvasWidth| 0                | -1 
// 0              | 2 / canvasHeight | -1
// 0              | 0                | 1
gl.uniformMatrix3fv(gl.getUniformLocation(program, "projectionMatrix"), false, 
    [2 / canvas.width, 0, 0, 0, 2 / canvas.height, 0, -1, -1, 1]
);

canvas.onmousemove = (e) => {
    mousePosition = {
        x: e.clientX,
        // The y value seems to be inverted if I don't do this, I don't know why
        y: canvas.height - e.clientY
    };

    render();
}

function elapsedTimeInSecond() {
    return performance.now() / 1000;
}

function updateVertices() {
    // The head needs updating regardless
    updateHead();

    if (trailNeedsUpdate()) {
        lastMousePosition = mousePosition;
        updateMousePath();
        updateTrail();
        updateTextureCoord();
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(trailGeometry.concat(headGeometry)), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(positionALoc);
    gl.vertexAttribPointer(positionALoc, 2, gl.FLOAT, false, 0, 0);


    gl.bindBuffer(gl.ARRAY_BUFFER, inputTextureCoordBuffer);
    updateTextureCoord();
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(inputTextureCoordALoc);
    gl.vertexAttribPointer(inputTextureCoordALoc, 2, gl.FLOAT, false, 0, 0);
}

function trailNeedsUpdate () {
    const numPoints = mousePath.length / 2;

    const deltaX = mousePosition.x - lastMousePosition.x;
    const deltaY = mousePosition.y - lastMousePosition.y;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let cosine;
    if (numPoints > 2) {
        const x = mousePath[mousePath.length - 4];
        const y = mousePath[mousePath.length - 3];

        const lastDeltaX = x - lastMousePosition.y;
        const lastDeltaY = y - lastMousePosition.y;

        const length1 = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const length2 = Math.sqrt(lastDeltaX * lastDeltaX + lastDeltaY * lastDeltaY);

        cosine = (lastDeltaX * deltaY + lastDeltaY * deltaX) / (length1 * length2);
    }

    return (distance > segmentLength) || (distance > 10 && cosine && cosine >= 0.7) || (!trailGeometry.length);
}

function updateMousePath() {
    const numPoints = mousePath.length / 2;
    if (numPoints > 4) {
        mousePath.shift();
        mousePath.shift();
    }

    mousePath.push(mousePosition.x, mousePosition.y);
}

function updateHead() {
    // Basically what we're doing is converting the unit vector (i.e: the two deltaX, deltaY values)
    // to a normal vector, and I learned this in the 10th grade, you just swap the two X and Y and you got it.
    // Also there are some translation involved
    let deltaX = mousePosition.x - lastMousePosition.x;
    let deltaY = mousePosition.y - lastMousePosition.y;

    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    deltaX = (deltaX / length) * trailWidth;
    deltaY = (deltaY / length) * trailWidth;

    const x1 = deltaY + mousePosition.x;
    const y1 = deltaX + mousePosition.y;

    const x2 = -deltaY + mousePosition.x;
    const y2 = -deltaX + mousePosition.y;

    headGeometry = [x1, y1, x2, y2];
}

function updateTrail() {
    const numVertexPairs = trailGeometry.length / 2;

    // Delete a segment if the trail is too long
    if (numVertexPairs > 70) {
        trailGeometry.splice(0, 8);
    }

    // Sorry cannot use the spread syntax because of funny intellisense
    trailGeometry.push(...headGeometry);
}

function updateTextureCoord() {
    const loopCount = ((trailGeometry.length + headGeometry.length) / 2) - 1;

    let array = [];
    for (let i = 0; i < loopCount; i ++) {
        array.push(
            0, 0,
            1, 0,
            0, 1,
            1, 1
        );
    }
    textureCoords = new Float32Array(array);
}

function render() {
    updateVertices();

    const numVertices = (headGeometry.length + trailGeometry.length) / 2;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, numVertices);
}