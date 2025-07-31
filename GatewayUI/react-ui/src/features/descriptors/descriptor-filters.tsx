import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
// import { GroupedTags, Tag, displayNameMap } from "../../app/models/tag";
import MultiSelectDropdown from "../../app/common/form/multiselect-dropdown";
import { DescriptorType, GroupedDescriptorTypes, displayNameMap } from "../../app/models/descriptorType";
import { useDescriptorTypes } from "../../app/common/hooks/useDescriptorTypes";
import DescriptorTypeInfo from "./descriptor-type-info";

interface DescriptorFiltersProps {
	onSelect: (descriptorType: DescriptorType) => void;
	selectedDescriptorTypes: DescriptorType[];
	categories?: string[];
}

const DescriptorFilters: React.FC<DescriptorFiltersProps> = ({onSelect, selectedDescriptorTypes, categories}) => {
	const { descriptorTypes } = useDescriptorTypes(); // Use the hook
	const [groupedDescriptorTypes, setGroupedDescriptorTypes] = useState<GroupedDescriptorTypes>({});

	useEffect(() => {
        if (descriptorTypes.length > 0) {
			const filtered = categories
				? descriptorTypes.filter(d => categories.includes(d.category))
				: descriptorTypes;

            const groups = filtered.reduce<GroupedDescriptorTypes>((acc, descriptorType) => {
                const groupKey = descriptorType.category;
                if (displayNameMap[groupKey]) {
                    acc[groupKey] = acc[groupKey] || [];
                    acc[groupKey].push(descriptorType);
                }
                return acc;
            }, {});
            setGroupedDescriptorTypes(groups);
        }
    }, [categories, descriptorTypes]);

	const handleSelectDescriptorType = (groupKey: string, descriptorType: DescriptorType) => {
        onSelect(descriptorType);
    };

	return (
        <div className="container mx-auto">
			<>
				<div className="container mx-auto">
					{/* <div className="flex items-center text-left cursor-pointer hover:underline" onClick={() => setFiltersVisible(!filtersVisible)}>
						<p className="mr-1 ml-5 text-gray-700">Filters</p>
						<div className={`transition-transform duration-300 transform ${filtersVisible ? 'rotate-0' : 'rotate-[-90deg]'}`}>
							<FaCaretDown />
						</div>
					</div>
					{filtersVisible && ( */}
						<div className="flex flex-wrap text-center"> 
							{Object.entries(groupedDescriptorTypes).map(([key, descriptorTypes]) => (
								<div key={key} className="w-full sm:w-1/2 md:w-1/3 p-2">
									<MultiSelectDropdown
										groupName={displayNameMap[key] || key}
										items={descriptorTypes}
										selectedItemIds={selectedDescriptorTypes.map(descriptorType => descriptorType.id)}
										renderItem={(descriptorType) => (
											<DescriptorTypeInfo
												label={descriptorType.label}
												tableLabel={descriptorType.tableLabel}
												imageUrl={descriptorType.imageUrl}
												description={descriptorType.description}
											/>
										)}
										onItemSelect={(descriptorType) => handleSelectDescriptorType(key, descriptorType)}
									/>
								</div>
							))}
						</div>
					{/* )} */}
				</div>
			</>    
        </div>
    );
}

export default observer(DescriptorFilters)