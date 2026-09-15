import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import agent from "../../app/api/agent";
import { useStore } from "../../app/stores/store";
import { ContentPageDetail, ContentSection } from "../../app/models/contentPage";
import { FiArrowLeft, FiTrash2, FiPlus, FiArrowUp, FiArrowDown, FiEye } from "react-icons/fi";
import ContentRenderer from "../common/content-renderer";

const ContentEditor: React.FC = () => {
	const { slug } = useParams<{ slug: string }>();
	const { contentStore } = useStore();
	const [page, setPage] = useState<ContentPageDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [previewing, setPreviewing] = useState(false);

	// Local editable state
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [comingSoon, setComingSoon] = useState(false);
	const [sections, setSections] = useState<ContentSection[]>([]);

	const fetchPage = useCallback(async () => {
		if (!slug) return;
		setLoading(true);
		try {
			const res = await agent.Content.getPageBySlug(slug);
			const p = res.data;
			setPage(p);
			setTitle(p.title);
			setDescription(p.description || "");
			setComingSoon(p.comingSoon);
			setSections([...p.sections]);
		} finally {
			setLoading(false);
		}
	}, [slug]);

	useEffect(() => {
		fetchPage();
	}, [fetchPage]);

	const handleSave = async () => {
		if (!page) return;
		setSaving(true);
		try {
			await agent.Content.updatePage(page.id, {
				title,
				description,
				comingSoon,
			});

			for (const section of sections) {
				if (section.id > 0) {
					await agent.Content.updateSection(section.id, {
						title: section.title || "",
						body: section.body,
						sortOrder: section.sortOrder,
					});
				}
			}

			const sectionIds = sections.filter((s) => s.id > 0).map((s) => s.id);
			if (sectionIds.length > 0) {
				await agent.Content.reorderSections(page.id, { sectionIds });
			}

			contentStore.invalidateSlug(slug!);
			contentStore.invalidateArea(page.area);
			toast.success("Page saved");
			await fetchPage();
		} catch {
			toast.error("Failed to save");
		} finally {
			setSaving(false);
		}
	};

	const handleAddSection = async () => {
		if (!page) return;
		try {
			const res = await agent.Content.addSection(page.id, {
				title: "New Section",
				body: "",
				sortOrder: sections.length,
			});
			setSections([...sections, res.data]);
			toast.success("Section added");
		} catch {
			toast.error("Failed to add section");
		}
	};

	const handleDeleteSection = async (sectionId: number) => {
		try {
			await agent.Content.deleteSection(sectionId);
			setSections(sections.filter((s) => s.id !== sectionId));
			toast.success("Section deleted");
		} catch {
			toast.error("Failed to delete section");
		}
	};

	const moveSection = (index: number, direction: -1 | 1) => {
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= sections.length) return;
		const updated = [...sections];
		[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
		updated.forEach((s, i) => (s.sortOrder = i));
		setSections(updated);
	};

	const updateSectionField = (index: number, field: "title" | "body", value: string) => {
		const updated = [...sections];
		if (field === "title") updated[index] = { ...updated[index], title: value };
		else updated[index] = { ...updated[index], body: value };
		setSections(updated);
	};

	if (loading) return <div className="container mx-auto py-8 px-6 text-gray-400">Loading...</div>;
	if (!page) return <div className="container mx-auto py-8 px-6 text-red-500">Page not found</div>;

	// Build a preview page object from current editor state
	if (previewing) {
		const previewPage: ContentPageDetail = {
			...page,
			title,
			description,
			comingSoon,
			sections,
		};
		return (
			<div>
				<div className="px-6 pt-4">
					<button
						onClick={() => setPreviewing(false)}
						className="flex items-center gap-1 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
					>
						<FiArrowLeft className="w-4 h-4" />
						Editor
					</button>
				</div>
				<ContentRenderer page={previewPage} />
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 px-6 max-w-6xl">
			{/* Header */}
			<div className="flex items-center gap-4 mb-8">
				<Link to="/admin/content" className="text-gray-500 hover:text-gray-700">
					<FiArrowLeft className="w-5 h-5" />
				</Link>
				<div className="text-2xl text-gray-700 font-bold flex-1">Edit: {page.slug}</div>
				<button
					onClick={() => setPreviewing(true)}
					className="flex items-center gap-1 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
				>
					<FiEye className="w-4 h-4" /> Preview
				</button>
				<button
					onClick={handleSave}
					disabled={saving}
					className="button-primary px-6 py-2 disabled:opacity-50"
				>
					{saving ? "Saving..." : "Save"}
				</button>
			</div>

			{/* Page metadata */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-link-100"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={2}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-link-100"
					/>
				</div>
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="comingSoon"
						checked={comingSoon}
						onChange={(e) => setComingSoon(e.target.checked)}
						className="rounded"
					/>
					<label htmlFor="comingSoon" className="text-sm text-gray-700">Coming soon</label>
				</div>
			</div>

			{/* Sections */}
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold text-gray-700">Sections</h2>
				<button
					onClick={handleAddSection}
					className="flex items-center gap-1 text-sm text-link-100 hover:text-link-200"
				>
					<FiPlus className="w-4 h-4" /> Add section
				</button>
			</div>

			{sections.map((section, idx) => (
				<div key={section.id} className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
					<div className="flex items-center gap-2 mb-4">
						<input
							type="text"
							value={section.title || ""}
							onChange={(e) => updateSectionField(idx, "title", e.target.value)}
							placeholder="Section title (optional)"
							className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-link-100"
						/>
						<button
							onClick={() => moveSection(idx, -1)}
							disabled={idx === 0}
							className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
							title="Move up"
						>
							<FiArrowUp className="w-4 h-4" />
						</button>
						<button
							onClick={() => moveSection(idx, 1)}
							disabled={idx === sections.length - 1}
							className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
							title="Move down"
						>
							<FiArrowDown className="w-4 h-4" />
						</button>
						<button
							onClick={() => handleDeleteSection(section.id)}
							className="p-1.5 text-red-400 hover:text-red-600"
							title="Delete section"
						>
							<FiTrash2 className="w-4 h-4" />
						</button>
					</div>

					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">Markdown</label>
						<textarea
							value={section.body}
							onChange={(e) => updateSectionField(idx, "body", e.target.value)}
							rows={10}
							className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-link-100 resize-y"
						/>
					</div>
				</div>
			))}
		</div>
	);
};

export default ContentEditor;
