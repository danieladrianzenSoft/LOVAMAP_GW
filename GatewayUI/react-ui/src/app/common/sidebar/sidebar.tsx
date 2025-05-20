import { FaTimes } from "react-icons/fa";

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  onOpen?: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  toggleButtonLabel?: string;
  showOverlay?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isVisible,
  onClose,
  onOpen,
  title,
  children,
  className = "",
  toggleButtonLabel,
  showOverlay = true,
}) => {
  return (
    <>
      {/* Floating toggle button when sidebar is hidden */}
      {!isVisible && toggleButtonLabel && onOpen && (
        <div className="fixed-vertical-button-container">
          <button
            onClick={onOpen}
            className="fixed-vertical-button"
          >
            {toggleButtonLabel}
          </button>
        </div>
      )}

      {/* Desktop (lg and up): static sidebar */}
      <div className={`hidden lg:block ${className}`}>
        {title && <h2 className="text-lg font-bold text-gray-700 px-4 pt-4">{title}</h2>}
        {children}
      </div>

      {/* Mobile: sliding panel */}
      {isVisible && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {showOverlay && (
            <div
              className="absolute inset-0 bg-black opacity-40"
              onClick={onClose}
            />
          )}

          <div className="absolute right-0 top-0 h-full w-11/12 max-w-sm bg-white shadow-lg overflow-y-auto p-4 transition-transform duration-300 transform translate-x-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
};