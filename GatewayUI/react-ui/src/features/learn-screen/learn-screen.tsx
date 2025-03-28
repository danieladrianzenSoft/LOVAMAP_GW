import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { displayNameMap, GroupedDescriptorTypes } from "../../app/models/descriptorType";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { useDescriptorTypes } from "../../app/common/hooks/useDescriptorTypes";

const LearnScreen = () => {
    const { descriptorTypes } = useDescriptorTypes(); // Use the hook
    const [activeTab, setActiveTab] = useState("Global"); // Default active tab is "Global"

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

    const categoryOrder = ["Global", "Pore", "Other"];

    return (
        <div className="container mx-auto py-8 px-2">
            {/* Tab Navigation */}
            <div className="flex space-x-4 mb-8">
                {categoryOrder.map((category) => (
                    <button
                        key={category}
                        className={`px-4 py-2 font-semibold text-gray-700 border-b-4 ${
                            activeTab === category ? "border-blue-500" : "border-transparent"
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
                                        <div className="max-w-[150px]">{descriptor.tableLabel}</div>
                                    </td>
                                    <td className="px-4 py-2" style={{ width: "25%" }}>
                                        <div className="w-full">
                                            <img
                                                src={descriptor.imageUrl}
                                                alt={descriptor.tableLabel}
                                                className="w-full h-auto object-contain"
                                                style={{ maxWidth: "100%", display: "block" }}
                                            />
                                        </div>
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
    );
};

export default observer(LearnScreen);