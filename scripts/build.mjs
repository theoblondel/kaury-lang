// Builds the package: the command and the compiler in plain JavaScript (dist/), plus the playground bundles.
import * as esbuild from 'esbuild'
import { rmSync } from 'node:fs'
const common = { bundle: true, platform: 'node', format: 'esm', target: 'node18', logLevel: 'info', sourcemap: true }
await esbuild.build({ ...common, entryPoints: ['src/cli/index.ts'], outfile: 'dist/cli.js', external: ['esbuild', 'sharp'] })
await esbuild.build({ ...common, entryPoints: ['src/core/index.ts'], outfile: 'dist/core.js', platform: 'neutral' })
// the compiler for the browser (playground, VS Code)
await esbuild.build({ ...common, entryPoints: ['src/core/index.ts'], outfile: 'playground/kaury-compiler.js', platform: 'browser', minify: true, sourcemap: false })
// the runtime for the browser (playground): the 3D stays in a chunk loaded on demand
// (emptied first: chunks of earlier builds have other names and would pile up)
rmSync('playground/rt', { recursive: true, force: true })
await esbuild.build({ entryPoints: { runtime: 'src/runtime/index.ts' }, bundle: true, format: 'esm', splitting: true, outdir: 'playground/rt', chunkNames: 'chunk-[hash]', minify: true, platform: 'browser', target: 'es2020', logLevel: 'info', define: { __KAURY_IMAGES__: '{}' } })
