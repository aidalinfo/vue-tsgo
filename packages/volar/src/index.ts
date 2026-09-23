/// <reference types="@volar/typescript" />

import { createPlugin, type IgnoreDirectiveMapping, type Mapping, type ScriptKind } from '@golar/plugin'
import type { LanguagePlugin } from '@volar/language-core'
import type ts from 'typescript'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

type Promisable<T> = T | Promise<T>

// Every diagnostic code a `@vue/language-core` `verification.shouldReport`
// filters (2.2.x and 3.x): unknown props (2353/2561), unused locals (6133),
// unknown ctx properties (2339/2551). Bit i of a mapping's suppression mask
// stands for SHOULD_REPORT_CODES[i]; the Go host uses the same table.
const SHOULD_REPORT_CODES = [2339, 2353, 2551, 2561, 6133]

function suppressionMask(verification: unknown): number {
	if (typeof verification !== 'object' || verification === null) {
		return 0
	}
	const shouldReport = (verification as { shouldReport?: (source: string | undefined, code: string | number) => boolean }).shouldReport
	if (typeof shouldReport !== 'function') {
		return 0
	}
	let mask = 0
	for (const [bit, code] of SHOULD_REPORT_CODES.entries()) {
		if (!shouldReport(undefined, code)) {
			mask |= 1 << bit
		}
	}
	return mask
}

export type CreateVolarPluginOptions = {
	filename: string
	languagePlugins: LanguagePlugin<string>[]
	// On-disk cache of generated service code. `key` must identify everything
	// the codegen output depends on besides the file (Volar version, options).
	cache?: { dir: string, key: string } | undefined
}

type ServiceCodeResult = Awaited<ReturnType<Parameters<typeof createPlugin>[0]['createServiceCode']>>

function readCache(file: string): ServiceCodeResult | undefined {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'))
	} catch {
		return undefined
	}
}

function writeCache(file: string, result: ServiceCodeResult) {
	try {
		fs.mkdirSync(path.dirname(file), { recursive: true })
		const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
		fs.writeFileSync(tmp, JSON.stringify(result))
		fs.renameSync(tmp, file)
	} catch {
		// the cache is an optimization only
	}
}

