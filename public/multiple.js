import { TWEEN } from './tween.module.min.js';

/* VARIABLE DEFINITION */
var socket = io({ 'reconnect': false });
let nScreens;
let screen;
let done = false;

let fullWidth = 1;
let fullHeight = 1;
let startX = 0;
let startY = 0;
let camera;
let chessboard;
let white = [];
let black = [];
let starPos = [];

let whiteNaming = {
    'k': 0, // king
    'q': 1, // queen
    'b1': 2, // bishop
    'n1': 3, // knight
    'r1': 4, // rook
    'p15': 5, 'p14': 6, 'p13': 7, 'p12': 8, 'p11': 9, 'p10': 10, 'p9': 11, 'p8': 12,
    'r2': 13, // rook
    'n2': 14, // knight
    'b2': 15 // bishop
}

let blackNaming = {
    'b1': 0, // bishop
    'n1': 1, // knight
    'r1': 2, // rook
    'p7': 3, 'p6': 4, 'p5': 5, 'p4': 6, 'p3': 7, 'p2': 8, 'p1': 9, 'p0': 10,
    'r2': 11, // rook
    'n2': 12, // knight
    'b2': 13, // bishop
    'q': 14, // queen
    'k': 15, // king
}

let chessboardStatus = Array(8).fill(0).map(x => Array(8).fill(null)); // 2d array
let initialPiecePos = {};
/* END VARIABLE DEFINITION */


/* SOCKET INFORMATION EXCHANGE */
socket.on('updateScreen', (coords) => {
    if (screen == 1) return; // do not update the master screen

    return;
});


/*
update: on first connection, retrieve data, screen number
    and send essential data (to the server) like the size (screen id, screen width, screen height)
*/
socket.on('update', (screenData) => {
    if (done) return;
    document.title = screenData.id;
    screen = screenData.id;
    done = true;

    console.log('screen data: ' + screenData.id);
    console.log('screen number: ' + screen);

    socket.emit('windowSize', {
        id: screen,
        width: window.innerWidth,
        height: window.innerHeight
    });
});


/*
Start visulization when the server gives the signal to do so
    - Retrieve: - super-resuloution (the total width of the screens)
                - Calculate the portion to the screen
    
    @param {Object} superRes, contains {width, height, child(Object)}
        child (Object): {1: width, 2: width, 3: width, ..., n: width}
*/
socket.on('start', (superRes) => {
    console.log('screen' + screen + ' ready');

    // super resolution width and height
    fullWidth = superRes.width;
    fullHeight = window.innerHeight;

    // get star coords (same for all screens)
    starPos = superRes.pos;

    // calculate each screen startX
    let scRes = superRes.child;

    // master is 0
    // left screens have negative values (negative offset)
    // right screens have positive values (positive offset)
    startX = 0;

    // right side screens
    if (screen % 2 == 0) {
        startX = scRes[1];
        for (let index = 2; index < screen; index += 2) {
            startX += scRes[index];
        }
    } else { // left side screens
        for (let index = 3; index <= screen; index += 2) {
            startX -= scRes[index];
        }
    }

    // startX = Math.floor(screen / 2) * window.innerWidth * (screen % 2 != 0 ? -1 : 1);

    console.log('superRes: (' + fullWidth + ',' + fullHeight + ')');
    console.log('StartX: ' + startX + ' StartY: ' + startY);

    // start animation
    init();
    addSphere();
    animate();
});

/*
*/
socket.on('updateFen', (fen) => {
    if(fen.move == '') printFen(fen.status);
    else {
        console.log('fen: ' + fen.status);
        printFen(fen.status);
        move(fen.move.split(' ')[0], fen.move.split(' ')[1]);
    }
});

/*
UpdateMouse -> update mouse position, only works for slaves
@param {Object} mouse, mouse {mousex: value, mousey: value}
*/
socket.on('updateMouse', (mouse) => {
    if (screen == 1) return;
    console.log('up');

    mouseX = mouse.mousex;
    mouseY = mouse.mousey;
});

