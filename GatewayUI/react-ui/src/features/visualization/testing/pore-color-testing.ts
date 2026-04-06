// TS port of the Python `distinguishable_colors` function used to bake pore
// vertex colors during mesh generation (see segmentation_2d3d's
// core/mesh_generation_methods.py:167). This module lets admins iterate on
// the coloring algorithm at runtime without regenerating GLBs.
//
// Edit `DEFAULT_TEST_COLOR_PARAMS` or the algorithms below, save, and click
// "Re-apply" in the Pores panel to see the result. Once happy, port the
// changes back to Python.

export type BgSpec =
	| 'w'
	| 'k'
	| [number, number, number]
	| Array<[number, number, number]>;

export interface TestColorParams {
	n_grid: number;
	L_min: number;
	L_max: number;
	gray_tol: number;
	bg: BgSpec;
}

// Mirrors the Python defaults in distinguishable_colors().
// To disable the luminosity filter, widen to L_min=0, L_max=100.
export const DEFAULT_TEST_COLOR_PARAMS: TestColorParams = {
	n_grid: 40,
	L_min: 0,
	L_max: 100,
	gray_tol: 0.05,
	bg: 'w',
};

// Pick which coloring scheme buildPoreColorMap uses. Add new schemes as
// functions below and extend this union.
export const SCHEME: 'distinguishable' = 'distinguishable';

// --- color-space helpers ------------------------------------------------

function srgbToLinear(c: number): number {
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// sRGB in [0,1] → CIE LAB (D65), matching skimage.color.rgb2lab.
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
	const rL = srgbToLinear(r);
	const gL = srgbToLinear(g);
	const bL = srgbToLinear(b);

	const X = 0.4124564 * rL + 0.3575761 * gL + 0.1804375 * bL;
	const Y = 0.2126729 * rL + 0.7151522 * gL + 0.0721750 * bL;
	const Z = 0.0193339 * rL + 0.1191920 * gL + 0.9503041 * bL;

	const Xn = 0.95047;
	const Yn = 1.0;
	const Zn = 1.08883;

	const delta = 6 / 29;
	const delta3 = delta * delta * delta;
	const f = (t: number) =>
		t > delta3 ? Math.pow(t, 1 / 3) : t / (3 * delta * delta) + 4 / 29;

	const fx = f(X / Xn);
	const fy = f(Y / Yn);
	const fz = f(Z / Zn);

	const L = 116 * fy - 16;
	const a = 500 * (fx - fy);
	const bStar = 200 * (fy - fz);

	return [L, a, bStar];
}

function rgbToHex(r: number, g: number, b: number): string {
	const toByte = (x: number) => Math.round(Math.max(0, Math.min(255, x * 255)));
	const h = (x: number) => toByte(x).toString(16).padStart(2, '0');
	return `#${h(r)}${h(g)}${h(b)}`;
}

function parseBg(bg: BgSpec): Array<[number, number, number]> {
	if (bg === 'w') return [[1, 1, 1]];
	if (bg === 'k') return [[0, 0, 0]];
	if (
		Array.isArray(bg) &&
		bg.length === 3 &&
		typeof (bg as any)[0] === 'number'
	) {
		return [bg as [number, number, number]];
	}
	return bg as Array<[number, number, number]>;
}

// --- algorithms ---------------------------------------------------------

