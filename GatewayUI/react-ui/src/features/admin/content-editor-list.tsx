import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import agent from "../../app/api/agent";
import { useStore } from "../../app/stores/store";
import { ContentPageSummary } from "../../app/models/contentPage";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { RxDragHandleDots2 } from "react-icons/rx";
import {
	DndContext,
	DragOverlay,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
	DragStartEvent,
	DragOverEvent,
	DragEndEvent,
	useDroppable,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const AREAS = ["learn", "documentation"] as const;
const AREA_LABELS: Record<string, string> = { learn: "Tutorials", documentation: "Dev Docs" };

const ContentEditorList: React.FC = () => {
	const [pages, setPages] = useState<ContentPageSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [newArea, setNewArea] = useState<string>("learn");
	const [activeId, setActiveId] = useState<string | null>(null);
	const [originArea, setOriginArea] = useState<string | null>(null);
	const [dragOverArea, setDragOverArea] = useState<string | null>(null);
	const originAreaRef = useRef<string | null>(null);
	const { contentStore } = useStore();
	const navigate = useNavigate();

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		})
	);

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

	const getSorted = (area: string) =>
		pages.filter((p) => p.area === area).sort((a, b) => a.sortOrder - b.sortOrder);

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

	const handleDragStart = (event: DragStartEvent) => {
		const id = event.active.id.toString();
		setActiveId(id);
		const area = pages.find((p) => p.id.toString() === id)?.area ?? null;
		setOriginArea(area);
		originAreaRef.current = area;
	};

	const handleDragOver = (event: DragOverEvent) => {
		const { over } = event;
		if (!over) {
			setDragOverArea(null);
			return;
		}
		const overId = over.id.toString();
		const area = overId.startsWith("area:")
			? overId.slice(5)
			: pages.find((p) => p.id.toString() === overId)?.area ?? null;
		setDragOverArea(area);
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		const draggedId = active.id.toString();
		const dragOrigin = originAreaRef.current!;

		setActiveId(null);
		setOriginArea(null);
		setDragOverArea(null);
		originAreaRef.current = null;

		if (!over) return;

		const overId = over.id.toString();
		const targetArea = overId.startsWith("area:")
			? overId.slice(5)
			: pages.find((p) => p.id.toString() === overId)?.area;

		if (!targetArea) return;

		if (dragOrigin === targetArea) {
			// Within-area reorder
			if (active.id === over.id) return;

			const areaPages = getSorted(targetArea);
			const oldIndex = areaPages.findIndex((p) => p.id.toString() === draggedId);
			const newIndex = areaPages.findIndex((p) => p.id.toString() === overId);
			if (oldIndex === -1 || newIndex === -1) return;

			const reordered = arrayMove(areaPages, oldIndex, newIndex);
			const updated = reordered.map((p, i) => ({ ...p, sortOrder: i }));
			setPages((prev) => [...prev.filter((p) => p.area !== targetArea), ...updated]);

			try {
				await agent.Content.reorderPages(targetArea, {
					pageIds: reordered.map((p) => p.id),
				});
				contentStore.invalidateArea(targetArea);
			} catch {
				toast.error("Failed to save order");
				fetchAll();
			}
		} else {
			// Cross-area move
			const draggedPage = pages.find((p) => p.id.toString() === draggedId)!;

			const newOriginPages = pages
				.filter((p) => p.area === dragOrigin && p.id.toString() !== draggedId)
				.sort((a, b) => a.sortOrder - b.sortOrder)
				.map((p, i) => ({ ...p, sortOrder: i }));

			const targetPages = getSorted(targetArea);
			const movedPage = { ...draggedPage, area: targetArea, sortOrder: targetPages.length };
			const newTargetPages = [...targetPages, movedPage].map((p, i) => ({ ...p, sortOrder: i }));

			const otherPages = pages.filter((p) => p.area !== dragOrigin && p.area !== targetArea);
			setPages([...otherPages, ...newOriginPages, ...newTargetPages]);

			try {
				await agent.Content.updatePage(draggedPage.id, { area: targetArea });
				await agent.Content.reorderPages(targetArea, {
					pageIds: newTargetPages.map((p) => p.id),
				});
				await agent.Content.reorderPages(dragOrigin, {
					pageIds: newOriginPages.map((p) => p.id),
				});
				contentStore.invalidateArea(targetArea);
				contentStore.invalidateArea(dragOrigin);
				toast.success(`Moved to ${AREA_LABELS[targetArea] ?? targetArea}`);
			} catch {
				toast.error("Failed to move page");
				fetchAll();
			}
		}
	};

	const handleDragCancel = () => {
		setActiveId(null);
		setOriginArea(null);
		setDragOverArea(null);
		originAreaRef.current = null;
	};

	if (loading) return <div className="container mx-auto py-8 px-6 text-gray-400">Loading...</div>;

	const activePage = activeId ? pages.find((p) => p.id.toString() === activeId) : null;

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
									{AREA_LABELS[a] ?? a}
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

			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
				onDragCancel={handleDragCancel}
			>
				{AREAS.map((area) => {
					const sorted = getSorted(area);
					const isDropTarget =
						activeId != null && originArea !== area && dragOverArea === area;

					return (
						<AreaDropZone key={area} area={area} isDropTarget={isDropTarget}>
							<h2 className="text-xl font-semibold text-gray-700 mb-4">
								{AREA_LABELS[area] ?? area}
							</h2>
							<SortableContext
								items={sorted.map((p) => p.id.toString())}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-2">
									{sorted.map((p) => (
										<SortablePageCard
											key={p.id}
											page={p}
											onDelete={handleDelete}
										/>
									))}
									{sorted.length === 0 && !isDropTarget && (
										<div className="text-center text-gray-300 py-6 text-sm border-2 border-dashed border-gray-200 rounded-lg">
											No pages
										</div>
									)}
								</div>
							</SortableContext>
							{isDropTarget && (
								<div className="text-center text-blue-400 py-3 text-sm mt-2">
									Drop here to move to {AREA_LABELS[area] ?? area}
								</div>
							)}
						</AreaDropZone>
					);
				})}

				<DragOverlay>
					{activePage ? <PageCardOverlay page={activePage} /> : null}
				</DragOverlay>
			</DndContext>
		</div>
	);
};

