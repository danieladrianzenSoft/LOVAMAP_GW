import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Domain } from "../../app/models/domain";
import { FiChevronDown, FiChevronUp, FiShuffle, FiX } from "react-icons/fi";
import Slider from "../../app/common/slider/slider";

/** Extract the numeric prefix from a compound pore ID (e.g. "921-abc..." → "921").
 *  If there's no dash, returns the whole string. */
const getPorePrefix = (id: string) => {
	const idx = id.indexOf('-');
	return idx > 0 ? id.substring(0, idx) : id;
};

/** Parse a pasted value like "[123, 456, 789]", "123,456,789", or "123 456 789" into individual tokens.
 *  Splits on commas, spaces, or any mix thereof. */
const parseAsList = (input: string): string[] | null => {
	const cleaned = input.replace(/[\[\]]/g, '').trim();
	const tokens = cleaned.split(/[\s,]+/).filter(Boolean);
	return tokens.length > 1 ? tokens : null;
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
	uniformColor?: string | null;
	onSetUniformColor?: (color: string | null) => void;
	opacity?: number;
	setOpacity?: (value: number) => void;
}

const MAX_DROPDOWN_ITEMS = 20;
const MIN_SEARCH_CHARS = 1;

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
  uniformColor,
  onSetUniformColor,
  opacity,
  setOpacity,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [listMatchError, setListMatchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const isIsolated = isolatedPoreIds != null && isolatedPoreIds.length > 0;

  // Sync local selectedIds from parent isolatedPoreIds only when the
  // parent value actually changes (undo, scaffold switch, un-isolate, etc.)
  const lastSyncedRef = useRef<string[] | null | undefined>(undefined);
  useEffect(() => {
    // Skip if the reference hasn't changed
    if (lastSyncedRef.current === isolatedPoreIds) return;
    lastSyncedRef.current = isolatedPoreIds;
    if (isolatedPoreIds && isolatedPoreIds.length > 0) {
      setSelectedIds(new Set(isolatedPoreIds));
    } else {
      setSelectedIds(new Set());
    }
  }, [isolatedPoreIds]);

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

  // Click-outside to close dropdown
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // The "active token" is the text after the last delimiter (comma or space).
  const activeToken = useMemo(() => {
    const parts = searchValue.split(/[\s,]+/);
    return (parts[parts.length - 1] ?? '').toLowerCase();
  }, [searchValue]);

  const filteredPoreIds = useMemo(() => {
    if (activeToken.length < MIN_SEARCH_CHARS || !allPoreIds) return [];
    return allPoreIds
      .filter(id => id.toLowerCase().includes(activeToken))
      .slice(0, MAX_DROPDOWN_ITEMS);
  }, [activeToken, allPoreIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Clear the active token from input, keep any preceding entries
    const parts = searchValue.split(/[\s,]+/);
    parts.pop();
    setSearchValue(parts.length > 0 ? parts.join(' ') + ' ' : '');
  };

  const removeSelection = (id: string) => {
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
    // Re-isolate with remaining IDs, or un-isolate if none left
    if (isIsolated) {
      if (next.size > 0) {
        onIsolatePores?.(Array.from(next));
      } else {
        onUnisolatePore?.();
      }
    }
  };

  /** Resolve typed input into pore IDs and apply isolation. */
  const handleApply = () => {
    // First, try to resolve the current input (single search or pasted list)
    const trimmed = searchValue.trim();
    if (trimmed) {
      const list = parseAsList(trimmed);
      const tokens = list ?? [trimmed];
      const newSelected = new Set<string>(selectedIds);
      const notFound: string[] = [];
      for (const token of tokens) {
        const t = token.trim();
        if (!t) continue;
        // Try prefix match first
        const fullId = prefixMap.get(t);
        if (fullId) {
          newSelected.add(fullId);
        } else {
          // Try as a full/partial ID match
          const match = allPoreIds?.find(id => id.toLowerCase().includes(t.toLowerCase()));
          if (match) newSelected.add(match);
          else notFound.push(t);
        }
      }
      if (notFound.length > 0) {
        setListMatchError(`Not found: ${notFound.join(', ')}`);
        setSelectedIds(newSelected);
        return; // Don't isolate yet, show error
      }
      setSelectedIds(newSelected);
      setSearchValue("");
      setListMatchError(null);
      setDropdownOpen(false);
      if (newSelected.size > 0) {
        onIsolatePores?.(Array.from(newSelected));
      }
      return;
    }

    // No input text — isolate whatever is currently selected
    if (selectedIds.size === 0) {
      if (isIsolated) onUnisolatePore?.();
      return;
    }
    onIsolatePores?.(Array.from(selectedIds));
    setSearchValue("");
    setDropdownOpen(false);
  };

  const handleInputChange = (value: string) => {
    setSearchValue(value);
    setListMatchError(null);
    // Open dropdown based on the active token (text after last delimiter)
    const parts = value.split(/[\s,]+/);
    const lastToken = parts[parts.length - 1] ?? '';
    setDropdownOpen(lastToken.length >= MIN_SEARCH_CHARS);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
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

				{onSetUniformColor && (
					<>
						<div className="flex justify-between items-center mt-3 text-sm text-gray-700">
							<span>Color type</span>
							<select
								value={uniformColor != null ? 'uniform' : 'random'}
								onChange={(e) => {
									if (e.target.value === 'uniform') {
										onSetUniformColor('#e84393');
									} else {
										onSetUniformColor(null);
										onRefreshColors?.();
									}
								}}
								disabled={!visible}
								className="text-sm border border-gray-300 rounded pl-2 pr-7 py-0.5 appearance-none bg-no-repeat focus:outline-none focus:border-link-100 disabled:opacity-50 disabled:cursor-not-allowed"
								style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center' }}
							>
								<option value="random">Random</option>
								<option value="uniform">Uniform</option>
							</select>
						</div>
						{uniformColor != null && (
							<div className="flex justify-between items-center mt-3 text-sm text-gray-700">
								<span>Color</span>
								<input
									type="color"
									value={uniformColor}
									onChange={(e) => onSetUniformColor(e.target.value)}
									disabled={!visible}
									className="w-7 h-7 rounded cursor-pointer border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
									title="Set uniform pore color"
								/>
							</div>
						)}
					</>
				)}

				{onRefreshColors && uniformColor == null && (
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

				{setOpacity && (
					<Slider
						label="Opacity"
						value={opacity ?? 1}
						min={0}
						max={1}
						step={0.01}
						onChange={setOpacity}
					/>
				)}

				{onIsolatePores && onUnisolatePore && (
					<div className="mt-3 pt-3 border-t border-gray-200">
						<div ref={containerRef}>
							<input
								ref={inputRef}
								type="text"
								placeholder="Isolate by ID..."
								value={searchValue}
								onChange={(e) => handleInputChange(e.target.value)}
								onKeyDown={handleKeyDown}
								onFocus={() => { if (searchValue.trim().length >= MIN_SEARCH_CHARS) setDropdownOpen(true); }}
								disabled={!visible}
								className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-link-100 disabled:opacity-50"
							/>

							{/* Selected / isolated chips */}
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
												onClick={() => removeSelection(id)}
												onMouseDown={(e) => e.preventDefault()}
											>
												<FiX size={10} />
											</button>
										</span>
									))}
								</div>
							)}

							{isIsolated && (
								<button
									className="button-tag text-xs mt-1.5 w-full"
									onClick={() => onUnisolatePore?.()}
								>
									Un-isolate
								</button>
							)}

							{/* Dropdown (portal) */}
							{dropdownOpen && filteredPoreIds.length > 0 && dropdownPos && createPortal(
								<div
									ref={dropdownRef}
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
							{dropdownOpen && activeToken.length >= MIN_SEARCH_CHARS && filteredPoreIds.length === 0 && (
								<p className="text-xs text-red-500 mt-1">No pores found</p>
							)}
						</div>
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
