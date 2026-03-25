import React from 'react';
import { FiInfo, FiCircle, FiHexagon } from 'react-icons/fi';
import History from '../../app/helpers/History';

export type MobileTab = 'info' | 'particles' | 'pores' | null;

interface MobileToolbarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

const tabs: { id: MobileTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'info', label: 'Info', Icon: FiInfo },
  { id: 'particles', label: 'Particles', Icon: FiCircle },
  { id: 'pores', label: 'Pores', Icon: FiHexagon },
];

const MobileToolbar: React.FC<MobileToolbarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.1)] flex items-center" style={{ height: '56px' }}>
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            className={`flex-1 flex flex-col items-center justify-center h-full transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-500'
            }`}
            onClick={() => onTabChange(isActive ? null : id)}
          >
            <Icon className="text-lg" />
            <span className="text-[10px] mt-0.5">{label}</span>
          </button>
        );
      })}
      <button
        className="flex-1 flex flex-col items-center justify-center h-full text-blue-600"
        onClick={() => History.push('/explore')}
      >
        <span className="text-xs font-semibold">Explore</span>
        <span className="text-[10px] mt-0.5">More</span>
      </button>
    </div>
  );
};

export default MobileToolbar;
