import React, { useState } from 'react';
import { PreviewInfo } from '../../app/models/job';

interface SegmentationComparisonViewProps {
  previewUrlMap: Record<string, string>;
  previewInfo: PreviewInfo;
}

const SegmentationComparisonView: React.FC<SegmentationComparisonViewProps> = ({
  previewUrlMap,
  previewInfo,
}) => {
  const slices = previewInfo.slices;
  const segSlices = previewInfo.segmented_slices ?? [];
  const hasSegmented = segSlices.length > 0;
  const maxZ = previewInfo.dimensions.z;

  const [selectedIdx, setSelectedIdx] = useState(
    Math.floor(slices.length / 2), // default to 50%
  );

  const inputSlice = slices[selectedIdx];
  const segSlice = segSlices[selectedIdx];
  const inputUrl = inputSlice ? previewUrlMap[inputSlice.name] : undefined;
  const segUrl = segSlice ? previewUrlMap[segSlice.name] : undefined;

  const depthPct = (idx: number) => {
    const z = slices[idx]?.z_index ?? 0;
    return maxZ > 0 ? Math.round((z / maxZ) * 100) : 0;
  };

  return (
    <div>
      {/* Depth selector tabs */}
      <p className="text-xs text-gray-400 mb-1.5">Cross-section at depth (Z-axis) — slice {inputSlice?.z_index ?? '?'} of {maxZ}</p>
      <div className="flex gap-1 mb-3">
        {slices.map((slice, idx) => (
          <button
            key={slice.name}
            onClick={() => setSelectedIdx(idx)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              idx === selectedIdx
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {depthPct(idx)}% depth
          </button>
        ))}
      </div>

      <div className={`grid gap-3 ${hasSegmented ? 'grid-cols-2 max-w-lg' : 'grid-cols-1 max-w-xs'}`}>
        {/* Input slice */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-1">
            Raw Input — Z = {inputSlice?.z_index ?? '?'}
          </span>
          <div className="border border-gray-200 rounded-lg bg-black overflow-hidden">
            {inputUrl ? (
              <img
                src={inputUrl}
                alt={`Input slice at Z=${inputSlice?.z_index}`}
                className="w-full h-auto block"
              />
            ) : (
              <div className="flex items-center justify-center p-8">
                <span className="text-sm text-gray-400">Not available</span>
              </div>
            )}
          </div>
        </div>

        {/* Segmented slice — only when available */}
        {hasSegmented && (
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">
              Segmentation Result — Z = {segSlice?.z_index ?? '?'}
            </span>
            <div className="border border-gray-200 rounded-lg bg-black overflow-hidden">
              {segUrl ? (
                <img
                  src={segUrl}
                  alt={`Segmented slice at Z=${segSlice?.z_index}`}
                  className="w-full h-auto block"
                />
              ) : (
                <div className="flex items-center justify-center p-8">
                  <span className="text-sm text-gray-400">Not available</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SegmentationComparisonView;
