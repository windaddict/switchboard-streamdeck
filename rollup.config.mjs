import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const sdPlugin = "com.johnknox.safarijump.sdPlugin";

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
	external: ["@elgato/streamdeck"],
};
