import React, { useCallback, useEffect, useState } from "react";
import agent from "../../../app/api/agent";
import { DomainListItem } from "../../../app/models/domainManager";
import { Pagination } from "../../../app/models/job";

const PAGE_SIZE = 20;

const DomainBrowserTable: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
	const [domains, setDomains] = useState<DomainListItem[]>([]);
	const [pagination, setPagination] = useState<Pagination | null>(null);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);

	// Filters
	const [category, setCategory] = useState<string>("");
	const [hasMetadata, setHasMetadata] = useState<string>("");
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");

	const fetchDomains = useCallback(async () => {
		setLoading(true);
		try {
			const filters: { category?: string; hasMetadata?: boolean; search?: string } = {};
			if (category) filters.category = category;
			if (hasMetadata === "true") filters.hasMetadata = true;
			else if (hasMetadata === "false") filters.hasMetadata = false;
			if (search) filters.search = search;

			const res = await agent.Admin.getDomainList(page, PAGE_SIZE, filters);
			setDomains(res.data);
			setPagination(res.pagination);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, category, hasMetadata, search, refreshKey]);

	useEffect(() => {
		fetchDomains();
	}, [fetchDomains]);

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setPage(1);
		setSearch(searchInput);
	};

	return (
		<div className="border rounded-lg bg-white shadow p-6">
			<h2 className="text-lg font-semibold mb-4">Domain Browser</h2>

			{/* Filter bar */}
			<div className="flex flex-wrap gap-4 mb-4 items-end">
				<div>
					<label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
					<select
						className="p-2 border rounded-md text-sm"
						value={category}
						onChange={(e) => { setCategory(e.target.value); setPage(1); }}
					>
						<option value="">All</option>
						<option value="Particles">Particles</option>
						<option value="Pores">Pores</option>
						<option value="Other">Other</option>
					</select>
				</div>
				<div>
					<label className="block text-xs font-medium text-gray-600 mb-1">Metadata</label>
					<select
						className="p-2 border rounded-md text-sm"
						value={hasMetadata}
						onChange={(e) => { setHasMetadata(e.target.value); setPage(1); }}
					>
						<option value="">All</option>
						<option value="true">Has Metadata</option>
						<option value="false">Missing Metadata</option>
					</select>
				</div>
				<form onSubmit={handleSearchSubmit} className="flex gap-2">
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Search Filename</label>
						<input
							type="text"
							className="p-2 border rounded-md text-sm"
							placeholder="e.g. labeledDomain"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
						/>
					</div>
					<button type="submit" className="self-end px-3 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-700">
						Search
					</button>
				</form>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full text-sm text-left">
					<thead className="bg-gray-50 text-gray-600 text-xs uppercase">
						<tr>
							<th className="px-3 py-2">ID</th>
							<th className="px-3 py-2">Scaffold</th>
							<th className="px-3 py-2">Group</th>
							<th className="px-3 py-2">Category</th>
							<th className="px-3 py-2">Original Filename</th>
							<th className="px-3 py-2">Mesh</th>
							<th className="px-3 py-2">Metadata</th>
							<th className="px-3 py-2">Created</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr><td colSpan={8} className="px-3 py-4 text-center text-gray-400">Loading…</td></tr>
						) : domains.length === 0 ? (
							<tr><td colSpan={8} className="px-3 py-4 text-center text-gray-400">No domains found</td></tr>
						) : (
							domains.map((d) => (
								<tr key={d.id} className="border-t hover:bg-gray-50">
									<td className="px-3 py-2 font-mono">{d.id}</td>
									<td className="px-3 py-2">{d.scaffoldId}</td>
									<td className="px-3 py-2">{d.scaffoldGroupId}</td>
									<td className="px-3 py-2">{d.category}</td>
									<td className="px-3 py-2 max-w-xs truncate" title={d.originalFileName ?? ""}>
										{d.originalFileName ?? "—"}
									</td>
									<td className="px-3 py-2">
										<span className={d.hasMesh ? "text-green-600" : "text-red-500"}>
											{d.hasMesh ? "Yes" : "No"}
										</span>
									</td>
									<td className="px-3 py-2">
										<span className={d.hasMetadata ? "text-green-600" : "text-red-500"}>
											{d.hasMetadata ? "Yes" : "No"}
										</span>
									</td>
									<td className="px-3 py-2 text-xs text-gray-500">
										{new Date(d.createdAt).toLocaleDateString()}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			{pagination && pagination.totalPages > 1 && (
				<div className="flex items-center justify-between mt-4 text-sm text-gray-600">
					<span>
						Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total)
					</span>
					<div className="flex gap-2">
						<button
							className="px-3 py-1 border rounded disabled:opacity-40"
							disabled={pagination.currentPage <= 1}
							onClick={() => setPage((p) => p - 1)}
						>
							Previous
						</button>
						<button
							className="px-3 py-1 border rounded disabled:opacity-40"
							disabled={pagination.currentPage >= pagination.totalPages}
							onClick={() => setPage((p) => p + 1)}
						>
							Next
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default DomainBrowserTable;
