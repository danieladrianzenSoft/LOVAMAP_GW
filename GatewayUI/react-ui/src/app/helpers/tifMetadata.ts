export interface TifMetadata {
	dx: number | null;
	dy: number | null;
	dz: number | null;
	unit: string | null;
	channels: number;
	bitsPerSample: number | null;
	isBinary: boolean;
}

// TIFF tag IDs we care about
const TAG_IMAGE_DESCRIPTION = 0x010e;
const TAG_BITS_PER_SAMPLE = 0x0102;
const TAG_SAMPLES_PER_PIXEL = 0x0115;
const TAG_X_RESOLUTION = 0x011a;
const TAG_Y_RESOLUTION = 0x011b;
const TAG_RESOLUTION_UNIT = 0x0128;

// TIFF type sizes (bytes per element)
const TYPE_SIZES: Record<number, number> = {
	1: 1,  // BYTE
	2: 1,  // ASCII
	3: 2,  // SHORT
	4: 4,  // LONG
	5: 8,  // RATIONAL (2x LONG)
	6: 1,  // SBYTE
	7: 1,  // UNDEFINED
	8: 2,  // SSHORT
	9: 4,  // SLONG
	10: 8, // SRATIONAL
	11: 4, // FLOAT
	12: 8, // DOUBLE
	16: 8, // LONG8 (BigTIFF)
};

interface TagEntry {
	type: number;
	count: number;
	valueOffset: number;
}

/** Read a slice of the File as an ArrayBuffer */
async function readSlice(file: File, start: number, length: number): Promise<ArrayBuffer> {
	const end = Math.min(start + length, file.size);
	return file.slice(start, end).arrayBuffer();
}

/** Read a 64-bit unsigned int as a JS number (safe for offsets < 2^53) */
function readUint64(view: DataView, offset: number, le: boolean): number {
	const lo = view.getUint32(offset + (le ? 0 : 4), le);
	const hi = view.getUint32(offset + (le ? 4 : 0), le);
	return hi * 0x100000000 + lo;
}

/**
 * Reads TIFF IFD tags directly from the file.
 * Supports both classic TIFF (magic 42) and BigTIFF (magic 43).
 * Uses targeted file.slice() reads so it works even when the IFD is deep in the file.
 */
