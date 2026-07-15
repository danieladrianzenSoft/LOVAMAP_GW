import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronRight, FaDownload, FaExchangeAlt, FaExternalLinkAlt, FaFolder, FaGlobeAmericas, FaImage, FaLock, FaRegStar, FaSearch, FaSpinner, FaStar, FaTimes, FaTrash } from 'react-icons/fa';
import UploadFile from '../../app/common/upload-file/upload-file';
import { Image, ImageCategory, ImageToUpdate } from '../../app/models/image';
import { Publication } from '../../app/models/publication';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import { ParticlePropertyGroup } from '../../app/models/particlePropertyGroup';

type LibraryFolder = string;

type Selection =
	| { type: 'group'; groupId: number }
	| { type: 'scaffold'; groupId: number; scaffoldId: number };

type PendingMove = {
	scaffoldId: number;
	sourceGroupId: number;
	targetGroupId: number | null;
	needsDestinationPicker: boolean;
};

interface ScaffoldGroupLibraryProps {
	scaffoldGroups: ScaffoldGroup[];
	publications: Publication[];
	isAdmin: boolean;
	onInteractGroup: (group: ScaffoldGroup, scaffoldId?: number) => void;
	onDeleteGroup: (groupId: number) => Promise<void>;
	onUploadImages: (group: ScaffoldGroup, files: File[], scaffoldId?: number) => Promise<ScaffoldGroup | null>;
	onUpdateImage: (group: ScaffoldGroup, image: Image, updates: Partial<ImageToUpdate>) => Promise<ScaffoldGroup | null>;
	onDeleteImage: (group: ScaffoldGroup, imageId: number) => Promise<ScaffoldGroup | null>;
	onMoveScaffold: (scaffoldId: number, targetGroupId: number) => Promise<boolean>;
	onUpdateVisibility: (group: ScaffoldGroup, isPublic: boolean) => Promise<ScaffoldGroup | null>;
	showFolders?: boolean;
	customFolders?: Array<{ key: LibraryFolder; label: string; filter: (group: ScaffoldGroup) => boolean }>;
	canManageScaffolds?: boolean;
	canManageImages?: boolean;
	canManageVisibility?: boolean;
	showVisibility?: boolean;
	canDeleteGroups?: boolean;
	getGroupFolderAction?: (group: ScaffoldGroup) => { label: string; targetFolderKey: LibraryFolder; title?: string } | null;
	onMoveGroupToFolder?: (group: ScaffoldGroup, targetFolderKey: LibraryFolder) => Promise<void>;
	useGroupBulkSelection?: boolean;
	canDownloadGroup?: boolean;
	isGroupDownloadLoading?: boolean;
	onDownloadGroup?: (group: ScaffoldGroup) => Promise<void> | void;
	headerAction?: React.ReactNode;
}

const defaultFolders: Array<{ key: LibraryFolder; label: string; filter: (group: ScaffoldGroup, isPublished: boolean) => boolean }> = [
	{ key: 'all', label: 'All My Scaffolds', filter: () => true },
	{ key: 'published', label: 'Published', filter: (_group, isPublished) => isPublished },
	{ key: 'unpublished', label: 'Unpublished', filter: (_group, isPublished) => !isPublished },
	{ key: 'public', label: 'Public', filter: group => group.isPublic },
	{ key: 'private', label: 'Private', filter: group => !group.isPublic },
	{ key: 'simulated', label: 'Simulated', filter: group => group.isSimulated },
	{ key: 'experimental', label: 'Experimental', filter: group => !group.isSimulated },
];

