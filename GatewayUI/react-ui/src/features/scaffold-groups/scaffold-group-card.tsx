import React from 'react';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import { FaCaretDown } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';

interface ScaffoldGroupCardProps {
    scaffoldGroup: ScaffoldGroup;
	isVisible: boolean;
    isSelectable?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
    toggleDetails: () => void;
    
}
const ScaffoldGroupCard: React.FC<ScaffoldGroupCardProps> = ({ scaffoldGroup, isVisible, isSelectable=false, isSelected=false, toggleDetails, onSelect }) => {
    return (
        <div className={`cursor-pointer bg-white rounded-lg p-4 m-2 border-gray-100 border-2 hover:bg-gray-50 text-gray-700 ${isVisible ? 'shadow-md' :''}`} onClick={toggleDetails}>
            <div className="flex items-center">
                <p className="mr-3">{scaffoldGroup.name}</p>
                <div className={`transition-transform duration-300 transform ml-auto ${isVisible ? 'rotate-0' : 'rotate-[-90deg]'}`}>
                    <FaCaretDown />
                </div>
            </div>
            <div className="flex justify-end mt-2">
                {isSelectable && onSelect && (
                    <button className={`button-outline border-none shadow-custom ${isSelected ? 'bg-red-50 hover:bg-red-100' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect();
                    }}>
                        {isSelected ? 'Remove' : 'Add'}
                    </button>
                )}
            </div>
            {/* You can add icons or other interactive elements here */}
        </div>
    );
};

export default observer(ScaffoldGroupCard);