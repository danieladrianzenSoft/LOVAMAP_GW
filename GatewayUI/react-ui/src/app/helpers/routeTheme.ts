/**
 * Routes that use a white background (page + top navigation).
 * All other routes default to the warm secondary theme (bg-secondary-50).
 *
 * - Exact + prefix match: the route itself AND any sub-paths get white bg.
 * - Sub-path only: only child routes get white bg (index stays warm).
 */
const WHITE_BG_ROUTES = ['/visualize', '/test-visualization'];
const WHITE_BG_SUBPATHS_ONLY = ['/tutorials', '/documentation'];

export const isWhiteBackgroundRoute = (pathname: string): boolean => {
	if (pathname === '/') return true;
	if (WHITE_BG_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/')))
		return true;
	if (WHITE_BG_SUBPATHS_ONLY.some((r) => pathname.startsWith(r + '/') && pathname !== r))
		return true;
	return false;
};
