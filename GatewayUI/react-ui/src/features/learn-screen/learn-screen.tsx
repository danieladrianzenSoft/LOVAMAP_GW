import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { displayNameMap, GroupedDescriptorTypes } from "../../app/models/descriptorType";
// import ScaffoldGroupDetails from "../scaffold-groups/scaffold-group-details";
// import ScaffoldGroupFilters from "../scaffold-groups/scaffold-group-filter";
// import ScaffoldGroupCard from "../scaffold-groups/scaffold-group-card";

const CreateExperiments = () => {
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

    // useEffect(() => {
    //     const updateNumberOfColumns = () => {
    //         const width = window.innerWidth;
    //         if (width < 640) setNumberOfColumns(1);
    //         else if (width < 768) setNumberOfColumns(2);
    //         else setNumberOfColumns(3);
    //     };
    //     window.addEventListener('resize', updateNumberOfColumns);
    //     updateNumberOfColumns();
    //     return () => window.removeEventListener('resize', updateNumberOfColumns);
    // }, []);

    // const toggleDetails = (id: number) => {
    //     setVisibleDetails(prev => prev === id ? null : id);
    // };

    //https://res.cloudinary.com/<cloud_name>/<asset_type>/<delivery_type>/<transformations>/<version>/<public_id>.<extension>
    // const descriptors = [
    //     {
    //         name: 'Average internal diameter (µm)',
    //         // https://res.cloudinary.com/hospitalsolidario/image/upload/v1727662561/jmlmhcyabbj3ompbqnbx.png
    //         imgSrc: 'https://res.cloudinary.com/magsoft-images/image/upload/cjrenphjercsdybjsitm.png', // Placeholder image URL
    //         explanation: 'Average thickness (in µm) along 1D ridges that are contained entirely within a 3D pore',
    //         publication: 'Nature Computational Science, doi: 10349823984'
    //     },
    //     {
    //         name: 'Largest enclosed spheres diameter (µm)',
    //         imgSrc: 'https://res.cloudinary.com/magsoft-images/image/upload/eokuy5wrd3pmyvdisrhn.png', // Placeholder image URL
    //         explanation: 'Diameter (in µm) of the largest sphere that can fit entirely within a 3D pore',
    //         publication: 'Small, doi: 10349823984'
    //     },
    //     {
    //         name: 'Number of 3D pores',
    //         imgSrc: 'https://res.cloudinary.com/magsoft-images/image/upload/t1ciq742wweuau1cjksd.png', // Placeholder image URL
    //         explanation: 'The total number of 3D pores - both interior and surface pores',
    //         publication: 'Nature Computational Science, doi: 10349823984'
    //     },
    //     {
    //         name: 'Volume (pL)',
    //         imgSrc: 'https://res.cloudinary.com/magsoft-images/image/upload/bnuhob6akrjae4s67sb5.png', // Placeholder image URL
    //         explanation: 'Volume of a 3D pore, reported in pL',
    //         publication: 'Nature Computational Science, doi: 10349823984'
    //     },
    //     {
    //         name: 'Void volume fraction',
    //         imgSrc: 'https://res.cloudinary.com/magsoft-images/image/upload/pbtlchvnkmqz42fdi4je.png', // Placeholder image URL
    //         explanation: 'Volume of void space divided by the total volume of the scaffold. We define "void space" as the non-particle voxels contained.',
    //         publication: 'Small, doi: 10349823984'
    //     }
    // ];

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
                                        <th className="px-4 py-2 text-left font-normal">Name</th>
                                        <th className="px-4 py-2 text-left font-normal">Visualization</th>
                                        <th className="px-4 py-2 text-left font-normal">Explanation</th>
                                        <th className="px-4 py-2 text-left font-normal">Publication</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {descriptorTypes.map((descriptor,index) => 
                                        <tr key={index} className="border-t border-gray-300">
                                            <td className="px-4 py-2 border-l border-gray-300 whitespace-normal">
                                                <div className="max-w-[150px]">
                                                    {descriptor.label}
                                                </div>
                                            </td>

                                            {/* <td className="px-4 py-2 border-l border-gray-300">{descriptor.label}</td> */}
                                            <td className="px-4 py-2">
                                                <div className="max-w-[300px]">
                                                    <img
                                                        src={descriptor.imageUrl ? descriptor.imageUrl : 'https://via.placeholder.com/150'}
                                                        alt={descriptor.name}
                                                        className="w-full max-w-[300px] h-auto object-contain"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">{descriptor.description}</td>
                                            <td className="px-4 py-2 border-r border-gray-300">{descriptor.publication}</td>
                                        </tr>
                                    )}
                                </tbody>
                                </table>
                            </div>
                    ))}
        </div>
    );
};

export default observer(CreateExperiments);