const ScaffoldGroupLibrary: React.FC<ScaffoldGroupLibraryProps> = ({
	scaffoldGroups,
	publications,
	isAdmin,
	onInteractGroup,
	onDeleteGroup,
	onUploadImages,
	onUpdateImage,
	onDeleteImage,
	onMoveScaffold,
	onUpdateVisibility,
	showFolders = true,
	customFolders,
	canManageScaffolds = true,
	canManageImages = isAdmin,
	canManageVisibility = isAdmin,
	showVisibility = true,
	canDeleteGroups = isAdmin,
	getGroupFolderAction,
	onMoveGroupToFolder,
	useGroupBulkSelection = false,
	canDownloadGroup = false,
	isGroupDownloadLoading = false,
	onDownloadGroup,
	headerAction,
}) => {
	const folders = customFolders ?? defaultFolders;
	const [activeFolder, setActiveFolder] = useState<LibraryFolder>(folders[0]?.key ?? 'all');
	const [query, setQuery] = useState('');
	const [expandedGroupIds, setExpandedGroupIds] = useState<Set<number>>(new Set());
	const [selection, setSelection] = useState<Selection | null>(null);
	const [showImageUpload, setShowImageUpload] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isMutating, setIsMutating] = useState(false);
	const [draggedScaffold, setDraggedScaffold] = useState<{ scaffoldId: number; sourceGroupId: number } | null>(null);
	const [draggedGroupId, setDraggedGroupId] = useState<number | null>(null);
	const [dropTargetGroupId, setDropTargetGroupId] = useState<number | null>(null);
	const [dropTargetFolderKey, setDropTargetFolderKey] = useState<LibraryFolder | null>(null);
	const [pendingVisibility, setPendingVisibility] = useState<boolean | null>(null);
	const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
	const [moveSearchQuery, setMoveSearchQuery] = useState('');
	const [checkedGroupIds, setCheckedGroupIds] = useState<Set<number>>(new Set());
	const libraryShellRef = useRef<HTMLDivElement>(null);
	const detailsRef = useRef<HTMLElement>(null);
	const listScrollRef = useRef<HTMLDivElement>(null);
	const isDragCanceledRef = useRef(false);

	const publicationLookup = useMemo(() => {
		const lookup = new Map<number, Publication[]>();
		for (const publication of publications) {
			for (const groupId of publication.scaffoldGroupIds ?? []) {
				const existing = lookup.get(groupId) ?? [];
				existing.push(publication);
				lookup.set(groupId, existing);
			}
		}
		return lookup;
	}, [publications]);

	const selectedGroup = useMemo(() => {
		if (!selection) return null;
		return scaffoldGroups.find(group => group.id === selection.groupId) ?? null;
	}, [scaffoldGroups, selection]);

	const selectedScaffoldId = selection?.type === 'scaffold' ? selection.scaffoldId : null;
	const selectedPublications = selectedGroup ? publicationLookup.get(selectedGroup.id) ?? [] : [];
	const inspectorImages = useMemo(
		() => selectedGroup ? getInspectorImages(selectedGroup, selectedScaffoldId) : [],
		[selectedGroup, selectedScaffoldId]
	);

	useEffect(() => {
		setShowImageUpload(false);
		setConfirmDelete(false);
		setPendingVisibility(null);
	}, [selection]);

	useEffect(() => {
		if (folders.some(folder => folder.key === activeFolder)) return;
		setActiveFolder(folders[0]?.key ?? 'all');
	}, [activeFolder, folders]);

	useEffect(() => {
		setCheckedGroupIds(new Set());
	}, [activeFolder]);

	const counts = useMemo(() => {
		const isPublished = (group: ScaffoldGroup) => (publicationLookup.get(group.id)?.length ?? 0) > 0;
		return Object.fromEntries(folders.map(folder => [
			folder.key,
			scaffoldGroups.filter(group => folder.filter(group, isPublished(group))).length,
		]));
	}, [folders, publicationLookup, scaffoldGroups]);

	const filteredGroups = useMemo(() => {
		const queryTerms = query
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter(Boolean);

		return scaffoldGroups.filter(group => {
			const groupPublications = publicationLookup.get(group.id) ?? [];
			const isPublished = groupPublications.length > 0;
			const activeFolderConfig = folders.find(folder => folder.key === activeFolder);
			const matchesFolder = !showFolders || !activeFolderConfig || activeFolderConfig.filter(group, isPublished);

			if (!matchesFolder) return false;
			if (queryTerms.length === 0) return true;

			const searchable = [
				group.name,
				group.comments,
				group.id.toString(),
				...(group.scaffoldIds ?? []).map(id => id.toString()),
				...(group.tags ?? []),
				...groupPublications.flatMap(publication => [
					publication.title,
					publication.authors,
					publication.journal,
					publication.doi,
					publication.citation,
				]),
			].join(' ').toLowerCase();

			return queryTerms.every(term => searchable.includes(term));
		});
	}, [activeFolder, folders, publicationLookup, query, scaffoldGroups, showFolders]);

	useEffect(() => {
		if (selection && filteredGroups.some(group => group.id === selection.groupId)) return;
		setSelection(null);
	}, [filteredGroups, selection]);

	useEffect(() => {
		if (!draggedScaffold) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			isDragCanceledRef.current = true;
			setDraggedScaffold(null);
			setDropTargetGroupId(null);
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [draggedScaffold]);

	useEffect(() => {
		if (!selection) return;

		const handlePointerDown = (event: MouseEvent | TouchEvent) => {
			const target = event.target as Node;
			if (detailsRef.current?.contains(target)) return;
			if (target instanceof Element && target.closest('[data-library-selectable-row="true"]')) return;
			if (
				target instanceof Element &&
				libraryShellRef.current?.contains(target) &&
				target.closest('button, a, input, select, textarea, label, [role="button"]')
			) return;
			setSelection(null);
		};

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('touchstart', handlePointerDown);
		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('touchstart', handlePointerDown);
		};
	}, [selection]);

	const toggleExpanded = (groupId: number) => {
		setExpandedGroupIds(prev => {
			const next = new Set(prev);
			next.has(groupId) ? next.delete(groupId) : next.add(groupId);
			return next;
		});
	};

	const selectGroup = (groupId: number) => {
		setSelection(current =>
			current?.type === 'group' && current.groupId === groupId
				? null
				: { type: 'group', groupId }
		);
	};

	const selectScaffold = (groupId: number, scaffoldId: number) => {
		setSelection(current =>
			current?.type === 'scaffold' && current.groupId === groupId && current.scaffoldId === scaffoldId
				? null
				: { type: 'scaffold', groupId, scaffoldId }
		);
	};

	const handleImageUpload = async (files: File[]) => {
		if (!selectedGroup) return;
		setIsMutating(true);
		const updatedGroup = await onUploadImages(selectedGroup, files, selectedScaffoldId ?? undefined);
		setIsMutating(false);
		if (updatedGroup) setSelection({ type: 'group', groupId: updatedGroup.id });
	};

	const handleImageUpdate = async (image: Image, updates: Partial<ImageToUpdate>) => {
		if (!selectedGroup) return;
		setIsMutating(true);
		await onUpdateImage(selectedGroup, image, updates);
		setIsMutating(false);
	};

	const handleImageDelete = async (imageId: number) => {
		if (!selectedGroup) return;
		setIsMutating(true);
		await onDeleteImage(selectedGroup, imageId);
		setIsMutating(false);
	};

	const handleDeleteGroup = async () => {
		if (!selectedGroup) return;
		setIsMutating(true);
		await onDeleteGroup(selectedGroup.id);
		setIsMutating(false);
		setConfirmDelete(false);
	};

	const handleMoveDrop = (targetGroupId: number) => {
		if (isDragCanceledRef.current) {
			isDragCanceledRef.current = false;
			return;
		}
		if (!canManageScaffolds || !draggedScaffold || draggedScaffold.sourceGroupId === targetGroupId || isMutating) return;

		setDropTargetGroupId(null);
		setMoveSearchQuery('');
		setPendingMove({
			scaffoldId: draggedScaffold.scaffoldId,
			sourceGroupId: draggedScaffold.sourceGroupId,
			targetGroupId,
			needsDestinationPicker: false,
		});
	};

	const handleOpenMovePicker = (scaffoldId: number, sourceGroupId: number) => {
		if (!canManageScaffolds) return;
		setMoveSearchQuery('');
		setPendingMove({
			scaffoldId,
			sourceGroupId,
			targetGroupId: null,
			needsDestinationPicker: true,
		});
	};

	const handleConfirmMoveScaffold = async () => {
		if (!canManageScaffolds || !pendingMove || pendingMove.targetGroupId == null || isMutating) return;
		const targetGroupId = pendingMove.targetGroupId;

		setIsMutating(true);
		const moved = await onMoveScaffold(pendingMove.scaffoldId, targetGroupId);
		setIsMutating(false);
		setDropTargetGroupId(null);

		if (moved) {
			setExpandedGroupIds(prev => {
				const next = new Set(prev);
				next.add(targetGroupId);
				next.add(pendingMove.sourceGroupId);
				return next;
			});
			setSelection({ type: 'scaffold', groupId: targetGroupId, scaffoldId: pendingMove.scaffoldId });
			setPendingMove(null);
			setMoveSearchQuery('');
		}
	};

	const handleDragAutoScroll = (event: React.DragEvent<HTMLElement>) => {
		if ((!draggedScaffold && !draggedGroupId) || isDragCanceledRef.current) return;

		const edgeSize = 96;
		const maxStep = 24;
		const topNavOffset = 64;
		const y = event.clientY;
		const list = listScrollRef.current;
		const content = document.querySelector('.content') as HTMLElement | null;
		const scrollTarget =
			list && list.scrollHeight > list.clientHeight
				? list
				: content ?? document.scrollingElement;

		if (!scrollTarget) return;

		const rect = scrollTarget instanceof HTMLElement
			? scrollTarget.getBoundingClientRect()
			: { top: 0, bottom: window.innerHeight };

		const topEdge = Math.max(rect.top, topNavOffset);
		const bottomEdge = Math.min(rect.bottom, window.innerHeight);

		if (y < topEdge + edgeSize) {
			const intensity = (topEdge + edgeSize - y) / edgeSize;
			scrollTarget.scrollTop -= Math.ceil(Math.min(1, intensity) * maxStep);
		} else if (bottomEdge - y < edgeSize) {
			const intensity = (edgeSize - (bottomEdge - y)) / edgeSize;
			scrollTarget.scrollTop += Math.ceil(Math.min(1, intensity) * maxStep);
		}
	};

	const handleVisibilityUpdate = async (isPublic: boolean) => {
		if (!canManageVisibility || !selectedGroup || isMutating || selectedGroup.isPublic === isPublic) return;

		setIsMutating(true);
		const updatedGroup = await onUpdateVisibility(selectedGroup, isPublic);
		setIsMutating(false);
		if (updatedGroup) setPendingVisibility(null);
	};

	const pendingMoveSourceGroup = pendingMove
		? scaffoldGroups.find(group => group.id === pendingMove.sourceGroupId) ?? null
		: null;
	const pendingMoveTargetGroup = pendingMove
		? scaffoldGroups.find(group => group.id === pendingMove.targetGroupId) ?? null
		: null;
	const destinationGroups = useMemo(() => {
		if (!pendingMove) return [];

		const terms = moveSearchQuery
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter(Boolean);

		return scaffoldGroups
			.filter(group => group.id !== pendingMove.sourceGroupId)
			.filter(group => {
				if (terms.length === 0) return true;
				const searchable = getGroupSearchText(group);
				return terms.every(term => searchable.includes(term));
			});
	}, [moveSearchQuery, pendingMove, scaffoldGroups]);

	const handleMoveGroupToFolder = async (group: ScaffoldGroup, targetFolderKey: LibraryFolder) => {
		if (!onMoveGroupToFolder || isMutating) return;

		setIsMutating(true);
		await onMoveGroupToFolder(group, targetFolderKey);
		setIsMutating(false);
		setDropTargetFolderKey(null);
		setCheckedGroupIds(current => {
			if (!current.has(group.id)) return current;
			const next = new Set(current);
			next.delete(group.id);
			return next;
		});
	};

	const handleBulkMoveGroupsToFolder = async (groups: ScaffoldGroup[], targetFolderKey: LibraryFolder) => {
		if (!onMoveGroupToFolder || isMutating || groups.length === 0) return;

		setIsMutating(true);
		for (const group of groups) {
			await onMoveGroupToFolder(group, targetFolderKey);
		}
		setIsMutating(false);
		setCheckedGroupIds(new Set());
	};

	const toggleCheckedGroup = (groupId: number) => {
		setCheckedGroupIds(current => {
			const next = new Set(current);
			next.has(groupId) ? next.delete(groupId) : next.add(groupId);
			return next;
		});
	};

	const activeFolderLabel = folders.find(folder => folder.key === activeFolder)?.label ?? 'Scaffold Groups';
	const hasGroupFolderActions = Boolean(getGroupFolderAction && onMoveGroupToFolder);
	const includeGroupActionColumn = hasGroupFolderActions && !useGroupBulkSelection;
	const checkedGroups = filteredGroups.filter(group => checkedGroupIds.has(group.id));
	const checkedGroupAction = checkedGroups.length > 0 ? getGroupFolderAction?.(checkedGroups[0]) ?? null : null;
	const groupGridClass = showVisibility
		? includeGroupActionColumn
			? 'grid-cols-[minmax(240px,1fr)_100px_140px_110px_96px] lg:grid-cols-[minmax(260px,1fr)_120px_150px_120px_104px]'
			: 'grid-cols-[minmax(240px,1fr)_100px_140px_110px] lg:grid-cols-[minmax(260px,1fr)_120px_150px_120px]'
		: includeGroupActionColumn
			? 'grid-cols-[minmax(240px,1fr)_100px_140px_96px] lg:grid-cols-[minmax(260px,1fr)_120px_150px_104px]'
			: 'grid-cols-[minmax(240px,1fr)_100px_140px] lg:grid-cols-[minmax(260px,1fr)_120px_150px]';
	const scaffoldGridClass = showVisibility
		? 'grid-cols-[minmax(240px,1fr)_100px_140px_110px_56px] lg:grid-cols-[minmax(260px,1fr)_120px_150px_120px_56px]'
		: 'grid-cols-[minmax(240px,1fr)_100px_140px_56px] lg:grid-cols-[minmax(260px,1fr)_120px_150px_56px]';
	const scaffoldSummaryColSpan = showVisibility ? 'col-span-3' : 'col-span-2';
	const tableMinWidth = showVisibility
		? includeGroupActionColumn ? 'min-w-[832px] lg:min-w-[920px]' : 'min-w-[736px] lg:min-w-[816px]'
		: includeGroupActionColumn ? 'min-w-[736px] lg:min-w-[816px]' : 'min-w-[640px] lg:min-w-[696px]';

	return (
		<div ref={libraryShellRef} className={`grid grid-cols-1 gap-4 min-h-[640px] min-w-0 ${
			showFolders
				? selectedGroup ? 'xl:grid-cols-[220px_minmax(0,1fr)_320px] 2xl:grid-cols-[240px_minmax(0,1fr)_360px]' : 'xl:grid-cols-[240px_minmax(0,1fr)]'
				: selectedGroup ? 'xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]' : 'xl:grid-cols-1'
		}`}>
			{showFolders && (
				<aside className="bg-white border border-gray-200 rounded-lg overflow-hidden">
					<div className="px-4 py-3 border-b border-gray-100">
						<div className="text-sm font-semibold text-gray-800">Folders</div>
					</div>
					<div className="p-2">
						{folders.map(folder => (
							<button
								key={folder.key}
								type="button"
								onClick={() => setActiveFolder(folder.key)}
								onDragOver={event => {
									if (!draggedGroupId || !onMoveGroupToFolder) return;
									event.preventDefault();
									setDropTargetFolderKey(folder.key);
								}}
								onDragLeave={() => {
									if (dropTargetFolderKey === folder.key) setDropTargetFolderKey(null);
								}}
								onDrop={async event => {
									event.preventDefault();
									const group = scaffoldGroups.find(item => item.id === draggedGroupId);
									if (group) await handleMoveGroupToFolder(group, folder.key);
									setDraggedGroupId(null);
								}}
								className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm text-left ${
									dropTargetFolderKey === folder.key
										? 'bg-secondary-100 ring-1 ring-inset ring-secondary-300'
										: activeFolder === folder.key
											? 'bg-secondary-100 text-gray-900 font-medium'
											: 'text-gray-600 hover:bg-gray-50'
								}`}
							>
								<span className="inline-flex items-center gap-2 min-w-0">
									<FaFolder className="text-gray-400 shrink-0" size={13} />
									<span className="truncate">{folder.label}</span>
								</span>
								<span className="text-xs text-gray-400">{counts[folder.key] ?? 0}</span>
							</button>
						))}
					</div>
				</aside>
			)}

			<section className="bg-white border border-gray-200 rounded-lg min-w-0">
				<div className="px-4 py-3 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
					<div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-start">
						<div>
							<div className="text-sm font-semibold text-gray-800">{showFolders ? activeFolderLabel : 'Scaffold Groups'}</div>
							<div className="text-xs text-gray-400">{filteredGroups.length} scaffold group{filteredGroups.length === 1 ? '' : 's'}</div>
						</div>
						{headerAction}
					</div>
					<label className="relative block w-full md:w-72">
						<FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
						<input
							value={query}
							onChange={event => setQuery(event.target.value)}
							className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-secondary-300"
							placeholder="Search groups, tags, publications"
						/>
					</label>
				</div>

				{useGroupBulkSelection && checkedGroups.length > 0 && checkedGroupAction && (
					<div className="flex flex-col gap-3 border-b border-gray-100 bg-secondary-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-sm text-gray-700">
							<span className="font-medium">{checkedGroups.length}</span> scaffold group{checkedGroups.length === 1 ? '' : 's'} selected
						</div>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => setCheckedGroupIds(new Set())}
								className="button-outline px-3 py-1.5 text-xs"
								disabled={isMutating}
							>
								Clear
							</button>
							<button
								type="button"
								onClick={() => handleBulkMoveGroupsToFolder(checkedGroups, checkedGroupAction.targetFolderKey)}
								className="button-secondary px-3 py-1.5 text-xs"
								disabled={isMutating}
								title={checkedGroupAction.title}
							>
								{checkedGroupAction.label}
							</button>
						</div>
					</div>
				)}

				<div
					ref={listScrollRef}
					className="overflow-auto"
					onDragOver={event => handleDragAutoScroll(event)}
				>
					<div className={`grid ${groupGridClass} gap-0 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 ${tableMinWidth}`}>
						<div>Name</div>
						<div>Count</div>
						<div>Publication</div>
						{showVisibility && <div>Visibility</div>}
						{includeGroupActionColumn && <div></div>}
					</div>
					<div className={tableMinWidth}>
						{filteredGroups.length === 0 ? (
							<div className="px-4 py-12 text-center text-sm text-gray-400">No scaffold groups found.</div>
						) : filteredGroups.map(group => {
							const groupPublications = publicationLookup.get(group.id) ?? [];
							const isExpanded = expandedGroupIds.has(group.id);
							const isSelectedGroup = selection?.type === 'group' && selection.groupId === group.id;
							const scaffoldIds = group.scaffoldIds ?? [];
							const groupFolderAction = getGroupFolderAction?.(group) ?? null;

							return (
								<div key={group.id}>
									<div
										data-library-selectable-row="true"
										className={`grid ${groupGridClass} items-center px-4 py-3 border-b border-gray-100 cursor-pointer ${
											dropTargetGroupId === group.id
												? 'bg-secondary-100 ring-1 ring-inset ring-secondary-300'
												: isSelectedGroup ? 'bg-secondary-50' : 'hover:bg-gray-50'
										}`}
										onClick={() => selectGroup(group.id)}
										draggable={hasGroupFolderActions && !isMutating}
										onDragStart={event => {
											if (!hasGroupFolderActions) return;
											event.dataTransfer.effectAllowed = 'move';
											event.dataTransfer.setData('text/plain', group.id.toString());
											setDraggedGroupId(group.id);
										}}
										onDragEnd={() => {
											setDraggedGroupId(null);
											setDropTargetFolderKey(null);
										}}
										onDragOver={event => {
											if (!canManageScaffolds || !draggedScaffold || draggedScaffold.sourceGroupId === group.id) return;
											event.preventDefault();
											handleDragAutoScroll(event);
											setDropTargetGroupId(group.id);
										}}
										onDragLeave={() => {
											if (dropTargetGroupId === group.id) setDropTargetGroupId(null);
										}}
											onDrop={async event => {
												event.preventDefault();
												handleMoveDrop(group.id);
											}}
									>
										<div className="flex items-center gap-2 min-w-0">
											{useGroupBulkSelection && groupFolderAction && (
												<input
													type="checkbox"
													checked={checkedGroupIds.has(group.id)}
													onChange={event => {
														event.stopPropagation();
														toggleCheckedGroup(group.id);
													}}
													onClick={event => event.stopPropagation()}
													className="h-4 w-4 shrink-0 rounded border-gray-300 accent-link-300"
													aria-label={`Select scaffold group ${group.name || group.id}`}
												/>
											)}
											<button
												type="button"
												onClick={event => {
													event.stopPropagation();
													toggleExpanded(group.id);
												}}
												className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-gray-100 shrink-0"
												title={isExpanded ? 'Collapse group' : 'Expand group'}
											>
												<FaChevronRight className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} size={11} />
											</button>
											<FaFolder className="text-secondary-300 shrink-0" size={16} />
											<div className="min-w-0">
												<div className="text-sm font-medium text-gray-800 truncate">{group.name || `Scaffold Group ${group.id}`}</div>
												<div className="text-xs text-gray-400 truncate">{group.tags?.slice(0, 4).join(', ') || `Group ${group.id}`}</div>
											</div>
										</div>
										<div className="text-sm text-gray-600">{scaffoldIds.length}</div>
										<div className="text-sm text-gray-600 truncate">
											{groupPublications.length > 0 ? `${groupPublications.length} linked` : 'Unpublished'}
										</div>
										{showVisibility && (
											<div>
												<VisibilityBadge isPublic={group.isPublic} />
											</div>
										)}
										{includeGroupActionColumn && (
											<div className="flex justify-end">
												{groupFolderAction && (
													<button
														type="button"
														onClick={async event => {
															event.stopPropagation();
															await handleMoveGroupToFolder(group, groupFolderAction.targetFolderKey);
														}}
														disabled={isMutating}
														className="button-outline px-3 py-1 text-xs"
														title={groupFolderAction.title}
													>
														{groupFolderAction.label}
													</button>
												)}
											</div>
										)}
									</div>

									{isExpanded && scaffoldIds.map((scaffoldId, index) => {
										const isSelectedScaffold = selection?.type === 'scaffold' && selection.scaffoldId === scaffoldId;
										const thumbnail = getScaffoldThumbnail(group, scaffoldId);
										return (
											<div
												data-library-selectable-row="true"
												key={scaffoldId}
												className={`grid ${scaffoldGridClass} items-center px-4 py-2 border-b border-gray-100 cursor-pointer ${
													isSelectedScaffold ? 'bg-secondary-50' : 'hover:bg-gray-50'
												}`}
												onClick={() => selectScaffold(group.id, scaffoldId)}
												draggable={canManageScaffolds && !isMutating}
												onDragStart={event => {
													if (!canManageScaffolds) return;
													event.stopPropagation();
													isDragCanceledRef.current = false;
													event.dataTransfer.effectAllowed = 'move';
													event.dataTransfer.setData('text/plain', scaffoldId.toString());
													setDraggedScaffold({ scaffoldId, sourceGroupId: group.id });
												}}
												onDragEnd={() => {
													setDraggedScaffold(null);
													setDropTargetGroupId(null);
													isDragCanceledRef.current = false;
												}}
												onDragOver={event => handleDragAutoScroll(event)}
											>
												<div className="flex items-center gap-3 min-w-0 pl-8">
													<div className="w-9 h-9 rounded overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
														{thumbnail ? (
															<img src={thumbnail.url} alt={`Scaffold ${scaffoldId}`} className="w-full h-full object-cover" />
														) : (
															<div className="w-full h-full flex items-center justify-center">
																<FaImage className="text-gray-300" size={13} />
															</div>
														)}
													</div>
													<div className="min-w-0">
														<div className="text-sm text-gray-700 truncate">Scaffold Id {scaffoldId}</div>
														<div className="text-xs text-gray-400">Replicate {index + 1}</div>
													</div>
												</div>
												<div className={`${scaffoldSummaryColSpan} text-xs text-gray-400 truncate`}>
													{group.name || formatParticle(group)}
												</div>
												<div className="flex justify-center">
													{canManageScaffolds && (
														<button
															type="button"
															onClick={event => {
																event.stopPropagation();
																handleOpenMovePicker(scaffoldId, group.id);
															}}
															className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800"
															title="Move scaffold"
															aria-label={`Move scaffold ${scaffoldId}`}
															disabled={isMutating}
														>
															<FaExchangeAlt size={12} />
														</button>
													)}
												</div>
											</div>
										);
									})}
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{selectedGroup && (
				<>
					<button
						type="button"
						className="fixed inset-0 z-40 bg-black/20 xl:hidden"
						onClick={() => setSelection(null)}
						aria-label="Close details"
					/>
					<aside
						ref={detailsRef}
						className="fixed inset-0 z-50 bg-white overflow-hidden sm:left-auto sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:shadow-xl xl:sticky xl:inset-auto xl:z-auto xl:top-4 xl:w-auto xl:max-w-none xl:self-start xl:border xl:border-gray-200 xl:rounded-lg xl:shadow-none xl:max-h-[calc(100vh-7.625rem)] xl:min-w-0"
						role="dialog"
						aria-modal="true"
					>
						<div className="h-full flex flex-col xl:max-h-[calc(100vh-7.625rem)]">
							<div className="px-4 py-4 border-b border-gray-100">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="text-xs text-gray-400 mb-1">{selectedScaffoldId ? 'Scaffold' : 'Scaffold Group'}</div>
										<h2 className="text-lg font-semibold text-gray-900 leading-tight break-words">
											{selectedScaffoldId ? `Scaffold ${selectedScaffoldId}` : selectedGroup.name}
										</h2>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										{showVisibility && (
											<VisibilityControl
												isPublic={selectedGroup.isPublic}
												isDisabled={isMutating}
												onChange={setPendingVisibility}
												canChange={canManageVisibility}
											/>
										)}
										<button
											type="button"
											onClick={() => setSelection(null)}
											className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-gray-100 xl:hidden"
											title="Close details"
										>
											<FaTimes className="text-gray-500" size={14} />
										</button>
									</div>
								</div>
							</div>

							<div className="p-4 overflow-auto space-y-5">
								{showVisibility && pendingVisibility !== null && (
									<VisibilityConfirm
										groupName={selectedGroup.name || `Scaffold Group ${selectedGroup.id}`}
										isPublic={pendingVisibility}
										isMutating={isMutating}
										onCancel={() => setPendingVisibility(null)}
										onConfirm={() => handleVisibilityUpdate(pendingVisibility)}
									/>
								)}

								<div className="grid grid-cols-2 gap-3 text-sm">
									<Stat label="Group ID" value={selectedGroup.id.toString()} />
									<Stat label="Scaffolds" value={(selectedGroup.scaffoldIds?.length ?? 0).toString()} />
									<Stat label="Domains" value={(selectedGroup.scaffoldIdsWithDomains?.length ?? 0).toString()} />
									<Stat label="Source" value={selectedGroup.isSimulated ? 'Simulated' : 'Experimental'} />
								</div>

								<div>
									<div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Publications</div>
									{selectedPublications.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{selectedPublications.map(publication => (
												<span key={publication.id} className="inline-flex max-w-full items-center gap-2 rounded bg-secondary-50 px-2 py-1.5 text-xs text-gray-700">
													<span className="min-w-0">
														<span className="block truncate">{publication.title}</span>
														<span className="block truncate text-[11px] text-gray-400">
															{publication.journal} · {new Date(publication.publishedAt).toLocaleDateString()}
														</span>
													</span>
													<a
														href={`https://doi.org/${publication.doi}`}
														target="_blank"
														rel="noopener noreferrer"
														onClick={event => event.stopPropagation()}
														className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-white hover:text-link-100"
														title="Open publication DOI"
														aria-label={`Open DOI for ${publication.title}`}
													>
														<FaExternalLinkAlt size={10} />
													</a>
												</span>
											))}
										</div>
									) : (
										<div className="text-sm text-gray-400">Unpublished</div>
									)}
								</div>

								<div>
									<div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Metadata</div>
									<dl className="space-y-2 text-sm">
										<Info label="Created" value={new Date(selectedGroup.createdAt).toLocaleString()} />
										<Info label="Container" value={selectedGroup.inputs?.containerShape ?? 'n/a'} />
										<Info label="Packing" value={selectedGroup.inputs?.packingConfiguration ?? 'n/a'} />
										<Info label="Particle" value={formatParticle(selectedGroup)} />
										{selectedGroup.comments && <Info label="Comments" value={selectedGroup.comments} />}
									</dl>
								</div>

							{selectedScaffoldId && (
								<div>
									<div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Selected Scaffold</div>
									<dl className="space-y-2 text-sm">
										<Info label="Scaffold ID" value={selectedScaffoldId.toString()} />
										<Info label="Replicate" value={(selectedGroup.scaffoldIds?.indexOf(selectedScaffoldId) + 1 || 1).toString()} />
									</dl>
								</div>
							)}

							<div>
								<div className="flex items-center justify-between mb-2">
									<div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
										{selectedScaffoldId ? 'Scaffold Images' : 'Group Images'}
									</div>
									{canManageImages && (
										<button
											type="button"
											onClick={() => setShowImageUpload(prev => !prev)}
											className="text-xs text-link-100 hover:underline"
										>
											{showImageUpload ? 'Hide upload' : 'Upload'}
										</button>
									)}
								</div>

								{showImageUpload && (
									<div className="mb-3 border border-dashed border-gray-200 rounded-md p-3">
										<UploadFile
											acceptedFileTypes={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
											onUploadSubmit={handleImageUpload}
											isUploadDisabled={isMutating}
											uploadButtonLabel={selectedScaffoldId ? 'Upload Scaffold Images' : 'Upload Group Images'}
										/>
									</div>
								)}

								{inspectorImages.length > 0 ? (
									<div className="grid grid-cols-2 gap-2">
										{inspectorImages.map(image => (
											<div key={image.id} className="relative border border-gray-200 rounded-md overflow-hidden bg-gray-50">
												<img src={image.url} alt={`${image.id}`} className="w-full h-24 object-cover" />
												{canManageImages && (
													<>
														<button
															type="button"
															onClick={() => handleImageDelete(image.id)}
															className="absolute top-1 left-1 bg-white rounded-full p-1 text-gray-500 hover:text-red-600"
															title="Delete image"
														>
															<FaTrash size={10} />
														</button>
														<button
															type="button"
															onClick={() => handleImageUpdate(image, { isThumbnail: !image.isThumbnail })}
															className="absolute top-1 right-1 bg-white rounded-full p-1 text-yellow-500"
															title={image.isThumbnail ? 'Unset thumbnail' : 'Set thumbnail'}
														>
															{image.isThumbnail ? <FaStar size={11} /> : <FaRegStar size={11} />}
														</button>
														<select
															className="absolute bottom-1 left-1 right-1 bg-white/90 text-xs px-1 py-1 rounded"
															value={image.category}
															onChange={event => handleImageUpdate(image, { category: event.target.value })}
														>
															{Object.keys(ImageCategory)
																.filter(key => isNaN(Number(key)))
																.map(category => (
																	<option key={category} value={category}>{category}</option>
																))}
														</select>
													</>
												)}
											</div>
										))}
									</div>
								) : (
									<div className="flex items-center gap-2 text-sm text-gray-400">
										<FaImage size={13} />
										{selectedScaffoldId ? 'No images found for this scaffold' : 'No group images found'}
									</div>
								)}
							</div>
						</div>

						<div className="mt-auto p-4 border-t border-gray-100">
							{confirmDelete ? (
								<div className="space-y-3">
									<p className="text-xs text-gray-600">Delete this scaffold group and all associated data, images, and domains?</p>
									<div className="flex gap-2">
										<button type="button" onClick={() => setConfirmDelete(false)} className="button-outline flex-1" disabled={isMutating}>
											Cancel
										</button>
										<button type="button" onClick={handleDeleteGroup} className="button-base bg-red-600 text-white hover:bg-red-700 flex-1" disabled={isMutating}>
											Delete
										</button>
									</div>
								</div>
							) : (
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => onInteractGroup(selectedGroup, selectedScaffoldId ?? undefined)}
										className="button-secondary flex-1"
									>
										Interact
									</button>
									{canDownloadGroup && onDownloadGroup && (
										<button
											type="button"
											onClick={() => onDownloadGroup(selectedGroup)}
											className="button-outline inline-flex items-center justify-center gap-2 px-3"
											title="Download descriptors"
											disabled={isGroupDownloadLoading}
										>
											{isGroupDownloadLoading ? <FaSpinner className="animate-spin" size={12} /> : <FaDownload size={12} />}
											{isGroupDownloadLoading ? 'Preparing...' : 'Download'}
										</button>
									)}
									{canDeleteGroups && (
										<button
											type="button"
											onClick={() => setConfirmDelete(true)}
											className="button-base bg-red-50 text-red-600 hover:bg-red-100 px-3"
											title="Delete scaffold group"
										>
											<FaTrash size={13} />
										</button>
									)}
								</div>
							)}
						</div>
						</div>
					</aside>
				</>
			)}

			{canManageScaffolds && pendingMove && pendingMoveSourceGroup && (
				<MoveScaffoldConfirm
					scaffoldId={pendingMove.scaffoldId}
					sourceGroup={pendingMoveSourceGroup}
					targetGroup={pendingMoveTargetGroup}
					destinationGroups={destinationGroups}
					searchQuery={moveSearchQuery}
					showDestinationPicker={pendingMove.needsDestinationPicker}
					isMutating={isMutating}
					onSearchChange={setMoveSearchQuery}
					onTargetChange={targetGroupId => setPendingMove(current =>
						current ? { ...current, targetGroupId } : current
					)}
					onCancel={() => {
						setPendingMove(null);
						setMoveSearchQuery('');
					}}
					onConfirm={handleConfirmMoveScaffold}
				/>
			)}
		</div>
	);
};

