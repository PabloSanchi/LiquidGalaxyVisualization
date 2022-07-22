import express from 'express';
import httpImport from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path';
import { moves } from './public/game/demo.js';
import fs from 'fs';
import https from 'https';


var app = express();

app.use(cors({
    origin: "*",
}));

// app.use(function (req, res, next) {

//     // Website you wish to allow to connect
//     res.setHeader('Access-Control-Allow-Origin', '*');

//     // Request methods you wish to allow
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

//     // Request headers you wish to allow
//     res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

//     // Set to true if you need the website to include cookies in the requests sent
//     // to the API (e.g. in case you use sessions)
//     res.setHeader('Access-Control-Allow-Credentials', true);

//     // Pass to next layer of middleware
//     next();
// });


var http = httpImport.createServer(app);

// const server = https.createServer({
//     key: fs.readFileSync(`${path.resolve()}/openssl/server.key`),
//     cert: fs.readFileSync(`${path.resolve()}/openssl/server.crt`)
// }, app);


var io = new Server(http, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        // allowedHeaders: ['Access-Control-Allow-Methods', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Headers'],
        // credentials: true
    }
});

const __dirname = path.resolve();

const port = 8120;

// Setup files to be sent on connection
const filePath = "/public" // Do not add '/' at the end
const vFile = "index.html"
const pruebas = "multiple.html";
const controllerFile = "controller/index.html"

// varibles
var screens = {};
var superRes = {};
var screenNumber = 1;
var activeScreens = 0;
var myArgs = process.argv.slice(2); // get nScreens input 
var nScreens = Number(myArgs[0]);
var okDemo = false;

if (myArgs.length == 0 || isNaN(nScreens)) {
    console.log("Number of screens invalid or not informed, default number is 3.");
    nScreens = 5;
}
console.log(`Running LQ Space Chess for Liquid Galaxy with ${nScreens} screens!`);

app.use(express.static(__dirname + filePath));

app.get('/', (req, res) => {
    res.send(`
        <body style="background-color: black;">
            <h1 style="font-family: Sans-serif; color: white;">
                DASHBOARD
            </h1>
        </body>
    `);
});

app.get('/:id', (req, res) => {
    const id = req.params.id

    if (id == "controller") {
        res.sendFile(__dirname + `${filePath}/${controllerFile}`);
    } else {
        if (id <= nScreens) {
            screenNumber = id
            res.sendFile(__dirname + `${filePath}/${pruebas}`);
        } else {
            res.send(`
            <body style="background-color: black;">
                <h1 style="font-family: Sans-serif; color: white;">
                    make sure that npm start SCREENUM is properly set
                </h1>
            </body>
            `);
        }
    }
    // }
});

io.on('connect', socket => {

    console.log(`User connected with id ${socket.id}`);

    // join the room taking care of the type (mobile or screen)
    if (socket.handshake.query.mobile == 'true') {
        console.log('MOBILE');
        socket.join('mobile');
        okDemo = false;
    } else if (socket.handshake.query.controller == 'true') {
        console.log('CONTROLLER');
        socket.join('controller');
    } else {
        console.log('SCREEN');
        socket.join('screen');
    }

    // if users leaves, then notify
    socket.on('quit', () => {
        console.log('user left');
    });

    if (!(socket.handshake.query.mobile == 'true') && !(socket.handshake.query.controller == 'true')) {
        io.to(socket.id).emit('update', {
            id: screenNumber
        });
    }

    socket.on('windowSize', (data) => {
        superRes[data.id] = data.width;
        activeScreens++;

        if (activeScreens == nScreens) {
            let r = 0;
            let pos = []

            Object.entries(superRes).forEach(res => {
                console.log(res[1]);
                r += res[1];
            });

            console.log('sending start signal');

            // stars coordinates (same for all screens)
            for (let index = 0; index < 4000; index++) {
                pos[index] = [Math.random() * 2000 - 500, Math.random() * 2000 - 500]
            }

            io.to('screen').emit('start', {
                width: r,
                height: 0,
                child: superRes,
                pos: pos
            });

            activeScreens = 0;
        }
    });

    // recieve coordinates from the master
    socket.on('updateScreens', (mouse) => {
        io.to('screen').emit('updateMouse', mouse);
    });

    socket.on('updatePos', (pos) => {
        io.to('screen').emit('updatePosScreen', pos);
    });

    socket.on('updateView', (data) => {
        io.to('screen').emit('setView', data);
    });

    /*
        newStatus - recieve the status and move from the client
                    and send the move to the screens
        
        @param {Object} data; contains the status (string) and the move (string)
    */
    socket.on('newStatus', (data) => {
        okDemo = false;
        console.log('FEN: ' + data.status);
        console.log('Move: ' + data.move);

        io.to('screen').emit('updateFen', {
            status: data.status,
            move: data.move
        });
    });

    /*
    currentBoard - recieve the current status from the client
                and send the status to the screens
    
    @param {Object} data; contains the status (string)
    */
    socket.on('currentBoard', (data) => {
        okDemo = false;
        console.log('Current Board: ' + data.status);

        io.to('screen').emit('updateFen', {
            status: data.status,
            move: ''
        });
    });

    /*
    controllerMove -> use the device or proper controller to move around the screens
    @param {Object} data; X and Z coordinates
    */
    socket.on('controllerMove', (data) => {
        io.to('screen').emit('controllerUpdate', data);
    });

    /*
    showDemo, send the screen a chess complete game
    to show how to game works
    @param {Object} data; contains all the moves
    */
    socket.on('showDemo', () => {
        okDemo = true;
        console.log('starting demo...');
        // reset keyboard
        io.to('screen').emit('updateFen', {
            status: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
            move: ''
        });

        let cont = 1;

        moves.every(async (move) => {
            if (!okDemo) return false;
            io.to('screen').emit('demoMove', {
                main: move,
                index: cont
            });

            cont++;
            return true
        });

    });

    /*
        showEarth -> tell the screens to show the earth
    */
    socket.on('showEarth', () => {
        io.to('screen').emit('goEarth');
    });

    /*
        showChess ->  tell the screens to show the chess
    */
    socket.on('showChess', () => {
        io.to('screen').emit('goChess');
    });


    socket.on('refreshEarthServer', (coord) => {
        io.to('screen').emit('refreshEarthScreen', coord);
    });

});


function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

http.listen(port, () => {
    console.log(`Listening:\nhttp://localhost:${port}\nhttps://localhost:${port}`);
});