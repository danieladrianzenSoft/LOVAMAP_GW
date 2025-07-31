export interface PoreDescriptorUIConfig {
	key: string;
	showInExplore?: boolean;
	showInDetails?: boolean;
	section?: string;
}

export const PORE_DESCRIPTOR_MAP: PoreDescriptorUIConfig[] = [
	{ key: 'Volume', showInExplore: true, showInDetails: true },
	{ key: 'SA', showInExplore: true, showInDetails: true },
	{ key: 'LongestLength', showInExplore: true, showInDetails: true },
	{ key: 'AspectRatio', showInExplore: true, showInDetails: true },
	// { key: 'NumSurroundingPores', showInExplore: false, showInDetails: true, section: 'Interior Pore Shape' },
	{ key: 'LargestDoorDiam', showInExplore: true, showInDetails: false },
	{ key: 'SmallestDoorDiam', showInExplore: true, showInDetails: false },
];