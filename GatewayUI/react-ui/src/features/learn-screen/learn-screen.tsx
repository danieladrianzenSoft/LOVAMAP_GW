import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { displayNameMap, GroupedDescriptorTypes } from "../../app/models/descriptorType";
// import ScaffoldGroupDetails from "../scaffold-groups/scaffold-group-details";
// import ScaffoldGroupFilters from "../scaffold-groups/scaffold-group-filter";
// import ScaffoldGroupCard from "../scaffold-groups/scaffold-group-card";

const LearnScreen = () => {
	const {resourceStore} = useStore();
	const {getDescriptorTypes} = resourceStore;

	const [groupedDescriptorTypes, setGroupedDescriptorTypes] = useState<GroupedDescriptorTypes>({});
	useEffect(() => {
        getDescriptorTypes().then(fetchedDescriptors => {
			// console.log(fetchedDescriptors)
            if (fetchedDescriptors) {
                const groups = fetchedDescriptors.reduce<GroupedDescriptorTypes>((acc, descriptorType) => {
                    const groupKey = descriptorType.category;
                    if (displayNameMap[groupKey]) {
                        acc[groupKey] = acc[groupKey] || [];
                        acc[groupKey].push(descriptorType);
                    }
                    return acc;
                }, {});
                setGroupedDescriptorTypes(groups);
            }
        }).catch(error => {
            console.error("Error fetching descriptor types:", error);
        });
    }, [getDescriptorTypes]);

    const categoryOrder = ["Global", "Pore", "Other"];

    return (
        <div className={`container mx-auto py-8 px-2`}>
            
                    {Object.entries(groupedDescriptorTypes)
                        .sort(([keyA], [keyB]) => categoryOrder.indexOf(keyA) - categoryOrder.indexOf(keyB))  // Sorting based on predefined order
                        .map(([key, descriptorTypes]) => (
                    // {descriptors.map((descriptor, index) => (
                        // <tr key={index} className="border-t border-gray-300">
                        //     <td className="px-4 py-2 border-l border-gray-300">{descriptor.name}</td>
                        //     <td className="px-4 py-2">
                        //         <img src={descriptor.imgSrc} alt={descriptor.name} className="w-96 h-36 object-cover" />
                        //     </td>
                        //     <td className="px-4 py-2">{descriptor.explanation}</td>
                        //     <td className="px-4 py-2 border-r border-gray-300">{descriptor.publication}</td>
                        // </tr>
                            <div key={key}>
                                <div className="text-3xl text-gray-700 font-bold mb-12 mt-12">{key + ' descriptors'}</div>

                                <table className="min-w-full border-collapse">
                                <thead>
                                    <tr>
                                        {/* <th className="px-4 py-2 text-left font-normal">Name</th> */}
                                        <th className="px-4 py-2 text-left font-normal" style={{ width: '15%' }}>Name</th>

                                        {/* <th className="px-4 py-2 text-left font-normal">Visualization</th> */}
                                        <th className="px-4 py-2 text-left font-normal" style={{ width: '25%' }}>Visualization</th>
                                        {/* <th className="px-4 py-2 text-left font-normal">Explanation</th> */}
                                        <th className="px-4 py-2 text-left font-normal" style={{ width: '40%' }}>Explanation</th>

                                        {/* <th className="px-4 py-2 text-left font-normal">Publication</th> */}
                                        <th className="px-4 py-2 text-left font-normal" style={{ width: '20%' }}>Publication</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {descriptorTypes.map((descriptor,index) => 
                                        <tr key={index} className="border-t border-gray-300">
                                            <td className="px-4 py-2 border-l border-gray-300 whitespace-normal" style={{ width: '15%' }}>
                                                <div className="max-w-[150px]">
                                                    {descriptor.label}
                                                </div>
                                            </td>

                                            {/* <td className="px-4 py-2 border-l border-gray-300">{descriptor.label}</td> */}
                                            {/* <td className="px-4 py-2">
                                                <div className="max-w-[300px]">
                                                    <img
                                                        src={descriptor.imageUrl ? descriptor.imageUrl : 'https://via.placeholder.com/150'}
                                                        alt={descriptor.name}
                                                        className="w-full max-w-[300px] h-auto object-contain"
                                                    />
                                                </div>
                                            </td> */}
                                            <td className="px-4 py-2" style={{ width: '25%' }}>
                                                <div className="w-full">
                                                    <img
                                                        src={descriptor.imageUrl ? descriptor.imageUrl : 'https://res.cloudinary.com/magsoft-images/image/upload/v1730398715/angellovamap.png'}
                                                        alt={descriptor.name}
                                                        className="w-full h-auto object-contain"
                                                        style={{ maxWidth: '100%', display: 'block' }} // Ensures the image scales within its container
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-2" style={{ width: '40%' }}>{descriptor.description}</td>
                                            <td className="px-4 py-2 border-r border-gray-300" style={{ width: '20%' }}>{descriptor.publication}</td>
                                        </tr>
                                    )}
                                </tbody>
                                </table>
                            </div>
                    ))}
        </div>
    );
};

export default observer(LearnScreen);