#!/bin/bash
# It is not finished yet, but it is enough to install the required packages.

# Open port 8117

LINE=`cat /etc/iptables.conf | grep "tcp" | grep "8111" | awk -F " -j" '{print $1}'`

RESULT=$LINE",8117"

DATA=`cat /etc/iptables.conf | grep "tcp" | grep "8111" | grep "8117"`

if [ "$DATA" == "" ]; then
    time=$(date +%H:%M:%S)
    echo "[$time] Port 8117 not open, opening port..." | tee -a ./logs/$filename
    sudo sed -i "s/$LINE/$RESULT/g" /etc/iptables.conf 2>> ./logs/$filename
else
    time=$(date +%H:%M:%S)
    echo "[$time] Port already open." | tee -a ./logs/$filename
fi

# Install dependencies
npm install

# Finish installation
time=$(date +%H:%M:%S)
echo "[$time] Installation complete. Reboot machine to finish installation" | tee -a ./logs/$filename
read -p "Do you want to reboot your machine now? [Y/n]: " yes

if [[ $yes =~ ^[Yy]$ ]]
then
  reboot
fi