export function createVolarPlugin(opts: CreateVolarPluginOptions) {
	createPlugin({
		filename: opts.filename,
		extraExtensions: opts.languagePlugins.flatMap(p => p.typescript?.extraFileExtensions?.map(e => `.${e.extension}`) ?? []),
		async createServiceCode(fileName, sourceText) {
			const cacheFile = opts.cache
				? path.join(opts.cache.dir, createHash('sha256').update(opts.cache.key).update('\0').update(fileName).update('\0').update(sourceText).digest('hex') + '.json')
				: undefined
			if (cacheFile) {
				const cached = readCache(cacheFile)
				if (cached) {
					return cached
				}
			}
			const result = generate(fileName, sourceText)
			if (cacheFile) {
				writeCache(cacheFile, result)
			}
			return result
		},
	})

	function generate(fileName: string, sourceText: string): ServiceCodeResult {
			for (const plugin of opts.languagePlugins) {
				if (plugin.createVirtualCode == null) {
					continue
				}
				const languageId = plugin.getLanguageId(fileName)
				if (languageId == null) {
					continue
				}

				const virtualCode = plugin.createVirtualCode(fileName, languageId, {
					getLength() {
						return sourceText.length
					},
					getText(start, end) {
					  return sourceText.slice(start, end)
					},
					dispose() {},
					getChangeRange() {
						return undefined
					},
				}, {
					getAssociatedScript(scriptId) {
						return undefined
					},
				})
				if (virtualCode == null) {
					continue
				}

				const serviceScript = plugin.typescript!.getServiceScript(virtualCode)
				const serviceText = serviceScript!.code.snapshot.getText(0, serviceScript!.code.snapshot.getLength())

				const verificationMappings = serviceScript!.code.mappings.filter(m => m.data.verification)
				const sourceOffsets = new Set<number>()
				const serviceOffsets = new Set<number>()

				for (const m of verificationMappings) {
					for (const [i, offset] of m.sourceOffsets.entries()) {
						sourceOffsets.add(offset)
						sourceOffsets.add(offset + m.lengths[i]!)
					}
					for (const [i, offset] of m.generatedOffsets.entries()) {
						serviceOffsets.add(offset)
						serviceOffsets.add(offset + (m.generatedLengths ?? m.lengths)[i]!)
					}
				}

				const sourceOffsetsUtf8 = new Map<number, number>()
				const serviceOffsetsUtf8 = new Map<number, number>()

				let currentUtf8Pos = 0
				const sortedSourceOffsets = Array.from(sourceOffsets).sort((a, b) => a - b)
				for (const [i, offset] of sortedSourceOffsets.entries()) {
					sourceOffsetsUtf8.set(offset, currentUtf8Pos += Buffer.byteLength(sourceText.slice(sortedSourceOffsets[i-1] ?? 0, offset)))
				}
				currentUtf8Pos = 0
				const sortedServiceOffsets = Array.from(serviceOffsets).sort((a, b) => a - b)
				for (const [i, offset] of sortedServiceOffsets.entries()) {
					serviceOffsetsUtf8.set(offset, currentUtf8Pos += Buffer.byteLength(serviceText.slice(sortedServiceOffsets[i-1] ?? 0, offset)))
				}

				const serviceCovered: [number, number][] = []
				// One suppression mask per emitted mapping, in the same order.
				const mappingSuppressedCodes: number[] = []
				const mappings = verificationMappings
					.flatMap((m): Mapping[] => {
						const mask = suppressionMask(m.data.verification)
						for (let i = 0; i < m.sourceOffsets.length; i++) {
							mappingSuppressedCodes.push(mask)
						}
						return m.sourceOffsets.map((sourceOffset, i) => {
							const generatedOffset = m.generatedOffsets[i]!
							const sourceLength = m.lengths[i]!
							const generatedLength = m.generatedLengths?.[i] ?? sourceLength
							if (generatedLength > 0) {
								serviceCovered.push([serviceOffsetsUtf8.get(generatedOffset)!, serviceOffsetsUtf8.get(generatedOffset + generatedLength)!])
							}

							const sourceOffsetUtf8 = sourceOffsetsUtf8.get(sourceOffset)!
							const generatedOffsetUtf8 = serviceOffsetsUtf8.get(generatedOffset)!
							return {
								sourceOffset: sourceOffsetUtf8,
								serviceOffset: generatedOffsetUtf8,
								sourceLength: sourceOffsetsUtf8.get(sourceOffset + sourceLength)! - sourceOffsetUtf8,
								serviceLengths: serviceOffsetsUtf8.get(generatedOffset + generatedLength)! - generatedOffsetUtf8,
							}
						})
					})

  			serviceCovered.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  			const merged: [number, number][] = [];
  			for (const [s, e] of serviceCovered) {
  			  const last = merged.at(-1);
  			  if (!last) {
						merged.push([s, e])
					} else if (s <= last[1]) {
						last[1] = Math.max(last[1], e)
					} else {
						merged.push([s, e]);
					}
  			}

  			const ignoreMappings: IgnoreDirectiveMapping[] = [];
  			let cursor = 0;

  			for (const [s, e] of merged) {
  			  if (s > cursor) {
						ignoreMappings.push({ serviceOffset: cursor, serviceLength: s - cursor });
					}
  			  cursor = Math.max(cursor, e);
  			}

  			ignoreMappings.push({ serviceOffset: cursor, serviceLength: Buffer.byteLength(serviceText) - cursor });

				return {
					serviceText,
					scriptKind: tsScriptKindToGolar(serviceScript?.scriptKind),
					mappings,
					ignoreMappings,
					mappingSuppressedCodes,
				}
			}
			throw new Error('Unknown language')
	}
}

function tsScriptKindToGolar(scriptKind: ts.ScriptKind | undefined): ScriptKind {
	switch (scriptKind) {
		case 1 satisfies ts.ScriptKind.JS:
			return 'js'
		case 2 satisfies ts.ScriptKind.JSX:
			return 'jsx'
		case 3 satisfies ts.ScriptKind.TS:
			return 'ts'
		case 4 satisfies ts.ScriptKind.TSX:
			return 'tsx'
		default:
			return 'ts'
	}
}