export async function extractTifMetadata(file: File): Promise<TifMetadata> {
	const result: TifMetadata = {
		dx: null,
		dy: null,
		dz: null,
		unit: null,
		channels: 1,
		bitsPerSample: null,
		isBinary: false,
	};

	try {
		// ── Pass 1: read file header to find IFD offset ──
		const headerBuf = await readSlice(file, 0, 16);
		const hdr = new DataView(headerBuf);

		const bom = hdr.getUint16(0);
		const le = bom === 0x4949;
		if (bom !== 0x4949 && bom !== 0x4d4d) {
			console.warn('[tifMetadata] Not a valid TIFF (BOM:', `0x${bom.toString(16)})`);
			return result;
		}

		const magic = hdr.getUint16(2, le);
		const isBigTiff = magic === 43;
		if (magic !== 42 && magic !== 43) {
			console.warn('[tifMetadata] Unknown TIFF version (magic =', magic, ')');
			return result;
		}

		let ifdOffset: number;
		if (isBigTiff) {
			const offsetSize = hdr.getUint16(4, le);
			if (offsetSize !== 8) {
				console.warn('[tifMetadata] BigTIFF offset size is not 8:', offsetSize);
				return result;
			}
			ifdOffset = readUint64(hdr, 8, le);
		} else {
			ifdOffset = hdr.getUint32(4, le);
		}

		console.log('[tifMetadata] format:', isBigTiff ? 'BigTIFF' : 'ClassicTIFF',
			'| endian:', le ? 'LE' : 'BE', '| IFD offset:', ifdOffset);

		if (ifdOffset >= file.size) {
			console.warn('[tifMetadata] IFD offset beyond file size');
			return result;
		}

		// ── Pass 2: read the IFD ──
		// First read just enough bytes to get the entry count
		const countSize = isBigTiff ? 8 : 2;
		const countBuf = await readSlice(file, ifdOffset, countSize);
		const countView = new DataView(countBuf);
		const numEntries = isBigTiff
			? readUint64(countView, 0, le)
			: countView.getUint16(0, le);

		const entrySize = isBigTiff ? 20 : 12;
		const ifdDataStart = ifdOffset + countSize;
		const ifdDataLen = numEntries * entrySize;

		// Read all IFD entries + some extra for inline/nearby values
		const ifdBuf = await readSlice(file, ifdDataStart, ifdDataLen + 1024);
		const ifdView = new DataView(ifdBuf);

		const tags: Record<number, TagEntry> = {};
		const allTags: Record<string, any> = {};

		for (let i = 0; i < numEntries; i++) {
			const off = i * entrySize;
			if (off + entrySize > ifdBuf.byteLength) break;

			const tagId = ifdView.getUint16(off, le);
			const type = ifdView.getUint16(off + 2, le);

			let count: number;
			let valueOffset: number; // absolute file offset

			if (isBigTiff) {
				count = readUint64(ifdView, off + 4, le);
				const totalBytes = (TYPE_SIZES[type] ?? 1) * count;
				valueOffset = totalBytes <= 8
					? ifdDataStart + off + 12  // inline in the entry
					: readUint64(ifdView, off + 12, le);
			} else {
				count = ifdView.getUint32(off + 4, le);
				const totalBytes = (TYPE_SIZES[type] ?? 1) * count;
				valueOffset = totalBytes <= 4
					? ifdDataStart + off + 8   // inline in the entry
					: ifdView.getUint32(off + 8, le);
			}

			tags[tagId] = { type, count, valueOffset };

			const tagName = TAG_NAMES[tagId] ?? `0x${tagId.toString(16).padStart(4, '0')}`;
			allTags[tagName] = `type=${type}, count=${count}, offset=${valueOffset}`;
		}

		console.log('[tifMetadata] IFD entries:', numEntries, '| tags:', allTags);

		// ── Pass 3: read tag values we care about ──
		// Collect all offsets we need to read, then batch them
		const valuesToRead: number[] = [];
		const addValueOffset = (tagId: number) => {
			if (tags[tagId]) valuesToRead.push(tags[tagId].valueOffset);
		};
		addValueOffset(TAG_BITS_PER_SAMPLE);
		addValueOffset(TAG_SAMPLES_PER_PIXEL);
		addValueOffset(TAG_RESOLUTION_UNIT);
		addValueOffset(TAG_X_RESOLUTION);
		addValueOffset(TAG_Y_RESOLUTION);

		let resUnit = 1;
		let rawDx: number | null = null;
		let rawDy: number | null = null;

		// Find the range we need to read for small values (shorts + rationals)
		// These are typically clustered near the IFD
		if (valuesToRead.length > 0) {
			const minOff = Math.min(...valuesToRead);
			const maxOff = Math.max(...valuesToRead) + 8; // +8 for RATIONAL size
			const valBuf = await readSlice(file, minOff, maxOff - minOff + 8);
			const valView = new DataView(valBuf);

			const readShortAt = (absOffset: number): number | null => {
				const rel = absOffset - minOff;
				if (rel < 0 || rel + 2 > valBuf.byteLength) return null;
				return valView.getUint16(rel, le);
			};

			const readRationalAt = (absOffset: number): number | null => {
				const rel = absOffset - minOff;
				if (rel < 0 || rel + 8 > valBuf.byteLength) return null;
				const num = valView.getUint32(rel, le);
				const den = valView.getUint32(rel + 4, le);
				return den === 0 ? null : num / den;
			};

			// BitsPerSample
			if (tags[TAG_BITS_PER_SAMPLE]) {
				const val = readShortAt(tags[TAG_BITS_PER_SAMPLE].valueOffset);
				if (val != null) {
					result.bitsPerSample = val;
					result.isBinary = val === 1;
				}
			}

			// SamplesPerPixel
			if (tags[TAG_SAMPLES_PER_PIXEL]) {
				const val = readShortAt(tags[TAG_SAMPLES_PER_PIXEL].valueOffset);
				if (val != null) result.channels = val;
			}

			// ResolutionUnit: 1=No unit, 2=Inch, 3=Centimeter
			if (tags[TAG_RESOLUTION_UNIT]) {
				const val = readShortAt(tags[TAG_RESOLUTION_UNIT].valueOffset);
				if (val != null) resUnit = val;
			}

			console.log('[tifMetadata] ResolutionUnit:', resUnit);

			// XResolution (raw value = pixels per unit)
			if (tags[TAG_X_RESOLUTION]) {
				const val = readRationalAt(tags[TAG_X_RESOLUTION].valueOffset);
				console.log('[tifMetadata] XResolution raw:', val, 'pixels per unit');
				if (val != null && val > 0) rawDx = 1.0 / val;
			}

			// YResolution
			if (tags[TAG_Y_RESOLUTION]) {
				const val = readRationalAt(tags[TAG_Y_RESOLUTION].valueOffset);
				if (val != null && val > 0) rawDy = 1.0 / val;
			}
		}

		// ImageDescription — parse BEFORE deciding on dx/dy, since ImageJ
		// stores the unit here (resUnit=1) rather than in ResolutionUnit
		if (tags[TAG_IMAGE_DESCRIPTION]) {
			const tag = tags[TAG_IMAGE_DESCRIPTION];
			const readLen = Math.min(tag.count, 1024 * 1024); // cap at 1MB
			try {
				const descBuf = await readSlice(file, tag.valueOffset, readLen);
				const desc = new TextDecoder().decode(descBuf).replace(/\0+$/, '');
				if (desc) {
					console.log('[tifMetadata] ImageDescription (first 300 chars):', desc.substring(0, 300));
					parseImageDescription(desc, result);
				}
			} catch (err) {
				console.warn('[tifMetadata] Failed to read ImageDescription:', err);
			}
		} else {
			console.log('[tifMetadata] No ImageDescription tag');
		}

		// ── Resolve dx/dy from XRes/YRes + unit info ──
		// OME-XML in ImageDescription may have already set dx/dy directly — keep those.
		// Otherwise, convert rawDx/rawDy to µm based on resUnit or ImageDescription unit.
		if (result.dx == null && rawDx != null) {
			if (resUnit === 2) {
				result.dx = rawDx * 25400;      // inch → µm
			} else if (resUnit === 3) {
				result.dx = rawDx * 10000;       // cm → µm
			} else if (resUnit === 1 && isUnitMicrons(result.unit)) {
				// ImageJ convention: resUnit=1 with unit from ImageDescription
				result.dx = rawDx;               // already in µm
			}
			// resUnit=1 with no recognized unit → discard (dimensionless)
		}
		if (result.dy == null && rawDy != null) {
			if (resUnit === 2) {
				result.dy = rawDy * 25400;
			} else if (resUnit === 3) {
				result.dy = rawDy * 10000;
			} else if (resUnit === 1 && isUnitMicrons(result.unit)) {
				result.dy = rawDy;
			}
		}

		console.log('[tifMetadata] result:', result);
	} catch (err) {
		console.warn('[tifMetadata] Failed to extract TIFF metadata:', err);
	}

	return result;
}