// TS port of Python's distinguishable_colors (farthest-point selection in
// LAB space, seeded from the background).
export function distinguishableColors(
	nColors: number,
	params: TestColorParams = DEFAULT_TEST_COLOR_PARAMS
): Array<[number, number, number]> {
	const { n_grid, L_min, L_max, gray_tol, bg } = params;
	if (nColors <= 0 || n_grid < 2) return [];

	// 1. Build RGB grid on [0,1] and convert to LAB, dropping colors that
	//    are too light/dark or too gray.
	const rgbs: Array<[number, number, number]> = [];
	const labs: Array<[number, number, number]> = [];

	const step = 1 / (n_grid - 1);
	for (let i = 0; i < n_grid; i++) {
		const r = i * step;
		for (let j = 0; j < n_grid; j++) {
			const g = j * step;
			for (let k = 0; k < n_grid; k++) {
				const b = k * step;

				const grayScore = Math.max(
					Math.abs(r - g),
					Math.abs(r - b),
					Math.abs(g - b)
				);
				if (grayScore < gray_tol) continue;

				const lab = rgbToLab(r, g, b);
				if (lab[0] <= L_min || lab[0] >= L_max) continue;

				rgbs.push([r, g, b]);
				labs.push(lab);
			}
		}
	}

	if (labs.length === 0) return [];

	// 2. Seed min_dist from the background colors.
	const bgLabs = parseBg(bg).map(([r, g, b]) => rgbToLab(r, g, b));
	const minDist = new Float64Array(labs.length);
	for (let i = 0; i < labs.length; i++) {
		let md = Infinity;
		for (let b = 0; b < bgLabs.length; b++) {
			const dL = labs[i][0] - bgLabs[b][0];
			const da = labs[i][1] - bgLabs[b][1];
			const db = labs[i][2] - bgLabs[b][2];
			const d = dL * dL + da * da + db * db;
			if (d < md) md = d;
		}
		minDist[i] = md;
	}

	// 3. Greedy farthest-point selection.
	const count = Math.min(nColors, rgbs.length);
	const selected: Array<[number, number, number]> = new Array(count);
	for (let n = 0; n < count; n++) {
		let maxIdx = 0;
		let maxVal = minDist[0];
		for (let i = 1; i < minDist.length; i++) {
			if (minDist[i] > maxVal) {
				maxVal = minDist[i];
				maxIdx = i;
			}
		}

		selected[n] = rgbs[maxIdx];

		const chosen = labs[maxIdx];
		for (let i = 0; i < labs.length; i++) {
			const dL = labs[i][0] - chosen[0];
			const da = labs[i][1] - chosen[1];
			const db = labs[i][2] - chosen[2];
			const d = dL * dL + da * da + db * db;
			if (d < minDist[i]) minDist[i] = d;
		}
	}

	return selected;
}

// Deterministic PRNG so Re-apply gives a different shuffle per seed value
// while remaining reproducible for a given seed.
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return function () {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
	};
}

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		const tmp = arr[i];
		arr[i] = arr[j];
		arr[j] = tmp;
	}
	return arr;
}

// --- public API ---------------------------------------------------------

// Memoize the greedy palette: (scheme, n, params) fully determine the
// output, so we only pay the O(n × grid) cost on the first call. Subsequent
// re-shuffles (from the Randomize-colors button) reuse the cached list.
const paletteCache = new Map<string, Array<[number, number, number]>>();

// Map entity ids (in id_to_index order) to CSS hex colors. The first id
// gets the color that is maximally far from the background, etc.
// If `shuffleSeed` is provided, the greedy color list is Fisher-Yates
// shuffled before assignment — so the palette is the same but neighbors
// get different colors on every Re-apply click.
export function buildPoreColorMap(
	entityIds: ReadonlyArray<number | string>,
	params: TestColorParams = DEFAULT_TEST_COLOR_PARAMS,
	options: { shuffleSeed?: number } = {}
): Record<string, string> {
	const n = entityIds.length;
	if (n === 0) return {};

	const cacheKey = `${SCHEME}|${n}|${JSON.stringify(params)}`;
	let colors = paletteCache.get(cacheKey);
	if (!colors) {
		switch (SCHEME) {
			case 'distinguishable':
			default:
				colors = distinguishableColors(n, params);
				break;
		}
		paletteCache.set(cacheKey, colors);
	}

	if (options.shuffleSeed !== undefined) {
		colors = shuffleInPlace(colors.slice(), mulberry32(options.shuffleSeed));
	}

	const map: Record<string, string> = {};
	for (let i = 0; i < n; i++) {
		const c = colors[i] ?? [0.5, 0.5, 0.5];
		map[String(entityIds[i])] = rgbToHex(c[0], c[1], c[2]);
	}
	return map;
}