const VisibilityBadge: React.FC<{ isPublic: boolean }> = ({ isPublic }) => (
	<span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${isPublic ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
		{isPublic ? <FaGlobeAmericas size={10} /> : <FaLock size={10} />}
		{isPublic ? 'Public' : 'Private'}
	</span>
);

const VisibilityControl: React.FC<{
	isPublic: boolean;
	isDisabled: boolean;
	canChange?: boolean;
	onChange: (isPublic: boolean) => void;
}> = ({ isPublic, isDisabled, canChange = true, onChange }) => (
	<div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
		<button
			type="button"
			onClick={() => onChange(true)}
			disabled={!canChange || isDisabled || isPublic}
			className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
				isPublic ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
			}`}
			title="Make scaffold group public"
		>
			<FaGlobeAmericas size={10} />
			Public
		</button>
		<button
			type="button"
			onClick={() => onChange(false)}
			disabled={!canChange || isDisabled || !isPublic}
			className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
				!isPublic ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
			}`}
			title="Make scaffold group private"
		>
			<FaLock size={10} />
			Private
		</button>
	</div>
);

const VisibilityConfirm: React.FC<{
	groupName: string;
	isPublic: boolean;
	isMutating: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}> = ({ groupName, isPublic, isMutating, onCancel, onConfirm }) => (
	<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
		<div className={`w-full max-w-sm rounded-lg border bg-white p-4 shadow-xl ${isPublic ? 'border-green-200' : 'border-gray-200'}`}>
			<div className="flex items-start gap-3">
				<div className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isPublic ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
					{isPublic ? <FaGlobeAmericas size={14} /> : <FaLock size={14} />}
				</div>
				<div className="min-w-0 flex-1">
					<div className="text-base font-semibold text-gray-900">
						{isPublic ? 'Make scaffold group public?' : 'Make scaffold group private?'}
					</div>
					<p className="mt-2 text-sm leading-6 text-gray-600">
						{isPublic
							? `This will make the entire scaffold group "${groupName}" public, not just the selected scaffold. It will be findable and viewable by all users.`
							: `This will make the entire scaffold group "${groupName}" private, not just the selected scaffold. Other users will no longer find it in public scaffold searches.`}
					</p>
					<div className="mt-4 flex gap-2">
						<button
							type="button"
							onClick={onCancel}
							disabled={isMutating}
							className="button-outline flex-1"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={onConfirm}
							disabled={isMutating}
							className={`button-base flex-1 text-white ${isPublic ? 'bg-green-700 hover:bg-green-800' : 'bg-gray-700 hover:bg-gray-800'}`}
						>
							{isPublic ? 'Make Public' : 'Make Private'}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
);