/*
UpdateMouse -> update camera position z, only works for slaves
@param {Object} pos: {z: value}
*/
socket.on('updatePosScreen', (pos) => {
    if (screen == 1) return;

    camera.position.x = pos.x;
    camera.position.z = pos.z;
});

window.onload = function () {
    document.addEventListener('keydown', onDocumentKeyDown, false);
}

const onDocumentKeyDown = (event) => {

    if (screen != 1) return;

    var keyCode = event.which;
    if (keyCode == 87) { // w
        camera.position.z += 10;
    } else if (keyCode == 83) { // s
        camera.position.z -= 10;
    } else if (keyCode == 65) {
        camera.position.x -= 50;
    } else if (keyCode == 68) {
        camera.position.x += 50;
    } else if (keyCode == 13) {  // enter
        startDemoView();
    } else if (keyCode == 8) { // back space
        move('A2','A4');
    } else { return; }

    socket.emit('updatePos', {
        x: camera.position.x,
        z: camera.position.z
    });
}

socket.on('controllerUpdate', (data) => {
    camera.position.x += data.x;
    camera.position.z += data.z;
});

/* SOCKET INFORMATION EXCHANGE */

/* VARIABLES FOR THREE JS */

const views = [];
let scene, renderer;
let mouseX = 0, mouseY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;
let stars = [];

/* END VARIABLES FOR THREE JS */


/*
View - set the camera offset according to the screen dimensions and position (...5,3,1,2,4...)

@param {Canvas} canvas
@param {Number} fullWidth
@param {Number} fullHeight
@param {Number} viewX
@param {Number} viewY
@param {Number} viewWidth
@param {Number} viewHeight

*/
function View(canvas, fullWidth, fullHeight, viewX, viewY, viewWidth, viewHeight) {

    canvas.width = viewWidth * window.devicePixelRatio;
    canvas.height = viewHeight * window.devicePixelRatio;

    const context = canvas.getContext('2d');

    camera = new THREE.PerspectiveCamera(20, (viewWidth) / (viewHeight), 1, 10000);

    // Orthographic Camera
    // camera = new THREE.OrthographicCamera
    //     (-viewWidth, viewWidth, viewHeight, -viewHeight, 1, 10000);

    // set camera offset
    camera.setViewOffset(fullWidth, fullHeight, viewX, viewY, viewWidth, viewHeight);

    // camera default position
    camera.position.z = 1000; // default camera z index pos
    // camera.position.x += (mouseX - camera.position.x) * 0.05;
    // camera.position.y += (- mouseY - camera.position.y) * 0.05;

    this.render = function () {

        // camera.position.x += (mouseX - camera.position.x) * 0.05;
        // camera.position.y += (- mouseY - camera.position.y) * 0.05;
        // camera.lookAt( scene.position );

        renderer.setViewport(0, fullHeight - viewHeight, viewWidth, viewHeight);
        renderer.render(scene, camera);

        context.drawImage(renderer.domElement, 0, 0);
    };
}


