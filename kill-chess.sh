#!/bin/bash
. ${HOME}/etc/shell.conf

pm2 delete CHESS_PORT:8117 2> /dev/null

for lg in $LG_FRAMES ; do
	if [ $lg == "lg1" ]; then
		export DISPLAY=:0
        pkill chromium-browse
		pkill chrome
	else
        ssh -Xnf lg@$lg " pkill chromium-browse; pkill chrome " || true
	fi
done