import * as THREE from 'three';

var socket = io();
let nScreens;
let screen;
let done = false;

let fullWidth = 1;
let fullHeight = 1;
let startX = 0;
let startY = 0;
let camera;

socket.on('updateScreen', (coords) => {
    if (screen == 1) return; // do not update the master screen

    return;
});


// on socket connect; JUST ONCE
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



socket.on('start', (superRes) => {
    console.log('screen' + screen + ' ready');
    fullWidth = superRes.width;
    fullHeight = window.innerHeight;

    startX = Math.floor(screen / 2) * window.innerWidth * (screen % 2 != 0 ? -1 : 1);

    console.log('superRes: (' + fullWidth + ',' + fullHeight + ')');
    console.log('StartX: ' + startX + ' StartY: ' + startY);

    init();
    animate();
});



socket.on('updateMouse', (mouse) => {
    if (screen == 1) return;
    console.log('up');

    mouseX = mouse.mousex;
    mouseY = mouse.mousey;
});

socket.on('updatePosScreen', (pos) => {
    if (screen == 1) return;
    camera.position.x = pos.x;
});

window.onload = function () {
    document.addEventListener('keydown', onDocumentKeyDown, false);
}

const onDocumentKeyDown = (event) => {

    if (screen != 1) return;

    var keyCode = event.which;
    if (keyCode == 87) { // w
        camera.position.y -= 5;
    } else if (keyCode == 83) { // s
        camera.position.y += 5;
    } else if (keyCode == 65) { // a
        camera.position.x += 5;
    } else if (keyCode == 68) { // d
        camera.position.x -= 5;
    } else return

    socket.emit('updatePos', {
        x: camera.position.x
    });
}

const views = [];
let scene, renderer;
let mouseX = 0, mouseY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;


function View(canvas, fullWidth, fullHeight, viewX, viewY, viewWidth, viewHeight) {

    canvas.width = viewWidth * window.devicePixelRatio;
    canvas.height = viewHeight * window.devicePixelRatio;

    const context = canvas.getContext('2d');

    // const camera = new THREE.PerspectiveCamera( 20, (viewWidth/3) / (viewHeight), 1, 10000 );

    // Orthographic Camera
    camera = new THREE.OrthographicCamera
        (-viewWidth / 4, viewWidth, viewHeight, -viewHeight, 1, 10000);

    // set camera first adjustements
    camera.setViewOffset(fullWidth, fullHeight, viewX, viewY, viewWidth, viewHeight);
    camera.position.z = 1800; // 1800
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (- mouseY - camera.position.y) * 0.05;
    // camera.lookAt( scene.position );

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
    scene.background = new THREE.Color(0x000000);

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 0, 1).normalize();
    scene.add(light);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;

    // var geometry = new THREE.BoxGeometry( 10, 10, 10 );
    // var material = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } );
    // cube = new THREE.Mesh( geometry, material );
    // cube.position.set(0,0,0);
    // scene.add( cube );

    
    // EXAMPLE ICOSAEDRON

    // const context = canvas.getContext('2d');
    // const gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
    // gradient.addColorStop(0.1, 'rgba(210,210,210,1)');
    // gradient.addColorStop(1, 'rgba(255,255,255,1)');

    // context.fillStyle = gradient;
    // context.fillRect(0, 0, canvas.width, canvas.height);

    // const noof_balls = 1;
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

    try {
        const loader = new THREE.GLTFLoader();
        // // Load a glTF resource
        loader.load(
            // resource URL
            'models/scene.gltf',
            // called when the resource is loaded
            function (gltf) {

                scene.add(gltf.scene);
                camera.lookAt( scene.position );

                // gltf.animations; // Array<THREE.AnimationClip>
                // gltf.scene; // THREE.Group
                // gltf.scenes; // Array<THREE.Group>
                // gltf.cameras; // Array<THREE.Camera>
                // gltf.asset; // Object

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
    } catch(err) {
        console.log('ERROR\n',err)
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