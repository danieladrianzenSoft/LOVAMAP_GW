import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../app/stores/store';
import { FaSpinner } from 'react-icons/fa';
import { Publication, PublicationToCreate, DescriptorRuleToCreate } from '../../app/models/publication';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import { DescriptorType } from '../../app/models/descriptorType';
import LoadingSpinner from '../../app/common/loading-spinner/loading-spinner';
import DataTable, { DataTableColumn } from '../../app/common/data-table/data-table';
import History from "../../app/helpers/History";
import { MdOutlineRemoveRedEye, MdDeleteOutline, MdEditNote } from "react-icons/md";

// ─── JobSelectionMode enum (mirrors backend) ─────────────────────────────────
const JOB_MODES = [
	{ value: 0, label: 'Latest for scaffold' },
	{ value: 1, label: 'Specific job' },
	{ value: 2, label: 'Latest regardless of job' },
	{ value: 3, label: 'Legacy (no job only)' },
];

// ─── types ───────────────────────────────────────────────────────────────────
type ModalStep = 'none' | 'addPublication' | 'confirmDataset' | 'addDataset' | 'addDescriptorRules';

const emptyForm: PublicationToCreate = {
	title: '', authors: '', journal: '', publishedAt: '', doi: '', citation: null,
};

interface DescriptorRuleState {
	enabled: boolean;
	jobMode: number;
	jobId: string;
}

