import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Domain } from "../../app/models/domain";
import { FiChevronDown, FiChevronUp, FiShuffle, FiX } from "react-icons/fi";

/** Extract the numeric prefix from a compound pore ID (e.g. "921-abc..." → "921").
 *  If there's no dash, returns the whole string. */
const getPorePrefix = (id: string) => {
	const idx = id.indexOf('-');
	return idx > 0 ? id.substring(0, idx) : id;
};

/** Parse a pasted value like "[123, 456, 789]" or "123,456,789" into individual tokens. */
const parseAsList = (input: string): string[] | null => {
	const cleaned = input.replace(/[\[\]]/g, '').trim();
	if (!cleaned.includes(',')) return null;
	const tokens = cleaned.split(',').map(s => s.trim()).filter(Boolean);
	return tokens.length > 0 ? tokens : null;
};

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
	onIsolatePores?: (ids: string[]) => void;
	onUnisolatePore?: () => void;
	isolatedPoreIds?: string[] | null;
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
  onIsolatePores,
  onUnisolatePore,
  isolatedPoreIds,
  allPoreIds,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [listMatchError, setListMatchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Build a prefix→fullId lookup
  const prefixMap = useMemo(() => {
    if (!allPoreIds) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const id of allPoreIds) {
      map.set(getPorePrefix(id), id);
    }
    return map;
  }, [allPoreIds]);

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
    // Don't show dropdown for list input (has commas)
    if (query.includes(',')) return [];
    return allPoreIds
      .filter(id => id.toLowerCase().includes(query))
      .slice(0, MAX_DROPDOWN_ITEMS);
  }, [searchValue, allPoreIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleIsolate = () => {
    if (selectedIds.size === 0) return;
    onIsolatePores?.(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSearchValue("");
    setDropdownOpen(false);
  };

  const handleInputChange = (value: string) => {
    setSearchValue(value);
    setListMatchError(null);
    const list = parseAsList(value);
    if (list) {
      // List mode: resolve prefixes to full IDs immediately
      setDropdownOpen(false);
      const matched = new Set<string>();
      const notFound: string[] = [];
      for (const token of list) {
        const fullId = prefixMap.get(token);
        if (fullId) matched.add(fullId);
        else notFound.push(token);
      }
      setSelectedIds(matched);
      if (notFound.length > 0) {
        setListMatchError(`Not found: ${notFound.join(', ')}`);
      }
    } else {
      setDropdownOpen(value.trim().length >= 3);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    // Don't close if there are selected items (user might click Isolate)
    if (selectedIds.size > 0) return;
    setDropdownOpen(false);
  };

  const handleUnisolate = () => {
    onUnisolatePore?.();
  };

  const isIsolated = isolatedPoreIds != null && isolatedPoreIds.length > 0;

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

				{onIsolatePores && onUnisolatePore && (
					<div className="mt-3 pt-3 border-t border-gray-200">
						{isIsolated ? (
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<span className="text-xs font-medium text-link-300 bg-link-50 rounded-full px-2 py-1 truncate">
										Isolated: {isolatedPoreIds!.length === 1
											? `Pore ${getPorePrefix(isolatedPoreIds![0])}`
											: `${isolatedPoreIds!.length} pores`}
									</span>
									<button
										className="button-tag text-xs"
										onClick={handleUnisolate}
									>
										Un-isolate
									</button>
								</div>
								{isolatedPoreIds!.length > 1 && (
									<div className="flex flex-wrap gap-1">
										{isolatedPoreIds!.map(id => (
											<span key={id} className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
												{getPorePrefix(id)}
											</span>
										))}
									</div>
								)}
							</div>
						) : (
							<div ref={containerRef} onBlur={handleBlur}>
								<input
									ref={inputRef}
									type="text"
									placeholder="Search ID or paste list..."
									value={searchValue}
									onChange={(e) => handleInputChange(e.target.value)}
									onFocus={() => { if (searchValue.trim().length >= 3) setDropdownOpen(true); }}
									disabled={!visible}
									className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-link-100 disabled:opacity-50"
								/>

								{/* Selected chips */}
								{selectedIds.size > 0 && (
									<div className="flex flex-wrap gap-1 mt-1.5">
										{Array.from(selectedIds).map(id => (
											<span
												key={id}
												className="inline-flex items-center gap-0.5 text-[10px] bg-link-50 text-link-300 rounded-full px-1.5 py-0.5"
											>
												{getPorePrefix(id)}
												<button
													className="hover:text-red-500"
													onClick={() => toggleSelection(id)}
													onMouseDown={(e) => e.preventDefault()}
												>
													<FiX size={10} />
												</button>
											</span>
										))}
									</div>
								)}

								{/* Isolate button */}
								{selectedIds.size > 0 && (
									<button
										className="button-tag text-xs mt-1.5 w-full disabled:opacity-50 disabled:cursor-not-allowed"
										onClick={handleIsolate}
									>
										Isolate {selectedIds.size === 1 ? `pore ${getPorePrefix(Array.from(selectedIds)[0])}` : `${selectedIds.size} pores`}
									</button>
								)}

								{/* Dropdown (portal) */}
								{dropdownOpen && filteredPoreIds.length > 0 && dropdownPos && createPortal(
									<div
										style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
										className="z-[9999] bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto"
									>
										{filteredPoreIds.map(id => {
											const isSelected = selectedIds.has(id);
											return (
												<button
													key={id}
													className={`w-full text-left px-2 py-1.5 text-xs truncate flex items-center gap-1.5 ${
														isSelected ? 'bg-link-50 text-link-300' : 'text-gray-700 hover:bg-gray-50'
													}`}
													onMouseDown={(e) => e.preventDefault()}
													onClick={() => toggleSelection(id)}
												>
													<span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
														isSelected ? 'bg-link-300 border-link-300 text-white' : 'border-gray-300'
													}`}>
														{isSelected && <span className="text-[9px]">&#10003;</span>}
													</span>
													{getPorePrefix(id)}
													<span className="text-gray-400">{id.substring(id.indexOf('-'))}</span>
												</button>
											);
										})}
									</div>,
									document.body
								)}

								{/* Error messages */}
								{listMatchError && (
									<p className="text-xs text-red-500 mt-1">{listMatchError}</p>
								)}
								{dropdownOpen && searchValue.trim().length >= 3 && filteredPoreIds.length === 0 && !parseAsList(searchValue) && (
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