// ── Common TIFF tag names for debug logging ──

const TAG_NAMES: Record<number, string> = {
	0x00fe: 'NewSubfileType',
	0x0100: 'ImageWidth',
	0x0101: 'ImageLength',
	0x0102: 'BitsPerSample',
	0x0103: 'Compression',
	0x0106: 'PhotometricInterpretation',
	0x010e: 'ImageDescription',
	0x0111: 'StripOffsets',
	0x0112: 'Orientation',
	0x0115: 'SamplesPerPixel',
	0x0116: 'RowsPerStrip',
	0x0117: 'StripByteCounts',
	0x011a: 'XResolution',
	0x011b: 'YResolution',
	0x011c: 'PlanarConfiguration',
	0x0128: 'ResolutionUnit',
	0x0131: 'Software',
	0x0132: 'DateTime',
	0x0153: 'SampleFormat',
};

/** Check if the unit string represents micrometers */
function isUnitMicrons(unit: string | null): boolean {
	if (!unit) return false;
	// Unescape literal \uXXXX sequences that ImageJ writes (e.g. "\u00B5m" → "µm")
	const unescaped = unit.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
		String.fromCharCode(parseInt(hex, 16))
	);
	const u = unescaped.toLowerCase().trim();
	return /^(µm|\u00b5m|um|μm|microns?|micrometers?)$/.test(u);
}

function parseImageDescription(desc: string, result: TifMetadata) {
	// ImageJ format: "ImageJ=1.53...\nchannels=1\nslices=100\nspacing=0.5\nunit=um\n"
	const channelMatch = desc.match(/channels=(\d+)/);
	if (channelMatch) {
		result.channels = parseInt(channelMatch[1], 10);
	}

	const spacingMatch = desc.match(/spacing=([\d.eE+-]+)/);
	if (spacingMatch) {
		result.dz = parseFloat(spacingMatch[1]);
	}

	const unitMatch = desc.match(/unit=(\S+)/);
	if (unitMatch) {
		result.unit = unitMatch[1];
	}

	// OME-XML: <Pixels PhysicalSizeX="0.5" ...>
	if (desc.includes('<Pixels')) {
		const sxMatch = desc.match(/PhysicalSizeX="([\d.eE+-]+)"/);
		const syMatch = desc.match(/PhysicalSizeY="([\d.eE+-]+)"/);
		const szMatch = desc.match(/PhysicalSizeZ="([\d.eE+-]+)"/);

		if (sxMatch) result.dx = parseFloat(sxMatch[1]);
		if (syMatch) result.dy = parseFloat(syMatch[1]);
		if (szMatch) result.dz = parseFloat(szMatch[1]);

		const sizeCMatch = desc.match(/SizeC="(\d+)"/);
		if (sizeCMatch) {
			result.channels = parseInt(sizeCMatch[1], 10);
		}
	}
}