function AreaDropZone({
	area,
	isDropTarget,
	children,
}: {
	area: string;
	isDropTarget: boolean;
	children: React.ReactNode;
}) {
	const { setNodeRef } = useDroppable({ id: `area:${area}` });

	return (
		<div
			ref={setNodeRef}
			className={`mb-8 rounded-xl transition-all duration-200 ${
				isDropTarget
					? "bg-blue-50 border-2 border-dashed border-blue-300 p-4 -m-4"
					: ""
			}`}
		>
			{children}
		</div>
	);
}

function SortablePageCard({
	page,
	onDelete,
}: {
	page: ContentPageSummary;
	onDelete: (page: ContentPageSummary) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: page.id.toString() });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	if (isDragging) {
		return (
			<div
				ref={setNodeRef}
				style={style}
				className="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50"
			>
				<div className="h-6" />
			</div>
		);
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="flex items-center bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
		>
			<button
				{...attributes}
				{...listeners}
				className="mr-3 p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
				title="Drag to reorder"
			>
				<RxDragHandleDots2 className="w-5 h-5" />
			</button>
			<Link
				to={`/admin/content/${page.slug}`}
				className="flex-1 flex items-center justify-between"
			>
				<div>
					<span className="font-medium text-gray-800">{page.title}</span>
					<span className="ml-2 text-sm text-gray-400">/{page.slug}</span>
				</div>
				<div className="flex items-center gap-2">
					{page.comingSoon && (
						<span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
							Coming soon
						</span>
					)}
					<span className="text-gray-400 text-sm">&rarr;</span>
				</div>
			</Link>
			<button
				onClick={() => onDelete(page)}
				className="ml-3 p-1.5 text-gray-300 hover:text-red-500 transition-colors"
				title="Delete page"
			>
				<FiTrash2 className="w-4 h-4" />
			</button>
		</div>
	);
}

function PageCardOverlay({ page }: { page: ContentPageSummary }) {
	return (
		<div className="flex items-center bg-white border border-gray-200 rounded-lg p-4 shadow-xl cursor-grabbing">
			<RxDragHandleDots2 className="w-5 h-5 mr-3 text-gray-400" />
			<div className="flex-1 flex items-center justify-between">
				<div>
					<span className="font-medium text-gray-800">{page.title}</span>
					<span className="ml-2 text-sm text-gray-400">/{page.slug}</span>
				</div>
				<div className="flex items-center gap-2">
					{page.comingSoon && (
						<span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
							Coming soon
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

export default ContentEditorList;
