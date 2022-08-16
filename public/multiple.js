import { TWEEN } from './tween.module.min.js';

/* VARIABLE DEFINITION */
var socket = io({ 'reconnect': false });
let nScreens, screen, done = false;

let fullWidth = 1, fullHeight = 1;
let startX = 0, startY = 0;
let camera;
let chessboard, satellite, earth, packageSat, starCluster2, starCluster, galaxy, simSpace;
let sendRecieve = false;
let white = [];
let saveWhite = [];
let black = [];
let saveBlack = [];
let starPos = [];
let refreshEarth = 1;

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

/* LOGO HIDE & UNHIDE */
// query selector get logo and hidebtn
const logo = document.querySelector('#logo');
const hidebtn = document.querySelector('#hidebtn');
// const votes = document.querySelector('#votes');
hidebtn.style.display = 'none';
// votes.style.display = 'none';

// on click hide or unhide logo with display property
hidebtn.addEventListener('click', () => {
    if (logo.style.display === 'none') {
        logo.style.display = 'block';
        hidebtn.innerHTML = '˄';
    } else {
        logo.style.display = 'none';
        hidebtn.innerHTML = '⌄';

    }
});


/* SOCKET INFORMATION EXCHANGE */

socket.on('displayVotes', (data) => {
    console.log(data);
    if (screen == 2) {
        if( votes.style.display == 'none') {
            votes.style.display = 'block';
            votes.innerHTML = '';
            Object.keys(data).map((key, index) => {
                if(key != 'status' && data[key] > 0) {
                    votes.innerHTML += `${key.split('_')[0].toUpperCase()} - ${key.split('_')[1].toUpperCase()}: ${data[key]}<br/>`
                }
            });
        } else { 
            votes.style.display = 'none';
        }
    }
});

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

    let keys = Object.keys(scRes);
    let arr = keys.map(Number).filter(e => e % 2 != 0);

    startX = 0;

    if (screen % 2 != 0) {
        if (Math.max(...arr) == screen) {
            startX = 0;
        } else {
            for (let index = Math.max(...arr); index > screen; index -= 2) {
                startX += scRes[index]
            }
        }
    } else {
        for (let index = Math.max(...arr); index >= 1; index -= 2) {
            startX += scRes[index]
        }
        for (let index = 2; index < screen; index += 2) {
            startX += scRes[index];
        }
    }

    console.log('superRes: (' + fullWidth + ',' + fullHeight + ')');
    console.log('StartX: ' + startX + ' StartY: ' + startY);

    // show logos
    // if even compare screen with max - 1
    // else compare screen with max
    var maxNum = Math.max(...keys.map(Number).filter(e => e % 2 != 0));
    console.log('max is: ' + maxNum);
    console.log('screen is: ' + screen);
    if(screen == maxNum) {
        hidebtn.style.display = 'block';
        logo.style.display = 'block';
        hidebtn.innerHTML = '˄';    
    }

    // start animation
    init();
    addSphere();
    animate();
});

