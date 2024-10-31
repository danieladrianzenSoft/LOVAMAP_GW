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
        <div className={`cursor-pointer bg-white rounded-lg p-4 m-2 border-gray-100 border-2 hover:shadow-md text-gray-700 ${isVisible ? 'shadow-md' :''}`} onClick={toggleDetails}>
            <div className="w-full">
                {/* Name and Caret Icon Row */}
                <div className="flex items-center">
                    <p className="mr-3">{scaffoldGroup.name}</p>
                    <div className={`transition-transform duration-300 transform ml-auto ${isVisible ? 'rotate-0' : 'rotate-[-90deg]'}`}>
                        <FaCaretDown />
                    </div>
                </div>

                {/* Images Section */}
                {scaffoldGroup.images.some((image) => image.category === 'InteriorPores' || image.category === 'ParticleSizeDistribution') ? (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        {scaffoldGroup.images
                            .filter((image) => image.category === 'InteriorPores' || image.category === 'ParticleSizeDistribution')
                            .sort((a, b) => {
                                // Sort to ensure 'InteriorPores' comes first
                                const categoryOrder: { [key: string]: number } = { InteriorPores: 0, ParticleSizeDistribution: 1 };
                                return categoryOrder[a.category] - categoryOrder[b.category];
                            })
                            .map((image, index) => (
                                <div key={index} className="flex flex-col items-center">
                                    <img 
                                        src={image.url} 
                                        alt={image.category} 
                                        className="w-full h-48 object-cover mb-2"
                                    />
                                    <p className="text-sm text-gray-600">{image.category}</p>
                                </div>
                            ))
                        }
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-gray-500 italic">No images available</p>
                )}
                {/* {scaffoldGroup.images
                    .filter((image) => image.category === 'ExteriorPores')
                    .length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-4">
                        {scaffoldGroup.images
                            .filter((image) => image.category === 'ExteriorPores')
                            .map((image, index) => (
                                <div key={index} className="flex flex-col items-center">
                                    <img 
                                        src={image.url} 
                                        alt={image.category} 
                                        className="w-full h-auto max-h-48 object-contain mb-2"
                                    />
                                    <p className="text-sm text-gray-600">{image.category}</p>
                                </div>
                            ))
                        }
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-gray-500 italic">No images available</p>
                )} */}
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