/*
init -> initialize the scene and renderer (printing the chessboard, start position by default)
*/
function init() {

    const canvas1 = document.getElementById('canvas1');

    console.log('Parameters:');
    console.log('fullWidth: ' + fullWidth);
    console.log('fullHeight: ' + fullHeight);
    console.log('startX: ' + startX);
    console.log('canvas w: ' + canvas1.clientWidth);
    console.log('canvas h: ' + canvas1.clientHeight);


    views.push(new View(canvas1, fullWidth, fullHeight, startX, 0, canvas1.clientWidth, canvas1.clientHeight));

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 0, 10).normalize();
    scene.add(light);

    try {
        const loader = new THREE.GLTFLoader();
        // Load a glTF resource
        loader.load(
            // resource URL
            'models/scene.gltf',
            // called when the resource is loaded
            function (gltf) {

                chessboard = gltf.scene;
                chessboard.rotation.x = Math.PI / 3.5;
                // chessboard.rotation.y = Math.PI / 2;


                // chessboard.position.x -= (canvas1.clientWidth / 2);
                camera.position.x = chessboard.position.x;
                camera.position.y = chessboard.position.y;

                light.position.set(10, 100, 200).normalize();

                console.log('ChessPosition: ' + chessboard.position.x);
                console.log('chess:', chessboard);


                // 1 white
                chessboard.children[0].children[0].children[0].children[1].children.forEach((piece) => {
                    initialPiecePos[piece.name] = piece.position.y;
                    piece.children[0].material.color.setHex(0xDDDDDD);
                    white.push(piece);
                });


                // 2 black
                chessboard.children[0].children[0].children[0].children[2].children.forEach((piece) => {
                    initialPiecePos[piece.name] = piece.position.y;
                    piece.children[0].material.color.setHex(0x606060);
                    black.push(piece);
                });

                // Border chessboard color
                chessboard.children[0].children[0].children[0].children[4].children[0].children[0].material.color.setHex(0xFFFFFF);

                // White squares color
                chessboard.children[0].children[0].children[0].children[4].children[1].children[0].material.color.setHex(0xF2C886);

                // Black squares color
                chessboard.children[0].children[0].children[0].children[4].children[1].children[1].material.color.setHex(0xCF9218);

                // add chessboard to the main scene
                scene.add(chessboard);
                // camera.lookAt(chessboard.position);

                // all pieces are dead (starting configuration)
                printFen('8/8/8/8/8/8/8/8');
            },
            // called while loading is progressing
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // called when loading has errors
            function (error) {
                console.log('An error happened');
            }
        );
    } catch (err) {
        console.log('ERROR\n', err)
    }

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(fullWidth, fullHeight);

    // document.addEventListener('mousemove', onDocumentMouseMove);
}

/*
onDocumentMouseMove -> update the mouse position and emit it to the other screens
*/
function onDocumentMouseMove(event) {
    // only the master can move
    if (screen != 1) return;

    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;

    socket.emit('updateScreens', {
        mousex: mouseX,
        mousey: mouseY
    });
}

/*
setPiecePos -> set the position of a piece in the visualization and in the status board
*/
function setPiecePos(piece, type, sx, sy, i, j, color) {

    // if (color == 'white') {
    //     white[whiteNaming[`${piece}${type}`]].position.x = sx;
    //     white[whiteNaming[`${piece}${type}`]].position.y = sy;
    //     chessboardStatus[i][j] = white[whiteNaming[`${piece}${type}`]];
    // } else {
    //     black[blackNaming[`${piece}${type}`]].position.x = sx;
    //     black[blackNaming[`${piece}${type}`]].position.y = sy;
    //     chessboardStatus[i][j] = black[blackNaming[`${piece}${type}`]];
    // }
    if (color == 'white') {

        new TWEEN.Tween(white[whiteNaming[`${piece}${type}`]].position)
            .to({ x: sx, y: sy }, 100)
            .start();

        chessboardStatus[i][j] = white[whiteNaming[`${piece}${type}`]];

    } else {
        new TWEEN.Tween(black[blackNaming[`${piece}${type}`]].position)
            .to({ x: sx, y: sy }, 100)
            .start();

        chessboardStatus[i][j] = black[blackNaming[`${piece}${type}`]];
    }
}

