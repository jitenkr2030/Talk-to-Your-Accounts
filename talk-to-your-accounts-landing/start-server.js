const { spawn } = require('child_process');
const path = require('path');

const projectDir = '/workspace/talk-to-your-accounts-landing';
const nextPath = path.join(projectDir, 'node_modules/.bin/next');

const server = spawn(nextPath, ['start', '-p', '3000'], {
  cwd: projectDir,
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});
