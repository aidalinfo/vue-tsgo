#!/usr/bin/env node
// Compares vue-go-tsc against vue-tsc on one or more projects.
//
//   node scripts/parity-check.mjs --tsgo <tsgo binary> --plugin <plugin.mjs> <project dir>...
//
// For each project (a directory with tsconfig.json, installed dependencies and
// vue-tsc), runs vue-tsc (the reference), vue-go-tsc with the Volar codegen
// (the default mode) and vue-go-tsc with the Go codegen, then compares the
// diagnostics by file:line (the checker is tsgo, not TypeScript 5.x, so the
// reported code/message may differ slightly for the same error).
//
// Exit code 1 when the Volar codegen differs from vue-tsc (a real regression
// of the default mode). Go codegen differences are reported as warnings: they
// point at Volar changes still to port to the Go codegen.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

function parseArgs(argv) {
  const opts = { projects: [] }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tsgo') opts.tsgo = argv[++i]
    else if (argv[i] === '--plugin') opts.plugin = argv[++i]
    else opts.projects.push(argv[i])
  }
  if (!opts.tsgo || !opts.plugin || opts.projects.length === 0) {
    console.error('usage: parity-check.mjs --tsgo <tsgo> --plugin <plugin.mjs> <project dir>...')
    process.exit(2)
  }
  return opts
}

const DIAGNOSTIC = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/

function run(cmd, args, cwd, env = {}) {
  const res = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  if (res.error) throw res.error
  const diagnostics = new Map()
  for (const line of `${res.stdout}\n${res.stderr}`.split('\n')) {
    const m = DIAGNOSTIC.exec(line.trim())
    if (m) diagnostics.set(`${path.normalize(m[1])}:${m[2]}`, `${m[4]} ${m[5].slice(0, 120)}`)
  }
  return { status: res.status, diagnostics }
}

function diff(reference, actual) {
  const missing = [...reference.keys()].filter(k => !actual.has(k)).sort()
  const extra = [...actual.keys()].filter(k => !reference.has(k)).sort()
  return { missing, extra }
}

function report(label, reference, actual, { missing, extra }, annotate) {
  for (const k of missing) annotate(`${label}: missing ${k} — vue-tsc: ${reference.get(k)}`)
  for (const k of extra) annotate(`${label}: extra ${k} — ${actual.get(k)}`)
}

const opts = parseArgs(process.argv.slice(2))
const inCI = !!process.env.GITHUB_ACTIONS
let failed = false

for (const dir of opts.projects) {
  const project = path.resolve(dir)
  const vueTsc = path.join(project, 'node_modules', '.bin', process.platform === 'win32' ? 'vue-tsc.cmd' : 'vue-tsc')
  if (!fs.existsSync(vueTsc)) {
    console.error(`${project}: vue-tsc is not installed`)
    process.exit(2)
  }
  const tsconfig = path.join(project, 'tsconfig.json')
  const reference = run(vueTsc, ['--noEmit', '-p', tsconfig], project)
  const volar = run(opts.tsgo, ['--noEmit', '-p', tsconfig], project, {
    GOLAR_PLUGIN: 'vue',
    GOLAR_VUE_PLUGIN_ENTRY: path.resolve(opts.plugin),
    GOLAR_NODE: process.execPath,
    GOLAR_VUE_TSCONFIG: tsconfig,
    GOLAR_VUE_CACHE: '0',
  })
  const go = run(opts.tsgo, ['--noEmit', '-p', tsconfig], project, { GOLAR_PLUGIN: '' })

  const volarDiff = diff(reference.diagnostics, volar.diagnostics)
  const goDiff = diff(reference.diagnostics, go.diagnostics)
  const volarOk = volarDiff.missing.length === 0 && volarDiff.extra.length === 0
  const goOk = goDiff.missing.length === 0 && goDiff.extra.length === 0

  console.log(`${project}: vue-tsc ${reference.diagnostics.size} error(s) | Volar codegen ${volar.diagnostics.size} ${volarOk ? '✓' : '✗'} | Go codegen ${go.diagnostics.size} ${goOk ? '✓' : '✗'}`)
  report('Volar codegen', reference.diagnostics, volar.diagnostics, volarDiff, msg => console.log(inCI ? `::error::${msg}` : `  ✗ ${msg}`))
  report('Go codegen', reference.diagnostics, go.diagnostics, goDiff, msg => console.log(inCI ? `::warning::${msg}` : `  ⚠ ${msg}`))
  if (!volarOk) failed = true
}

process.exit(failed ? 1 : 0)
