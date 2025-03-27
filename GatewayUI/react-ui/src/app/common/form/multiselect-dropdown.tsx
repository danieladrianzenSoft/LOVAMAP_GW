import React from "react";
import { observer } from "mobx-react";

interface MultiSelectDropdownProps<T> {
    groupName: string;
    items: T[];
    selectedItemIds: number[];  // Assuming the unique identifier is always a number for simplicity
    renderItem: (item: T) => React.ReactNode; // Function to render the display text for each item
    onItemSelect: (item: T) => void;
}

const MultiSelectDropdown = <T extends { id: number }>({
    groupName,
    items,
    selectedItemIds,
    renderItem,
    onItemSelect,
}: MultiSelectDropdownProps<T>) => {
    return (
        <div className="text-center">
            <h3 className="text-gray-700 font-bold mb-3">{groupName}</h3>
            <ul className="text-left inline-block mx-auto text-gray-700">
                {items.map(item => (
                    <li key={item.id} onClick={() => onItemSelect(item)} 
                        className={selectedItemIds.includes(item.id) ? "underline cursor-pointer mb-1" : "cursor-pointer hover:underline mb-1"}>
                        {renderItem(item)}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default observer(MultiSelectDropdown);