function move(srcSquare, targetSquare) {
    let src = [srcSquare[0].toUpperCase().charCodeAt(0) - 65, parseInt(srcSquare[1]) - 1];
    let dest = [targetSquare[0].toUpperCase().charCodeAt(0) - 65, parseInt(targetSquare[1]) - 1];
    
    console.log(src);
    console.log(dest);

    
    let movinDistance = 39;
    if(chessboardStatus[dest[0]][dest[1]] != null) {
        let pieceName = chessboardStatus[dest[0]][dest[1]].name;
        var expresion = /^Pawn.*/gi;
        if( expresion.test(pieceName) ) movinDistance = 33;

        new TWEEN.Tween(chessboardStatus[dest[0]][dest[1]].position)
        .to({ x: movinDistance, y: initialPiecePos[pieceName] }, 700)
        .start();
    }

    // move white piece from source square to destination square
    
    if(chessboardStatus[src[0]][src[1]].parent.name == 'White_Pieces002') { // white
        new TWEEN.Tween(chessboardStatus[src[0]][src[1]].position)
        .to({ x: (21 - dest[1]*6), y: (-21 + dest[0]*6) }, 700)
        .start();
    } else {
        new TWEEN.Tween(chessboardStatus[src[0]][src[1]].position)
        .to({ x: (-21 + dest[1]*6), y: (21 - dest[0]*6) }, 700)
        .start();
    }

    chessboardStatus[dest[0]][dest[1]] = chessboardStatus[src[0]][src[1]];
    chessboardStatus[src[0]][src[1]] = null;

}
/*
printFen -> print the chessboard with the given fen string
@param {String} fen, Forsyth–Edwards Notation
*/
function printFen(fen) {
    // rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR

    let rw = 1, bw = 1, nw = 1, pw = 8, qw = 1, kw = 1;
    let rb = 1, bb = 1, nb = 1, pb = 0, qb = 1, kb = 1;

    // left top corner
    let sxw = -21, syw = -21;
    let sxb = 21, syb = 21;
    let i = 0, j = 7;

    // reset chessboard status
    chessboardStatus = Array(8).fill(0).map(x => Array(8).fill(null));

    for (let piece of fen) {

        if (piece == '/') {
            sxw += 6; syw = -21;
            sxb -= 6; syb = 21;
            i = 0; j--;
            continue;
        }

        if (!Number.isNaN(parseInt(piece))) {
            syw += 6 * parseInt(piece);
            syb -= 6 * parseInt(piece);
            i += parseInt(piece);
            continue;
        }

        if (piece == piece.toLowerCase()) { // black

            if (piece == 'q' || piece == 'k') {
                setPiecePos(piece, '', sxb, syb, i, j, 'black');
                eval(`${piece}b++`);
            } else {
                setPiecePos(piece, eval(`${piece}b`), sxb, syb, i, j, 'black');
                eval(`${piece}b++`);
            }

        } else { // white            
            piece = piece.toLowerCase();

            if (piece == 'q' || piece == 'k') {
                setPiecePos(piece, '', sxw, syw, i, j, 'white');
                eval(`${piece}w++`);
            } else {
                setPiecePos(piece, eval(`${piece}w`), sxw, syw, i, j, 'white');
                eval(`${piece}w++`);
            }
        }
        syw += 6;
        syb -= 6;
        i++;
    }

    // check if there are dead pieces
    let num, aux;
    for (let piece of 'rnbqkp') {
        for (let color of 'wb') {

            if (piece == 'q' || piece == 'k')
                num = 2;
            else if (piece == 'p')
                num = (color == 'w' ? 16 : 8);
            else
                num = 3;

            aux = eval(`${piece}${color}`);
            if (aux != num) {
                for (let index = aux; index < num; index++) {
                    ((piece == 'q' || piece == 'k') ?
                        setDeadPosition(piece, '', color) :
                        setDeadPosition(piece, index, color));
                }
            }
        }
    }

    console.log(chessboardStatus);
}

function setDeadPosition(piece, type, color) {
    let movinDistance;

    movinDistance = 39;
    if (piece == 'p') movinDistance = 33;

    if (color == 'w') {
        new TWEEN.Tween(white[whiteNaming[`${piece}${type}`]].position)
            .to({ x: movinDistance }, 500)
            .start();
    } else {
        new TWEEN.Tween(black[blackNaming[`${piece}${type}`]].position)
            .to({ x: movinDistance }, 500)
            .start();
    }
}

/*
animate -> animate the scene
*/
function animate() {

    views[0].render();
    TWEEN.update();
    animateStars();
    requestAnimationFrame(animate);
}

