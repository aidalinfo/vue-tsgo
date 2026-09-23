// Bundles the Volar codegen plugin into a single file shipped in the
// vue-go-tsc npm package (cli/volar/plugin.mjs). @vue/language-core is bundled
// as the fallback for projects without vue-tsc; typescript is always the
// project's own, so it is not bundled.
import path from 'node:path'
import { build } from 'esbuild'

const outfile = path.join(import.meta.dirname, '../../../cli/volar/plugin.mjs')

await build({
	entryPoints: [path.join(import.meta.dirname, '../src/index.ts')],
	outfile,
	bundle: true,
	platform: 'node',
	format: 'esm',
	target: 'node18',
	external: ['typescript'],
	minify: true,
	legalComments: 'linked',
	banner: {
		// CommonJS dependencies bundled into ESM need `require`.
		js: "import { createRequire as __vgtCreateRequire } from 'node:module'; const require = __vgtCreateRequire(import.meta.url);",
	},
	logLevel: 'info',
})
