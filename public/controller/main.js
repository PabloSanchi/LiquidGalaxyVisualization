var socket = io({query: "controller=true"});
let nScreens;

// dom varibales
const up = document.getElementById('up');
const down = document.getElementById('down');
const left = document.getElementById('left');
const right = document.getElementById('right');
const chess = document.getElementById('chess');
const earth = document.getElementById('earth');

// emit 'controllerMove' with value offset of 50; socket.emit
const send = (xVal, zVal) => {
    socket.emit('controllerMove', {
        x: xVal,
        z: zVal,
    });
}

// add on click envet listener
up.addEventListener('click', () => {
    send(0, -50);
});

down.addEventListener('click', () => {
    send(0, 50);
});

left.addEventListener('click', () => {
    send(50, 0);
});

right.addEventListener('click', () => {
    send(-50, 0);
});

chess.addEventListener('click', () => {
    socket.emit('showChess');
});

earth.addEventListener('click', () => {
    socket.emit('showEarth');
});