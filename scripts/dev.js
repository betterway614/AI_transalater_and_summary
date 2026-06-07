#!/usr/bin/env node
const { execSync } = require('child_process')
// Strip ELECTRON_RUN_AS_NODE to prevent Electron from running in Node.js mode
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
execSync('npx electron-vite dev', { stdio: 'inherit', env })
