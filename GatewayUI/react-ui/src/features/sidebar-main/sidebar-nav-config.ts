export interface NavItem {
	label: string;
	to: string;
	/** Additional paths that should mark this item as active */
	matchPaths?: string[];
}

export interface NavCategory {
	key: string;
	label: string;
	items: NavItem[];
	/** Only show this category for users with this role */
	requireRole?: string;
}

export const NAV_CATEGORIES: NavCategory[] = [
	{
		key: 'analyze',
		label: 'Analyze',
		items: [
			{ label: 'Run LOVAMAP', to: '/run', matchPaths: ['/jobs/*', '/segment'] },
			{ label: 'Calculate', to: '/descriptor-calculator' },
		],
	},
	{
		key: 'explore',
		label: 'Explore',
		items: [
			{ label: 'Interact', to: '/visualize' },
			{ label: 'Explore Scaffolds', to: '/explore' },
			{ label: 'Explore Data', to: '/data' },
			{ label: 'Download Data', to: '/experiments' },
		],
	},
	{
		key: 'learn',
		label: 'Learn',
		items: [
			{ label: 'Learn', to: '/learn', matchPaths: ['/learn/*'] },
			{ label: 'Documentation', to: '/documentation' },
			{ label: 'Publications', to: '/publications' },
		],
	},
	{
		key: 'admin',
		label: 'Admin',
		requireRole: 'administrator',
		items: [
			{ label: 'Dashboard', to: '/dashboard' },
			{ label: 'Content', to: '/admin/content', matchPaths: ['/admin/content/*'] },
			{ label: 'Utilities', to: '/admin' },
		],
	},
];
