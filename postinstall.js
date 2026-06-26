const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const cmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
console.log(`[Postinstall] Running npm install for jiosaavn-api using ${cmd}...`);

const child = spawn(cmd, ['install'], {
  cwd: path.join(__dirname, 'jiosaavn-api'),
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`[Postinstall] npm install inside jiosaavn-api failed with code ${code}`);
  } else {
    console.log('[Postinstall] Successfully installed jiosaavn-api dependencies.');
  }
  process.exit(code);
});
