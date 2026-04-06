import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../app/stores/store';
import { FaSpinner } from 'react-icons/fa';
import { Publication, PublicationToCreate } from '../../app/models/publication';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import History from "../../app/helpers/History";
import { MdOutlineRemoveRedEye, MdDeleteOutline } from "react-icons/md";

// ─── types ─────────────────────────────────────────────────────────────────

type ModalStep = 'none' | 'addPublication' | 'confirmDataset' | 'addDataset';

const emptyForm: PublicationToCreate = {
	title: '', authors: '', journal: '', publishedAt: '', doi: '', citation: null,
};

// ─── component ──────────────────────────────────────────────────────────────

const Publications: React.FC = () => {
	const { publicationStore, userStore, scaffoldGroupStore } = useStore();
	const { getPublications, createPublication, createDataset, deletePublication } = publicationStore;

	const [isLoading, setIsLoading] = useState(true);
	const [publications, setPublications] = useState<Publication[]>([]);
	const [step, setStep] = useState<ModalStep>('none');
	const [form, setForm] = useState<PublicationToCreate>(emptyForm);
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const newPubIdRef = useRef<number | null>(null);

	const [scaffoldSearch, setScaffoldSearch] = useState('');
	const [allScaffolds, setAllScaffolds] = useState<ScaffoldGroup[]>([]);
	const [scaffoldsLoading, setScaffoldsLoading] = useState(false);
	const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
	const [datasetError, setDatasetError] = useState<string | null>(null);

	const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const isAdmin = userStore.user?.roles?.includes('administrator') ?? false;

	const refreshPublications = async () => {
		setIsLoading(true);
		const results = await getPublications();
		setPublications(results);
		setIsLoading(false);
	};

	useEffect(() => { refreshPublications(); }, []); // eslint-disable-line

	// debounced scaffold search
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

	const openAddPublication = () => {
		setForm(emptyForm); setFormError(null); newPubIdRef.current = null;
		setStep('addPublication');
	};

	const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		setForm(prev => ({ ...prev, [name]: value || null }));
	};

	const handleSavePublication = async () => {
		if (!form.title.trim() || !form.authors.trim() || !form.journal.trim() || !form.doi.trim() || !form.publishedAt) {
			setFormError('Please fill in all required fields.'); return;
		}
		setIsSubmitting(true); setFormError(null);
		const { success, error } = await createPublication(form);
		setIsSubmitting(false);
		if (!success) { setFormError(error ?? 'Unknown error.'); return; }
		const results = await getPublications();
		setPublications(results);
		newPubIdRef.current = results.find(p => p.title === form.title)?.id ?? null;
		setStep('confirmDataset');
	};

	const handleOpenDataset = () => {
		setSelectedGroupIds(new Set()); setScaffoldSearch('');
		setDatasetError(null); setAllScaffolds([]);
		setStep('addDataset');
	};

	const toggleGroup = (id: number) => {
		setSelectedGroupIds(prev => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const handleSaveDataset = async () => {
		if (selectedGroupIds.size === 0) { setDatasetError('Please select at least one scaffold group.'); return; }
		const pubId = newPubIdRef.current;
		if (!pubId) { setDatasetError('Publication ID missing.'); return; }
		const scaffoldIds = allScaffolds
			.filter(g => selectedGroupIds.has(g.id))
			.flatMap(g => g.scaffoldIds);
		setIsSubmitting(true); setDatasetError(null);
		const { success, error } = await createDataset(pubId, scaffoldIds);
		setIsSubmitting(false);
		if (!success) { setDatasetError(error ?? 'Unknown error.'); return; }
		setStep('none');
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

	return (
		<div className="container mx-auto py-8 px-2">
			<div className="text-3xl text-gray-700 font-bold mb-12">Publications</div>

			{isLoading ? (
				<div className="flex justify-center items-center py-8"><FaSpinner className="animate-spin" size={40} /></div>
			) : (
				<>
					{isAdmin && (
						<div className="flex justify-end mb-4">
							<button className="button-primary w-24" onClick={openAddPublication}>Add</button>
						</div>
					)}
					<div className="w-full overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
									<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publication</th>
									<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOI</th>
									<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{publications?.map((pub, index) => (
									<tr key={pub.id} className="hover:bg-gray-50">
										<td className="px-4 py-4 text-sm text-gray-700">{index + 1}</td>
										<td className="px-4 py-4">
											<div className="font-semibold text-gray-800">{pub.title}</div>
											<div className="text-xs text-gray-500 mt-1">{pub.authors}</div>
											<div className="text-xs text-gray-500">{pub.journal}</div>
											<div className="text-xs text-gray-400">{new Date(pub.publishedAt).toLocaleDateString()}</div>
										</td>
										<td className="px-4 py-4 text-sm text-blue-600 break-all">
											<a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{pub.doi}</a>
										</td>
										<td className="px-4 py-4">
											<div className="flex items-center gap-3">
												<button className="text-xl text-gray-600 hover:text-blue-600" onClick={() => handleViewInExplore(pub.id)} title="View in Explore">
													<MdOutlineRemoveRedEye />
												</button>
												{isAdmin && (
													<button className="text-xl text-gray-400 hover:text-red-500" onClick={() => setConfirmDeleteId(pub.id)} title="Delete Publication">
														<MdDeleteOutline />
													</button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}

			{/* Confirm Delete Modal */}
			{confirmDeleteId !== null && (
				<Overlay>
					<ModalBox title="Delete Publication">
						<p className="text-sm text-gray-600">Are you sure you want to delete this publication? This will also remove all associated datasets and scaffold links.</p>
						<ModalFooter>
							<CancelBtn onClick={() => setConfirmDeleteId(null)} disabled={isDeleting} />
							<button
								className="px-4 py-2 text-sm rounded bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
								onClick={handleConfirmDelete}
								disabled={isDeleting}
							>
								{isDeleting && <FaSpinner className="animate-spin" size={13} />}
								{isDeleting ? 'Deleting...' : 'Delete'}
							</button>
						</ModalFooter>
					</ModalBox>
				</Overlay>
			)}

			{/* Modal 1 — Add Publication */}
			{step === 'addPublication' && (
				<Overlay>
					<ModalBox title="Add Publication">
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
							<SaveBtn onClick={handleSavePublication} loading={isSubmitting} />
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
							<button className="button-primary px-4 py-2 text-sm w-auto mb-0" onClick={handleOpenDataset}>Yes, add now</button>
						</ModalFooter>
					</ModalBox>
				</Overlay>
			)}

			{/* Modal 3 — Pick scaffold groups */}
			{step === 'addDataset' && (
				<Overlay>
					<ModalBox title="Link Scaffold Groups" wide>
						<input value={scaffoldSearch} onChange={e => setScaffoldSearch(e.target.value)} className={`${inputCls} mb-3`} placeholder="Search by name or tag..." />

						{selectedGroupIds.size > 0 && (
							<div className="flex flex-wrap gap-1 mb-3">
								{allScaffolds.filter(g => selectedGroupIds.has(g.id)).map(g => (
									<span key={g.id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full cursor-pointer" onClick={() => toggleGroup(g.id)}>
										{g.name || `Group ${g.id}`} ✕
									</span>
								))}
							</div>
						)}

						<div className="border border-gray-200 rounded overflow-y-auto max-h-72">
							{scaffoldsLoading ? (
								<div className="flex justify-center py-6"><FaSpinner className="animate-spin" size={24} /></div>
							) : allScaffolds.length === 0 ? (
								<p className="text-sm text-gray-400 text-center py-6">No scaffold groups found.</p>
							) : (
								allScaffolds.map(g => (
									<div key={g.id}
										className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 ${selectedGroupIds.has(g.id) ? 'bg-blue-50' : ''}`}
										onClick={() => toggleGroup(g.id)}
									>
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
							<SaveBtn onClick={handleSaveDataset} loading={isSubmitting} label="Link Scaffolds" />
						</ModalFooter>
					</ModalBox>
				</Overlay>
			)}
		</div>
	);
};

export default observer(Publications);

// ─── shared UI ──────────────────────────────────────────────────────────────

const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";

const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">{children}</div>
);

const ModalBox: React.FC<{ title: string; wide?: boolean; children: React.ReactNode }> = ({ title, wide, children }) => (
	<div className={`bg-white rounded-lg shadow-xl mx-4 p-6 w-full ${wide ? 'max-w-xl' : 'max-w-lg'}`}>
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