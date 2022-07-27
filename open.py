import subprocess, re, os, sys

screens = sys.argv[1]
url = ''

def execute(cmd):
    popen = subprocess.Popen(cmd, stdout=subprocess.PIPE, universal_newlines=True)
    for stdout_line in iter(popen.stdout.readline, ""):
        yield stdout_line 
    popen.stdout.close()
    return_code = popen.wait()
    if return_code:
        raise subprocess.CalledProcessError(return_code, cmd)


for path in execute(["ssh", "-R", "80:localhost:8120", "nokey@localhost.run"]):
    print(path, end="")
    match = re.search(".*tunneled with tls termination, https://.*", path)
    if match is not None:
        # print('URL: ' + match.group(0).split(' ')[-1])
        url = match.group(0).split(' ')[-1]
        os.system('clear')
        if os.name == 'nt':
            os.system(f'npm start {screens} {url}')
        else:
            os.system(f'bash open-chess.sh {screens} {url}')