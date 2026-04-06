import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
// import { GroupedTags, Tag, displayNameMap } from "../../app/models/tag";
import MultiSelectDropdown from "../../app/common/form/multiselect-dropdown";
import { DescriptorType, GroupedDescriptorTypes, displayNameMap } from "../../app/models/descriptorType";
import { useDescriptorTypes } from "../../app/common/hooks/useDescriptorTypes";
import DescriptorTypeInfo from "./descriptor-type-info";

interface DescriptorFiltersProps {
	onSelect: (descriptorType: DescriptorType) => void;
	onBulkSelect?: (descriptorTypes: DescriptorType[], select: boolean) => void;
	selectedDescriptorTypes: DescriptorType[];
	categories?: string[];
}

const DescriptorFilters: React.FC<DescriptorFiltersProps> = ({onSelect, onBulkSelect, selectedDescriptorTypes, categories}) => {
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
						<div className="flex flex-wrap text-center">
							{Object.entries(groupedDescriptorTypes).map(([key, descriptorTypes]) => {
								const selectedIds = selectedDescriptorTypes.map(d => d.id);
								const allSelected = descriptorTypes.every(d => selectedIds.includes(d.id));

								const groupHeading = (
									<span className="flex items-baseline gap-2">
										{displayNameMap[key] || key}
										{onBulkSelect && (
											<span
												onClick={(e) => { e.stopPropagation(); onBulkSelect(descriptorTypes, !allSelected); }}
												className="button-link"
											>
												({allSelected ? "deselect all" : "select all"})
											</span>
										)}
									</span>
								);

								return (
									<div key={key} className="w-full sm:w-1/2 md:w-1/3 p-2">
										<MultiSelectDropdown
											groupName={groupHeading}
											items={descriptorTypes}
											selectedItemIds={selectedIds}
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
								);
							})}
						</div>
				</div>
			</>
        </div>
    );
}

export default observer(DescriptorFilters)