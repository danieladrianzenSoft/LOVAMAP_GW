import React, { useState } from 'react';
import * as THREE from 'three';
import BottomSheet from './bottom-sheet';
import SelectedPanel from './selected-panel';
import HiddenPanel from './hidden-panel';
import { DomainMetadata } from '../../app/models/domainMetadata';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';

interface MobileFloatingChipsProps {
  activeCategory: number;
  selectedEntity: { id: string; mesh: THREE.Mesh } | null;
  onUnselect: () => void;
  domainMetadata?: DomainMetadata | null;
  scaffoldGroup?: ScaffoldGroup | null;
  hiddenIds: Set<string>;
  isHiddenPanelOpen: boolean;
  toggleHiddenPanel: () => void;
  onShowAll: () => void;
  onToggleVisibility: (id: string) => void;
  isActiveCategoryVisible: boolean;
}

const MobileFloatingChips: React.FC<MobileFloatingChipsProps> = ({
  activeCategory,
  selectedEntity,
  onUnselect,
  domainMetadata,
  scaffoldGroup,
  hiddenIds,
  isHiddenPanelOpen,
  toggleHiddenPanel,
  onShowAll,
  onToggleVisibility,
  isActiveCategoryVisible,
}) => {
  const [selectedSheetOpen, setSelectedSheetOpen] = useState(false);
  const [hiddenSheetOpen, setHiddenSheetOpen] = useState(false);

  const hasSelection = selectedEntity != null;
  const hasHidden = hiddenIds.size > 0;

  if (!hasSelection && !hasHidden) return null;

  const entityLabel = activeCategory === 0 ? 'Particle' : 'Pore';

  return (
    <>
      {/* Floating chips */}
      <div className="fixed left-3 z-30 flex flex-col gap-2" style={{ bottom: '70px' }}>
        {hasSelection && (
          <button
            className="bg-white bg-opacity-95 shadow-md rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 flex items-center gap-1.5"
            onClick={() => setSelectedSheetOpen(true)}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            {entityLabel}: {selectedEntity!.id.split('-')[0]}
          </button>
        )}

        {hasHidden && isActiveCategoryVisible && (
          <button
            className="bg-white bg-opacity-95 shadow-md rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 flex items-center gap-1.5"
            onClick={() => setHiddenSheetOpen(true)}
          >
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            {hiddenIds.size} hidden
          </button>
        )}
      </div>

      {/* Selected entity bottom sheet */}
      <BottomSheet isOpen={selectedSheetOpen} onClose={() => setSelectedSheetOpen(false)}>
        <SelectedPanel
          selectedDomainEntity={selectedEntity}
          domainCategory={activeCategory}
          onUnselect={() => {
            onUnselect();
            setSelectedSheetOpen(false);
          }}
          domainMetadata={domainMetadata}
          scaffoldGroup={scaffoldGroup}
          className="w-full shadow-none bg-transparent"
        />
      </BottomSheet>

      {/* Hidden entities bottom sheet */}
      <BottomSheet isOpen={hiddenSheetOpen} onClose={() => setHiddenSheetOpen(false)}>
        <HiddenPanel
          isOpen={true}
          toggleOpen={() => {}}
          category={activeCategory}
          hiddenIds={hiddenIds}
          onShowAll={() => {
            onShowAll();
            setHiddenSheetOpen(false);
          }}
          onToggleVisibility={onToggleVisibility}
          className="w-full shadow-none bg-transparent"
        />
      </BottomSheet>
    </>
  );
};

export default MobileFloatingChips;
