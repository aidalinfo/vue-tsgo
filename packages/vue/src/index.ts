import { createVolarPlugin } from '@golar/volar'
import * as bundledCore from '@vue/language-core'
import bundledCorePkg from '@vue/language-core/package.json' with { type: 'json' }
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

// Volar codegen mode: the .vue virtual code comes from `@vue/language-core`,
// the same codegen vue-tsc runs, so vue-go-tsc checks exactly what vue-tsc
// checks. Type-checking itself stays in tsgo.
//
// The project's own version is used whenever it has vue-tsc (parity with the
// vue-tsc it would run: 2.2.x and 3.x differ); the bundled copy otherwise.

type LanguageCore = typeof import('@vue/language-core')
type TypeScript = typeof import('typescript')

function fail(message: string): never {
	console.error(`vue-go-tsc: Volar codegen: ${message}\n  (run with --codegen=go to use the built-in Go codegen instead)`)
	process.exit(1)
}

// The tsconfig being checked (set by the vue-go-tsc launcher from -p/--project).
const configPath = path.resolve(process.env.GOLAR_VUE_TSCONFIG ?? 'tsconfig.json')
const projectDir = path.dirname(configPath)

function loadVolar(): { core: LanguageCore, ts: TypeScript, coreVersion: string, source: string } {
	const projectRequire = createRequire(path.join(projectDir, 'package.json'))
	let vueTscRequire: NodeJS.Require | undefined
	let vueTscDir: string | undefined
	try {
		vueTscDir = path.dirname(projectRequire.resolve('vue-tsc/package.json'))
		vueTscRequire = createRequire(path.join(vueTscDir, 'package.json'))
	} catch {
		// no vue-tsc in the project: bundled language-core below
	}

	let ts: TypeScript
	try {
		ts = (vueTscRequire ?? projectRequire)('typescript')
	} catch {
		fail(`cannot resolve "typescript" from ${projectDir}`)
	}

	if (vueTscRequire) {
		try {
			return {
				core: vueTscRequire('@vue/language-core'),
				ts,
				coreVersion: vueTscRequire('@vue/language-core/package.json').version,
				source: vueTscDir!,
			}
		} catch (err) {
			fail(`cannot load @vue/language-core from ${vueTscDir}: ${(err as Error).message}`)
		}
	}
	return { core: bundledCore, ts, coreVersion: bundledCorePkg.version, source: 'bundled' }
}

const { core, ts, coreVersion, source } = loadVolar()

let parsed: ReturnType<LanguageCore['createParsedCommandLine']>
try {
	parsed = ts.sys.fileExists(configPath)
		? core.createParsedCommandLine(ts, ts.sys, configPath)
		: core.createParsedCommandLineByJson(ts, ts.sys, projectDir, {})
} catch (err) {
	fail(`cannot read ${configPath}: ${(err as Error).message}`)
}

if (process.env.GOLAR_VUE_DEBUG) {
	console.error(`[vue-go-tsc] Volar codegen: @vue/language-core ${coreVersion} (${source}), TypeScript ${ts.version}, tsconfig ${configPath}`)
}

const vueLanguagePlugin = core.createVueLanguagePlugin(ts, parsed.options, parsed.vueOptions, (id: string) => id)

// Everything the generated code depends on besides the .vue file itself.
function cacheIdentity(): string | undefined {
	try {
		return JSON.stringify([coreVersion, source, ts.version, parsed.vueOptions, parsed.options])
	} catch {
		return undefined
	}
}
const identity = process.env.GOLAR_VUE_CACHE === '0' ? undefined : cacheIdentity()

createVolarPlugin({
	filename: fileURLToPath(import.meta.url),
	languagePlugins: [vueLanguagePlugin],
	cache: identity === undefined ? undefined : {
		dir: process.env.GOLAR_VUE_CACHE_DIR ?? path.join(os.homedir(), '.cache', 'vue-go-tsc', 'volar-codegen'),
		key: identity,
	},
})