/*
addSpehere -> add spheres (starts) to the scene
*/
function addSphere() {

    // The loop will move from z position of -1000 to z position 1000, adding a random particle at each position. 
    for (var z = -2000; z < 2000; z += 40) {

        // Make a sphere (exactly the same as before). 
        var geometry = new THREE.SphereGeometry(0.5, 32, 32)
        var material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        var sphere = new THREE.Mesh(geometry, material)

        sphere.position.x = starPos[z + 2000][0];
        sphere.position.y = starPos[z + 2000][1];

        sphere.position.z = z;
        sphere.scale.x = sphere.scale.y = 2;
        scene.add(sphere);
        stars.push(sphere);
    }
}

/*
animateStars -> animate the stars, moving starts
*/
function animateStars() {
    let star;
    // loop through each star
    for (var i = 0; i < stars.length; i++) {
        star = stars[i];
        // speed is proportional to the z position of the star
        star.position.z += i / 30;
        // respawn the star when its position is close to the camera
        if (star.position.z > 1500) star.position.z -= 2500;
    }
}


// printFen('4k2r/6r1/8/8/8/8/3R4/R3K3');
// printFen('8/5k2/3p4/1p1Pp2p/pP2Pp1P/P4P1K/8/8');
// printFen('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R');
// printFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");
// printFen("rnbqkbnr/8/8/8/8/8/8/RNBQKBNR");

