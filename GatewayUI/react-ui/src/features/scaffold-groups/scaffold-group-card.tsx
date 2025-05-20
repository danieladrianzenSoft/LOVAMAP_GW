import React from 'react';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import { FaCaretDown } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import { HistogramPlot } from '../plotting/histogram-plot';
// import { ImageCategory } from '../../app/models/image';

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
        <div className={`flex flex-col h-full cursor-pointer bg-white rounded-lg p-4 m-2 border-gray-100 border-2 hover:shadow-md text-gray-700 ${isVisible ? 'shadow-md' :''}`} onClick={toggleDetails}>
            <div className="w-full">
                {/* Name and Caret Icon Row */}
                <div className="flex items-center">
                    <p className="mr-3">{scaffoldGroup.name}</p>
                    <div className={`transition-transform duration-300 transform ml-auto ${isVisible ? 'rotate-0' : 'rotate-[-90deg]'}`}>
                        <FaCaretDown />
                    </div>
                </div>

                {/* Images Section */}
                {(() => {
                    const firstImage = scaffoldGroup.images.find(img => img.category === "Particles");
                    const hasImage = Boolean(firstImage);

                    if (hasImage) {
                        return (
                            <div className="mt-4 flex flex-wrap justify-center gap-4 items-stretch">
                                {/* Image block */}
                                <div className="flex-1 min-w-[180px] max-w-full flex flex-col items-center">
                                    <img
                                        src={firstImage!.url}
                                        alt={firstImage!.category}
                                        className="w-full h-48 object-cover mb-2 rounded"
                                    />
                                    <p className="text-sm text-gray-600">{firstImage!.category}</p>
                                </div>

                                {/* Histogram block */}
                                <div className="flex-1 min-w-[180px] max-w-full flex flex-col items-center">
                                    <div className="w-full h-52 mb-2 pb-0">
                                        <HistogramPlot
                                            data={scaffoldGroup.inputs.sizeDistribution}
                                            labelFontSize={13}
                                            hideYLabels={true}
                                            showHoverInfo={false}
                                        />
                                    </div>
                                    <p className="text-sm text-gray-600 -mt-4 z-10">Particle Size (μm)</p>
                                </div>
                            </div>
                        );
                    } else {
                        // No image → full-width histogram
                        return (
                            <div className="flex flex-col items-center">
                                <div className="w-full h-52 mb-2 pb-0">
                                    <HistogramPlot
                                        data={scaffoldGroup.inputs.sizeDistribution}
                                        hideYLabels={true}
                                        showHoverInfo={false}
                                    />
                                </div>
                                <p className="text-sm text-gray-600 -mt-4 z-10">Particle Size</p>
                            </div>
                        );
                    }
                })()}
            </div>
            <div className="mt-auto pt-4 flex justify-end">
                {isSelectable && onSelect && (
                    <button
                        className={`button-outline border-none shadow-custom ${isSelected ? 'bg-red-50 hover:bg-red-100' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect();
                        }}
                    >
                        {isSelected ? 'Remove' : 'Add'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default observer(ScaffoldGroupCard);