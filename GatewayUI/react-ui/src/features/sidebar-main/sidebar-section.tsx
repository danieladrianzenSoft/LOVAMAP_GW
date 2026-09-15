import React from 'react';
import { NavLink, useLocation, matchPath } from 'react-router-dom';
import { FiChevronDown } from 'react-icons/fi';
import { NavCategory } from './sidebar-nav-config';

interface SidebarSectionProps {
	category: NavCategory;
	isExpanded: boolean;
	onToggle: () => void;
	onNavigate: () => void;
}

function isItemActive(itemTo: string, matchPaths: string[] | undefined, pathname: string): boolean {
	// Exact match on the item's own path
	if (matchPath({ path: itemTo, end: true }, pathname)) return true;
	// Only match sub-paths if explicitly declared in matchPaths
	if (matchPaths) {
		for (const mp of matchPaths) {
			if (matchPath(mp, pathname)) return true;
		}
	}
	return false;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ category, isExpanded, onToggle, onNavigate }) => {
	const location = useLocation();

	// Check if any item in this category is active
	const hasActiveItem = category.items.some((item) =>
		isItemActive(item.to, item.matchPaths, location.pathname)
	);

	return (
		<div>
			<button
				onClick={onToggle}
				className="sidebar-category-header"
			>
				<span className={hasActiveItem ? 'font-bold' : ''}>{category.label}</span>
				<FiChevronDown
					className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
						isExpanded ? '' : '-rotate-90'
					}`}
				/>
			</button>

			<div
				className={`overflow-hidden transition-all duration-200 ${
					isExpanded ? 'max-h-96' : 'max-h-0'
				}`}
			>
				{category.items.map((item) => {
					const active = isItemActive(item.to, item.matchPaths, location.pathname);
					return (
						<NavLink
							key={item.to}
							to={item.to}
							onClick={onNavigate}
							className={active ? 'sidebar-tab-sub-selected' : 'sidebar-tab-sub'}
						>
							{item.label}
						</NavLink>
					);
				})}
			</div>
		</div>
	);
};

export default SidebarSection;
