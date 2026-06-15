export interface LovamapDatValidation {
	type: 'dat';
	valid: true;
	particleCount: number;
}

export interface LovamapJsonValidation {
	type: 'json';
	valid: true;
	beadCount: number;
	domainSize: number | number[];
	voxelSize: number | number[];
	voxelCount: number | number[];
}

export interface LovamapValidationError {
	valid: false;
	error: string;
}

export type LovamapFileValidation =
	| LovamapDatValidation
	| LovamapJsonValidation
	| LovamapValidationError;

const REQUIRED_JSON_KEYS = ['bead_data', 'domain_size', 'voxel_size', 'voxel_count', 'bead_count'] as const;

export async function validateLovamapFile(file: File): Promise<LovamapFileValidation> {
	const ext = file.name.toLowerCase().split('.').pop();

	if (ext === 'dat' || ext === 'txt' || ext === 'csv') {
		return validateDatFile(file);
	}

	if (ext === 'json') {
		return validateJsonFile(file);
	}

	return { valid: false, error: `Unsupported file type: .${ext}` };
}

async function validateDatFile(file: File): Promise<LovamapFileValidation> {
	const text = await file.text();
	const lines = text.split(/\r?\n/);
	let particleCount = 0;

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;

		const parts = line.split(/[\s,]+/).map(Number);
		if (parts.length >= 4 && !parts.some((v) => Number.isNaN(v))) {
			particleCount++;
		}
	}

	if (particleCount === 0) {
		return { valid: false, error: 'No valid particle rows found (expected rows with at least 4 numbers).' };
	}

	return { type: 'dat', valid: true, particleCount };
}

async function validateJsonFile(file: File): Promise<LovamapFileValidation> {
	let parsed: any;
	try {
		const text = await file.text();
		parsed = JSON.parse(text);
	} catch {
		return { valid: false, error: 'Invalid JSON file.' };
	}

	// Support both [{...}] (array with single element) and {...} (plain object)
	const obj = Array.isArray(parsed) ? parsed[0] : parsed;

	if (!obj || typeof obj !== 'object') {
		return { valid: false, error: 'JSON must be an object or a single-element array containing an object.' };
	}

	const missing = REQUIRED_JSON_KEYS.filter((k) => !(k in obj));
	if (missing.length > 0) {
		return { valid: false, error: `Missing required keys: ${missing.join(', ')}` };
	}

	return {
		type: 'json',
		valid: true,
		beadCount: obj.bead_count,
		domainSize: obj.domain_size,
		voxelSize: obj.voxel_size,
		voxelCount: obj.voxel_count,
	};
}