/*
*/
socket.on('updateFen', (fen) => {
    if (fen.move == '') printFen(fen.status);
    else if( fen.status != '') {
        console.log('fen: ' + fen.status);
        printFen(fen.status);
        console.log('move: ' + fen.move);
        move(fen.move.split(' ')[0], fen.move.split(' ')[1]);
    } else {
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

/* demoMove -> apple the move recieved from the server 
@param {Array} move, array of strings [srcSquare, targetSquare]
*/
socket.on('demoMove', (data) => {
    setTimeout(() => { move(data.main[0], data.main[1]) }, data.index * 1000);
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
        camera.position.x += 50;
    } else if (keyCode == 68) {
        camera.position.x -= 50;
    } else { return; }

    socket.emit('updatePos', {
        x: camera.position.x,
        z: camera.position.z
    });
}

/*
setView -> set the camera view (white perspective, black perspective or global view);
*/
socket.on('setView', (data) => {
    if (data.where == 'white') {
        showChess(1000);
        new TWEEN.Tween(chessboard.rotation)
            .to({ y: 0 + Math.PI / 2 }, 1000)
            .start();
    } else if (data.where == 'black') {
        showChess(1000);
        new TWEEN.Tween(chessboard.rotation)
            .to({ y: 0 - Math.PI / 2 }, 1000)
            .start();
    } else if (data.where == 'center') {
        goChess(1000);
        new TWEEN.Tween(chessboard.rotation)
            .to({ x: Math.PI / 3.5, y: 0, z: 0 }, 1000)
            .start();
    } else {
        new TWEEN.Tween(chessboard.rotation)
            .to({ y: chessboard.rotation._y + data.where }, 200)
            .start();

        new TWEEN.Tween(chessboard.rotation)
            .to({ x: chessboard.rotation._x + data.whereX }, 200)
            .start();
    }
});

/*
goEarth -> move the camera to the earth view
*/
socket.on('goEarth', () => {
    var position = new THREE.Vector3().copy(camera.position);

    new TWEEN.Tween(position)
        .to({ x: 1000, z: 1500 }, 2000)
        .easing(TWEEN.Easing.Back.InOut)
        .onUpdate(function () {
            camera.position.copy(position);
        })
        .onComplete(function () {
            camera.position.x = position.x;
            camera.position.z = position.z;
        })
        .start();
});

/*
goChess -> move the camera to the chess view
*/
socket.on('goChess', () => {
    goChess();
});

function goChess() {
    var position = new THREE.Vector3().copy(camera.position);

    new TWEEN.Tween(position)
        .to({ x: 0, z: 1000 }, 2000)
        .easing(TWEEN.Easing.Back.InOut)
        .onUpdate(function () {
            camera.position.copy(position);
        })
        .onComplete(function () {
            camera.position.x = position.x;
            camera.position.z = position.z;
        })
        .start();
}

function showChess(time = 2000) {
    var position = new THREE.Vector3().copy(camera.position);

    new TWEEN.Tween(position)
        .to({ x: 0 }, time)
        .easing(TWEEN.Easing.Back.InOut)
        .onUpdate(function () {
            camera.position.copy(position);
        })
        .onComplete(function () {
            camera.position.x = position.x;
            camera.position.z = position.z;
        })
        .start();
}

/*
controllerUpdate -> move the camera
*/
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


/**
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
    scene.background = new THREE.Color(0x000101);

    const BGLoader = new THREE.TextureLoader();
    scene.background = BGLoader.load('bgImages/bground.jpg');


    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 0, 10).normalize();
    scene.add(light);

    const ambienLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambienLight);

    try {
        const loader = new THREE.GLTFLoader();
        // load chessboard model
        loader.load(
            'models/scene.gltf',
            function (gltf) {

                chessboard = gltf.scene;
                chessboard.rotation.x = Math.PI / 3.5;

                // chessboard.position.x -= (canvas1.clientWidth / 2);
                camera.position.x = chessboard.position.x;
                camera.position.y = chessboard.position.y;
                camera.position.z = chessboard.position.z + 1000;

                light.position.set(10, 100, 200).normalize();

                console.log('chess:', chessboard);

                // 1 white
                chessboard.children[0].children[0].children[0].children[1].children.forEach((piece) => {
                    initialPiecePos[piece.name] = piece.position.y;
                    piece.children[0].material.color.setHex(0xDDDDDD);
                    white.push(piece);
                    saveWhite.push(piece);
                });

                // 2 black
                chessboard.children[0].children[0].children[0].children[2].children.forEach((piece) => {
                    initialPiecePos[piece.name] = piece.position.y;
                    piece.children[0].material.color.setHex(0x606060);
                    black.push(piece);
                    saveBlack.push(piece);
                });

                // Border chessboard color
                chessboard.children[0].children[0].children[0].children[4]
                    .children[0]
                    .children[0]
                    .material.dispose(); // .color.setHex(0xFFFFFF);

                // White squares color brown - 0xF2C886 blue - 0x86C6F2
                chessboard.children[0].children[0].children[0].children[4].children[1].children[0].material.color.setHex(0x86C6F2);

                // Black squares color brown - 0xCF9218 blue - 0x2586C9
                chessboard.children[0].children[0].children[0].children[4].children[1].children[1].material.color.setHex(0x2586C9);

                // add chessboard to the main scene
                scene.add(chessboard);

                // all pieces are dead (starting configuration)
                setTimeout(() => printFen('8/8/8/8/8/8/8/8'), 1000);

                // setTimeout(() => { 
                //     printFen('rnbqkbnr/pppppppp/8/8/8/P7/1PPPPPPP/RNBQKBNR');
                //     setTimeout(() => move('a7','a3'),1000);
                // },1000);

            },
            // called while loading is progressing
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // called when loading has errors
            function (error) {
                console.log('An error happened chess');
            }
        );

        // load satellite model
        loader.load(
            'models/sat/scene.gltf',
            function (gltf) {
                satellite = gltf.scene;
                satellite.rotation.x = Math.PI / 1.5;
                satellite.rotation.y = Math.PI / 3;

                satellite.position.x += 1700;
                scene.add(satellite);
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function (error) {
                console.log('An error happened sat');
            }
        );

        // load earth model
        loader.load(
            'models/earth/scene.gltf',
            function (gltf) {
                earth = gltf.scene;
                earth.position.x += 1000;
                scene.add(earth);
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function (error) {
                console.log('An error happened earth');
            }
        );

        // load package model
        loader.load(
            'models/packet/scene.gltf',
            function (gltf) {
                packageSat = gltf.scene;
                packageSat.position.x += 1000;
                scene.add(packageSat);

                // rotate the package
                packageSat.rotation.y = Math.PI / 2;

                // make it invisible
                packageSat.visible = false;

                packageSat.scale.set(9, 9, 9);
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function (error) {
                console.log('An error happened packet');
            }
        );

        // load space sim
        loader.load(
            'models/Space/scene.gltf',
            function (gltf) {
        
                simSpace = gltf.scene;
                console.log('simSpace', simSpace);
                scene.add(simSpace);

                // simSpace.children[0].children[0].children[0].children[0].children[1].visible = false;
                simSpace.scale.set(12, 12, 12);
                simSpace.position.z = -4000;
                simSpace.position.x = 1500;
                // simSpace.position.x = 3000;
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function (error) {
                console.log('An error happened simSpace');
            }
        );

        // load star cluster model
        loader.load(
            'models/cluster/scene.gltf',
            function (gltf) {

                starCluster = gltf.scene;
                starCluster2 = gltf.scene.clone();

                starCluster.position.x += 500;
                starCluster2.position.x -= 500;
                starCluster.position.y -= 1000;
                starCluster2.position.y -= 1000;

                scene.add(starCluster);
                scene.add(starCluster2);

                // rotate the package
                starCluster.rotation.y = Math.PI / 2;
                starCluster2.rotation.y = Math.PI / 2;

                starCluster.scale.set(50, 50, 50);
                starCluster2.scale.set(50, 50, 50);
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function (error) {
                console.log('An error happened starCluster');
            }
        );

        // galaxy
        loader.load(
            'models/bgModel/scene.gltf',
            function (gltf) {

                galaxy = gltf.scene;
                scene.add(galaxy);
                // rotate the package
                galaxy.rotation.x = Math.PI / 1.5;
                galaxy.position.x -= 750;
                galaxy.position.y += 300;
                galaxy.position.z -= 2000;

                galaxy.scale.set(50, 50, 50);
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function (error) {
                console.log('An error happened galaxy');
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

/**
 * move -> move the piece with its consecuneces
 * 
 * @param {String} srcSquare 
 * @param {String} targetSquare 
 * @param {Number} speed = 700
 */
function move(srcSquare, targetSquare, speed = 700) {
    let src = [srcSquare[0].toUpperCase().charCodeAt(0) - 65, parseInt(srcSquare[1]) - 1];
    let dest = [targetSquare[0].toUpperCase().charCodeAt(0) - 65, parseInt(targetSquare[1]) - 1];
    let movinDistance = 39;
    let color = 'w';
    // console.log(src);
    // console.log(dest);
    // console.log('order: ' + srcSquare + ' - ' + targetSquare);

    // move to death position
    if (chessboardStatus[dest[0]][dest[1]] != null) {
        let pieceName = chessboardStatus[dest[0]][dest[1]].name;
        var expresion = /^Pawn.*/gi;
        if (expresion.test(pieceName)) movinDistance = 33;

        new TWEEN.Tween(chessboardStatus[dest[0]][dest[1]].position)
            .to({ x: movinDistance, y: initialPiecePos[pieceName] }, speed)
            .start();
    }

    // move piece from source square to destination square
    if (chessboardStatus[src[0]][src[1]].parent.name == 'White_Pieces002') { // white
        new TWEEN.Tween(chessboardStatus[src[0]][src[1]].position)
            .to({ x: (21 - dest[1] * 6), y: (-21 + dest[0] * 6) }, speed)
            .start();

    } else { // black
        color = 'b';
        new TWEEN.Tween(chessboardStatus[src[0]][src[1]].position)
            .to({ x: (-21 + dest[1] * 6), y: (21 - dest[0] * 6) }, speed)
            .start();
    }

    // castling
    var isKing = /^King.*/gi;
    if (isKing.test(chessboardStatus[src[0]][src[1]].name)) {
        // if castling
        if (Math.abs(dest[0] - src[0]) == 2) {
            if (dest[0] - src[0] > 0) { // right castling
                (color == 'w' ? move('H1', 'F1') : move('H8', 'F8'));
            } else { // left castling
                (color == 'w' ? move('A1', 'D1') : move('A8', 'D8'));
            }
        }
    }

    chessboardStatus[dest[0]][dest[1]] = chessboardStatus[src[0]][src[1]];
    chessboardStatus[src[0]][src[1]] = null;
}

/**
 * setPiecePos -> set the position of a piece in the visualization and in the status board
 * 
 * @param {String} piece 
 * @param {String} type 
 * @param {Number} sx 
 * @param {Number} sy 
 * @param {Number} i 
 * @param {Number} j 
 * @param {String} color 
 */
function setPiecePos(piece, type, sx, sy, i, j, color) {

    if (color == 'white') {
        white[whiteNaming[`${piece}${type}`]].visible = true;
        new TWEEN.Tween(white[whiteNaming[`${piece}${type}`]].position)
            .to({ x: sx, y: sy }, 100)
            .start();

        chessboardStatus[i][j] = white[whiteNaming[`${piece}${type}`]];

    } else {
        black[blackNaming[`${piece}${type}`]].visible = true;

        new TWEEN.Tween(black[blackNaming[`${piece}${type}`]].position)
            .to({ x: sx, y: sy }, 100)
            .start();

        chessboardStatus[i][j] = black[blackNaming[`${piece}${type}`]];
    }
}

/**
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

    white = saveWhite.slice();
    black = saveBlack.slice();

    console.log('fen: ', fen);
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
                if (piece == 'q' && qb > 1) {
                    // let newName = black[blackNaming[`p${pb}`]].name;
                    // black[blackNaming[`p${pb}`]].name = newName;
                    setPiecePos('p', pb, sxb, syb, i, j, 'black');
                    pb++;
                } else {
                    setPiecePos(piece, '', sxb, syb, i, j, 'black');
                    eval(`${piece}b++`);
                }
            } else {
                setPiecePos(piece, eval(`${piece}b`), sxb, syb, i, j, 'black');
                eval(`${piece}b++`);
            }

        } else { // white            
            piece = piece.toLowerCase();

            if (piece == 'q' || piece == 'k') {
                if (piece == 'q' && qw > 1) {
                    setPiecePos('p', pw, sxw, syw, i, j, 'white');
                    pw++;
                } else {
                    setPiecePos(piece, '', sxw, syw, i, j, 'white');
                    eval(`${piece}w++`);
                }
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

/**
setDeadPosition -> set the position of a dead piece in the visualization
@param {String} piece, the piece type (r, n, b, q, k, p)
@param {Number} type, number of the piece, examaple: p1, p2, ... ,p16, r1, r2
@param {String} color, the color of the piece (w, b)
*/
function setDeadPosition(piece, type, color) {
    let movinDistance;

    movinDistance = 39;
    if (piece == 'p') movinDistance = 33;

    if (color == 'w') {
        white[whiteNaming[`${piece}${type}`]].visible = true;
        new TWEEN.Tween(white[whiteNaming[`${piece}${type}`]].position)
            .to({ x: movinDistance }, 500)
            .start();
    } else {
        black[blackNaming[`${piece}${type}`]].visible = true;
        new TWEEN.Tween(black[blackNaming[`${piece}${type}`]].position)
            .to({ x: movinDistance }, 500)
            .start();
    }
}


socket.on('refreshEarthScreen', (coord) => {
    if(earth) earth.rotation.y = coord.y;
});

/*
animate -> animate the scene
*/
function animate() {

    views[0].render();
    TWEEN.update();
    animateStars();

    if (galaxy) {
        galaxy.rotation.z += Math.PI / 0.5;
    }

    if (simSpace && earth) {
        earth.rotation.y -= 0.0003;
        refreshEarth = (refreshEarth + 1) % 100;
        if (refreshEarth == 0) {
            socket.emit('refreshEarthServer', {
                y: (earth.rotation.y -= 0.003)
            });
        }

    }

    // move the satellite around the earth (orbit) and send/recieve packets
    if (satellite && earth) {
        satellite.position.x = earth.position.x + Math.cos(Date.now() / 2500) * 250;
        satellite.position.y = earth.position.y + Math.sin(Date.now() / 2500) * 250;

        if (
            // 914 - 235
            (Math.floor(satellite.position.x) >= 910 && Math.floor(satellite.position.x) <= 920) &&
            (Math.floor(satellite.position.y) >= 230 && Math.floor(satellite.position.y) <= 240)
        ) {
            // make packet visible again
            packageSat.visible = true;

            if (sendRecieve) {
                // packageSat position == eath poistion
                packageSat.position.x = earth.position.x;
                packageSat.position.y = earth.position.y;

                // use tween to move the package from the earth to the satellite
                // on complete packageSat.visible = false
                // { x: satellite.position.x - 65, y: satellite.position.y + 50 }
                new TWEEN.Tween(packageSat.position)
                    .to({ x: (satellite.position.x - 30), y: (satellite.position.y - 15) }, 500)
                    .easing(TWEEN.Easing.Cubic.Out)
                    .onComplete(() => {
                        sendRecieve = false;
                        packageSat.visible = false;
                    }).start();
            } else {
                // packageSat position == satellite poistion
                packageSat.position.x = satellite.position.x;
                packageSat.position.y = satellite.position.y;

                // use tween to move the package from the satellite to the earth
                // on complete packageSat.visible = false
                new TWEEN.Tween(packageSat.position)
                    .to({ x: earth.position.x, y: earth.position.y }, 2000)
                    .onComplete(() => {
                        sendRecieve = true;
                        packageSat.visible = false;
                    }).start();
            }
        }
    }
    requestAnimationFrame(animate);
}

/*
addSpehere -> add spheres (starts) to the scene
*/
function addSphere() {

    // The loop will move from z position of -1000 to z position 1000, adding a random particle at each position. 
    for (var z = -4000; z < 4000; z += 40) {

        // Make a sphere (exactly the same as before). 
        var geometry = new THREE.SphereGeometry(0.5, 32, 32)
        var material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        var sphere = new THREE.Mesh(geometry, material)

        sphere.position.x = starPos[z + 4000][0];
        sphere.position.y = starPos[z + 4000][1];

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
        star.position.z += i / 50;
        // respawn the star when its position is close to the camera
        if (star.position.z > 1500) star.position.z -= 2500;
    }
}

// DEMO CODE
// useful variables
let pointer, demo = [];
let pause = false;
let animationSpeed = 700;

/**
* @param {Object} data, data = {moves: Object}
*/
socket.on('startDemo', (data) => {
    console.log('starting demo screens');
    // reset board
    printFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    // get moves
    demo = data.moves;
    console.log('moves: ', demo);
    // reset pointer & play default (pause = false)
    pointer = 0;
    pause = false;
    // start demo
    demoMode();
});


/**
 * forward -> move forwards in the demo
 */
socket.on('forward', () => {
    if(demo.length == 0) return;
    if(!pause) {pause = true; return; }
    if(pointer <= demo.length-1) {
        move(demo[pointer].substring(0,2), demo[pointer].substring(2,4));
        pointer++;
    }
});

/**
 * backward -> move backwards in the demo
 */
socket.on('backward', () => {
    if(demo.length == 0) return;
    if(!pause) {pause = true; return; }
    if(pointer == 0) return;
    
    pointer--;
    printFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    for(let i = 0; i < pointer; i++) {
        move(demo[i].substring(0,2), demo[i].substring(2,4), animationSpeed);
    }
});

/**
 * xVel -> set demo speed
 */
socket.on('xVel', (data) => {
    animationSpeed = data.speed;
});

/**
 * playpause -> play/pause demo
 */
socket.on('playpause', () => {
    if(demo.length == 0) return;
    pause = !pause;
    // if true, then start animation
    if(!pause) demoMode();
});

socket.on('resetAll', () => {
    console.log('reseting');
    pause = true; animationSpeed = 700; pointer = 0; demo = [];
    setTimeout(() => {printFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')}, 1255);
});

socket.on('killDemo', () => {
    pause = true; animationSpeed = 700; pointer = 0; demo = [];
});

/**
 * demoMode -> play the demo
 */
function demoMode() {
    move(demo[pointer].substring(0,2), demo[pointer].substring(2,4), animationSpeed);
    pointer++;

    setTimeout(() => {
        if(pointer < demo.length-1 && !pause) requestAnimationFrame(demoMode);
    }, animationSpeed);
}