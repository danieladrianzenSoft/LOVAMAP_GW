import React, { useState, useRef, useEffect, useMemo } from "react";
import { FaCaretDown } from "react-icons/fa";
import { DescriptorType } from "../../app/models/descriptorType";

interface DescriptorSelectorProps {
  descriptorTypes: DescriptorType[]; // all available types
  selectedDescriptorTypes: DescriptorType[]; // currently selected
  onChange: (updated: DescriptorType[]) => void;
}

export const DescriptorSelector: React.FC<DescriptorSelectorProps> = ({
  descriptorTypes,
  selectedDescriptorTypes,
  onChange
}) => {
	const [dropdownVisible, setDropdownVisible] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const groupedBySubcategory = useMemo(() => {
		return descriptorTypes.reduce((acc, d) => {
			const key = d.subCategory || d.category || "Other";
			if (!acc[key]) acc[key] = [];
			acc[key].push(d);
			return acc;
		}, {} as Record<string, DescriptorType[]>);
	}, [descriptorTypes]);

	// Build grouped map based on PORE_DESCRIPTOR_MAP
	// const sectionedDescriptors = React.useMemo(() => {
	// 	const mapByName = new Map(descriptorTypes.map(d => [d.name, d]));

	// 	return PORE_DESCRIPTOR_MAP.filter(cfg => cfg.showInExplore).reduce((acc, cfg) => {
	// 		const section = cfg.section || "Other";
	// 		const fullDescriptor = mapByName.get(cfg.key);
	// 		if (!fullDescriptor) return acc;

	// 		if (!acc[section]) acc[section] = [];
	// 			acc[section].push(fullDescriptor);
	// 		return acc;
	// 	}, {} as Record<string, DescriptorType[]>);
	// }, [descriptorTypes]);

	const handleToggle = (descriptor: DescriptorType) => {
		const exists = selectedDescriptorTypes.some(d => d.id === descriptor.id);
		if (exists) {
		onChange(selectedDescriptorTypes.filter(d => d.id !== descriptor.id));
		} else {
		onChange([...selectedDescriptorTypes, descriptor]);
		}
	};

	// Close dropdown on outside click
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
		if (
			containerRef.current &&
			!containerRef.current.contains(event.target as Node)
		) {
			setDropdownVisible(false);
		}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<div className="relative mb-6 w-full" ref={containerRef}>
			{/* Toggle Button */}
			<div
				className="flex items-center text-left cursor-pointer hover:underline"
				onClick={() => setDropdownVisible(prev => !prev)}
			>
				<p className="text-gray-700 font-semibold mr-1">Selected Pore Descriptors</p>
				<FaCaretDown className={`transition-transform duration-300 ${dropdownVisible ? 'rotate-0' : '-rotate-90'}`} />
			</div>

			{/* Dropdown Panel */}
			{dropdownVisible && (
				<div className="absolute mt-2 left-0 w-full bg-white border-b border-gray-300 rounded shadow-md z-50 p-4 max-h-[400px] overflow-y-auto">
				{Object.entries(groupedBySubcategory).map(([section, descriptors]) => (
					<div key={section} className="mb-4">
					<h4 className="text-sm font-semibold text-gray-600 mb-2">{section}</h4>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{descriptors.map(descriptor => {
						const checked = selectedDescriptorTypes.some(d => d.id === descriptor.id);
						return (
							<label key={descriptor.id} className="flex items-center space-x-2 cursor-pointer">
							<input
								type="checkbox"
								checked={checked}
								onChange={() => handleToggle(descriptor)}
								className="accent-blue-600"
							/>
							<span className="text-sm text-gray-700">{descriptor.label || descriptor.name}</span>
							</label>
						);
						})}
					</div>
					</div>
				))}
				</div>
			)}
		</div>
	);
};