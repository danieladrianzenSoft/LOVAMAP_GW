import React from 'react';
import { useStore } from '../../app/stores/store';
import UserDropdown from './user-dropdown';
import { observer } from 'mobx-react-lite';
import history from "../../app/helpers/History";
import { NavLink, useLocation, Link } from 'react-router-dom';
import logo from '../../../src/LOVAMAP_logo.png';
import { isWhiteBackgroundRoute } from '../../app/helpers/routeTheme';
import { FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';

const ROUTE_LABELS: Record<string, string> = {
	'': 'Home',
	visualize: 'Interact',
	'test-visualization': 'Test Visualization',
	learn: 'Learn',
	descriptors: 'Descriptors',
	'scaffold-generation': 'Scaffold Generation',
	'getting-started': 'Getting Started',
	'compare-2d-3d': 'Compare 2D vs. 3D',
	documentation: 'Documentation',
	explore: 'Explore',
	data: 'Data',
	'descriptor-calculator': 'Descriptor Calculator',
	publications: 'Publications',
	experiments: 'Experiments',
	'my-scaffolds': 'My Scaffolds',
	run: 'Run',
	jobs: 'Jobs',
	new: 'New',
	lovamap: 'LOVAMAP',
	segmentation: 'Particle Segmentation',
	mesh: 'Mesh Generation',
	screenshots: 'Screenshots',
	admin: 'Admin',
	'bulk-upload': 'Bulk Upload',
	dashboard: 'Dashboard',
	content: 'Content',
	'rdf-explorer': 'RDF Explorer',
	settings: 'Settings',
};

const formatSegment = (segment: string): string => {
	if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
	// Fallback: decode URI and title-case dashes/underscores
	try {
		return decodeURIComponent(segment)
			.replace(/[-_]/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
	} catch {
		return segment;
	}
};

const Breadcrumbs: React.FC<{ pathname: string }> = ({ pathname }) => {
	const segments = pathname.split('/').filter(Boolean);

	// Build crumbs: always start with Home, then each path segment
	const crumbs = [
		{ label: 'Home', to: '/' },
		...segments.map((seg, idx) => {
			let label = formatSegment(seg);
			// Contextual label: numeric id following /visualize -> "Scaffold <id>"
			const prev = segments[idx - 1];
			if (prev === 'visualize' && /^\d+$/.test(seg)) {
				label = `Scaffold ${seg}`;
			}
			return {
				label,
				to: '/' + segments.slice(0, idx + 1).join('/'),
			};
		}),
	];

	return (
		<nav aria-label="Breadcrumb" className="hidden md:flex items-center text-sm absolute left-1/2 -translate-x-1/2">
			<ol className="flex items-center flex-wrap">
				{crumbs.map((crumb, idx) => {
					const isLast = idx === crumbs.length - 1;
					return (
						<li key={crumb.to} className="flex items-center">
							{isLast ? (
								<span className="font-bold text-gray-800">{crumb.label}</span>
							) : (
								<Link
									to={crumb.to}
									className="text-gray-600 underline hover:text-gray-800"
								>
									{crumb.label}
								</Link>
							)}
							{!isLast && (
								<span className="mx-2 text-gray-400" aria-hidden="true">
									&gt;
								</span>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
};

const TopNavigation: React.FC = () => {
	const {commonStore} = useStore();
	const isLoggedIn = commonStore.isLoggedIn;
	const location = useLocation();
	const bgClass = isWhiteBackgroundRoute(location.pathname)
		? 'bg-white'
		: 'bg-secondary-50';

	return (
		<div className={`top-navigation ${bgClass}`}>
			{/* Left side: Logo + hamburger */}
			{!commonStore.isSidebarOpen && (
				<div className="flex items-center space-x-4">
					{/* Hamburger only on mobile */}
					<button
						className="md:hidden focus:outline-none"
						onClick={() => commonStore.setSidebarOpen(!commonStore.isSidebarOpen)}
					>
					<svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
					</button>

					{/* Sidebar collapse toggle (desktop only) */}
					<button
						className="hidden md:flex focus:outline-none text-gray-400 hover:text-gray-600"
						onClick={() => commonStore.setSidebarCollapsed(!commonStore.isSidebarCollapsed)}
						aria-label={commonStore.isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
						title={commonStore.isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
					>
						{commonStore.isSidebarCollapsed ? (
							<FaAngleDoubleRight className="h-3.5 w-3.5" />
						) : (
							<FaAngleDoubleLeft className="h-3.5 w-3.5" />
						)}
					</button>

					{/* Logo (mobile only — desktop has it in the sidebar) */}
					<NavLink to="/" onClick={() => commonStore.setSidebarOpen(false)} className="md:hidden">
						<img className="mx-auto w-32 my-4" src={logo} alt="logo" />
					</NavLink>
				</div>
			)}
			{commonStore.isSidebarOpen && (
				<div></div>
			)}

			{/* Middle: Breadcrumbs */}
			<Breadcrumbs pathname={location.pathname} />

			{/* Right side: User/Login */}
			<div className="flex items-center space-x-4 mr-0">
				{isLoggedIn ? <UserCircle /> : (
				<button onClick={() => history.push('/login')} className='button-primary'>
					Login
				</button>
				)}
			</div>
		</div>
	)
}

const UserCircle: React.FC = () => {

	return (
		<>
			<UserDropdown/>
		</>
	)
}

export default observer(TopNavigation);