const MoveScaffoldConfirm: React.FC<{
	scaffoldId: number;
	sourceGroup: ScaffoldGroup;
	targetGroup: ScaffoldGroup | null;
	destinationGroups: ScaffoldGroup[];
	searchQuery: string;
	showDestinationPicker: boolean;
	isMutating: boolean;
	onSearchChange: (value: string) => void;
	onTargetChange: (targetGroupId: number) => void;
	onCancel: () => void;
	onConfirm: () => void;
}> = ({
	scaffoldId,
	sourceGroup,
	targetGroup,
	destinationGroups,
	searchQuery,
	showDestinationPicker,
	isMutating,
	onSearchChange,
	onTargetChange,
	onCancel,
	onConfirm,
}) => (
	<div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/30 sm:items-center sm:p-4">
		<div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-5xl sm:rounded-lg sm:border sm:border-gray-200">
			<div className="shrink-0 flex items-start justify-between gap-3 border-b border-gray-100 p-4">
				<div>
					<div className="text-base font-semibold text-gray-900">Move scaffold {scaffoldId}?</div>
					<p className="mt-1 text-sm text-gray-600">
						This changes the scaffold's parent scaffold group. The scaffold will use the destination group's metadata after the move.
					</p>
				</div>
				<button
					type="button"
					onClick={onCancel}
					disabled={isMutating}
					className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-gray-100"
					title="Cancel move"
				>
					<FaTimes className="text-gray-500" size={14} />
				</button>
			</div>

			<div className="min-h-0 flex-1 overflow-auto p-4">
				{showDestinationPicker && (
					<div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3">
						<label className="relative block">
							<FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
							<input
								value={searchQuery}
								onChange={event => onSearchChange(event.target.value)}
								className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-secondary-300"
								placeholder="Search destination groups by name, id, tag, or metadata"
							/>
						</label>
						<div className="mt-3 max-h-48 overflow-auto rounded-md border border-gray-200 bg-white">
							{destinationGroups.length === 0 ? (
								<div className="px-3 py-4 text-center text-sm text-gray-400">No destination groups found.</div>
							) : destinationGroups.map(group => (
								<button
									key={group.id}
									type="button"
									onClick={() => onTargetChange(group.id)}
									className={`w-full px-3 py-2 text-left text-sm border-b border-gray-100 last:border-b-0 ${
										targetGroup?.id === group.id
											? 'bg-secondary-50 text-gray-900'
											: 'hover:bg-gray-50 text-gray-700'
									}`}
								>
									<div className="flex items-center justify-between gap-3">
										<span className="min-w-0 truncate font-medium">{group.name || `Scaffold Group ${group.id}`}</span>
										<span className="shrink-0 text-xs text-gray-400">{group.scaffoldIds?.length ?? 0} scaffolds</span>
									</div>
									<div className="mt-1 truncate text-xs text-gray-400">
										{[group.id.toString(), group.isSimulated ? 'simulated' : 'experimental', ...(group.tags ?? []).slice(0, 4)].join(' | ')}
									</div>
								</button>
							))}
						</div>
					</div>
				)}

				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					<MoveGroupSummary title="From" group={sourceGroup} scaffoldDelta={-1} />
					{targetGroup ? (
						<MoveGroupSummary title="To" group={targetGroup} scaffoldDelta={1} />
					) : (
						<div className="flex min-h-[240px] items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-400">
							Select a destination scaffold group.
						</div>
					)}
				</div>
			</div>

			<div className="shrink-0 flex flex-col gap-2 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end">
				<button
					type="button"
					onClick={onCancel}
					disabled={isMutating}
					className="button-outline sm:w-32"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={onConfirm}
					disabled={isMutating || !targetGroup}
					className="button-secondary sm:w-40"
				>
					Move Scaffold
				</button>
			</div>
		</div>
	</div>
);

