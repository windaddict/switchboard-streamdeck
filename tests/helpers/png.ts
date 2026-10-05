/**
 * Test-only PNG reader. The asset tests (icons, key faces) must look at real
 * pixels - a file-exists check cannot tell a white glyph from a coloured one -
 * and the repo has no image library, so this decodes the one PNG flavour the
 * generator (inkscape) emits: 8-bit RGBA, non-interlaced. Anything else throws
 * a clear error instead of returning wrong pixels. Not matched by
 * `tests/**\/*.test.ts`, so vitest never runs it as a suite.
 */

import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

export interface Png {
	width: number;
	height: number;
	/** width * height * 4 bytes, row-major, R G B A (not premultiplied). */
	rgba: Uint8Array;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function paeth(a: number, b: number, c: number): number {
	const p = a + b - c;
	const pa = Math.abs(p - a);
	const pb = Math.abs(p - b);
	const pc = Math.abs(p - c);
	if (pa <= pb && pa <= pc) return a;
	return pb <= pc ? b : c;
}

export function decodePng(buf: Uint8Array, label = "png"): Png {
	for (let i = 0; i < SIGNATURE.length; i++) {
		if (buf[i] !== SIGNATURE[i]) throw new Error(`${label}: not a PNG (bad signature)`);
	}
	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	let pos = 8;
	let width = 0;
	let height = 0;
	const idat: Uint8Array[] = [];
	let sawIhdr = false;
	while (pos + 8 <= buf.length) {
		const len = view.getUint32(pos);
		const type = String.fromCharCode(buf[pos + 4], buf[pos + 5], buf[pos + 6], buf[pos + 7]);
		const data = buf.subarray(pos + 8, pos + 8 + len);
		if (type === "IHDR") {
			sawIhdr = true;
			width = view.getUint32(pos + 8);
			height = view.getUint32(pos + 12);
			const depth = data[8];
			const colour = data[9];
			const interlace = data[12];
			if (colour !== 6 || depth !== 8 || interlace !== 0) {
				throw new Error(
					`${label}: unsupported PNG (colour type ${colour}, bit depth ${depth}, interlace ${interlace}); ` +
						"the reader handles only 8-bit RGBA, non-interlaced",
				);
			}
		} else if (type === "IDAT") {
			idat.push(data);
		} else if (type === "IEND") {
			break;
		}
		pos += 12 + len;
	}
	if (!sawIhdr) throw new Error(`${label}: PNG has no IHDR chunk`);

	const raw = inflateSync(Buffer.concat(idat));
	const bpp = 4;
	const stride = width * bpp;
	if (raw.length !== (stride + 1) * height) {
		throw new Error(`${label}: inflated size ${raw.length} does not match ${width}x${height} RGBA`);
	}
	const out = new Uint8Array(stride * height);
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		const src = y * (stride + 1) + 1;
		const row = y * stride;
		for (let x = 0; x < stride; x++) {
			const a = x >= bpp ? out[row + x - bpp] : 0;
			const b = y > 0 ? out[row - stride + x] : 0;
			const c = y > 0 && x >= bpp ? out[row - stride + x - bpp] : 0;
			let v = raw[src + x];
			switch (filter) {
				case 0:
					break;
				case 1:
					v += a;
					break;
				case 2:
					v += b;
					break;
				case 3:
					v += (a + b) >> 1;
					break;
				case 4:
					v += paeth(a, b, c);
					break;
				default:
					throw new Error(`${label}: unknown PNG scanline filter ${filter}`);
			}
			out[row + x] = v & 0xff;
		}
	}
	return { width, height, rgba: out };
}

export function readPng(path: string | URL): Png {
	return decodePng(readFileSync(path), String(path));
}

/** RGBA of one pixel. */
export function pixel(png: Png, x: number, y: number): [number, number, number, number] {
	const i = (y * png.width + x) * 4;
	return [png.rgba[i], png.rgba[i + 1], png.rgba[i + 2], png.rgba[i + 3]];
}
