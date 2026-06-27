import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const sdPlugin = "com.movingavg.switchboard.sdPlugin";

/** @type {import('rollup').RollupOptions} */
export default {
	input: "src/plugin.ts",
	output: {
		file: `${sdPlugin}/bin/plugin.js`,
		format: "es",
		sourcemap: true,
		sourcemapPathTransform: (relativePath) => relativePath.replace(/^\.\.\//, `../../src/`),
	},
	plugins: [
		typescript({ tsconfig: "./tsconfig.json", outDir: undefined, declaration: false }),
		nodeResolve({ browser: false, exportConditions: ["node"], preferBuiltins: true }),
		commonjs(),
	],
	// Bundle the SDK so the .sdPlugin is self-contained — it must run from the
	// Stream Deck Plugins dir (outside this repo's node_modules) when installed
	// by drag-and-drop / Homebrew / the .streamDeckPlugin installer.
	external: [],
};
