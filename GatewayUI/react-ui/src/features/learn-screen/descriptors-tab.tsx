import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useLocation } from "react-router-dom";
import { DescriptorType, displayNameMap, GroupedDescriptorTypes } from "../../app/models/descriptorType";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { useDescriptorTypes } from "../../app/common/hooks/useDescriptorTypes";

const DescriptorsTab = () => {
    const location = useLocation();
    const { descriptorTypes } = useDescriptorTypes();
    const [activeTab, setActiveTab] = useState("Global");

    const [groupedDescriptorTypes, setGroupedDescriptorTypes] = useState<GroupedDescriptorTypes>({});

    useEffect(() => {
        if (descriptorTypes.length > 0) {
            const groups = descriptorTypes.reduce<GroupedDescriptorTypes>((acc, descriptorType) => {
                const groupKey = descriptorType.category;
                if (displayNameMap[groupKey]) {
                    acc[groupKey] = acc[groupKey] || [];
                    acc[groupKey].push(descriptorType);
                }
                return acc;
            }, {});
            setGroupedDescriptorTypes(groups);
        }
    }, [descriptorTypes]);

    useEffect(() => {
        if (!location.hash) return;
        const id = location.hash.replace('#', '');

        let lastTop = -1;
        let attempts = 0;
        const maxAttempts = 10;

        const tryScroll = () => {
            const el = document.getElementById(id);
            if (!el) return;
            const top = el.getBoundingClientRect().top + window.scrollY;
            if (top !== lastTop && attempts < maxAttempts) {
                lastTop = top;
                attempts++;
                el.scrollIntoView({ behavior: 'smooth' });
                timer = window.setTimeout(tryScroll, 500);
            }
        };

        let timer = window.setTimeout(tryScroll, 100);
        return () => clearTimeout(timer);
    }, [location.hash, groupedDescriptorTypes]);

    const categoryOrder = ["Global", "Pore", "Other"];

    const getLabelWithUnit = (descriptor?: DescriptorType): string => {
        if (!descriptor) return "";
        return descriptor.unit
            ? `${descriptor.tableLabel} (${descriptor.unit})`
            : descriptor.tableLabel;
    };

    return (
        <div className="container mx-auto py-8 px-6">
            <div id="descriptors">
                <div className="text-3xl text-gray-700 font-bold mb-12">Descriptors</div>
                <div className="mb-12">
                    <p>
                        Descriptors are the output of LOVAMAP, and they provide a quantitative way of characterizing,
                        analyzing, and comparing granular materials. They fall into three categories:{" "}
                        <strong>Global</strong> descriptors capture whole-packing properties such as void volume fraction,
                        total number of pores, and total number of bottlenecks (the narrow passages connecting adjacent pores).{" "}
                        <strong>Pore</strong> descriptors are computed per-pore and include metrics like pore volume,
                        surface area, largest enclosed sphere, bottleneck area, and pore coordination number.{" "}
                        <strong>Other</strong> descriptors cover additional features such as hotspot fractions and
                        geometric approximations of pore shape (vertices, edges, and faces).
                        Check the table below for a summary of all the descriptors that LOVAMAP outputs.
                        For more details, see <a
                            href="https://doi.org/10.1038/s43588-023-00551-x"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-link-100 hover:underline"
                        >
                        Riley et al., 2023
                        </a>{" "}and{" "}
                        <a
                            href="https://doi.org/10.1002/ppsc.202500163"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-link-100 hover:underline"
                        >
                        Riley et al., 2025.
                        </a>
                    </p>
                </div>
                {/* Tab Navigation */}
                <div className="flex space-x-4 mb-8">
                    {categoryOrder.map((category) => (
                        <button
                            key={category}
                            className={`px-4 py-2 font-semibold text-gray-700 border-b-4 ${
                                activeTab === category ? "border-link-100" : "border-transparent"
                            }`}
                            onClick={() => setActiveTab(category)}
                        >
                            {category} Descriptors
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {groupedDescriptorTypes[activeTab] && (
                    <div className="w-full overflow-x-auto">
                        <table className="min-w-[768px] border-collapse w-full">
                            <thead>
                                <tr>
                                    <th className="px-4 py-2 text-left font-normal" style={{ width: "15%" }}>
                                        Name
                                    </th>
                                    <th className="px-4 py-2 text-left font-normal" style={{ width: "25%" }}>
                                        Visualization
                                    </th>
                                    <th className="px-4 py-2 text-left font-normal" style={{ width: "40%" }}>
                                        Explanation
                                    </th>
                                    <th className="px-4 py-2 text-left font-normal" style={{ width: "20%" }}>
                                        Publication
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedDescriptorTypes[activeTab]
                                    .slice()
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((descriptor, index) => (
                                    <tr key={index} className="border-t border-gray-300 last:border-b">
                                        <td className="px-4 py-2 border-l border-gray-300 whitespace-normal" style={{ width: "15%" }}>
                                            <div className="max-w-[150px]">{getLabelWithUnit(descriptor)}</div>
                                        </td>
                                        <td className="px-4 py-2" style={{ width: "25%" }}>
                                            {descriptor.imageUrl ? <div className="w-full">
                                                <img
                                                    src={descriptor.imageUrl}
                                                    alt={descriptor.tableLabel}
                                                    className="w-full h-auto object-contain"
                                                    style={{ maxWidth: "100%", display: "block" }}
                                                />
                                            </div> : <p>-</p>}
                                        </td>
                                        <td className="px-4 py-2" style={{ width: "40%" }}>
                                            <ReactMarkdown
                                                rehypePlugins={[rehypeSanitize]}
                                                className="markdown-content"
                                            >
                                                {descriptor.description}
                                            </ReactMarkdown>
                                        </td>
                                        <td className="px-4 py-2 border-r border-gray-300" style={{ width: "20%" }}>
                                            {descriptor.publication}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default observer(DescriptorsTab);
