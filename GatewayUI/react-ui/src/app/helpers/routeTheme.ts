/**
 * Routes that use a white background (page + top navigation).
 * All other routes default to the warm secondary theme (bg-secondary-50).
 *
 * Matches either an exact path or a path-prefix (e.g. "/visualize/:id").
 */
const WHITE_BG_ROUTES = ['/visualize', '/learn', '/test-visualization'];

export const isWhiteBackgroundRoute = (pathname: string): boolean => {
	if (pathname === '/') return true;
	return WHITE_BG_ROUTES.some(
		(r) => pathname === r || pathname.startsWith(r + '/')
	);
};
