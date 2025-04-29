import React from "react";

interface Category {
	value: number;
	label: string;
}

interface CategorySelectorProps {
	name?: string;
	categories: Category[];
	selected: number[];
	onChange: (values: number[]) => void;
	multiSelect?: boolean;
  }

const CategorySelector: React.FC<CategorySelectorProps> = ({
	name = "category",
	categories,
	selected,
	onChange,
	multiSelect = false,
  }) => {
	const handleToggle = (value: number) => {
	  if (multiSelect) {
		const newValues = selected.includes(value)
		  ? selected.filter((v) => v !== value)
		  : [...selected, value];
		onChange(newValues);
	  } else {
		onChange([value]);
	  }
	};
  
	return (
		<div className="mb-4">
			<label className="block text-gray-700 font-semibold mb-2 capitalize">
			{name}
			</label>
			<div className="flex gap-2 flex-wrap">
				{categories.map((cat) => (
					<label key={cat.value} className="flex items-center space-x-2 cursor-pointer">
					<input
						type={multiSelect ? "checkbox" : "radio"}
						name={name}
						value={cat.value}
						checked={selected.includes(cat.value)}
						onChange={() => handleToggle(cat.value)}
						className="form-checkbox text-blue-600"
					/>
					<span className="text-sm text-gray-700">{cat.label}</span>
					</label>
				))}
			</div>
		</div>
	);
};
  
  export default CategorySelector;
  