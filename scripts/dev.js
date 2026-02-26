#!/usr/bin/env node
// Fully removes ELECTRON_RUN_AS_NODE before starting electron-vite dev.
// Setting it to "" (cross-env trick) is not enough — Electron 32 runs in
// node mode whenever the variable EXISTS, even if the value is empty.
const { spawnSync } = require('child_process')
const { resolve } = require('path')

delete process.env.ELECTRON_RUN_AS_NODE

const bin = resolve(__dirname, '../node_modules/.bin/electron-vite')
const result = spawnSync(bin, ['dev'], { stdio: 'inherit', shell: true })
process.exit(result.status ?? 0)
