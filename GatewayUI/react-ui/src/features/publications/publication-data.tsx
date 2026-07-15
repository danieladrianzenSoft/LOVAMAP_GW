import React, { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaChevronDown, FaDownload, FaEdit, FaSave, FaSpinner, FaTimes } from 'react-icons/fa';
import { downloadScaffoldGroupAsExcel, triggerDownload, triggerZipDownload } from '../../app/common/excel-generator/excel-generator';
import { openPreviewInNewTab } from '../../app/common/new-tab-preview/new-tab-preview';
import LoadingSpinner from '../../app/common/loading-spinner/loading-spinner';
import { Image, ImageToUpdate } from '../../app/models/image';
import { Publication } from '../../app/models/publication';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import { useStore } from '../../app/stores/store';
import ScaffoldGroupLibrary from '../scaffold-groups/scaffold-group-library';

const PublicationData: React.FC = () => {
	const { publicationId } = useParams<{ publicationId: string }>();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { publicationStore, scaffoldGroupStore, userStore } = useStore();

	const [publication, setPublication] = useState<Publication | null>(null);
	const [publications, setPublications] = useState<Publication[]>([]);
	const [allGroups, setAllGroups] = useState<ScaffoldGroup[]>([]);
	const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
	const [savedGroupIds, setSavedGroupIds] = useState<Set<number>>(new Set());
	const [isLoading, setIsLoading] = useState(true);
	const [isEditMode, setIsEditMode] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
	const [downloadMode, setDownloadMode] = useState<'comprehensive' | 'customized' | 'group' | null>(null);

	const numericPublicationId = Number(publicationId);
	const isAdmin = userStore.user?.roles?.includes('administrator') ?? false;
	const canEdit = Boolean(publication && userStore.user && (isAdmin || publication.uploaderId === userStore.user.id));
	const hasChanges = !setsEqual(selectedGroupIds, savedGroupIds);

	const loadData = async () => {
		if (!numericPublicationId) return;

		setIsLoading(true);
		const [publicationResult, publicationResults] = await Promise.all([
			publicationStore.getPublication(numericPublicationId),
			publicationStore.getPublications(),
		]);

		const user = userStore.user;
		const userIsAdmin = user?.roles?.includes('administrator') ?? false;
		const userCanEdit = Boolean(publicationResult && user && (userIsAdmin || publicationResult.uploaderId === user.id));
		const groupResults = await scaffoldGroupStore.getSummarizedScaffoldGroups({
			selectedTags: [],
			sizeIds: [],
			publicationId: userCanEdit ? null : numericPublicationId,
			restrictToPublicationDataset: userCanEdit ? false : true,
			isSimulated: null,
		});

		const initialGroupIds = new Set(publicationResult?.scaffoldGroupIds ?? []);
		setPublication(publicationResult);
		setPublications(publicationResults);
		setAllGroups(groupResults ?? []);
		setSelectedGroupIds(initialGroupIds);
		setSavedGroupIds(new Set(initialGroupIds));
		setIsLoading(false);
	};

	useEffect(() => {
		loadData();
	}, [numericPublicationId]); // eslint-disable-line react-hooks/exhaustive-deps

	const visibleGroups = useMemo(() => {
		if (isEditMode) return allGroups;
		return allGroups.filter(group => selectedGroupIds.has(group.id));
	}, [allGroups, isEditMode, selectedGroupIds]);

	const selectedScaffoldCount = useMemo(() => {
		return allGroups
			.filter(group => selectedGroupIds.has(group.id))
			.reduce((total, group) => total + (group.scaffoldIds?.length ?? 0), 0);
	}, [allGroups, selectedGroupIds]);

	const handleMoveGroupToFolder = async (group: ScaffoldGroup, targetFolderKey: string) => {
		setSelectedGroupIds(current => {
			const next = new Set(current);
			if (targetFolderKey === 'selected') {
				next.add(group.id);
			} else if (targetFolderKey === 'available') {
				next.delete(group.id);
			}
			return next;
		});
	};

	const handleSave = async () => {
		if (!publication || !canEdit || isSaving) return;

		setIsSaving(true);
		const { success, error } = await publicationStore.updateScaffoldGroups(publication.id, Array.from(selectedGroupIds));
		setIsSaving(false);

		if (!success) {
			toast.error(error ?? 'Failed to update publication data.');
			return;
		}

		toast.success('Publication data updated.');
		const updatedPublication = await publicationStore.getPublication(publication.id);
		if (updatedPublication) {
			const updatedIds = new Set(updatedPublication.scaffoldGroupIds ?? []);
			setPublication(updatedPublication);
			setSelectedGroupIds(updatedIds);
			setSavedGroupIds(new Set(updatedIds));
		} else {
			setSavedGroupIds(new Set(selectedGroupIds));
		}
		setIsEditMode(false);
	};

	const handleCancelEdit = () => {
		setSelectedGroupIds(new Set(savedGroupIds));
		setIsEditMode(false);
	};

	const handleStartEdit = async () => {
		if (!canEdit) return;

		const groupResults = await scaffoldGroupStore.getSummarizedScaffoldGroups({
			selectedTags: [],
			sizeIds: [],
			restrictToPublicationDataset: false,
			isSimulated: null,
		});
		setAllGroups(groupResults ?? []);
		setIsEditMode(true);
	};

	const handleDownloadGroup = async (group: ScaffoldGroup) => {
		if (!userStore.user) {
			window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
			return;
		}

		setDownloadMode('group');
		const detailedGroup = await scaffoldGroupStore.getDetailedScaffoldGroupById({ scaffoldGroupId: group.id });
		if (!detailedGroup) {
			setDownloadMode(null);
			toast.error('Failed to load descriptor data for this scaffold group.');
			return;
		}

		const result = downloadScaffoldGroupAsExcel(detailedGroup);
		openPreviewInNewTab(result, triggerDownload, [result], 100);
		setDownloadMode(null);
	};

	const handleDownloadPublication = async () => {
		if (!userStore.user) {
			redirectToLoginWithIntent('download=publication');
			return;
		}

		setDownloadMode('comprehensive');
		const groupsToDownload = allGroups.filter(group => selectedGroupIds.has(group.id));
		if (groupsToDownload.length === 0) {
			setDownloadMode(null);
			toast.error('No scaffold groups selected for this publication.');
			return;
		}

		const detailedGroups = await Promise.all(
			groupsToDownload.map(group => scaffoldGroupStore.getDetailedScaffoldGroupById({ scaffoldGroupId: group.id }))
		);
		const validGroups = detailedGroups.filter((group): group is ScaffoldGroup => Boolean(group));

		if (validGroups.length === 0) {
			setDownloadMode(null);
			toast.error('Failed to load publication descriptor data.');
			return;
		}

		const files = validGroups.map(group => {
			const result = downloadScaffoldGroupAsExcel(group);
			return {
				...result,
				filename: makePublicationWorkbookFilename(group, result.filename),
			};
		});
		const zipName = `${publication?.title ?? 'publication'}_data`
			.replace(/[^a-z0-9]+/gi, '_')
			.replace(/^_+|_+$/g, '')
			.slice(0, 80) || 'publication_data';
		triggerZipDownload(files, `${zipName}.zip`);
		setDownloadMode(null);
	};

	const handleCustomizeDownload = () => {
		if (!userStore.user) {
			redirectToLoginWithIntent('customizeDownload=true');
			return;
		}

		setDownloadMode('customized');
		const ids = Array.from(selectedGroupIds).join(',');
		const params = new URLSearchParams({
			scaffoldGroupIds: ids,
			stage: '2',
		});
		if (publication) {
			params.set('publicationId', publication.id.toString());
			params.set('publicationTitle', publication.title);
			params.set('publicationAuthors', publication.authors);
			params.set('publicationJournal', publication.journal);
			params.set('publicationPublishedAt', new Date(publication.publishedAt).toISOString());
			params.set('publicationDoi', publication.doi);
		}
		navigate(`/experiments?${params.toString()}`);
	};

	const redirectToLoginWithIntent = (intentQuery: string) => {
		const redirectPath = `${window.location.pathname}?${intentQuery}`;
		window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`;
	};

	useEffect(() => {
		if (!userStore.user || isLoading || isEditMode) return;

		const downloadIntent = searchParams.get('download');

		if (downloadIntent === 'publication') {
			handleDownloadPublication();
			window.history.replaceState(null, '', window.location.pathname);
			return;
		}

		if (searchParams.get('customizeDownload') === 'true') {
			handleCustomizeDownload();
			window.history.replaceState(null, '', window.location.pathname);
			return;
		}
	}, [userStore.user, isLoading, isEditMode, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleMoveScaffold = async (scaffoldId: number, targetGroupId: number) => {
		const result = await scaffoldGroupStore.moveScaffoldToGroup(scaffoldId, targetGroupId);
		if (!result) {
			toast.error('Failed to move scaffold. Confirm the target group has matching metadata.');
			return false;
		}

		toast.success('Scaffold moved successfully.');
		const refreshedGroups = await scaffoldGroupStore.getSummarizedScaffoldGroups({
			selectedTags: [],
			sizeIds: [],
			restrictToPublicationDataset: false,
			isSimulated: null,
		});
		setAllGroups(refreshedGroups ?? []);
		return true;
	};

	if (isLoading) {
		return (
			<div className="container mx-auto py-8 px-6">
				<LoadingSpinner />
			</div>
		);
	}

	if (!publication) {
		return (
			<div className="container mx-auto py-8 px-6">
				<button type="button" onClick={() => navigate('/publications')} className="button-outline inline-flex items-center gap-2 mb-6">
					<FaArrowLeft size={12} />
					Publications
				</button>
				<div className="bg-white border border-gray-200 rounded-lg p-8 text-sm text-gray-500">Publication not found.</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 px-6">
			<div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0">
					<button type="button" onClick={() => navigate('/publications')} className="button-outline inline-flex items-center gap-2 mb-4">
						<FaArrowLeft size={12} />
						Publications
					</button>
					<h1 className="text-3xl font-bold text-gray-800 leading-tight break-words">{publication.title}</h1>
					<div className="mt-2 text-sm text-gray-500">
						{publication.authors} · {publication.journal} · {new Date(publication.publishedAt).toLocaleDateString()}
					</div>
					<a
						href={`https://doi.org/${publication.doi}`}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-1 inline-block text-sm text-link-100 hover:underline break-all"
					>
						{publication.doi}
					</a>
					<div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
						<span className="rounded bg-white border border-gray-200 px-2 py-1">{selectedGroupIds.size} selected groups</span>
						<span className="rounded bg-white border border-gray-200 px-2 py-1">{selectedScaffoldCount} scaffolds</span>
					</div>
				</div>

				<div className="flex shrink-0 flex-wrap gap-2">
					{isEditMode ? (
						<>
							<button type="button" onClick={handleCancelEdit} className="button-outline inline-flex items-center gap-2" disabled={isSaving}>
								<FaTimes size={12} />
								Cancel
							</button>
							<button type="button" onClick={handleSave} className="button-primary mb-0 inline-flex w-auto items-center gap-2" disabled={isSaving || !hasChanges}>
								<FaSave size={12} />
								{isSaving ? 'Saving...' : 'Save Changes'}
							</button>
						</>
					) : canEdit && (
						<>
							<button type="button" onClick={handleStartEdit} className="button-secondary inline-flex items-center gap-2">
								<FaEdit size={12} />
								Edit
							</button>
						</>
					)}
				</div>
			</div>

			<ScaffoldGroupLibrary
				scaffoldGroups={visibleGroups}
				publications={publications}
				isAdmin={isAdmin}
				showFolders={isEditMode}
				customFolders={isEditMode ? [
					{ key: 'selected', label: 'Selected', filter: group => selectedGroupIds.has(group.id) },
					{ key: 'available', label: 'Available', filter: group => !selectedGroupIds.has(group.id) },
				] : undefined}
				canManageScaffolds={isEditMode && canEdit}
				canManageImages={false}
				canManageVisibility={false}
				showVisibility={false}
				canDeleteGroups={false}
				getGroupFolderAction={isEditMode ? group => selectedGroupIds.has(group.id)
					? { label: 'Remove', targetFolderKey: 'available', title: 'Remove from publication' }
					: { label: 'Add', targetFolderKey: 'selected', title: 'Add to publication' } : undefined}
				onMoveGroupToFolder={isEditMode ? handleMoveGroupToFolder : undefined}
				canDownloadGroup={true}
				isGroupDownloadLoading={downloadMode === 'group'}
				onDownloadGroup={handleDownloadGroup}
				headerAction={!isEditMode ? (
					<DownloadMenu
						compact
						isOpen={downloadMenuOpen}
						loadingMode={downloadMode}
						onToggle={() => setDownloadMenuOpen(prev => !prev)}
						onClose={() => setDownloadMenuOpen(false)}
						onComprehensive={() => {
							setDownloadMenuOpen(false);
							handleDownloadPublication();
						}}
						onCustomized={() => {
							setDownloadMenuOpen(false);
							handleCustomizeDownload();
						}}
					/>
				) : undefined}
				onInteractGroup={(group, scaffoldId) => scaffoldGroupStore.navigateToVisualization(group, scaffoldId)}
				onDeleteGroup={async () => undefined}
				onUploadImages={async () => null}
				onUpdateImage={async (_group: ScaffoldGroup, _image: Image, _updates: Partial<ImageToUpdate>) => null}
				onDeleteImage={async () => null}
				onMoveScaffold={handleMoveScaffold}
				onUpdateVisibility={async () => null}
			/>
		</div>
	);
};

