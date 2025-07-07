export interface PoreDescriptorConfig {
	key: string;
	label: string;
	typeId: number;
	xlabel: string;
	section: 'Interior Pore Size' | 'Interior Pore Shape';
	showInExplore?: boolean;
	showInDetails?: boolean;
}

export const PORE_DESCRIPTOR_MAP: PoreDescriptorConfig[] = [
	{
		key: 'volume',
		label: 'Volume',
		typeId: 22,
		section: 'Interior Pore Size',
		xlabel: 'pL',
		showInExplore: true,
		showInDetails: true,
	},
	{
		key: 'surfaceArea',
		label: 'Surface Area',
		typeId: 23,
		section: 'Interior Pore Size',
		xlabel: 'μm²/1000',
		showInExplore: true,
		showInDetails: true,
	},
	{
		key: 'poreLongestLength',
		label: 'Longest Length',
		typeId: 25,
		section: 'Interior Pore Shape',
		xlabel: 'μm',
		showInExplore: true,
		showInDetails: true,
	},
	{
		key: 'poreAspectRatio',
		label: 'Aspect Ratio',
		typeId: 27,
		section: 'Interior Pore Shape',
		xlabel: '',
		showInExplore: true,
		showInDetails: true,
	},
];