export type SearchCategory =
	| { key: 'all'; label: 'All' }
	| { key: 'microscopy'; label: 'Microscopy'; isSimulated: false }
	| { key: 'simulated'; label: 'Simulated'; isSimulated: true }
	| { key: 'spheres' | 'ellipsoids' | 'nuggets' | 'rods'; label: string; shapeTagName: string };

export const SEARCH_CATEGORIES: SearchCategory[] = [
	{ key: 'all', label: 'All' },
	{ key: 'spheres', label: 'Spheres', shapeTagName: 'spheres' },
	{ key: 'ellipsoids', label: 'Ellipsoids', shapeTagName: 'ellipsoids' },
	{ key: 'nuggets', label: 'Nuggets', shapeTagName: 'nuggets' },
	{ key: 'rods', label: 'Rods', shapeTagName: 'rods' },
	{ key: 'simulated', label: 'Simulated', isSimulated: true },
	{ key: 'microscopy', label: 'Microscopy', isSimulated: false },
];

export const DEFAULT_CATEGORY: SearchCategory = SEARCH_CATEGORIES[0];

export interface CategoryPreFilter {
	isSimulated?: boolean;
	shapeTagName?: string;
}

export const categoryToPreFilter = (cat: SearchCategory): CategoryPreFilter => {
	if (cat.key === 'all') return {};
	if (cat.key === 'microscopy' || cat.key === 'simulated') {
		return { isSimulated: cat.isSimulated };
	}
	return { shapeTagName: cat.shapeTagName };
};
