import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import UploadFile from '../../app/common/upload-file/upload-file';
import { useStore } from '../../app/stores/store';
import toast from "react-hot-toast";
import ToastNotification from "../../app/common/notification/toast-notification";
import { FaSpinner, FaPlus, FaStar, FaRegStar, FaTimes } from 'react-icons/fa';
import { Image, ImageToCreate, ImageToUpdate } from '../../app/models/image';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';

const ScaffoldGroupUploads: React.FC = () => {
    const { scaffoldGroupStore } = useStore();
    const { getUploadedScaffoldGroups, uploadedScaffoldGroups = [], updateImage, deleteImage } = scaffoldGroupStore;

    const [visibleDetails, setVisibleDetails] = useState<number | null>(null); // Track visible details
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedGroup, setSelectedGroup] = useState<ScaffoldGroup | null>(null); // Track selected group
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // Track modal state
    const [isUploadVisible, setIsUploadVisible] = useState<boolean>(false); // Track visibility of UploadFile

    useEffect(() => {
        const fetchUploadedScaffoldGroups = async () => {
            setIsLoading(true);
            await getUploadedScaffoldGroups();
            setIsLoading(false);
        };
        fetchUploadedScaffoldGroups();
    }, [getUploadedScaffoldGroups]);

    const handleUploadSubmitFile = async (files: File[]) => {
        try {
            const jsonFiles = files.filter(file => file.type === 'application/json');
            // Handle JSON uploads
            if (jsonFiles.length > 0) {
                const parsedJson = await Promise.all(jsonFiles.map(file => file.text().then(JSON.parse)));
                const combinedJson = parsedJson.flat();
                await scaffoldGroupStore.uploadScaffoldGroupBatch(combinedJson);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to upload files.');
        }
    }

    const handleUploadSubmitImage = async (files: File[], imageType?: string) => {
        try {
            const imageFiles = files.filter(file => file.type.startsWith('image/'));

            // Handle image uploads if a group is selected
            if (imageFiles.length > 0 && selectedGroup) {
                await Promise.all(
                    imageFiles.map(async (imageFile) => {
                        const image: ImageToCreate = {
                            scaffoldGroupId: selectedGroup.id,
                            file: imageFile,
                        };
                        const addedImage = await scaffoldGroupStore.uploadImageForScaffoldGroup(
                            selectedGroup.id,
                            image,
                            imageType
                        );

                        // Update the selected group state to reflect the new images
                        if (addedImage != null) {
                            console.log(addedImage)
                            selectedGroup.images.push(addedImage);
                            // toast.success('Image uploaded successfully!');
                            console.log(addedImage);
                        }
                    })
                );
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to upload images.');
        }
    };

    const handleImageUpdate = async (image: any, updates: Partial<ImageToUpdate>) => {
        try {
            if (selectedGroup == null) return;
            const updatedImage: ImageToUpdate = {
                id: image.id,
                category: updates.category ?? image.category,
                isThumbnail: updates.isThumbnail ?? image.isThumbnail,
                scaffoldGroupId: selectedGroup.id,
                scaffoldId: image.scaffoldId ?? null,
            };
            const updatedScaffoldGroup = await updateImage(selectedGroup.id, updatedImage);
            if (updatedScaffoldGroup) {
                setSelectedGroup(updatedScaffoldGroup);
                await getUploadedScaffoldGroups(); // Refresh the scaffold group data
            }
            // toast.success('Image updated successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to update image.');
        }
    };

    const handleImageDelete = async (imageId: number) => {
        if (selectedGroup == null) return;
        try {
            const result = await scaffoldGroupStore.deleteImage(selectedGroup.id, imageId);
            
            // Update selectedGroup with the updated scaffold group data
            if (result) {
                selectedGroup.images = selectedGroup.images?.filter((image:Image) => image.id != imageId);
                // toast.success('Image deleted successfully!');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete image.');
        }
    };

    const handleUploadError = (group: any) => {
        toast.error('Failed to upload files.');
    };

    const handleRowClick = (group: any) => {
        setSelectedGroup(group); // Set selected group
        setIsModalOpen(true); // Open modal
    };

    const closeModal = () => {
        setSelectedGroup(null); // Clear selected group
        setIsUploadVisible(false);
        setIsModalOpen(false); // Close modal
    };

    const toggleUploadSection = () => {
        setIsUploadVisible(!isUploadVisible); // Toggle upload section visibility
    };

    return (
        <div className={`container mx-auto py-8 px-2`}>
            <div className="text-3xl text-gray-700 font-bold mb-12">Uploaded scaffolds</div>

            <UploadFile
                acceptedFileTypes={{ 'application/json': ['.json'] }}
                onUploadSubmit={handleUploadSubmitFile}
                onUploadError={handleUploadError}
            />

            {isLoading ? (
                <div className="flex justify-center items-center py-8">
                    <FaSpinner className="animate-spin" size={40} />
                </div>
            ) : (
                <div className="flex">
                    <div className="w-full">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {uploadedScaffoldGroups.map((group, index) => (
                                    <tr
                                        key={index}
                                        onClick={() => handleRowClick(group)}
                                        className="cursor-pointer hover:bg-gray-100"
                                    >
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{group.name}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{group.tags?.join(', ')}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{group.images.length}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                            {new Date(group.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isModalOpen && selectedGroup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{selectedGroup.name}</h2>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 cursor-pointer">&times;</button>
                        </div>
                        <p className="mb-4">Tags: {selectedGroup.tags?.join(', ')}</p>
                        <p className="mb-4">
                            Created At: {new Date(selectedGroup.createdAt).toLocaleString()}
                        </p>

                        <p className="mb-4">Uploaded Images: </p>

                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {selectedGroup?.images
                                .slice() // Create a shallow copy to avoid mutating the original array
                                .sort((a: any, b: any) => Number(b.isThumbnail) - Number(a.isThumbnail)) // Thumbnails first
                                .map((image: any) => (
                                <div key={image.id} className="relative border rounded-lg overflow-hidden">
                                    <img
                                        src={image.url}
                                        alt={`Image ${image.id}`}
                                        className="object-cover w-full h-24 p-2"
                                    />
                                    <button
                                        onClick={() => handleImageDelete(image.id)}
                                        className="absolute top-1 left-1 bg-white rounded-full p-1 hover:bg-gray-200 cursor-pointer"
                                    >
                                        <FaTimes className="text-gray-500" size={12} />
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleImageUpdate(image, { isThumbnail: !image.isThumbnail })
                                        }
                                        className="absolute top-2 right-2 text-yellow-500 cursor-pointer hover:text-yellow-300"
                                    >
                                        {image.isThumbnail ? <FaStar /> : <FaRegStar />}
                                    </button>
                                    <select
                                        className="absolute bottom-2 left-2 bg-white/80 text-sm max-w-full w-11/12 px-2 py-1 rounded-md"
                                        value={image.category}
                                        onChange={(e) => handleImageUpdate(image, { category: e.target.value })}
                                    >
                                        {['ExteriorPores', 'InteriorPores', 'ParticleSizeDistribution', 'Other'].map(
                                            category => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                            ))}
                            <button
                                onClick={toggleUploadSection}
                                className="flex items-center justify-center border-2 border-dashed rounded-lg h-24 cursor-pointer hover:border-blue-500"
                            >
                                <FaPlus size={24} className="text-gray-400" />
                            </button>

                            {/* {selectedGroup.images.map((image: any) => (
                                <div key={image.id} className="relative border rounded-lg overflow-hidden">
                                    <img
                                        src={image.url}
                                        alt={`Image ${image.id}`}
                                        className="object-cover w-full h-24 p-2"
                                    />
                                    <button
                                        onClick={() =>
                                            handleImageUpdate(image, { isThumbnail: !image.isThumbnail })
                                        }
                                        className="absolute top-2 right-2 text-yellow-500 cursor-pointer hover:text-yellow-300"
                                    >
                                        {image.isThumbnail ? <FaStar /> : <FaRegStar />}
                                    </button>
                                    <select
                                        className="absolute bottom-2 left-2 bg-white/80 text-sm max-w-full w-11/12 px-2 py-1 rounded-md"
                                        value={image.category}
                                        onChange={(e) => handleImageUpdate(image, { category: e.target.value })}
                                    >
                                        {['ExteriorPores', 'InteriorPores', 'ParticleSizeDistribution', 'Other'].map(
                                            category => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                            ))}

                            <button
                                onClick={toggleUploadSection}
                                className="flex items-center justify-center border-2 border-dashed rounded-lg h-24 cursor-pointer hover:border-blue-500"
                            >
                                <FaPlus size={24} className="text-gray-400" />
                            </button> */}
                        </div>
                       
                        {/* <div className="grid grid-cols-3 gap-2 mt-2">
                            {selectedGroup.images.map((image: any, index: number) => (
                                <div key={index} className="border rounded-lg overflow-hidden">
                                    <img
                                        src={image.url} // Assuming `image.url` contains the image URL
                                        alt={`Image ${index + 1}`}
                                        className="object-cover w-full h-24 p-2"
                                    />
                                </div>
                            ))}

                            <button
                                onClick={toggleUploadSection}
                                className="flex items-center justify-center border-2 border-dashed rounded-lg h-24"
                            >
                                <FaPlus size={24} className="text-gray-400" />
                            </button>
                        </div> */}

                        {isUploadVisible && (
                            <div className="mt-4">
                                <UploadFile
                                    acceptedFileTypes={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
                                    onUploadSubmit={handleUploadSubmitImage}
                                />
                            </div>
                        )}

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={closeModal}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default observer(ScaffoldGroupUploads);