const setsEqual = (left: Set<number>, right: Set<number>) => {
	if (left.size !== right.size) return false;
	for (const value of Array.from(left)) {
		if (!right.has(value)) return false;
	}
	return true;
};

const makePublicationWorkbookFilename = (group: ScaffoldGroup, fallbackFilename: string) => {
	const rawBase = group.name?.trim() || fallbackFilename.replace(/\.xlsx$/i, '') || `scaffold_group_${group.id}`;
	const safeBase = rawBase
		.replace(/[^a-z0-9]+/gi, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 60) || 'scaffold_group';

	return `${safeBase}_group_${group.id}.xlsx`;
};

const DownloadMenu: React.FC<{
	isOpen: boolean;
	loadingMode: 'comprehensive' | 'customized' | 'group' | null;
	onToggle: () => void;
	onClose: () => void;
	onComprehensive: () => void;
	onCustomized: () => void;
	compact?: boolean;
}> = ({ isOpen, loadingMode, onToggle, onClose, onComprehensive, onCustomized, compact = false }) => {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;

		const handlePointerDown = (event: MouseEvent | TouchEvent) => {
			if (!menuRef.current || menuRef.current.contains(event.target as Node)) return;
			onClose();
		};

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('touchstart', handlePointerDown);
		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('touchstart', handlePointerDown);
		};
	}, [isOpen, onClose]);

	return (
		<div ref={menuRef} className="relative z-30">
			<button
				type="button"
				onClick={onToggle}
				className={compact
					? 'inline-flex h-9 w-9 items-center justify-center rounded-md bg-link-300 text-white shadow-sm transition hover:bg-link-400 focus:outline-none focus:ring-2 focus:ring-link-300 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70'
					: 'button-outline inline-flex items-center gap-2'}
				disabled={loadingMode !== null}
				aria-label="Download publication data"
				title="Download publication data"
			>
				{loadingMode ? <FaSpinner className="animate-spin" size={12} /> : <FaDownload size={12} />}
				{!compact && (
					<>
						{loadingMode === 'comprehensive'
							? 'Preparing...'
							: loadingMode === 'customized'
								? 'Opening...'
								: 'Download Data'}
						{!loadingMode && <FaChevronDown size={10} />}
					</>
				)}
			</button>
			{isOpen && (
				<div className="absolute left-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl md:left-auto md:right-0">
					<button
						type="button"
						onClick={onComprehensive}
						className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
					>
						Comprehensive
					</button>
					<button
						type="button"
						onClick={onCustomized}
						className="w-full border-t border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
					>
						Customized
					</button>
				</div>
			)}
		</div>
	);
};

export default observer(PublicationData);
