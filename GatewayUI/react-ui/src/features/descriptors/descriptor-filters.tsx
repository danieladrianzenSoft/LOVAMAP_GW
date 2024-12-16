import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import { useStore } from "../../app/stores/store";
// import { GroupedTags, Tag, displayNameMap } from "../../app/models/tag";
import MultiSelectDropdown from "../../app/common/form/multiselect-dropdown";
import { DescriptorType, GroupedDescriptorTypes, displayNameMap } from "../../app/models/descriptorType";
import { useDescriptorTypes } from "../../app/common/hooks/useDescriptorTypes";

interface DescriptorFiltersProps {
	onSelect: (descriptorType: DescriptorType) => void;
	selectedDescriptorTypes: DescriptorType[];
}

const DescriptorFilters: React.FC<DescriptorFiltersProps> = ({onSelect, selectedDescriptorTypes}) => {
	const { descriptorTypes, loading, error } = useDescriptorTypes(); // Use the hook
	const [groupedDescriptorTypes, setGroupedDescriptorTypes] = useState<GroupedDescriptorTypes>({});

	useEffect(() => {
        if (descriptorTypes.length > 0) {
            const groups = descriptorTypes.reduce<GroupedDescriptorTypes>((acc, descriptorType) => {
                const groupKey = descriptorType.category;
                if (displayNameMap[groupKey]) {
                    acc[groupKey] = acc[groupKey] || [];
                    acc[groupKey].push(descriptorType);
                }
                return acc;
            }, {});
            setGroupedDescriptorTypes(groups);
        }
    }, [descriptorTypes]);

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
								<div key={key} className="w-1/3 p-2">
									<MultiSelectDropdown
										groupName={displayNameMap[key] || key}
										items={descriptorTypes}
										selectedItemIds={selectedDescriptorTypes.map(descriptorType => descriptorType.id)}
										renderItem={(descriptorType) => descriptorType.label}
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