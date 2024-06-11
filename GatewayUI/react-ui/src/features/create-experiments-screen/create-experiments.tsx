import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import ScaffoldGroupDetails from "../scaffold-groups/scaffold-group-details";
import ScaffoldGroupFilters from "../scaffold-groups/scaffold-group-filter";
import ScaffoldGroupCard from "../scaffold-groups/scaffold-group-card";

const CreateExperiments = () => {
    const { commonStore, scaffoldGroupStore } = useStore();
	const isLoggedIn = commonStore.isLoggedIn();
    const { scaffoldGroups } = scaffoldGroupStore;
    const [visibleDetails, setVisibleDetails] = useState<number | null>(null);
    const [numberOfColumns, setNumberOfColumns] = useState(3);

    useEffect(() => {
        const updateNumberOfColumns = () => {
            const width = window.innerWidth;
            if (width < 640) setNumberOfColumns(1);
            else if (width < 768) setNumberOfColumns(2);
            else setNumberOfColumns(3);
        };
        window.addEventListener('resize', updateNumberOfColumns);
        updateNumberOfColumns();
        return () => window.removeEventListener('resize', updateNumberOfColumns);
    }, []);

    const toggleDetails = (id: number) => {
        setVisibleDetails(prev => prev === id ? null : id);
    };

    const rows = [];
    for (let i = 0; i < scaffoldGroups.length; i += numberOfColumns) {
        rows.push(scaffoldGroups.slice(i, i + numberOfColumns));
    }

    return (
        <div className={`container mx-auto py-8 px-2`}>
			<div className="text-3xl text-gray-700 font-bold mb-12">Create experiments</div>
            <div className="flex">
                <div className="w-full mb-12">
                    <p className="text-xl">1. Select the scaffold groups to include in your experiment</p>
                </div>
            </div>
            <ScaffoldGroupFilters />
            {rows.map((row, index) => (
                <React.Fragment key={index}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {row.map(scaffoldGroup => (
                            <ScaffoldGroupCard
                                key={scaffoldGroup.id}
                                scaffoldGroup={scaffoldGroup}
                                isVisible={visibleDetails === scaffoldGroup.id}
                                toggleDetails={() => toggleDetails(scaffoldGroup.id)}
                            />
                        ))}
                    </div>
                    {row.some(sg => sg.id === visibleDetails) && (
                        <div className={`transition-opacity duration-500 ease-in-out transform ${visibleDetails ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} overflow-hidden`}>
                            <ScaffoldGroupDetails
                                scaffoldGroup={row.find(sg => sg.id === visibleDetails)!}
                                isVisible={true}
                                toggleDetails={() => visibleDetails && toggleDetails(visibleDetails)}
                            />
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export default observer(CreateExperiments);