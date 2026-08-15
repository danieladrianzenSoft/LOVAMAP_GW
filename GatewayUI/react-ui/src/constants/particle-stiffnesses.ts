export const PARTICLE_STIFFNESSES = [
	{ value: "", label: "-" }, // optional empty/default
	{ value: "rigid", label: "rigid (non-deformable)" },
	{ value: "stiff", label: "stiff (E > 1000 Pa)" },
	{ value: "semisoft", label: "semi-soft (E 200–1000 Pa)" },
	{ value: "soft", label: "soft (E < 200 Pa)" },
	{ value: "unknown", label: "unknown" },
];

export const STIFFNESS_E_RANGES: Record<string, { min?: number; max?: number }> = {
	stiff: { min: 1000 },
	semisoft: { min: 200, max: 1000 },
	soft: { max: 200 },
};

const STIFFNESS_ALIASES: Record<string, string> = {
	"semi-soft": "semisoft",
	"semi_soft": "semisoft",
};

export function normalizeStiffness(value: string): string {
	return STIFFNESS_ALIASES[value.toLowerCase()] ?? value;
}

export function getStiffnessLabel(value: string): string {
	const normalized = normalizeStiffness(value);
	const entry = PARTICLE_STIFFNESSES.find((s) => s.value === normalized);
	return entry?.label ?? value;
}

export function validateYoungsModulus(stiffness: string, value: number): string | null {
	const range = STIFFNESS_E_RANGES[stiffness];
	if (!range) return null;

	if (range.min != null && range.max != null) {
		if (value < range.min || value > range.max) {
			return `E must be between ${range.min} and ${range.max} Pa for ${getStiffnessLabel(stiffness)}`;
		}
	} else if (range.min != null) {
		if (value < range.min) {
			return `E must be greater than ${range.min} Pa for ${getStiffnessLabel(stiffness)}`;
		}
	} else if (range.max != null) {
		if (value >= range.max) {
			return `E must be less than ${range.max} Pa for ${getStiffnessLabel(stiffness)}`;
		}
	}

	return null;
}
