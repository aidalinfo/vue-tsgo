package project

import (
	"github.com/microsoft/typescript-go/internal/ast"
	"github.com/microsoft/typescript-go/internal/core"
	"github.com/microsoft/typescript-go/internal/golarext"
	"github.com/microsoft/typescript-go/internal/parser"
	"github.com/microsoft/typescript-go/internal/vfs"
	"github.com/zeebo/xxh3"
)

type ParseCacheKey struct {
	ast.SourceFileParseOptions
	ScriptKind core.ScriptKind
	Hash       xxh3.Uint128
}

func NewParseCacheKey(
	options ast.SourceFileParseOptions,
	hash xxh3.Uint128,
	scriptKind core.ScriptKind,
) ParseCacheKey {
	return ParseCacheKey{
		SourceFileParseOptions: options,
		Hash:                   hash,
		ScriptKind:             scriptKind,
	}
}

type ParseCacheArgs struct {
	fh FileHandle
	fs vfs.FS
}
type ParseCache = RefCountCache[ParseCacheKey, *ast.SourceFile, ParseCacheArgs]

func NewParseCache(options RefCountCacheOptions, golarCallbacks *golarext.GolarCallbacks) *ParseCache {
	return NewRefCountCache(
		options,
		func(key ParseCacheKey, args ParseCacheArgs) *ast.SourceFile {
			var file *ast.SourceFile
			if golarCallbacks == nil {
				file = parser.ParseSourceFile(key.SourceFileParseOptions, args.fh.Content(), key.ScriptKind)
			} else {
				file = golarCallbacks.ParseSourceFile(args.fs, key.SourceFileParseOptions, args.fh.Content(), key.ScriptKind)
			}
			file.Hash = args.fh.Hash()
			return file
		},
		nil,
	)
}
