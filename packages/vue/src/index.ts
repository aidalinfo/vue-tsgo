import { createVolarPlugin } from '@golar/volar'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

// Volar codegen mode: run the project's own `@vue/language-core` (the one its
// `vue-tsc` uses) so the virtual TS code is exactly what vue-tsc checks.
// Falls back to the bundled version when the project has no vue-tsc.
function loadVolar() {
	const cwd = process.cwd()
	const projectRequire = createRequire(path.join(cwd, 'package.json'))
	try {
		const vueTscDir = path.dirname(projectRequire.resolve('vue-tsc/package.json'))
		const vueTscRequire = createRequire(path.join(vueTscDir, 'package.json'))
		return {
			core: vueTscRequire('@vue/language-core') as typeof import('@vue/language-core'),
			ts: vueTscRequire('typescript') as typeof import('typescript'),
			coreVersion: vueTscRequire('@vue/language-core/package.json').version as string,
			source: vueTscDir,
		}
	} catch {
		const selfRequire = createRequire(import.meta.url)
		return {
			core: selfRequire('@vue/language-core') as typeof import('@vue/language-core'),
			ts: selfRequire('typescript') as typeof import('typescript'),
			coreVersion: selfRequire('@vue/language-core/package.json').version as string,
			source: 'bundled',
		}
	}
}

const { core, ts, coreVersion, source } = loadVolar()

// The tsconfig being checked: GOLAR_VUE_TSCONFIG, else ./tsconfig.json.
const configPath = path.resolve(process.env.GOLAR_VUE_TSCONFIG ?? 'tsconfig.json')
const parsed = ts.sys.fileExists(configPath)
	? core.createParsedCommandLine(ts, ts.sys, configPath)
	: core.createParsedCommandLineByJson(ts, ts.sys, process.cwd(), {})

if (process.env.GOLAR_VUE_DEBUG) {
	console.error(`[golar-vue] language-core from ${source}, tsconfig ${configPath}`)
}

const vueLanguagePlugin = core.createVueLanguagePlugin(ts, parsed.options, parsed.vueOptions, (id: string) => id)

// Everything the generated code depends on besides the .vue file itself.
function cacheIdentity(): string | undefined {
	try {
		return JSON.stringify([coreVersion, ts.version, parsed.vueOptions, parsed.options])
	} catch {
		return undefined
	}
}
const identity = process.env.GOLAR_VUE_CACHE === '0' ? undefined : cacheIdentity()

createVolarPlugin({
	filename: import.meta.filename,
	languagePlugins: [vueLanguagePlugin],
	cache: identity === undefined ? undefined : {
		dir: process.env.GOLAR_VUE_CACHE_DIR ?? path.join(os.homedir(), '.cache', 'vue-go-tsc', 'volar-codegen'),
		key: identity,
	},
})
