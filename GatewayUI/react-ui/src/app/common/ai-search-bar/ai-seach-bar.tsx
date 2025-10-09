import React, { useEffect, useRef, useState } from 'react';

interface AISearchBarProps {
	onSearch: (prompt: string) => void;
	onClear?: () => void;
	onClick?: () => void;
	placeholder?: string;
	buttonLabel?: string;
}

const AISearchBar: React.FC<AISearchBarProps> = ({
	onSearch,
	onClear,
	onClick,
	placeholder = "Describe the scaffold groups you want to find, e.g., monodisperse soft spheres that are 100 µm in diameter",	
	buttonLabel = "Search"
}) => {
	const [input, setInput] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

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

	return (
		<div className="flex items-center space-x-2 w-full mt-4">
			<textarea
				ref={textareaRef}
				value={input}
				onClick={onClick}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				rows={1}
				className="flex-grow resize-none px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
			/>
			{/* <button
				onClick={handleSearch}
				className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
			>
				{buttonLabel}
			</button> */}
		</div>
	);
};

export default AISearchBar;