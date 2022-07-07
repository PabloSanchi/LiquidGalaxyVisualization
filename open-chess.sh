#!/bin/bash
. ${HOME}/etc/shell.conf

pm2 start index.js --name CHESS_PORT:8117 -- $1 2>> ./logs/$filename

port=8117;
screenNumber=0;
for lg in $LG_FRAMES ; do
    screenNumber=${lg:2}
	if [ $lg == "lg1" ]; then
        ssh -Xnf lg@$lg " export DISPLAY=:0 ; chromium-browser http://localhost:$port/$screenNumber --start-fullscreen --autoplay-policy=no-user-gesture-required </dev/null >/dev/null 2>&1 &" || true
	else
        ssh -Xnf lg@$lg " export DISPLAY=:0 ; chromium-browser http://lg1:$port/$screenNumber --start-fullscreen </dev/null >/dev/null 2>&1 &" || true
	fi

   sleep 1
done