// ─── component ───────────────────────────────────────────────────────────────
const Publications: React.FC = () => {
	const { publicationStore, userStore, scaffoldGroupStore, descriptorStore, jobStore } = useStore();
	const { getPublications, createPublication, updatePublication, createDataset, upsertDataset, deletePublication } = publicationStore;

	// list
	const [isLoading, setIsLoading] = useState(true);
	const [publications, setPublications] = useState<Publication[]>([]);

	// modal flow
	const [step, setStep] = useState<ModalStep>('none');
	// 4/13 JacklynX changed - null = create mode, number = edit mode for publication
	const [editingPubId, setEditingPubId] = useState<number | null>(null);
	const [form, setForm] = useState<PublicationToCreate>(emptyForm);
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const newPubIdRef = useRef<number | null>(null);
	// 4/13 JacklynX changed - true = upsert existing dataset, false = create new
	const isEditingDataset = useRef(false);

	// scaffold picker
	const [scaffoldSearch, setScaffoldSearch] = useState('');
	const [allScaffolds, setAllScaffolds] = useState<ScaffoldGroup[]>([]);
	const [scaffoldsLoading, setScaffoldsLoading] = useState(false);
	const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
	const [datasetError, setDatasetError] = useState<string | null>(null);

	// descriptor rules
	const [descriptorTypes, setDescriptorTypes] = useState<DescriptorType[]>([]);
	const [descriptorRules, setDescriptorRules] = useState<Record<number, DescriptorRuleState>>({});
	const [defaultJobMode, setDefaultJobMode] = useState<number>(0);
	const [jobs, setJobs] = useState<{ id: string; label: string }[]>([]);
	const [descriptorError, setDescriptorError] = useState<string | null>(null);

	// delete confirm
	const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const isAdmin = userStore.user?.roles?.includes('administrator') ?? false;

	// ── fetch list ─────────────────────────────────────────────────────────
	const refreshPublications = async () => {
		setIsLoading(true);
		const results = await getPublications();
		setPublications(results);
		setIsLoading(false);
	};
	useEffect(() => { refreshPublications(); }, []); // eslint-disable-line

	// ── scaffold search (debounced) ────────────────────────────────────────
	useEffect(() => {
		if (step !== 'addDataset') return;
		const handler = setTimeout(async () => {
			setScaffoldsLoading(true);
			try {
				const response = await scaffoldGroupStore.getSummarizedScaffoldGroups({
					selectedTags: [], sizeIds: [], restrictToPublicationDataset: false, isSimulated: null,
				});
				const all: ScaffoldGroup[] = response ?? [];
				const filtered = scaffoldSearch.trim()
					? all.filter(g =>
						g.name?.toLowerCase().includes(scaffoldSearch.toLowerCase()) ||
						g.tags?.some(t => t.toLowerCase().includes(scaffoldSearch.toLowerCase()))
					) : all;
				setAllScaffolds(filtered);
			} catch { setAllScaffolds([]); }
			finally { setScaffoldsLoading(false); }
		}, 300);
		return () => clearTimeout(handler);
	}, [scaffoldSearch, step]); // eslint-disable-line

	// ── load descriptor types + jobs when entering descriptor rules step ───
	useEffect(() => {
		if (step !== 'addDescriptorRules') return;
		const load = async () => {
			const types = await descriptorStore.getDescriptorTypes();
			setDescriptorTypes(types);
			const initial: Record<number, DescriptorRuleState> = {};
			types.forEach(t => {
				initial[t.id] = descriptorRules[t.id] ?? { enabled: false, jobMode: 0, jobId: '' };
			});
			setDescriptorRules(initial);
			const jobList = await jobStore.getAllJobs();
			setJobs((jobList ?? [])
				.filter(j => j.status === 'Completed')
				.map(j => ({
					id: j.id,
					label: `${j.id.slice(0, 8)}... · ${new Date(j.submittedAt).toLocaleDateString()} · ${j.status}`,
				})));
		};
		load();
	}, [step]); // eslint-disable-line

	// ── handlers ──────────────────────────────────────────────────────────

	const openAddPublication = () => {
		setEditingPubId(null);
		setForm(emptyForm);
		setFormError(null);
		newPubIdRef.current = null;
		setStep('addPublication');
	};

	// 4/13 JacklynX changed - open Edit Publication modal pre-filled with existing data
	const openEditPublication = (pub: Publication) => {
		setEditingPubId(pub.id);
		setForm({
			title: pub.title,
			authors: pub.authors,
			journal: pub.journal,
			publishedAt: new Date(pub.publishedAt).toISOString().split('T')[0],
			doi: pub.doi,
			citation: pub.citation,
		});
		setFormError(null);
		setStep('addPublication');
	};

	const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		setForm(prev => ({ ...prev, [name]: value || null }));
	};

	const handleSavePublication = async () => {
		if (!form.title?.trim() || !form.authors?.trim() || !form.journal?.trim() || !form.doi?.trim() || !form.publishedAt) {
			setFormError('Please fill in all required fields.'); return;
		}
		setIsSubmitting(true); setFormError(null);
		if (editingPubId !== null) {
			const { success, error } = await updatePublication(editingPubId, form);
			setIsSubmitting(false);
			if (!success) { setFormError(error ?? 'Unknown error.'); return; }
			await refreshPublications();
			setStep('none');
		} else {
			const { success, error } = await createPublication(form);
			setIsSubmitting(false);
			if (!success) { setFormError(error ?? 'Unknown error.'); return; }
			const results = await getPublications();
			setPublications(results);
			newPubIdRef.current = results.find(p => p.title === form.title)?.id ?? null;
			setStep('confirmDataset');
		}
	};

	// 4/13 JacklynX changed - open dataset modal; editMode=true calls upsert to edit existing dataset
	const handleOpenDataset = (pubId?: number, editMode = false, pub?: Publication) => {
		if (pubId) newPubIdRef.current = pubId;
		isEditingDataset.current = editMode;
		// 4/27 JacklynX changed - preselect already-linked scaffold groups when editing
		if (editMode && pub?.scaffoldGroupIds?.length) {
			setSelectedGroupIds(new Set(pub.scaffoldGroupIds));
		} else {
			setSelectedGroupIds(new Set());
		}
		setScaffoldSearch('');
		setDatasetError(null);
		setAllScaffolds([]);
		setDescriptorRules({});
		setDescriptorError(null);
		setStep('addDataset');
	};

	const toggleGroup = (id: number) => {
		setSelectedGroupIds(prev => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	// 4/27 JacklynX changed - select all scaffold groups
	const handleSelectAllScaffolds = () => {
		if (selectedGroupIds.size === allScaffolds.length) {
			setSelectedGroupIds(new Set());
		} else {
			setSelectedGroupIds(new Set(allScaffolds.map(g => g.id)));
		}
	};

	// 4/27 JacklynX changed - select all descriptor types
	const handleSelectAllDescriptors = () => {
		const allEnabled = descriptorTypes.every(dt => descriptorRules[dt.id]?.enabled);
		setDescriptorRules(prev => {
			const next = { ...prev };
			descriptorTypes.forEach(dt => {
				next[dt.id] = { ...next[dt.id], enabled: !allEnabled };
			});
			return next;
		});
	};

	// 4/27 JacklynX changed - apply default job mode to all enabled descriptors
	const handleApplyDefaultJobMode = (mode: number) => {
		setDefaultJobMode(mode);
		setDescriptorRules(prev => {
			const next = { ...prev };
			descriptorTypes.forEach(dt => {
				if (next[dt.id]?.enabled) {
					next[dt.id] = { ...next[dt.id], jobMode: mode, jobId: '' };
				}
			});
			return next;
		});
	};

	const handleNextToDescriptorRules = () => {
		if (selectedGroupIds.size === 0) { setDatasetError('Please select at least one scaffold group.'); return; }
		setDatasetError(null);
		setDescriptorError(null);
		setStep('addDescriptorRules');
	};

	const toggleDescriptorRule = (typeId: number) => {
		setDescriptorRules(prev => ({
			...prev,
			[typeId]: { ...prev[typeId], enabled: !prev[typeId]?.enabled },
		}));
	};

	const updateRuleField = (typeId: number, field: 'jobMode' | 'jobId', value: any) => {
		setDescriptorRules(prev => ({
			...prev,
			[typeId]: { ...prev[typeId], [field]: value },
		}));
	};

	const handleSaveDataset = async () => {
		const pubId = newPubIdRef.current;
		if (!pubId) { setDescriptorError('Publication ID missing.'); return; }
		for (const [idStr, rule] of Object.entries(descriptorRules)) {
			if (rule.enabled && rule.jobMode === 1 && !rule.jobId) {
				setDescriptorError(`Please select a job for the descriptor that uses "Specific job" mode.`);
				return;
			}
		}
		const scaffoldIds = allScaffolds
			.filter(g => selectedGroupIds.has(g.id))
			.flatMap(g => g.scaffoldIds);
		const rules: DescriptorRuleToCreate[] = Object.entries(descriptorRules)
			.filter(([, r]) => r.enabled)
			.map(([idStr, r]) => ({
				descriptorTypeId: Number(idStr),
				jobMode: r.jobMode,
				jobId: r.jobMode === 1 ? r.jobId : null,
			}));
		setIsSubmitting(true); setDescriptorError(null);
		const fn = isEditingDataset.current ? upsertDataset : createDataset;
		const { success, error } = await fn(pubId, scaffoldIds, rules);
		setIsSubmitting(false);
		if (!success) { setDescriptorError(error ?? 'Unknown error.'); return; }
		setStep('none');
		await refreshPublications();
	};

	const handleConfirmDelete = async () => {
		if (!confirmDeleteId) return;
		setIsDeleting(true);
		const { success, error } = await deletePublication(confirmDeleteId);
		setIsDeleting(false);
		if (!success) { alert(error ?? 'Failed to delete.'); return; }
		setConfirmDeleteId(null);
		await refreshPublications();
	};

	const handleViewInExplore = (pubId: number) => {
		History.push(`/explore?publicationId=${pubId}&restrictToPublicationDataset=true`);
	};

	// ── DataTable columns (professor's style) ─────────────────────────────
	const columns: DataTableColumn<Publication>[] = [
		{
			header: '#',
			render: (_pub, index) => index + 1,
		},
		{
			header: 'Publication',
			render: (pub) => (
				<div className={isAdmin ? 'cursor-pointer' : ''} onClick={() => isAdmin && openEditPublication(pub)}>
					<div className="font-semibold text-gray-800">{pub.title}</div>
					<div className="text-xs text-gray-500 mt-1">{pub.authors}</div>
					<div className="text-xs text-gray-500">{pub.journal}</div>
					<div className="text-xs text-gray-400">{new Date(pub.publishedAt).toLocaleDateString()}</div>
				</div>
			),
			cellClassName: '!text-gray-800',
		},
		{
			header: 'DOI',
			render: (pub) => (
				<a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
					{pub.doi}
				</a>
			),
			cellClassName: '!text-link-100 break-all',
		},
		{
			header: '',
			render: (pub) => (
				<div className="flex items-center gap-3">
					<button className="text-xl text-gray-600 hover:text-link-200" onClick={() => handleViewInExplore(pub.id)} title="View in Explore">
						<MdOutlineRemoveRedEye />
					</button>
					{isAdmin && (
						<>
							<button className="text-xl text-gray-500 hover:text-blue-600" onClick={() => openEditPublication(pub)} title="Edit Publication">
								<MdEditNote />
							</button>
							<button className="text-xs text-gray-500 hover:text-blue-600 border border-gray-300 hover:border-blue-400 rounded px-2 py-1" onClick={() => handleOpenDataset(pub.id, true, pub)} title="Edit Dataset">
								± Dataset
							</button>
							<button className="text-xl text-gray-400 hover:text-red-500" onClick={() => setConfirmDeleteId(pub.id)} title="Delete Publication">
								<MdDeleteOutline />
							</button>
						</>
					)}
				</div>
			),
		},
	];

	// ── render ────────────────────────────────────────────────────────────
	return (
		<div className="container mx-auto py-8 px-6">
			<div className="text-3xl text-gray-700 font-bold mb-12">Publications</div>

			{isLoading ? (
				<LoadingSpinner />
			) : (
				<>
					{isAdmin && (
						<div className="flex justify-end">
							<button className="button-primary items-center content-center w-24 mb-2" onClick={openAddPublication}>Add</button>
						</div>
					)}
					<div className="flex">
						<DataTable
							data={publications ?? []}
							columns={columns}
							rowKey={(pub) => pub.id}
						/>
					</div>
				</>
			)}

			{/* Confirm Delete */}
			{confirmDeleteId !== null && (
				<Overlay>
					<ModalBox title="Delete Publication">
						<p className="text-sm text-gray-600">Are you sure? This will also remove all associated datasets and scaffold links.</p>
						<ModalFooter>
							<CancelBtn onClick={() => setConfirmDeleteId(null)} disabled={isDeleting} />
							<button className="px-4 py-2 text-sm rounded bg-red-500 hover:bg-red-600 text-white flex items-center gap-2" onClick={handleConfirmDelete} disabled={isDeleting}>
								{isDeleting && <FaSpinner className="animate-spin" size={13} />}
								{isDeleting ? 'Deleting...' : 'Delete'}
							</button>
						</ModalFooter>
					</ModalBox>
				</Overlay>
			)}

			{/* Modal 1 — Add / Edit Publication */}
			{step === 'addPublication' && (
				<Overlay>
					<ModalBox title={editingPubId !== null ? 'Edit Publication' : 'Add Publication'}>
						<div className="space-y-3">
							<Field label="Title" required><input name="title" value={form.title} onChange={handleFormChange} className={inputCls} placeholder="Publication title" /></Field>
							<Field label="Authors" required><input name="authors" value={form.authors} onChange={handleFormChange} className={inputCls} placeholder="e.g. Smith J, Lee K, et al." /></Field>
							<Field label="Journal" required><input name="journal" value={form.journal} onChange={handleFormChange} className={inputCls} placeholder="e.g. Nature Biotechnology" /></Field>
							<Field label="Published Date" required><input type="date" name="publishedAt" value={form.publishedAt} onChange={handleFormChange} className={inputCls} /></Field>
							<Field label="DOI" required><input name="doi" value={form.doi} onChange={handleFormChange} className={inputCls} placeholder="e.g. 10.1038/s41587-021-00816-w" /></Field>
							<Field label="Citation" optional><textarea name="citation" value={form.citation ?? ''} onChange={handleFormChange} rows={2} className={inputCls} placeholder="Full citation string" /></Field>
						</div>
						{formError && <p className="mt-3 text-sm text-red-500">{formError}</p>}
						<ModalFooter>
							<CancelBtn onClick={() => setStep('none')} disabled={isSubmitting} />
							<SaveBtn onClick={handleSavePublication} loading={isSubmitting} label={editingPubId !== null ? 'Update' : 'Save'} />
						</ModalFooter>
					</ModalBox>
				</Overlay>
			)}

			{/* Modal 2 — Confirm dataset */}
			{step === 'confirmDataset' && (
				<Overlay>
					<ModalBox title="Publication Created!">
						<p className="text-sm text-gray-600 mb-2">Would you like to link scaffold groups to this publication now?</p>
						<ModalFooter>
							<button className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50" onClick={() => setStep('none')}>Skip for now</button>
							<button className="button-primary px-4 py-2 text-sm w-auto mb-0" onClick={() => handleOpenDataset()}>Yes, add now</button>
						</ModalFooter>
					</ModalBox>
				</Overlay>
			)}

			{/* Modal 3 — Scaffold picker */}
			{step === 'addDataset' && (
				<Overlay>
					<ModalBox title={isEditingDataset.current ? 'Edit Dataset — Select Scaffolds' : 'Link Scaffold Groups'} wide>
						<input value={scaffoldSearch} onChange={e => setScaffoldSearch(e.target.value)} className={`${inputCls} mb-2`} placeholder="Search by name or tag..." />

						{/* 4/27 JacklynX changed - select all button */}
						{allScaffolds.length > 0 && (
							<div className="flex items-center justify-between mb-2">
								<button
									className="text-xs text-blue-600 hover:underline"
									onClick={handleSelectAllScaffolds}
								>
									{selectedGroupIds.size === allScaffolds.length ? 'Deselect All' : 'Select All'}
								</button>
								<span className="text-xs text-gray-400">{allScaffolds.length} groups total</span>
							</div>
						)}
						{selectedGroupIds.size > 0 && (
							<div className="flex flex-wrap gap-1 mb-3">
								{allScaffolds.filter(g => selectedGroupIds.has(g.id)).map(g => (
									<span key={g.id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full cursor-pointer" onClick={() => toggleGroup(g.id)}>
										{g.name || `Group ${g.id}`} ✕
									</span>
								))}
							</div>
						)}
						<div className="border border-gray-200 rounded overflow-y-auto max-h-96">
							{scaffoldsLoading ? (
								<div className="flex justify-center py-6"><FaSpinner className="animate-spin" size={24} /></div>
							) : allScaffolds.length === 0 ? (
								<p className="text-sm text-gray-400 text-center py-6">No scaffold groups found.</p>
							) : (
								allScaffolds.map(g => (
									<div key={g.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 ${selectedGroupIds.has(g.id) ? 'bg-blue-50' : ''}`} onClick={() => toggleGroup(g.id)}>
										<input type="checkbox" readOnly checked={selectedGroupIds.has(g.id)} className="accent-blue-600 w-4 h-4 shrink-0" />
										<div>
											<div className="text-sm font-medium text-gray-800">{g.name || `Group ${g.id}`}</div>
											<div className="text-xs text-gray-400">
												{g.scaffoldIds?.length ?? 0} scaffold{g.scaffoldIds?.length !== 1 ? 's' : ''}
												{g.tags?.length ? ` · ${g.tags.slice(0, 3).join(', ')}` : ''}
											</div>
										</div>
									</div>
								))
							)}
						</div>
						<p className="text-xs text-gray-400 mt-2">{selectedGroupIds.size} group{selectedGroupIds.size !== 1 ? 's' : ''} selected</p>
						{datasetError && <p className="mt-2 text-sm text-red-500">{datasetError}</p>}
						<ModalFooter>
							<CancelBtn onClick={() => setStep('none')} disabled={isSubmitting} />
							<SaveBtn onClick={handleNextToDescriptorRules} label="Next →" />
						</ModalFooter>
					</ModalBox>
				</Overlay>
			)}

			{/* Modal 4 — Descriptor Rules */}
			{step === 'addDescriptorRules' && (
				<Overlay>
					<ModalBox title="Select Descriptor Rules" wide>
						<p className="text-xs text-gray-400 mb-3">For each descriptor type, choose whether to include it and how to select which job's results to use.</p>

						{/* 4/27 JacklynX changed - select all + default job mode */}
						<div className="flex items-center gap-4 mb-3 p-3 bg-gray-50 rounded border border-gray-200">
							<button
								className="text-xs text-blue-600 hover:underline shrink-0"
								onClick={handleSelectAllDescriptors}
							>
								{descriptorTypes.length > 0 && descriptorTypes.every(dt => descriptorRules[dt.id]?.enabled) ? 'Deselect All' : 'Select All'}
							</button>
							<div className="flex items-center gap-2 flex-1">
								<label className="text-xs text-gray-500 shrink-0">Default job mode:</label>
								<select
									value={defaultJobMode}
									onChange={e => handleApplyDefaultJobMode(Number(e.target.value))}
									className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
								>
									{JOB_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
								</select>
							</div>
						</div>
						<div className="border border-gray-200 rounded overflow-y-auto max-h-96">
							{descriptorTypes.length === 0 ? (
								<div className="flex justify-center py-6"><FaSpinner className="animate-spin" size={24} /></div>
							) : (
								descriptorTypes.map(dt => {
									const rule = descriptorRules[dt.id] ?? { enabled: false, jobMode: 0, jobId: '' };
									return (
										<div key={dt.id} className={`px-4 py-3 border-b border-gray-100 last:border-0 ${rule.enabled ? 'bg-blue-50' : ''}`}>
											<div className="flex items-center gap-3">
												<input type="checkbox" checked={rule.enabled} onChange={() => toggleDescriptorRule(dt.id)} className="accent-blue-600 w-4 h-4 shrink-0" />
												<div className="flex-1">
													<div className="text-sm font-medium text-gray-800">{dt.label || dt.name}</div>
													<div className="text-xs text-gray-400">{dt.category}{dt.subCategory ? ` · ${dt.subCategory}` : ''}{dt.unit ? ` · ${dt.unit}` : ''}</div>
												</div>
											</div>
											{rule.enabled && (
												<div className="mt-2 ml-7 space-y-2">
													<div>
														<label className="text-xs text-gray-500 mb-1 block">Job selection mode</label>
														<select value={rule.jobMode} onChange={e => updateRuleField(dt.id, 'jobMode', Number(e.target.value))} className={`${inputCls} text-xs py-1`}>
															{JOB_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
														</select>
													</div>
													{rule.jobMode === 1 && (
														<div>
															<label className="text-xs text-gray-500 mb-1 block">Select job <span className="text-red-400">*</span></label>
															<select value={rule.jobId} onChange={e => updateRuleField(dt.id, 'jobId', e.target.value)} className={`${inputCls} text-xs py-1`}>
																<option value="">-- select a job --</option>
																{jobs.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
															</select>
														</div>
													)}
												</div>
											)}
										</div>
									);
								})
							)}
						</div>
						<p className="text-xs text-gray-400 mt-2">{Object.values(descriptorRules).filter(r => r.enabled).length} descriptor{Object.values(descriptorRules).filter(r => r.enabled).length !== 1 ? 's' : ''} selected</p>
						{descriptorError && <p className="mt-2 text-sm text-red-500">{descriptorError}</p>}
						<ModalFooter>
							<button className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50" onClick={() => setStep('addDataset')}>← Back</button>
							<SaveBtn onClick={handleSaveDataset} loading={isSubmitting} label="Save Dataset" />
						</ModalFooter>
					</ModalBox>
				</Overlay>
			)}
		</div>
	);
};

export default observer(Publications);

// ─── shared UI ───────────────────────────────────────────────────────────────

const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";

const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">{children}</div>
);

const ModalBox: React.FC<{ title: string; wide?: boolean; children: React.ReactNode }> = ({ title, wide, children }) => (
	<div className={`bg-white rounded-lg shadow-xl mx-4 p-6 w-full overflow-y-auto max-h-screen ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
		<div className="text-xl font-bold text-gray-700 mb-4">{title}</div>
		{children}
	</div>
);

const Field: React.FC<{ label: string; required?: boolean; optional?: boolean; children: React.ReactNode }> = ({ label, required, optional, children }) => (
	<div>
		<label className="block text-xs font-medium text-gray-500 mb-1">
			{label} {required && <span className="text-red-400">*</span>}{optional && <span className="text-gray-400">(optional)</span>}
		</label>
		{children}
	</div>
);

const ModalFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<div className="mt-5 flex justify-end gap-3">{children}</div>
);

const CancelBtn: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
	<button className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50" onClick={onClick} disabled={disabled}>Cancel</button>
);

const SaveBtn: React.FC<{ onClick: () => void; loading?: boolean; label?: string }> = ({ onClick, loading, label = 'Save' }) => (
	<button className="button-primary px-4 py-2 text-sm w-auto mb-0 flex items-center gap-2" onClick={onClick} disabled={loading}>
		{loading && <FaSpinner className="animate-spin" size={13} />}
		{loading ? 'Saving...' : label}
	</button>
);
