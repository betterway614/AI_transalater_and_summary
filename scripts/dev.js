#!/usr/bin/env node
delete process.env.ELECTRON_RUN_AS_NODE
const { execSync } = require('child_process')
execSync('npx electron-vite dev', { stdio: 'inherit', env: process.env })
