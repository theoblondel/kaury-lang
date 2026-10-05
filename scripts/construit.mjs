// Construit le paquet : la commande et le compilateur en JavaScript pur (dist/).
import * as esbuild from 'esbuild'
const commun = { bundle: true, platform: 'node', format: 'esm', target: 'node18', logLevel: 'info', sourcemap: true }
await esbuild.build({ ...commun, entryPoints: ['src/cli/index.ts'], outfile: 'dist/cli.js', external: ['esbuild'] })
await esbuild.build({ ...commun, entryPoints: ['src/noyau/index.ts'], outfile: 'dist/noyau.js', platform: 'neutral' })
// le compilateur pour le navigateur (terrain de jeu)
await esbuild.build({ ...commun, entryPoints: ['src/noyau/index.ts'], outfile: 'terrain/kaury-compilateur.js', platform: 'browser', minify: true, sourcemap: false })
// le runtime pour le navigateur (terrain de jeu) : la 3D reste dans un morceau chargé à la demande
await esbuild.build({ entryPoints: { runtime: 'src/runtime/index.ts' }, bundle: true, format: 'esm', splitting: true, outdir: 'terrain/rt', chunkNames: 'morceau-[hash]', minify: true, platform: 'browser', target: 'es2020', logLevel: 'info' })
