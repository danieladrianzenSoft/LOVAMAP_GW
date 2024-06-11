import React from 'react';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import { FaCaretDown } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';

interface ScaffoldGroupCardProps {
    scaffoldGroup: ScaffoldGroup;
	isVisible: boolean;
    toggleDetails: () => void;
}
const ScaffoldGroupCard: React.FC<ScaffoldGroupCardProps> = ({ scaffoldGroup, isVisible, toggleDetails }) => {
    return (
        <div className={`flex items-center cursor-pointer bg-white rounded-lg p-4 m-2 border-gray-100 border-2 hover:bg-gray-50 text-gray-700 ${isVisible ? 'shadow-md' :''}`} onClick={toggleDetails}>
            <p className="mr-3">{scaffoldGroup.name}</p>
			<div className={`transition-transform duration-300 transform ml-auto ${isVisible ? 'rotate-0' : 'rotate-[-90deg]'}`}>
				<FaCaretDown />
			</div>
            {/* You can add icons or other interactive elements here */}
        </div>
    );
};

export default observer(ScaffoldGroupCard);