function startDemoView() {
    // start position
    printFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    
    // print a gamechess moves using move('source', 'target')
    
    setTimeout(() => { move('E2', 'E4'); }, 1*1000);
    setTimeout(() => { move('B8', 'C6'); }, 2*1000);
    setTimeout(() => { move('G1', 'F3'); }, 3*1000);
    setTimeout(() => { move('D7', 'D5'); }, 4*1000);
    setTimeout(() => { move('B1', 'C3'); }, 5*1000);
    setTimeout(() => { move('G8', 'F6'); }, 6*1000);
    setTimeout(() => { move('C3', 'D5'); }, 7*1000);
    setTimeout(() => { move('F6', 'E4'); }, 8*1000);
    setTimeout(() => { move('F1', 'C4'); }, 9*1000);
    setTimeout(() => { move('E7', 'E5'); }, 10*1000);
    setTimeout(() => { move('D1', 'E2'); }, 11*1000);
    setTimeout(() => { move('C8', 'F5'); }, 12*1000);
    setTimeout(() => { move('E1', 'G1'); move('H1','F1'); }, 13*1000); // castling
    setTimeout(() => { move('D8', 'D6'); }, 14*1000);
    setTimeout(() => { move('D2', 'D3'); }, 15*1000);
    setTimeout(() => { move('C6', 'D4'); }, 16*1000);
    setTimeout(() => { move('F3', 'D4'); }, 17*1000);
    setTimeout(() => { move('E5', 'D4'); }, 18*1000);
    setTimeout(() => { move('D3', 'E4'); }, 19*1000);
    setTimeout(() => { move('F5', 'G6'); }, 20*1000);
    setTimeout(() => { move('C1', 'F4'); }, 21*1000);
    setTimeout(() => { move('D4', 'D3'); }, 22*1000);
    setTimeout(() => { move('C4', 'B5'); }, 23*1000);
    setTimeout(() => { move('C7', 'C6'); }, 24*1000);
    setTimeout(() => { move('E2', 'D3'); }, 25*1000);
    setTimeout(() => { move('D6', 'D7'); }, 26*1000);
    setTimeout(() => { move('D5', 'C7'); }, 27*1000);
    setTimeout(() => { move('E8', 'E7'); }, 28*1000);
    setTimeout(() => { move('F4', 'G5'); }, 29*1000);
    setTimeout(() => { move('F7', 'F6'); }, 30*1000);
    setTimeout(() => { move('G5', 'F6'); }, 31*1000);
    setTimeout(() => { move('G7', 'F6'); }, 32*1000);
    setTimeout(() => { move('D3', 'D7'); }, 33*1000);
    setTimeout(() => { move('E7', 'D7'); }, 34*1000);
    setTimeout(() => { move('C7', 'A8'); }, 35*1000);
    setTimeout(() => { move('C6', 'B5'); }, 36*1000);
    setTimeout(() => { move('F2', 'F3'); }, 37*1000);
    setTimeout(() => { move('F8', 'C5'); }, 38*1000);
    setTimeout(() => { move('G1', 'H1'); }, 39*1000);
    setTimeout(() => { move('H8', 'A8'); }, 40*1000);
    setTimeout(() => { move('A1', 'D1'); }, 41*1000);
    setTimeout(() => { move('D7', 'C8'); }, 42*1000);
    setTimeout(() => { move('F1', 'E1'); }, 43*1000);
    setTimeout(() => { move('C8', 'B8'); }, 44*1000);
    setTimeout(() => { move('D1', 'D8'); }, 45*1000);
    setTimeout(() => { move('B8', 'C7'); }, 46*1000);
    setTimeout(() => { move('D8', 'A8'); }, 47*1000);
    setTimeout(() => { move('B5', 'B4'); }, 48*1000);
    setTimeout(() => { move('C2', 'C3'); }, 49*1000);
    setTimeout(() => { move('B4', 'C3'); }, 50*1000);
    setTimeout(() => { move('B2', 'C3'); }, 51*1000);
    setTimeout(() => { move('C5', 'B6'); }, 52*1000);
    setTimeout(() => { move('E1', 'D1'); }, 53*1000);
    setTimeout(() => { move('H7', 'H6'); }, 54*1000);
    setTimeout(() => { move('A8', 'F8'); }, 55*1000);
    setTimeout(() => { move('A7', 'A6'); }, 56*1000);
    setTimeout(() => { move('F8', 'F6'); }, 57*1000);
    setTimeout(() => { move('G6', 'H5'); }, 58*1000);
    setTimeout(() => { move('G2', 'G4'); }, 59*1000);
    setTimeout(() => { move('H5', 'E8'); }, 60*1000);
    setTimeout(() => { move('F6', 'H6'); }, 61*1000);
    setTimeout(() => { move('E8', 'C6'); }, 62*1000);
    setTimeout(() => { move('H6', 'H7'); }, 63*1000);
    setTimeout(() => { move('C7', 'B8'); }, 64*1000);
    setTimeout(() => { move('G4', 'G5'); }, 65*1000);
    setTimeout(() => { move('B6', 'C5'); }, 66*1000);
    setTimeout(() => { move('H7', 'G7'); }, 67*1000);
    setTimeout(() => { move('C5', 'B6'); }, 68*1000);
    setTimeout(() => { move('G5', 'G6'); }, 69*1000);
    setTimeout(() => { move('B6', 'C5'); }, 70*1000);
    setTimeout(() => { move('H2', 'H3'); }, 71*1000);
    setTimeout(() => { move('C5', 'E3'); }, 72*1000);
    setTimeout(() => { move('H1', 'H2'); }, 73*1000);
    setTimeout(() => { move('E3', 'C5'); }, 74*1000);
    setTimeout(() => { move('G7', 'F7'); }, 75*1000);
    setTimeout(() => { move('A6', 'A5'); }, 76*1000);
    setTimeout(() => { move('G6', 'G7'); }, 77*1000);
    setTimeout(() => { move('C5', 'D6'); }, 78*1000);
    setTimeout(() => { move('D1', 'D6'); }, 79*1000);
    setTimeout(() => { move('C6', 'B5'); }, 80*1000);
    setTimeout(() => { move('G7', 'G8'); }, 81*1000);
    setTimeout(() => { move('B8', 'A7'); }, 82*1000);
    setTimeout(() => { move('G8', 'G1'); }, 83*1000);
    setTimeout(() => { move('A7', 'B8'); }, 84*1000);
    setTimeout(() => { move('D6', 'D8'); }, 86*1000);
    setTimeout(() => { printFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'); }, 87*1000);
}