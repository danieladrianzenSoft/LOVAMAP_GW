export interface PoreDescriptorUIConfig {
	key: string;
	showInExplore?: boolean;
	showInDetails?: boolean;
	section?: string;
}

export const PORE_DESCRIPTOR_MAP: PoreDescriptorUIConfig[] = [
	{ key: 'Volume', showInExplore: true, showInDetails: true, section: 'Interior Pore Size' },
	{ key: 'SA', showInExplore: true, showInDetails: true, section: 'Interior Pore Size' },
	{ key: 'LongestLength', showInExplore: true, showInDetails: true, section: 'Interior Pore Shape' },
	{ key: 'AspectRatio', showInExplore: true, showInDetails: true, section: 'Interior Pore Shape' },
	// { key: 'NumSurroundingPores', showInExplore: false, showInDetails: true, section: 'Interior Pore Shape' },
	// { key: 'AvgInternalDiam', showInExplore: true, showInDetails: false, section: 'Interior Pore Shape' },
];