const MoveGroupSummary: React.FC<{
	title: string;
	group: ScaffoldGroup;
	scaffoldDelta: number;
}> = ({ title, group, scaffoldDelta }) => {
	const currentCount = group.scaffoldIds?.length ?? 0;
	const nextCount = Math.max(0, currentCount + scaffoldDelta);

	return (
		<div className="rounded-md border border-gray-200 bg-gray-50 p-3">
			<div className="mb-3 flex items-start justify-between gap-2">
				<div className="min-w-0">
					<div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</div>
					<div className="mt-1 truncate text-sm font-semibold text-gray-900">
						{group.name || `Scaffold Group ${group.id}`}
					</div>
				</div>
				<VisibilityBadge isPublic={group.isPublic} />
			</div>
			<ScaffoldMoveMetadata group={group} scaffoldCountText={`${currentCount} now, ${nextCount} after move`} />
			<div className="mt-3">
				<div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Tags</div>
				<GroupTags tags={group.tags ?? []} />
			</div>
		</div>
	);
};

const ScaffoldMoveMetadata: React.FC<{ group: ScaffoldGroup; scaffoldCountText: string }> = ({ group, scaffoldCountText }) => {
	const firstParticle = group.inputs?.particles?.[0];
	const additionalParticles = group.inputs?.particles?.slice(1) ?? [];

	return (
		<table className="w-full text-left text-sm text-gray-600">
			<tbody>
				<MetadataRow label="Group ID" value={group.id.toString()} />
				<MetadataRow label="Scaffolds" value={scaffoldCountText} />
				<MetadataRow label="Source" value={group.isSimulated ? 'simulated' : 'experimental'} />
				{firstParticle && (
					<>
						<tr>
							<td className="py-1 pr-3 align-top font-medium text-gray-500" colSpan={2}>Particles:</td>
						</tr>
						<MetadataRow label="Shape" value={firstParticle.shape} isNested />
						<MetadataRow label="Size" value={formatParticleSize(firstParticle.meanSize)} isNested />
						<MetadataRow label="Composition" value={firstParticle.dispersity?.toLowerCase()} isNested />
						<MetadataRow label="Configuration" value={group.inputs?.packingConfiguration?.toLowerCase() ?? 'unknown'} isNested />
						<MetadataRow label="Size distribution" value={formatSizeDistributionType(firstParticle.sizeDistributionType)} isNested />
						<MetadataRow label="Stiffness" value={firstParticle.stiffness} isNested />
						{firstParticle.material && <MetadataRow label="Material" value={firstParticle.material} isNested />}
						<MetadataRow label="Friction" value={firstParticle.friction} isNested />
					</>
				)}
				<MetadataRow label="Container" value={group.inputs?.containerShape ?? 'n/a'} />
				{group.inputs?.containerDimensions && <MetadataRow label="Dimensions" value={group.inputs.containerDimensions} />}
				{group.inputs?.interlinkingMechanism && <MetadataRow label="Interlinking" value={group.inputs.interlinkingMechanism} />}
				{group.inputs?.scaffoldOccupants && <MetadataRow label="Occupants" value={group.inputs.scaffoldOccupants.split(',').join(', ')} />}
				{group.inputs?.imagingMethod && <MetadataRow label="Imaging" value={group.inputs.imagingMethod} />}
				{additionalParticles.length > 0 && (
					<tr>
						<td className="pt-3 pb-1 pr-3 align-top font-medium text-gray-500" colSpan={2}>Additional particle groups:</td>
					</tr>
				)}
				{additionalParticles.map((particle, index) => (
					<tr key={`${particle.shape}-${particle.meanSize}-${index}`}>
						<td className="py-1 pr-3 pl-4 align-top text-gray-400" colSpan={2}>
							{formatParticleGroupSummary(particle)}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};

const MetadataRow: React.FC<{ label: string; value?: string | null; isNested?: boolean }> = ({ label, value, isNested = false }) => (
	<tr>
		<td className={`py-1 pr-3 align-top font-medium whitespace-nowrap ${isNested ? 'pl-4 text-gray-400' : 'text-gray-500'}`}>{label}:</td>
		<td className="py-1 text-gray-700">{value || 'n/a'}</td>
	</tr>
);

const GroupTags: React.FC<{ tags: string[] }> = ({ tags }) => {
	if (tags.length === 0) return <div className="text-sm text-gray-400">No tags</div>;

	return (
		<div className="flex flex-wrap gap-1.5">
			{tags.slice(0, 8).map(tag => (
				<span key={tag} className="rounded bg-white px-2 py-1 text-xs text-gray-600 ring-1 ring-gray-200">
					{tag}
				</span>
			))}
			{tags.length > 8 && (
				<span className="rounded bg-white px-2 py-1 text-xs text-gray-400 ring-1 ring-gray-200">
					+{tags.length - 8} more
				</span>
			)}
		</div>
	);
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
	<div className="rounded-md bg-gray-50 px-3 py-2">
		<div className="text-xs text-gray-400">{label}</div>
		<div className="font-semibold text-gray-800 truncate">{value}</div>
	</div>
);

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
	<div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
		<dt className="text-gray-400">{label}</dt>
		<dd className="text-gray-700 break-words">{value}</dd>
	</div>
);

const formatParticle = (group: ScaffoldGroup) => {
	const particle = group.inputs?.particles?.[0];
	if (!particle) return 'n/a';
	const size = particle.meanSize != null ? `${Number(particle.meanSize).toPrecision(3)} um` : 'unknown size';
	return [particle.shape, size, particle.material].filter(Boolean).join(', ');
};

const getGroupSearchText = (group: ScaffoldGroup) => {
	return [
		group.id,
		group.name,
		group.comments,
		group.isPublic ? 'public' : 'private',
		group.isSimulated ? 'simulated' : 'experimental',
		group.inputs?.containerShape,
		group.inputs?.containerDimensions,
		group.inputs?.packingConfiguration,
		group.inputs?.interlinkingMechanism,
		group.inputs?.scaffoldOccupants,
		group.inputs?.imagingMethod,
		...(group.tags ?? []),
		...(group.inputs?.particles ?? []).flatMap(particle => [
			particle.shape,
			particle.stiffness,
			particle.friction,
			particle.dispersity,
			particle.sizeDistributionType,
			particle.meanSize,
			particle.standardDeviationSize,
			particle.proportion,
			particle.material,
		]),
	]
		.filter(value => value != null)
		.join(' ')
		.toLowerCase();
};

const formatParticleSize = (meanSize?: number | null) => {
	return meanSize != null ? `${Number(meanSize).toPrecision(3)} um diameter` : 'unknown size';
};

const formatSizeDistributionType = (sizeDistributionType?: string | null) => {
	return sizeDistributionType?.toLowerCase() === 'delta'
		? 'delta (spike)'
		: sizeDistributionType;
};

const formatParticleGroupSummary = (particle: ParticlePropertyGroup) => {
	const proportion = particle.proportion != null ? `${(particle.proportion * 100).toPrecision(3)}%` : '';
	const size = particle.meanSize != null ? `${particle.meanSize.toPrecision(3)} um` : '';
	return [proportion, size, particle.shape, particle.stiffness, particle.material]
		.filter(Boolean)
		.join(' ');
};

const getScaffoldThumbnail = (group: ScaffoldGroup, scaffoldId: number) => {
	const scaffoldImages = group.images?.filter(image => image.scaffoldId === scaffoldId) ?? [];
	return scaffoldImages.find(image => getImageCategoryKey(image.category) === 'HalfHalf') ?? null;
};

const getInspectorImages = (group: ScaffoldGroup, scaffoldId: number | null) => {
	if (scaffoldId) {
		return uniqueImagesByCategory(
			(group.images ?? [])
				.filter(image => image.scaffoldId === scaffoldId)
				.sort(sortImagesForCategoryDisplay)
		);
	}

	return uniqueImagesByCategory(
		(group.images ?? [])
			.filter(image => image.isThumbnail)
			.sort(sortImagesForCategoryDisplay)
	);
};

const uniqueImagesByCategory = (images: Image[]) => {
	const seen = new Set<string>();
	const result: Image[] = [];

	for (const image of images) {
		const categoryKey = getImageCategoryKey(image.category);
		if (seen.has(categoryKey)) continue;
		seen.add(categoryKey);
		result.push(image);
	}

	return result;
};

const sortImagesForCategoryDisplay = (a: Image, b: Image) => {
	const categoryOrder = ['HalfHalf', 'Particles', 'InteriorPores', 'ExteriorPores', 'Other'];
	const getRank = (category: string | number | null | undefined) => {
		const rank = categoryOrder.indexOf(getImageCategoryKey(category));
		return rank === -1 ? categoryOrder.length : rank;
	};
	const categoryDelta = getRank(a.category) - getRank(b.category);
	if (categoryDelta !== 0) return categoryDelta;
	return Number(b.isThumbnail) - Number(a.isThumbnail);
};

const getImageCategoryKey = (category: string | number | null | undefined) => {
	const numericCategory = Number(category);
	if (!Number.isNaN(numericCategory)) {
		return ImageCategory[numericCategory] ?? 'Other';
	}
	return category?.toString() ?? 'Other';
};

export default ScaffoldGroupLibrary;
