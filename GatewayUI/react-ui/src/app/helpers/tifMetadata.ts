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
};

/**
 * Reads TIFF IFD tags directly from the file header.
 * Only reads the bytes it needs — safe for multi-GB microscopy TIFFs.
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
		// Read first 64 KB for the IFD — more than enough for headers
		const headerSize = Math.min(file.size, 64 * 1024);
		const headerBuf = await file.slice(0, headerSize).arrayBuffer();
		const view = new DataView(headerBuf);

		// Byte order: II = little-endian, MM = big-endian
		const bom = view.getUint16(0);
		const le = bom === 0x4949; // 'II'
		if (bom !== 0x4949 && bom !== 0x4d4d) {
			console.warn('[tifMetadata] Not a valid TIFF file');
			return result;
		}

		// Magic number check
		const magic = view.getUint16(2, le);
		if (magic !== 42) {
			console.warn('[tifMetadata] Not a standard TIFF (magic =', magic, ')');
			return result;
		}

		// Offset to first IFD
		const ifdOffset = view.getUint32(4, le);
		if (ifdOffset + 2 > headerBuf.byteLength) return result;

		const numEntries = view.getUint16(ifdOffset, le);
		const tags: Record<number, { type: number; count: number; valueOffset: number }> = {};
		const allTags: Record<string, any> = {};

		for (let i = 0; i < numEntries; i++) {
			const entryOffset = ifdOffset + 2 + i * 12;
			if (entryOffset + 12 > headerBuf.byteLength) break;

			const tagId = view.getUint16(entryOffset, le);
			const type = view.getUint16(entryOffset + 2, le);
			const count = view.getUint32(entryOffset + 4, le);

			// Value or offset — if total bytes fit in 4 bytes, value is inline
			const totalBytes = (TYPE_SIZES[type] ?? 1) * count;
			const valueOffset = totalBytes <= 4
				? entryOffset + 8
				: view.getUint32(entryOffset + 8, le);

			tags[tagId] = { type, count, valueOffset };

			// Build debug log of all tags
			const tagName = TAG_NAMES[tagId] ?? `0x${tagId.toString(16).padStart(4, '0')}`;
			try {
				allTags[tagName] = readTagValue(view, le, type, count, valueOffset, headerBuf.byteLength);
			} catch {
				allTags[tagName] = `<unreadable: type=${type}, count=${count}>`;
			}
		}

		console.log('[tifMetadata] all TIFF tags:', allTags);

		// BitsPerSample
		if (tags[TAG_BITS_PER_SAMPLE]) {
			const val = readShort(view, le, tags[TAG_BITS_PER_SAMPLE]);
			if (val != null) {
				result.bitsPerSample = val;
				result.isBinary = val === 1;
			}
		}

		// SamplesPerPixel
		if (tags[TAG_SAMPLES_PER_PIXEL]) {
			const val = readShort(view, le, tags[TAG_SAMPLES_PER_PIXEL]);
			if (val != null) result.channels = val;
		}

		// XResolution (RATIONAL = numerator/denominator)
		if (tags[TAG_X_RESOLUTION]) {
			const val = readRational(view, le, tags[TAG_X_RESOLUTION], headerBuf.byteLength);
			if (val != null && val > 0) result.dx = 1.0 / val;
		}

		// YResolution
		if (tags[TAG_Y_RESOLUTION]) {
			const val = readRational(view, le, tags[TAG_Y_RESOLUTION], headerBuf.byteLength);
			if (val != null && val > 0) result.dy = 1.0 / val;
		}

		// ImageDescription — parse for ImageJ/OME metadata
		if (tags[TAG_IMAGE_DESCRIPTION]) {
			const desc = readAscii(view, tags[TAG_IMAGE_DESCRIPTION], headerBuf.byteLength, file);
			if (desc) {
				console.log('[tifMetadata] ImageDescription:', desc.substring(0, 500));
				parseImageDescription(desc, result);
			}
		}

		console.log('[tifMetadata] result:', result);
	} catch (err) {
		console.warn('[tifMetadata] Failed to extract TIFF metadata:', err);
	}

	return result;
}

// ── Tag value readers ──

function readShort(
	view: DataView, le: boolean,
	tag: { type: number; count: number; valueOffset: number },
): number | null {
	if (tag.valueOffset + 2 > view.byteLength) return null;
	return view.getUint16(tag.valueOffset, le);
}

function readRational(
	view: DataView, le: boolean,
	tag: { type: number; count: number; valueOffset: number },
	bufLen: number,
): number | null {
	if (tag.valueOffset + 8 > bufLen) return null;
	const num = view.getUint32(tag.valueOffset, le);
	const den = view.getUint32(tag.valueOffset + 4, le);
	return den === 0 ? null : num / den;
}

function readAscii(
	view: DataView,
	tag: { type: number; count: number; valueOffset: number },
	bufLen: number,
	file: File,
): string | null {
	const len = tag.count;
	if (tag.valueOffset + len <= bufLen) {
		const bytes = new Uint8Array(view.buffer, tag.valueOffset, len);
		return new TextDecoder().decode(bytes).replace(/\0+$/, '');
	}
	// ImageDescription may be beyond our 64KB header read — skip for now
	return null;
}

function readTagValue(
	view: DataView, le: boolean,
	type: number, count: number, valueOffset: number,
	bufLen: number,
): any {
	if (valueOffset >= bufLen) return '<offset beyond header>';
	switch (type) {
		case 1: // BYTE
			return count === 1 ? view.getUint8(valueOffset) : `<${count} bytes>`;
		case 2: { // ASCII
			const end = Math.min(valueOffset + count, bufLen);
			const bytes = new Uint8Array(view.buffer, valueOffset, end - valueOffset);
			const s = new TextDecoder().decode(bytes).replace(/\0+$/, '');
			return s.length > 100 ? s.substring(0, 100) + '...' : s;
		}
		case 3: // SHORT
			if (count === 1) return view.getUint16(valueOffset, le);
			if (count <= 2) return Array.from({ length: count }, (_, i) => view.getUint16(valueOffset + i * 2, le));
			return `<${count} shorts>`;
		case 4: // LONG
			return count === 1 ? view.getUint32(valueOffset, le) : `<${count} longs>`;
		case 5: { // RATIONAL
			if (valueOffset + 8 > bufLen) return '<beyond header>';
			const n = view.getUint32(valueOffset, le);
			const d = view.getUint32(valueOffset + 4, le);
			return d === 0 ? 'NaN' : `${n}/${d} (${(n / d).toFixed(4)})`;
		}
		default:
			return `<type=${type}, count=${count}>`;
	}
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
