import express from 'express';
import httpImport from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path';

var app = express();
var http = httpImport.createServer(app);
var io = new Server(http, {
    cors: {
        origin: '*',// "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const __dirname = path.resolve();

const port = 3001;

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
if (myArgs.length == 0 || isNaN(nScreens)) {
    console.log("Number of screens invalid or not informed, default number is 3.");
    nScreens = 3;
}
console.log(`Running LQ Space Chess for Liquid Galaxy with ${nScreens} screens!`);

app.use(express.static(__dirname + filePath));


app.get('/:id', (req, res) => {
    const id = req.params.id

    // console.log(Object.keys(screens));

    // if(Object.keys(screens).includes(id.toString()))
    //     res.send(`
    //         <body style="background-color: black;">
    //             <h1 style="font-family: Sans-serif; color: white;">
    //                 Ya hay una pantalla numero ${id}
    //             </h1>
    //         </body>
    //         `);
    // else {
    if (id == "controller") {
        res.sendFile(__dirname + `${filePath}/${controllerFile}`);
    } else {
        screenNumber = id
        res.sendFile(__dirname + `${filePath}/${pruebas}`);
    }
    // }
});

io.on('connect', socket => {

    // console.log(Object.keys(screens));

    // if(!(Object.keys(screens).includes(screenNumber.toString()))) {

    //     if(socket.handshake.query.mobile != 'true')
    //         screens[screenNumber] = socket;
    // }else {
    //     socket.disconnect()
    // }

    console.log(`User connected with id ${socket.id}`);

    // join the room taking care of the type (mobile or screen)
    if (socket.handshake.query.mobile == 'true') {
        socket.join('mobile');
    } else {
        socket.join('screen');
    }

    // if users leaves, then notify
    socket.on('quit', () => {
        console.log('user left');
    });


    io.to('screen').emit('update', {
        id: screenNumber
    })

    socket.on('windowSize', (data) => {
        superRes[data.id] = data.width;
        activeScreens++;

        if (activeScreens == nScreens) {
            let r = 0;
            // for (let i = 1; i <= Object.keys(superRes).length; ++i) {
            //     r += superRes[i];
            //     console.log(`screen ${i}: ${superRes[i]}`);
            // }

            Object.entries(superRes).forEach(res => {
                r += res[1];
            });

            console.log('sending start signal');

            io.to('screen').emit('start', {
                width: r,
                height: 0,
                child: superRes,
            })
        }
    });

    // recieve coordinates from the master
    socket.on('updateScreens', (mouse) => {
        io.to('screen').emit('updateMouse', mouse);
    });

    socket.on('updatePos', (pos) => {
        io.to('screen').emit('updatePosScreen', pos);
    })


    /*
        newStatus - recieve the status and move from the client
                    and send the move to the screens
        
        @param {Object} data; contains the status (string) and the move (string)
    */
    socket.on('newStatus', (data) => {
        console.log('FEN: ' + data.status);
        console.log('Move: ' + data.move);

        io.to('screen').emit('updateFen', {
            status: data.status
        });

        // io.to('screen').emit('move', {
        //     status: data.status,
        //     move: data.move
        // });
    });

    /*
    currentBoard - recieve the current status from the client
                and send the status to the screens
    
    @param {Object} data; contains the status (string)
    */
    socket.on('currentBoard', (data) => {
        console.log('Current Board: ' + data.status);

        io.to('screen').emit('updateFen', {
            status: data.status
        });
        // emit curent borad status to the screens
        // io.to('screen').emit('currentStatus', {
        //     status: data.status
        // });
    });
});

http.listen(port, () => {
    console.log(`Listening on port ${port}`);
});