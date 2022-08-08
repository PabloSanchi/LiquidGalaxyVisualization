# Installation & Launch process
## Requirements
    
1. Make sure the Liquid Galaxy core is installed. Check out the git hub [repository](https://github.com/LiquidGalaxyLAB/liquid-galaxy)
2. Make sure **Node.js version 16** is installed on the master machine by running:
```bash
node -v
```
-  The output should look someting like `v16.*.*`, at least you need version `v14.*.*`, if this is not the case it may not work, if not, try upgrading to the version 16.

3. Install pm2 on master machine. Run command:
```bash
sudo npm i -g pm2
```
4. Make sure Chromium Browser is installed on all machines.

## Installation
1. Go to the default working directory:
```bash
cd ~
```

2. Clone github repository
```bash
git clone https://github.com/PabloSanchi/LiquidGalaxyVisualization
```

3. Go to the LiquidGalaxyVisualization folder
```bash
cd LiquidGalaxyVisualization
```

4. Install space chess
```bash
bash install.sh
```
   - You will be prompted: *Do you want to reboot your machine now? [Y/n]:*
     - type: Y


## Launch

- Go to the LiquidGalaxyVisualization folder
```bash
cd ~/LiquidGalaxyVisualization
```

- Execute the launch script, by doing the following:
```bash
bash open-chess.sh NUMSCREEN
```
***NUMSCREEN is the number of screens that you want to use.***

***The default value is 5. Make sure to set it properly according to your rig setup.***