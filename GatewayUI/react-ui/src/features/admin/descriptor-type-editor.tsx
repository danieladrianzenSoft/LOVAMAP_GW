import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import agent from "../../app/api/agent";
import { DescriptorType, DescriptorTypeToUpdate, displayNameMap } from "../../app/models/descriptorType";
import { FiChevronDown, FiChevronRight, FiSave } from "react-icons/fi";

const CATEGORY_ORDER = ["Global", "Pore", "Other"];

const DescriptorTypeEditor: React.FC = () => {
    const [descriptorTypes, setDescriptorTypes] = useState<DescriptorType[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Global");
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [editState, setEditState] = useState<Record<number, DescriptorTypeToUpdate>>({});
    const [saving, setSaving] = useState<number | null>(null);

    useEffect(() => {
        fetchDescriptorTypes();
    }, []);

    const fetchDescriptorTypes = async () => {
        setLoading(true);
        try {
            const res = await agent.Descriptors.getAllDescriptorTypes();
            setDescriptorTypes(res.data);
        } catch {
            toast.error("Failed to load descriptor types");
        } finally {
            setLoading(false);
        }
    };

    const grouped = descriptorTypes.reduce<Record<string, DescriptorType[]>>((acc, dt) => {
        if (displayNameMap[dt.category]) {
            acc[dt.category] = acc[dt.category] || [];
            acc[dt.category].push(dt);
        }
        return acc;
    }, {});

    const toggleExpand = (id: number) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(id);
        const dt = descriptorTypes.find((d) => d.id === id);
        if (dt && !editState[id]) {
            setEditState((prev) => ({
                ...prev,
                [id]: {
                    description: dt.description || "",
                    imageUrl: dt.imageUrl || "",
                    tableLabel: dt.tableLabel || "",
                    unit: dt.unit || "",
                },
            }));
        }
    };

    const updateField = (id: number, field: keyof DescriptorTypeToUpdate, value: string) => {
        setEditState((prev) => ({
            ...prev,
            [id]: { ...prev[id], [field]: value },
        }));
    };

    const handleSave = async (id: number) => {
        const dto = editState[id];
        if (!dto) return;

        setSaving(id);
        try {
            const res = await agent.Descriptors.updateDescriptorType(id, dto);
            setDescriptorTypes((prev) =>
                prev.map((dt) => (dt.id === id ? res.data : dt))
            );
            setEditState((prev) => ({
                ...prev,
                [id]: {
                    description: res.data.description || "",
                    imageUrl: res.data.imageUrl || "",
                    tableLabel: res.data.tableLabel || "",
                    unit: res.data.unit || "",
                },
            }));
            toast.success("Descriptor type updated");
        } catch {
            toast.error("Failed to update descriptor type");
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-6">
                <div className="text-3xl text-gray-700 font-bold mb-8">Descriptor Types</div>
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-6">
            <div className="text-3xl text-gray-700 font-bold mb-2">Descriptor Types</div>
            <p className="text-sm text-gray-500 mb-8">
                Edit display fields for descriptor types. Name, category, and data type are read-only.
            </p>

            {/* Tab navigation */}
            <div className="flex space-x-4 mb-6">
                {CATEGORY_ORDER.map((cat) => (
                    <button
                        key={cat}
                        className={`px-4 py-2 font-semibold text-gray-700 border-b-4 ${
                            activeTab === cat ? "border-link-100" : "border-transparent"
                        }`}
                        onClick={() => setActiveTab(cat)}
                    >
                        {displayNameMap[cat] || cat} ({(grouped[cat] || []).length})
                    </button>
                ))}
            </div>

            {/* Descriptor list */}
            <div className="space-y-2">
                {(grouped[activeTab] || [])
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((dt) => {
                        const isExpanded = expandedId === dt.id;
                        const edit = editState[dt.id];

                        return (
                            <div
                                key={dt.id}
                                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                            >
                                {/* Row header */}
                                <button
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                                    onClick={() => toggleExpand(dt.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <FiChevronDown className="text-gray-400" />
                                        ) : (
                                            <FiChevronRight className="text-gray-400" />
                                        )}
                                        <span className="font-medium text-gray-800">
                                            {dt.name}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {dt.tableLabel}
                                            {dt.unit ? ` (${dt.unit})` : ""}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {dt.publication || "No publication"}
                                    </span>
                                </button>

                                {/* Expanded edit form */}
                                {isExpanded && edit && (
                                    <div className="px-4 pb-4 border-t border-gray-100">
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Name (read-only)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={dt.name}
                                                    disabled
                                                    className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Table Label
                                                </label>
                                                <input
                                                    type="text"
                                                    value={edit.tableLabel || ""}
                                                    onChange={(e) =>
                                                        updateField(dt.id, "tableLabel", e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-link-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Unit
                                                </label>
                                                <input
                                                    type="text"
                                                    value={edit.unit || ""}
                                                    onChange={(e) =>
                                                        updateField(dt.id, "unit", e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-link-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Publication (read-only)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={dt.publication || ""}
                                                    disabled
                                                    className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Image URL
                                            </label>
                                            <input
                                                type="text"
                                                value={edit.imageUrl || ""}
                                                onChange={(e) =>
                                                    updateField(dt.id, "imageUrl", e.target.value)
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-link-100"
                                            />
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Description (Markdown)
                                            </label>
                                            <textarea
                                                value={edit.description || ""}
                                                onChange={(e) =>
                                                    updateField(dt.id, "description", e.target.value)
                                                }
                                                rows={4}
                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-link-100 font-mono text-sm"
                                            />
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => handleSave(dt.id)}
                                                disabled={saving === dt.id}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                                            >
                                                <FiSave />
                                                {saving === dt.id ? "Saving..." : "Save"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

export default DescriptorTypeEditor;
