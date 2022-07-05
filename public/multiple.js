// import * as THREE from 'three';

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
let orange = [];


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
    animate();
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
    } else return

    socket.emit('updatePos', {
        z: camera.position.z
    });
}

// variables
const views = [];
let scene, renderer;
let mouseX = 0, mouseY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;


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
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (- mouseY - camera.position.y) * 0.05;

    this.render = function () {

        camera.position.x += (mouseX - camera.position.x) * 0.05;
        camera.position.y += (- mouseY - camera.position.y) * 0.05;
        // camera.lookAt( scene.position );

        renderer.setViewport(0, fullHeight - viewHeight, viewWidth, viewHeight);
        renderer.render(scene, camera);

        context.drawImage(renderer.domElement, 0, 0);
    };
}

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
    scene.background = new THREE.Color(0x202020);

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 0, 1).normalize();
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

                // chessboard.position.x -= 100;

                console.log('ChessPosition: ' + chessboard.position.x);

                console.log('chess:', chessboard);


                // 1 white
                chessboard.children[0].children[0].children[0].children[1].children.forEach((piece) => {
                    piece.children[0].material.color.setHex(0xDDDDDD);
                    white.push(piece);
                });


                // 2 orange
                chessboard.children[0].children[0].children[0].children[2].children.forEach((piece) => {
                    piece.children[0].material.color.setHex(0x606060);
                    orange.push(piece);
                });



                chessboard.children[0].children[0].children[0].children[4].children[0].children[0].material.color.setHex(0xC28A6E);

                chessboard.children[0].children[0].children[0].children[4].children[1].children[0].material.color.setHex(0xA0A0A0);
                chessboard.children[0].children[0].children[0].children[4].children[1].children[1].material.color.setHex(0x101010);

                // add chessboard to the main scene
                scene.add(chessboard);
                camera.lookAt(chessboard.position);

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

    document.addEventListener('mousemove', onDocumentMouseMove);
}

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

function animate() {

    for (let i = 0; i < views.length; ++i) {
        views[i].render();
    }

    requestAnimationFrame(animate);
}


// EXAMPLE ICOSAEDRON

// const canvas = document.createElement('canvas');
// canvas.width = 128;
// canvas.height = 128;

// const context = canvas.getContext('2d');
// const gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
// gradient.addColorStop(0.1, 'rgba(210,210,210,1)');
// gradient.addColorStop(1, 'rgba(255,255,255,1)');

// context.fillStyle = gradient;
// context.fillRect(0, 0, canvas.width, canvas.height);

// const noof_balls = 10;
// const radius = 100;

// const geometry1 = new THREE.IcosahedronGeometry(radius, 1);

// const count = geometry1.attributes.position.count;
// geometry1.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));

// const color = new THREE.Color();
// const positions = geometry1.attributes.position;
// const colors = geometry1.attributes.color;

// for (let i = 0; i < count; i++) {
//     color.setHSL((positions.getY(i) / radius + 1) / 2, 1.0, 0.5);
//     colors.setXYZ(i, color.r, color.g, color.b);
// }

// const material = new THREE.MeshPhongMaterial({
//     color: 0xffffff,
//     flatShading: true,
//     vertexColors: true,
//     shininess: 0
// });

// const wireframeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true });

// for (let i = 0; i < noof_balls; i++) { // create balls

//     const mesh = new THREE.Mesh(geometry1, material);
//     const wireframe = new THREE.Mesh(geometry1, wireframeMaterial);
//     mesh.add(wireframe);

//     mesh.position.x = - (noof_balls - 1) / 2 * 400 + i * 400;
//     mesh.rotation.x = i * 0.5;

//     scene.add(mesh);

// }

// END EXAMPLE ICOSAEDRON