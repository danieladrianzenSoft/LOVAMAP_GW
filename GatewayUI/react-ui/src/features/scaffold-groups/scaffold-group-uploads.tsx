import React, { useEffect, useState } from 'react';
// import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
// import { FaCaretDown } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import UploadFile from '../../app/common/upload-file/upload-file';
import { useStore } from '../../app/stores/store';
import toast from "react-hot-toast";
import ToastNotification from "../../app/common/notification/toast-notification";

const ScaffoldGroupUploads: React.FC = () => {
    const {scaffoldGroupStore} = useStore();
    const { 
        uploadScaffoldGroup, 
        getUploadedScaffoldGroups, 
        setUploadedScaffoldGroups, 
        uploadedScaffoldGroups = [] 
    } = scaffoldGroupStore;
    const [visibleDetails, setVisibleDetails] = useState<number | null>(null);
    const [numberOfColumns, setNumberOfColumns] = useState(3);

    useEffect(() => {
        getUploadedScaffoldGroups();
      }, [getUploadedScaffoldGroups]);

      const handleUploadSubmit = async (files: File[], combinedJson?: any) => {
        if (combinedJson) {
          try {
            await scaffoldGroupStore.uploadScaffoldGroupBatch(combinedJson);
          } catch (error) {
            console.error(error);
          }
        } else {
          // handle as needed
        }
      };

    const handleUploadSuccess = (response: any) => {
        toast.custom((t) => (
            <ToastNotification
                title="Scaffold groups uploaded"
                message={response}
                onDismiss={() => toast.dismiss(t.id)}
            />
        ), {
            duration: 4000,
            position: "top-right"
        });
    };
    
    const handleUploadError = (error: any) => {
        toast.custom((t) => (
            <ToastNotification
                title="Error uploading scaffold groups"
                message={error}
                onDismiss={() => toast.dismiss(t.id)}
            />
        ), {
            duration: 4000,
            position: "top-right",
            className: "error"
        });
        console.error('Error uploading scaffold group: ', error)
    };

    const toggleDetails = (id: number) => {
        setVisibleDetails(prev => prev === id ? null : id);
    };

    // const rows = [];
    // for (let i = 0; i < uploadedScaffoldGroups.length; i += numberOfColumns) {
    //     rows.push(uploadedScaffoldGroups.slice(i, i + numberOfColumns));
    // }

    return (
        <div className={`container mx-auto py-8 px-2`}>
            <div>
                <div className="text-3xl text-gray-700 font-bold mb-12">
                    Uploaded scaffolds
                </div>
                <UploadFile
                    acceptedFileTypes={{ 'application/json': ['.json'] }}
                    onUploadSubmit={handleUploadSubmit}
                    onUploadSuccess={handleUploadSuccess}
                    onUploadError={handleUploadError}
                />
            </div>

            <div className="flex">
                <div className="w-full">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tags
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date Added
                        </th>
                        {/* <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tags
                        </th> */}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {uploadedScaffoldGroups.map((group, index) => (
                        <tr key={index}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                {group.name}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                {group.tags.join(', ')}
                            </td>
                            {/* <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                            {group.comments}
                            </td> */}
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                {new Date(group.createdAt).toLocaleString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true, // Set to false for 24-hour time
                                })}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
            {/* <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
            )} */}
        </div>
        
    );
};

export default observer(ScaffoldGroupUploads);