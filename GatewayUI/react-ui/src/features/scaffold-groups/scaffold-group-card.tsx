import React, { useRef } from 'react';
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
    columns?: number;
}
const ScaffoldGroupCard: React.FC<ScaffoldGroupCardProps> = ({ scaffoldGroup, isVisible, isSelectable=false, isSelected=false, toggleDetails, onSelect, columns }) => {
    const initialScale = 1.5;
    const imageBlockRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // useEffect(() => {
    //     const container = imageBlockRef.current;
    //     const img = imageRef.current;
    //     if (!container || !img) return;

    //     // Linearly interpolate scale from 1.3 @170px wide to 1.5 @200px wide, clamped.
    //     const ro = new ResizeObserver((entries) => {
    //         const width = entries[0].contentRect.width;
    //         const scale = Math.min(1.5, Math.max(1.3, 1.3 + (width - 170) * (0.3 / 30)));
    //         img.style.transform = `scale(${scale})`;
    //     });
    //     ro.observe(container);
    //     return () => ro.disconnect();
    // }, []);

    return (
        <div className={`relative flex flex-col h-full cursor-pointer bg-white p-3 pb-0 text-gray-700 overflow-hidden
            transition-all duration-100 ease-out
            ${isSelected ? 'ring-4 ring-secondary-300' : ''}
            ${isVisible ? 'rounded-t-2xl shadow-md' : 'rounded-2xl hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]'}`}
            onClick={isSelectable && onSelect ? onSelect : toggleDetails}
            aria-expanded={isVisible}
        >
            {/* Optional overlay to make it visually grayer and slightly disabled */}
            {isVisible && (
                <div
                aria-hidden="true"
                className="absolute inset-0 rounded-lg bg-white/60 z-0 transition-opacity duration-200 pointer-events-none"
                />
            )}

            {/* Name and Caret Icon Row */}
            <div className="flex items-start min-h-[2rem] relative z-10">
                <p className="mr-3 line-clamp-2 leading-tight">{scaffoldGroup.name}</p>
                {!isSelectable && (
                    <div className={`transition-transform duration-300 transform ml-auto shrink-0 ${isVisible ? 'rotate-0' : 'rotate-[-90deg]'}`}>
                        <FaCaretDown />
                    </div>
                )}
            </div>

            {/* Images Section - flex-grows to fill remaining card height */}
            {(() => {
                const firstImage = scaffoldGroup.images.find(img => img.category === "Particles");
                const hasImage = Boolean(firstImage);

                if (hasImage) {
                    return (
                        <div className="flex-1 -mx-3 -mt-1 flex items-stretch min-h-[200px]">
                            {/* Image block - right edge anchored so image only bleeds left/top/bottom; card's overflow-hidden clips the bleed at its rounded edges */}
                            <div ref={imageBlockRef} className="flex-[5] min-w-0 overflow-hidden">
                                <img
                                    ref={imageRef}
                                    src={firstImage!.url}
                                    alt={firstImage!.category}
                                    className="block w-full h-full object-cover"
                                    style={{ transform: `scale(${initialScale})`, transformOrigin: '90% 35%' }}
                                />
                            </div>

                            {/* Histogram block - symmetric horizontal padding so gap(image→plot) == gap(plot→card-edge) */}
                            <div className="flex-[4] min-w-[100px] flex flex-col items-center justify-center px-3 pb-3">
                                <div className="w-full h-40">
                                    <HistogramPlot
                                        data={scaffoldGroup.inputs.sizeDistribution}
                                        labelFontSize={13}
                                        hideYLabels={true}
                                        showHoverInfo={false}
                                    />
                                </div>
                                <p className="text-sm text-gray-600 -mt-4 z-10 text-center">Particle Size (μm) Distribution</p>
                            </div>
                        </div>
                    );
                } else {
                    // No image → full-width histogram
                    return (
                        <div className="flex-1 flex flex-col items-center justify-center pb-3">
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
            {isSelectable && (
                <div className="mt-auto pt-1 pb-3 pr-1 flex justify-end z-10 relative bg-white">
                    <button
                        className="button-link"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleDetails();
                        }}
                    >
                        Details
                    </button>
                </div>
            )}
        </div>
    );
};

export default observer(ScaffoldGroupCard);