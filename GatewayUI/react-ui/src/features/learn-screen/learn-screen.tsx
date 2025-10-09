import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { DescriptorType, displayNameMap, GroupedDescriptorTypes } from "../../app/models/descriptorType";
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

    const getLabelWithUnit = (descriptor?: DescriptorType): string => {
        if (!descriptor) return "";
        return descriptor.unit
            ? `${descriptor.tableLabel} (${descriptor.unit})`
            : descriptor.tableLabel;
    };

    return (
        <div className="container mx-auto py-8 px-2">
            <div>
                <div className="text-3xl text-gray-700 font-bold mb-12">Generating Simulated Scaffolds</div>                        
                <div className="flex flex-wrap justify-center gap-4">
                    <div className="aspect-[4/3] w-full sm:w-[48%] overflow-hidden rounded-xl shadow-lg">
                        <video
                        controls
                        className="w-full h-full object-cover"
                        >
                        <source src="https://res.cloudinary.com/danmkw7ni/video/upload/v1234567890/u0ytoqfz2ubvrhxuwgkb.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                        </video>
                    </div>

                    <div className="aspect-[4/3] w-full sm:w-[48%] overflow-hidden rounded-xl shadow-lg">
                        <video
                        controls
                        className="w-full h-full object-cover"
                        >
                        <source src="https://res.cloudinary.com/danmkw7ni/video/upload/v1234567890/rqdeaoleiywlydnwzcjz.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
                <div className="mt-12">
                    <p>
                        To generate particle scaffolds of various shapes and configurations, we used SideFX Houdini,
                        an industry-standard physics simulation software. This involves creating particles of desired 
                        shapes, sizes, and random orientations and using Houdini's rigid-body solver to simulate how 
                        they fall, collide, and settle into a container of a prescribed shape and size. 
                        For non-rigid particles, we use Houdini's native finite element physics solver after imposing 
                        the particles' Lamé parameters. To reduce computational expense, we use the last
                        frame of the rigid-body simulation as the initial condition of the non-rigid simulation. 
                        For more details, see <a
                            href="https://doi.org/10.1038/s43588-023-00551-x"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                        Riley et al., 2023.
                        </a>
                    </p>
                </div>
            </div>
            

            <div className="mt-12">
                <div className="text-3xl text-gray-700 font-bold mb-12">Descriptors</div>    
                <div className="mb-12">
                    <p>
                        Descriptors are the output of LOVAMAP, and they provide a quantitative way of characterizing,
                        analyzing, and comparing granular materials. Check the table below for a summary of 
                        all the descriptors that LOVAMAP outputs.
                        For more details, see <a
                            href="https://doi.org/10.1038/s43588-023-00551-x"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                        Riley et al., 2023.
                        </a>
                    </p>
                </div>                
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
                                            <div className="max-w-[150px]">{getLabelWithUnit(descriptor)}</div>
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
        </div>
    );
};

export default observer(LearnScreen);