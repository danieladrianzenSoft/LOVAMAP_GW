import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { FaCaretDown } from 'react-icons/fa';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { SEARCH_CATEGORIES, SearchCategory } from './search-categories';

interface AISearchBarProps {
	onSearch: (prompt: string) => void;
	onClear?: () => void;
	onClick?: () => void;
	placeholder?: string;
	buttonLabel?: string;
	category?: SearchCategory;
	onCategoryChange?: (c: SearchCategory, currentInput: string) => void;
	categories?: SearchCategory[];
}

const AISearchBar: React.FC<AISearchBarProps> = ({
	onSearch,
	onClear,
	onClick,
	placeholder = "What type of particle scaffold are you looking for?",
	buttonLabel = "Search",
	category,
	onCategoryChange,
	categories = SEARCH_CATEGORIES,
}) => {
	const [input, setInput] = useState("");
	const [popoverOpen, setPopoverOpen] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const popoverRef = useRef<HTMLDivElement>(null);

	const closePopover = useCallback(() => setPopoverOpen(false), []);
	useOnClickOutside(popoverRef, closePopover);

	const handleSearch = () => {
		const trimmed = input.trim();
		if (trimmed) {
			onSearch(trimmed);
		} else {
			onClear?.(); // call clear callback if provided
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault(); // prevent newline
			handleSearch();
		}
	};

	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
		}
	}, [input]);

	const showDropdown = category !== undefined && !!onCategoryChange;

	return (
		<div className="flex items-center space-x-2 w-full mt-4">
			<div className="flex-grow flex items-stretch border rounded-md shadow-sm bg-white">
				{showDropdown && (
					<div ref={popoverRef} className="relative flex items-stretch">
						<button
							type="button"
							onClick={() => setPopoverOpen(o => !o)}
							className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 bg-secondary-100 hover:bg-secondary-200 rounded-l-md whitespace-nowrap"
							aria-haspopup="listbox"
							aria-expanded={popoverOpen}
						>
							<span>{category!.label}</span>
							<FaCaretDown className="text-gray-500 text-xs" />
						</button>
						<div className="w-px bg-gray-200 self-stretch" />
						{popoverOpen && (
							<ul
								role="listbox"
								className="absolute left-0 top-full z-[60] mt-1 w-40 bg-white border rounded-md shadow-lg py-1 max-h-64 overflow-auto"
							>
								{categories.map(c => (
									<li key={c.key}>
										<button
											type="button"
											onClick={() => {
												onCategoryChange!(c, input);
												setPopoverOpen(false);
											}}
											className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${
												c.key === category!.key ? 'font-semibold text-link-100' : 'text-gray-700'
											}`}
										>
											{c.label}
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				)}
				<textarea
					ref={textareaRef}
					value={input}
					onClick={onClick}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					rows={1}
					className="flex-grow resize-none pl-4 py-2 bg-transparent border-0 focus:outline-none focus:ring-0"
				/>
				<button
					type="button"
					onClick={handleSearch}
					title={buttonLabel}
					aria-label={buttonLabel}
					className="px-3 py-2 text-gray-400 hover:text-gray-600 transition flex-shrink-0"
				>
					<FiSearch className="text-lg" />
				</button>
			</div>
		</div>
	);
};

export default AISearchBar;
