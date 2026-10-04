import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Domain } from "../../app/models/domain";
import { FiChevronDown, FiChevronUp, FiShuffle } from "react-icons/fi";

interface DomainPanelProps {
	isOpen: boolean;
	togglePanelOpen: () => void;
	domain: Domain | null;
	visible: boolean;
	canEdit: boolean;
	onToggleVisibility: () => void;
	onToggleHideEdgePores?: (hide: boolean) => void;
	areEdgePoresHidden?: boolean;
	onEditClick: () => void;
	className?: string;
	onRefreshColors?: () => void;
	onIsolatePore?: (id: string) => void;
	onUnisolatePore?: () => void;
	isolatedPoreId?: string | null;
	allPoreIds?: string[];
}

const MAX_DROPDOWN_ITEMS = 20;

const PoresPanel: React.FC<DomainPanelProps> = ({
  isOpen,
  togglePanelOpen,
  domain,
  visible,
  canEdit,
  onToggleVisibility,
  onToggleHideEdgePores,
  areEdgePoresHidden,
  onEditClick,
  className,
  onRefreshColors,
  onIsolatePore,
  onUnisolatePore,
  isolatedPoreId,
  allPoreIds,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const updateDropdownPos = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    updateDropdownPos();
    window.addEventListener('scroll', updateDropdownPos, true);
    window.addEventListener('resize', updateDropdownPos);
    return () => {
      window.removeEventListener('scroll', updateDropdownPos, true);
      window.removeEventListener('resize', updateDropdownPos);
    };
  }, [dropdownOpen, updateDropdownPos]);

  const filteredPoreIds = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (query.length < 3 || !allPoreIds) return [];
    return allPoreIds
      .filter(id => id.toLowerCase().includes(query))
      .slice(0, MAX_DROPDOWN_ITEMS);
  }, [searchValue, allPoreIds]);

  const handleSelect = (id: string) => {
    onIsolatePore?.(id);
    setSearchValue("");
    setDropdownOpen(false);
  };

  const handleUnisolate = () => {
    onUnisolatePore?.();
  };

  const handleInputChange = (value: string) => {
    setSearchValue(value);
    setDropdownOpen(value.trim().length >= 3);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Keep dropdown open if focus moves within the container
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    setDropdownOpen(false);
  };

  return (
    <div className={className ?? "bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64 mt-2"}>
      <div
        className={`flex justify-between items-center cursor-pointer transition-all duration-300 ${
          isOpen ? "border-b border-gray-300 pb-2" : "pb-0"
        }`}
        onClick={togglePanelOpen}
      >
        <h2 className="text-sm font-semibold text-gray-800">Pores</h2>
        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
      </div>

      <div className={`${
          isOpen ? "max-h-102 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        }`}>
			{domain ? (
			<>
				<div className="flex justify-between items-center mt-3 text-sm text-gray-700">
					<span>Show pores</span>
					<label className="inline-flex items-center cursor-pointer relative w-11 h-6">
						<input
							type="checkbox"
							className="sr-only peer"
							checked={visible}
							onChange={() => onToggleVisibility()}
						/>
						<div className="w-full h-full bg-gray-200 rounded-full peer-checked:bg-link-100 transition-colors" />
						<div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform transform peer-checked:translate-x-5" />
					</label>
				</div>

				{onToggleHideEdgePores && (
					<div className={`flex justify-between items-center mt-3 text-sm ${visible ? 'text-gray-700' : 'text-gray-400'}`}>
						<span>Show surface pores</span>
						<label className={`inline-flex items-center relative w-11 h-6 ${visible ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
							<input
								type="checkbox"
								className="sr-only peer"
								checked={!areEdgePoresHidden}
								disabled={!visible}
								onChange={(e) => onToggleHideEdgePores(!e.target.checked)}
							/>
							<div className="w-full h-full bg-gray-200 rounded-full peer-checked:bg-link-100 peer-disabled:opacity-50 transition-colors" />
							<div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform transform peer-checked:translate-x-5" />
						</label>
					</div>
				)}

				{onRefreshColors && (
					<div className="flex justify-start">
						<button
							className="button-tag flex items-center gap-2 mt-3 mb-0 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={onRefreshColors}
							disabled={!visible}
							title={visible ? "Randomize colors" : "Show pores to randomize colors"}
						>
							<FiShuffle /> Randomize colors
						</button>
					</div>
				)}

				{onIsolatePore && onUnisolatePore && (
					<div className="mt-3 pt-3 border-t border-gray-200">
						{isolatedPoreId != null ? (
							<div className="flex items-center justify-between gap-2">
								<span className="text-xs font-medium text-link-300 bg-link-50 rounded-full px-2 py-1 truncate">
									Isolated: Pore {isolatedPoreId.split('-')[0]}
								</span>
								<button
									className="button-tag text-xs"
									onClick={handleUnisolate}
								>
									Un-isolate
								</button>
							</div>
						) : (
							<div ref={containerRef} onBlur={handleBlur}>
								<input
									ref={inputRef}
									type="text"
									placeholder="Search pore ID..."
									value={searchValue}
									onChange={(e) => handleInputChange(e.target.value)}
									onFocus={() => { if (searchValue.trim().length >= 3) setDropdownOpen(true); }}
									disabled={!visible}
									className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-link-100 disabled:opacity-50"
								/>
								{dropdownOpen && filteredPoreIds.length > 0 && dropdownPos && createPortal(
									<div
										style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
										className="z-[9999] bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto"
									>
										{filteredPoreIds.map(id => (
											<button
												key={id}
												className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-link-50 truncate"
												onMouseDown={(e) => e.preventDefault()}
												onClick={() => handleSelect(id)}
											>
												{id.split('-')[0]}
												<span className="text-gray-400 ml-1">{id.substring(id.indexOf('-'))}</span>
											</button>
										))}
									</div>,
									document.body
								)}
								{dropdownOpen && searchValue.trim().length >= 3 && filteredPoreIds.length === 0 && (
									<p className="text-xs text-red-500 mt-1">No pores found</p>
								)}
							</div>
						)}
					</div>
				)}
			</>
			) : (
				<p className="mt-2 text-sm italic text-gray-500">Non-existent domain</p>
			)}
			{canEdit && (
				<>
					<hr className="mt-3 border-t border-gray-200" />
					<div className="mt-2 flex justify-end">
						<button
						className="button-tag"
						onClick={onEditClick}
						>
						Update
						</button>
					</div>
				</>
			)}
      	</div>
    </div>
  );
};

export default PoresPanel;
