/* VARIABLE DEFINITION */
var socket = io();
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

let deadWhite = new Array(16);
let deadBlack = new Array(16);
let chessboardStatus = Array(8).fill(0).map(x => Array(8).fill(null)); // 2d array

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
    printFen(fen.status);
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
        camera.position.z += 100;
    } else if (keyCode == 83) { // s
        camera.position.z -= 100;
    } else if (keyCode == 65) { 
        camera.position.x -= 50;
    } else if (keyCode == 68) {
        camera.position.x += 50;
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
                chessboard.rotation.x = Math.PI / 3;

                // chessboard.position.x -= (canvas1.clientWidth / 2);
                camera.position.x = chessboard.position.x;
                camera.position.y = chessboard.position.y;

                light.position.set(10, 100, 200).normalize();

                console.log('ChessPosition: ' + chessboard.position.x);
                console.log('chess:', chessboard);


                // 1 white
                chessboard.children[0].children[0].children[0].children[1].children.forEach((piece) => {
                    piece.children[0].material.color.setHex(0xDDDDDD);
                    white.push(piece);
                });


                // 2 black
                chessboard.children[0].children[0].children[0].children[2].children.forEach((piece) => {
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

                // printFen('4k2r/6r1/8/8/8/8/3R4/R3K3');
                printFen('8/5k2/3p4/1p1Pp2p/pP2Pp1P/P4P1K/8/8');
                // printFen('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R');
                // printFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");
                // printFen("rnbqkbnr/8/8/8/8/8/8/RNBQKBNR");
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

// function movePiece(srcSquare, toSquare) {
//     if (chessboard[toSquare.split('')[0]][toSquare.split('')[1]] != null) {
//         // remove the piece
//         // - find out the color
//         // - move it to its dead position
//     }

//     // move the piece src to the targuet square
//     chessboard[toSquare.split('')[0]][toSquare.split('')[1]] = chessboard[srcSquare.split('')[0]][srcSquare.split('')[1]];
//     chessboard[srcSquare.split('')[0]][srcSquare.split('')[1]] = null;

//     // update the board
//     // calc offset
//     let offsetX = (toSquare.split('')[0].toLowerCase()).charCodeAt(0)-97;
//     let offsetY = parseInt(toSquare.split('')[1])-1;
//     // if it it white
//     if(true) {
//         chessboard[toSquare.split('')[0]][toSquare.split('')[1]].position.x = 21 - offsetX;
//         chessboard[toSquare.split('')[0]][toSquare.split('')[1]].position.x = -21 + offsetY;
//     }else {// if it is black
//         chessboard[toSquare.split('')[0]][toSquare.split('')[1]].position.x = -21 + offsetX;
//         chessboard[toSquare.split('')[0]][toSquare.split('')[1]].position.x = 21 - offsetY;
//     }
// }


/*
setPiecePos -> set the position of a piece in the visualization and in the status board
*/
function setPiecePos(piece, type, sx, sy, i, j, color) {

    if (color == 'white') {
        white[whiteNaming[`${piece}${type}`]].position.x = sx;
        white[whiteNaming[`${piece}${type}`]].position.y = sy;
        chessboardStatus[i][j] = white[whiteNaming[`${piece}${type}`]];
    } else {
        black[blackNaming[`${piece}${type}`]].position.x = sx;
        black[blackNaming[`${piece}${type}`]].position.y = sy;
        chessboardStatus[i][j] = black[blackNaming[`${piece}${type}`]];
    }
}

/*
printFen -> print the chessboard with the given fen string
@param {String} fen, Forsyth–Edwards Notation
*/
function printFen(fen) {
    // rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR

    let rw = 1, bw = 1, nw = 1, pw = 8, qw = 1, kw = 1;
    let rb = 1, bb = 1, nb = 1, pb = 0, qb = 1, kb = 1;

    let sxw = -21, syw = -21;
    let sxb = 21, syb = 21;
    let i = 0, j = 8;

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
            i++;
            continue;
        }

        if (piece == piece.toLowerCase()) { // black
                        
            if(piece == 'q' || piece == 'k') { 
                setPiecePos(piece, '', sxb, syb, i, j, 'black');
                eval(`${piece}b++`);
            }else {
                setPiecePos(piece, eval(`${piece}b`), sxb, syb, i, j, 'black');
                eval(`${piece}b++`);
            }

        } else { // white            
            piece = piece.toLowerCase();
            
            if(piece == 'q' || piece == 'k') {
                setPiecePos(piece, '', sxw, syw, i, j, 'white');
                eval(`${piece}w++`);
            }else {
                setPiecePos(piece, eval(`${piece}w`), sxw, syw, i, j, 'white');
                eval(`${piece}w++`);
            }
        }
        syw += 6;
        syb -= 6;
    }

    // check if there are dead pieces
    let num, aux;
    for(let piece of 'rnbqkp') {
        for(let color of 'wb') {

            if(piece == 'q' || piece == 'k')
                num = 2;
            else if(piece == 'p')
                num = (color == 'w' ? 16 : 8);
            else 
                num = 3;

            aux = eval(`${piece}${color}`);
            if(aux != num ) {
                for(let index = aux; index < num; index++) {
                    ((piece == 'q' || piece == 'k') ?
                        setDeadPosition(piece, '', color) : 
                        setDeadPosition(piece, index, color));                       
                }
            }
        }
    }
}

function setDeadPosition(piece, type, color) {
    let movinDistance = 24;
    if (piece == 'p') movinDistance = 18;

    if (color == 'w') {
        white[whiteNaming[`${piece}${type}`]].position.x += movinDistance;
        deadWhite[whiteNaming[`${piece}${type}`]] = white[whiteNaming[`${piece}${type}`]];
    } else {
        black[blackNaming[`${piece}${type}`]].position.x += movinDistance;
        deadBlack[blackNaming[`${piece}${type}`]] = black[blackNaming[`${piece}${type}`]];
    }
}

/*
animate -> animate the scene
*/
function animate() {
    
    views[0].render();
    // animateStars();
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

        sphere.position.x = Math.random() * 1000 - 500;
        sphere.position.y = Math.random() * 1000 - 500;
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