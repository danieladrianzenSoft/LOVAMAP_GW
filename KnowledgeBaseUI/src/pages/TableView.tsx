import React, { useEffect, useState } from 'react';
import { papersApi, materialsApi, experimentsApi, outcomesApi } from '../api/client';
import type { Paper, Material, Experiment, Outcome } from '../models/rdfGraph';
import { FiSearch, FiChevronUp, FiChevronDown } from 'react-icons/fi';

type Tab = 'papers' | 'materials' | 'experiments' | 'outcomes';
type SortDir = 'asc' | 'desc';

const TABS: { key: Tab; label: string }[] = [
	{ key: 'papers', label: 'Papers' },
	{ key: 'materials', label: 'Materials' },
	{ key: 'experiments', label: 'Experiments' },
	{ key: 'outcomes', label: 'Outcomes' },
];

const TableView: React.FC = () => {
	const [tab, setTab] = useState<Tab>('papers');
	const [papers, setPapers] = useState<Paper[]>([]);
	const [materials, setMaterials] = useState<Material[]>([]);
	const [experiments, setExperiments] = useState<Experiment[]>([]);
	const [outcomes, setOutcomes] = useState<Outcome[]>([]);
	const [loaded, setLoaded] = useState<Set<Tab>>(new Set());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [sortField, setSortField] = useState<string>('');
	const [sortDir, setSortDir] = useState<SortDir>('asc');

	// Prefetch all tabs in parallel on mount
	useEffect(() => {
		Promise.all([
			papersApi.getAll().then(d => { setPapers(d); setLoaded(s => new Set(s).add('papers')); }),
			materialsApi.getAll().then(d => { setMaterials(d); setLoaded(s => new Set(s).add('materials')); }),
			experimentsApi.getAll().then(d => { setExperiments(d); setLoaded(s => new Set(s).add('experiments')); }),
			outcomesApi.getAll().then(d => { setOutcomes(d); setLoaded(s => new Set(s).add('outcomes')); }),
		])
			.catch((err: any) => setError(err?.message || 'Failed to load data.'))
			.finally(() => setLoading(false));
	}, []);

	const handleSort = (field: string) => {
		if (sortField === field) {
			setSortDir(d => d === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDir('asc');
		}
	};

	const SortIcon: React.FC<{ field: string }> = ({ field }) => {
		if (sortField !== field) return null;
		return sortDir === 'asc'
			? <FiChevronUp className="inline ml-0.5" size={12} />
			: <FiChevronDown className="inline ml-0.5" size={12} />;
	};

	const sortAndFilter = <T extends Record<string, any>>(data: T[], searchFields: (keyof T)[]): T[] => {
		let result = data;
		if (search.trim()) {
			const q = search.toLowerCase();
			result = result.filter(row =>
				searchFields.some(f => {
					const v = row[f];
					if (v == null) return false;
					if (Array.isArray(v)) return v.some((item: unknown) => String(item).toLowerCase().includes(q));
					return String(v).toLowerCase().includes(q);
				})
			);
		}
		if (sortField) {
			result = [...result].sort((a, b) => {
				const aVal = a[sortField];
				const bVal = b[sortField];
				if (aVal == null && bVal == null) return 0;
				if (aVal == null) return 1;
				if (bVal == null) return -1;
				const cmp = typeof aVal === 'string'
					? aVal.localeCompare(bVal as string)
					: (aVal as number) - (bVal as number);
				return sortDir === 'asc' ? cmp : -cmp;
			});
		}
		return result;
	};

	const renderTable = () => {
		switch (tab) {
			case 'papers': return <PapersTable data={sortAndFilter(papers, ['title', 'doi', 'journalTitle', 'year'])} onSort={handleSort} sortField={sortField} SortIcon={SortIcon} />;
			case 'materials': return <MaterialsTable data={sortAndFilter(materials, ['label', 'particleShape', 'particleMaterial', 'stiffnessQualitative'])} onSort={handleSort} sortField={sortField} SortIcon={SortIcon} />;
			case 'experiments': return <ExperimentsTable data={sortAndFilter(experiments, ['label', 'experimentCategory', 'experimentType', 'cellType', 'cultureDuration'])} onSort={handleSort} sortField={sortField} SortIcon={SortIcon} />;
			case 'outcomes': return <OutcomesTable data={sortAndFilter(outcomes, ['label', 'measurementCategory', 'measurementType', 'unit', 'scope'])} onSort={handleSort} sortField={sortField} SortIcon={SortIcon} />;
		}
	};

	const count = { papers: papers.length, materials: materials.length, experiments: experiments.length, outcomes: outcomes.length }[tab];
	const tabReady = loaded.has(tab);

	if (loading && !tabReady) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kb-500"></div>
				<span className="ml-3 text-gray-500 dark:text-gray-400">Loading data...</span>
			</div>
		);
	}

	if (error) {
		return <div className="text-center py-20 text-red-500">{error}</div>;
	}

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			{/* Tabs */}
			<div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
				{TABS.map(t => (
					<button
						key={t.key}
						onClick={() => setTab(t.key)}
						className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
							tab === t.key
								? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
								: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{/* Header + Search */}
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-xl font-bold text-gray-800 dark:text-white">
					{TABS.find(t => t.key === tab)!.label} ({count})
				</h1>
				<div className="flex items-center bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
					<FiSearch className="text-gray-400 mr-2" size={16} />
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search..."
						className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none w-64 placeholder-gray-400"
					/>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					{renderTable()}
				</div>
			</div>
		</div>
	);
};

// ── Sub-tables ──

interface TableProps<T> {
	data: T[];
	onSort: (field: string) => void;
	sortField: string;
	SortIcon: React.FC<{ field: string }>;
}

const TH: React.FC<{ field: string; label: string; align?: string; onSort: (f: string) => void; SortIcon: React.FC<{ field: string }> }> = ({ field, label, align, onSort, SortIcon }) => (
	<th
		className={`${align === 'right' ? 'text-right' : 'text-left'} px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-gray-200`}
		onClick={() => onSort(field)}
	>
		{label} <SortIcon field={field} />
	</th>
);

function EmptyRow({ cols, search }: { cols: number; search?: string }) {
	return (
		<tr>
			<td colSpan={cols} className="px-4 py-8 text-center text-gray-400">
				{search ? 'No results match your search.' : 'No data found.'}
			</td>
		</tr>
	);
}

const PapersTable: React.FC<TableProps<Paper>> = ({ data, onSort, SortIcon }) => (
	<table className="w-full text-sm text-gray-600 dark:text-gray-400">
		<thead>
			<tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
				<TH field="title" label="Title" onSort={onSort} SortIcon={SortIcon} />
				<TH field="doi" label="DOI" onSort={onSort} SortIcon={SortIcon} />
				<TH field="journalTitle" label="Journal" onSort={onSort} SortIcon={SortIcon} />
				<TH field="year" label="Year" align="right" onSort={onSort} SortIcon={SortIcon} />
				<th className="text-right px-4 py-3 font-medium">Authors</th>
			</tr>
		</thead>
		<tbody>
			{data.length === 0 ? <EmptyRow cols={5} /> : data.map(row => (
				<tr key={row.uri} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
					<td className="px-4 py-2 max-w-md truncate" title={row.title}>{row.title}</td>
					<td className="px-4 py-2 font-mono text-xs">{row.doi}</td>
					<td className="px-4 py-2">{row.journalTitle ?? '—'}</td>
					<td className="px-4 py-2 text-right">{row.year ?? '—'}</td>
					<td className="px-4 py-2 text-right" title={row.authorNames.join(', ')}>{row.authorNames.length}</td>
				</tr>
			))}
		</tbody>
	</table>
);

const MaterialsTable: React.FC<TableProps<Material>> = ({ data, onSort, SortIcon }) => (
	<table className="w-full text-sm text-gray-600 dark:text-gray-400">
		<thead>
			<tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
				<TH field="label" label="Label" onSort={onSort} SortIcon={SortIcon} />
				<TH field="particleShape" label="Shape" onSort={onSort} SortIcon={SortIcon} />
				<TH field="particleSizeMin" label="Size Range" align="right" onSort={onSort} SortIcon={SortIcon} />
				<TH field="particleMaterial" label="Material" onSort={onSort} SortIcon={SortIcon} />
				<TH field="stiffnessQualitative" label="Stiffness" onSort={onSort} SortIcon={SortIcon} />
			</tr>
		</thead>
		<tbody>
			{data.length === 0 ? <EmptyRow cols={5} /> : data.map(row => (
				<tr key={row.uri} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
					<td className="px-4 py-2 max-w-xs truncate" title={row.label}>{row.label}</td>
					<td className="px-4 py-2">{row.particleShape ?? '—'}</td>
					<td className="px-4 py-2 text-right">
						{row.particleSizeMin != null
							? row.particleSizeMin === row.particleSizeMax
								? `${row.particleSizeMin} ${row.particleSizeUnit ?? 'μm'}`
								: `${row.particleSizeMin}–${row.particleSizeMax} ${row.particleSizeUnit ?? 'μm'}`
							: '—'}
					</td>
					<td className="px-4 py-2">{row.particleMaterial ?? '—'}</td>
					<td className="px-4 py-2">{row.stiffnessQualitative ?? '—'}</td>
				</tr>
			))}
		</tbody>
	</table>
);

const ExperimentsTable: React.FC<TableProps<Experiment>> = ({ data, onSort, SortIcon }) => (
	<table className="w-full text-sm text-gray-600 dark:text-gray-400">
		<thead>
			<tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
				<TH field="label" label="Label" onSort={onSort} SortIcon={SortIcon} />
				<TH field="experimentCategory" label="Category" onSort={onSort} SortIcon={SortIcon} />
				<TH field="experimentType" label="Type" onSort={onSort} SortIcon={SortIcon} />
				<TH field="cellType" label="Cell Type" onSort={onSort} SortIcon={SortIcon} />
				<TH field="cultureDuration" label="Duration" onSort={onSort} SortIcon={SortIcon} />
			</tr>
		</thead>
		<tbody>
			{data.length === 0 ? <EmptyRow cols={5} /> : data.map(row => (
				<tr key={row.uri} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
					<td className="px-4 py-2 max-w-xs truncate" title={row.label}>{row.label}</td>
					<td className="px-4 py-2">{row.experimentCategory ?? '—'}</td>
					<td className="px-4 py-2">{row.experimentType ?? '—'}</td>
					<td className="px-4 py-2">{row.cellType ?? '—'}</td>
					<td className="px-4 py-2">{row.cultureDuration ?? '—'}</td>
				</tr>
			))}
		</tbody>
	</table>
);

const OutcomesTable: React.FC<TableProps<Outcome>> = ({ data, onSort, SortIcon }) => (
	<table className="w-full text-sm text-gray-600 dark:text-gray-400">
		<thead>
			<tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
				<TH field="label" label="Label" onSort={onSort} SortIcon={SortIcon} />
				<TH field="measurementCategory" label="Category" onSort={onSort} SortIcon={SortIcon} />
				<TH field="value" label="Value" align="right" onSort={onSort} SortIcon={SortIcon} />
				<TH field="scope" label="Scope" onSort={onSort} SortIcon={SortIcon} />
				<TH field="significant" label="Significant?" align="right" onSort={onSort} SortIcon={SortIcon} />
			</tr>
		</thead>
		<tbody>
			{data.length === 0 ? <EmptyRow cols={5} /> : data.map(row => (
				<tr key={row.uri} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
					<td className="px-4 py-2 max-w-xs truncate" title={row.label}>{row.label}</td>
					<td className="px-4 py-2">{row.measurementCategory ?? '—'}</td>
					<td className="px-4 py-2 text-right">
						{row.value != null ? `${row.value} ${row.unit ?? ''}`.trim() : '—'}
					</td>
					<td className="px-4 py-2">{row.scope ?? '—'}</td>
					<td className="px-4 py-2 text-right">
						{row.significant != null ? (row.significant ? 'Yes' : 'No') : '—'}
					</td>
				</tr>
			))}
		</tbody>
	</table>
);

export default TableView;
