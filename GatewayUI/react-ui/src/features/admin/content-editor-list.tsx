import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import agent from "../../app/api/agent";
import { useStore } from "../../app/stores/store";
import { ContentPageSummary } from "../../app/models/contentPage";
import { FiPlus, FiTrash2 } from "react-icons/fi";

const AREAS = ["learn", "documentation"] as const;

const ContentEditorList: React.FC = () => {
	const [pages, setPages] = useState<ContentPageSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [newArea, setNewArea] = useState<string>("learn");
	const { contentStore } = useStore();
	const navigate = useNavigate();

	const fetchAll = async () => {
		setLoading(true);
		try {
			const [learnRes, docRes] = await Promise.all([
				agent.Content.getPages("learn"),
				agent.Content.getPages("documentation"),
			]);
			setPages([...learnRes.data, ...docRes.data]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAll();
	}, []);

	const handleCreate = async () => {
		if (!newTitle.trim()) return;
		const slug = newTitle
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		try {
			const res = await agent.Content.createPage({
				slug,
				title: newTitle.trim(),
				area: newArea,
				comingSoon: true,
				sortOrder: pages.filter((p) => p.area === newArea).length,
				sections: [],
			});
			contentStore.invalidateArea(newArea);
			toast.success("Page created");
			navigate(`/admin/content/${res.data.slug}`);
		} catch {
			toast.error("Failed to create page");
		}
	};

	const handleDelete = async (page: ContentPageSummary) => {
		if (!window.confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
		try {
			await agent.Content.deletePage(page.id);
			contentStore.invalidateArea(page.area);
			setPages(pages.filter((p) => p.id !== page.id));
			toast.success("Page deleted");
		} catch {
			toast.error("Failed to delete page");
		}
	};

	if (loading) return <div className="container mx-auto py-8 px-6 text-gray-400">Loading...</div>;

	const grouped = pages.reduce<Record<string, ContentPageSummary[]>>((acc, p) => {
		(acc[p.area] ??= []).push(p);
		return acc;
	}, {});

	return (
		<div className="container mx-auto py-8 px-6">
			<div className="flex items-center justify-between mb-8">
				<div className="text-3xl text-gray-700 font-bold">Content Pages</div>
				<button
					onClick={() => setCreating(!creating)}
					className="flex items-center gap-1 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
				>
					<FiPlus className="w-4 h-4" /> New page
				</button>
			</div>

			{creating && (
				<div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 flex items-end gap-4">
					<div className="flex-1">
						<label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
						<input
							type="text"
							value={newTitle}
							onChange={(e) => setNewTitle(e.target.value)}
							placeholder="e.g. Getting Started with Meshes"
							className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-link-100"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
						<select
							value={newArea}
							onChange={(e) => setNewArea(e.target.value)}
							className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-link-100"
						>
							{AREAS.map((a) => (
								<option key={a} value={a}>
									{a}
								</option>
							))}
						</select>
					</div>
					<button
						onClick={handleCreate}
						disabled={!newTitle.trim()}
						className="button-primary px-6 py-2 disabled:opacity-50"
					>
						Create
					</button>
				</div>
			)}

			{Object.entries(grouped).map(([area, areaPages]) => (
				<div key={area} className="mb-8">
					<h2 className="text-xl font-semibold text-gray-700 mb-4 capitalize">{area}</h2>
					<div className="space-y-2">
						{areaPages.map((p) => (
							<div
								key={p.id}
								className="flex items-center bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
							>
								<Link
									to={`/admin/content/${p.slug}`}
									className="flex-1 flex items-center justify-between"
								>
									<div>
										<span className="font-medium text-gray-800">{p.title}</span>
										<span className="ml-2 text-sm text-gray-400">/{p.slug}</span>
									</div>
									<div className="flex items-center gap-2">
										{p.comingSoon && (
											<span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
												Coming soon
											</span>
										)}
										<span className="text-gray-400 text-sm">&rarr;</span>
									</div>
								</Link>
								<button
									onClick={() => handleDelete(p)}
									className="ml-3 p-1.5 text-gray-300 hover:text-red-500 transition-colors"
									title="Delete page"
								>
									<FiTrash2 className="w-4 h-4" />
								</button>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
};

export default ContentEditorList;
