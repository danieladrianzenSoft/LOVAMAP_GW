import React from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, children }) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-20"
          style={{ bottom: '56px' }}
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed left-0 right-0 z-30 bg-white bg-opacity-95 rounded-t-2xl shadow-lg transition-transform duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ bottom: '56px', maxHeight: '60vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: 'calc(60vh - 20px)' }}>
          {children}
        </div>
      </div>
    </>
  );
};

export default BottomSheet;
