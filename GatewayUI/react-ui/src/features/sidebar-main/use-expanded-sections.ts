import { useState, useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { NAV_CATEGORIES } from './sidebar-nav-config';

/** Finds which category key owns the current route. */
function findActiveCategory(pathname: string): string | null {
	for (const cat of NAV_CATEGORIES) {
		for (const item of cat.items) {
			if (matchPath(item.to + '/*', pathname) || matchPath(item.to, pathname)) {
				return cat.key;
			}
			if (item.matchPaths) {
				for (const mp of item.matchPaths) {
					if (matchPath(mp, pathname)) return cat.key;
				}
			}
		}
	}
	return null;
}

export function useExpandedSections() {
	const location = useLocation();
	const [expanded, setExpanded] = useState<Set<string>>(new Set());

	// Auto-expand the section containing the active route
	useEffect(() => {
		const activeKey = findActiveCategory(location.pathname);
		if (activeKey && !expanded.has(activeKey)) {
			setExpanded((prev) => new Set(prev).add(activeKey));
		}
	}, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

	const toggle = (key: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	return { expanded, toggle };
}
