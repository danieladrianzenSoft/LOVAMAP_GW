import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import UploadFile from '../../app/common/upload-file/upload-file';
import { useStore } from '../../app/stores/store';
import toast from "react-hot-toast";
import { FaPlus, FaTimes } from 'react-icons/fa';
import LoadingSpinner from '../../app/common/loading-spinner/loading-spinner';
import { Image, ImageToCreate, ImageToUpdate } from '../../app/models/image';
import { Publication } from '../../app/models/publication';
import { ScaffoldGroup, ScaffoldGroupToCreate } from '../../app/models/scaffoldGroup';
import { useDescriptorTypes } from '../../app/common/hooks/useDescriptorTypes';
import { processExcelFile } from '../../app/common/excel-processor/excel-processor';
import ScaffoldGroupLibrary from './scaffold-group-library';

const ScaffoldGroupUploads: React.FC = () => {
    const { descriptorTypes} = useDescriptorTypes();
    const { scaffoldGroupStore, userStore, publicationStore } = useStore();
    const { getUploadedScaffoldGroups, uploadedScaffoldGroups = [],
        updateImage, navigateToVisualization, deleteScaffoldGroup, moveScaffoldToGroup, updateScaffoldGroupVisibility } = scaffoldGroupStore;

    const navigate = useNavigate();
    const isAdmin = userStore.user?.roles?.includes("administrator") ?? false;

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [uploadPct, setUploadPct] = useState<number | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showFileUpload, setShowFileUpload] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchUploadedScaffoldGroups = async () => {
            setIsLoading(true);
            const [publicationResults] = await Promise.all([
                publicationStore.getPublications(),
                getUploadedScaffoldGroups(),
            ]);
            setPublications(publicationResults);
            setIsLoading(false);
        };
        fetchUploadedScaffoldGroups();
    }, [getUploadedScaffoldGroups, publicationStore]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
                setShowAddMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Utility function to trigger JSON download
    const triggerJsonDownload = (jsonObject: any, fileName: string) => {
        const jsonBlob = new Blob([JSON.stringify(jsonObject, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(jsonBlob);
        link.download = fileName;
        link.click();
    };

    const handleDeleteGroup = async (scaffoldGroupId: number) => {
        try {
            await deleteScaffoldGroup(scaffoldGroupId);
            toast.success('Scaffold group deleted successfully');
            if (uploadedScaffoldGroups.some(g => g.id === scaffoldGroupId)) {
                scaffoldGroupStore.removeUploadedScaffoldGroup(scaffoldGroupId);
            }
        } catch (error) {
            toast.error('There was an error deleting this scaffold group');
            console.error(error);
        }
    }

    const handleUploadSubmitFile = async (files: File[]) => {
        try {
        // 1) Excel files → convert, let user download JSON (unchanged)
        const excelFiles = files.filter(f => f.name.endsWith(".xlsx") || f.name.endsWith(".xls"));
        if (excelFiles.length > 0) {
            if (!descriptorTypes?.length) {
                alert("Descriptor types are not available. Cannot process Excel files.");
                return;
            }
            await Promise.all(
                excelFiles.map(async (file) => {
                    const outputJson = await processExcelFile(file, descriptorTypes);
                    const fileName = `${file.name.replace(/\.[^/.]+$/, "")}_output.json`;
                    triggerJsonDownload(outputJson, fileName);
                })
            );
        }

        // 2) JSON files → parse and combine
        const jsonFiles = files.filter(f => f.type === "application/json");
        if (jsonFiles.length > 0) {
            const parsedJsonArrays = await Promise.all(
                jsonFiles.map(f => f.text().then(JSON.parse))
            );
            const combinedJson: ScaffoldGroupToCreate[] = parsedJsonArrays.flat();

            // (A) Always stream with progress:
            setUploadPct(0);
            const result = await scaffoldGroupStore.uploadScaffoldGroupBatchStreamed(
                combinedJson,
                (pct) => setUploadPct(pct)
            );
            setUploadPct(null);

            if (!result) {
                toast.error("Failed to upload scaffold groups.");
            } else {
                toast.success(`Uploaded ${result.length} scaffold group(s).`);
            }
        }
        } catch (err) {
            console.error(err);
            setUploadPct(null);
            toast.error("Failed to upload files.");
        }
    };

    const handleUploadSubmitImage = async (group: ScaffoldGroup, files: File[], scaffoldId?: number) => {
        try {
            const imageFiles = files.filter(file => file.type.startsWith('image/'));

            if (imageFiles.length > 0) {
                await Promise.all(
                    imageFiles.map(async (imageFile) => {
                        const image: ImageToCreate = {
                            scaffoldGroupId: group.id,
                            scaffoldId: scaffoldId ?? null,
                            file: imageFile,
                        };
                        await scaffoldGroupStore.uploadImageForScaffoldGroup(group.id, image);
                    })
                );
                await getUploadedScaffoldGroups();
                return await scaffoldGroupStore.getScaffoldGroupSummary(group.id) ?? null;
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to upload images.');
        }
        return null;
    };

    const handleImageUpdate = async (group: ScaffoldGroup, image: Image, updates: Partial<ImageToUpdate>) => {
        try {
            const updatedImage: ImageToUpdate = {
                id: image.id,
                category: updates.category ?? image.category,
                isThumbnail: updates.isThumbnail ?? image.isThumbnail,
                scaffoldGroupId: group.id,
                scaffoldId: image.scaffoldId ?? null,
            };
            const updatedScaffoldGroup = await updateImage(group.id, updatedImage);
            if (updatedScaffoldGroup) {
                await getUploadedScaffoldGroups(); // Refresh the scaffold group data
                return updatedScaffoldGroup;
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to update image.');
        }
        return null;
    };

    const handleImageDelete = async (group: ScaffoldGroup, imageId: number) => {
        try {
            const result = await scaffoldGroupStore.deleteImage(group.id, imageId);
            if (result) {
                await getUploadedScaffoldGroups();
                return result;
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete image.');
        }
        return null;
    };

    const handleMoveScaffold = async (scaffoldId: number, targetGroupId: number) => {
        try {
            const result = await moveScaffoldToGroup(scaffoldId, targetGroupId);
            if (result) {
                toast.success('Scaffold moved successfully');
                return true;
            }
        } catch (error) {
            console.error(error);
        }
        toast.error('Failed to move scaffold. Confirm the target group has matching metadata.');
        return false;
    };

    const handleVisibilityChange = async (group: ScaffoldGroup, isPublic: boolean) => {
        try {
            const result = await updateScaffoldGroupVisibility(group.id, isPublic);
            if (result) {
                toast.success(`Scaffold group is now ${isPublic ? 'public' : 'private'}`);
                return result;
            }
        } catch (error) {
            console.error(error);
        }
        toast.error('Failed to update scaffold group visibility.');
        return null;
    };

    const handleUploadError = (group: any) => {
        toast.error('Failed to upload files.');
    };

    return (
        <div className={`container mx-auto py-8 px-6`}>
            <div className="flex items-center justify-between mb-12">
                <div className="text-3xl text-gray-700 font-bold">My Scaffolds</div>
                <div className="relative" ref={addMenuRef}>
                    <button
                        onClick={() => isAdmin ? setShowAddMenu(prev => !prev) : navigate('/jobs/new')}
                        className="button-outline flex items-center gap-2 cursor-pointer"
                    >
                        <FaPlus size={12} />
                        {isAdmin ? 'Add New' : 'Run LOVAMAP'}
                    </button>
                    {isAdmin && showAddMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <button
                                onClick={() => {
                                    setShowFileUpload(prev => !prev);
                                    setShowAddMenu(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 cursor-pointer rounded-t-lg"
                            >
                                Upload File
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddMenu(false);
                                    navigate('/jobs/new');
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 cursor-pointer border-t border-gray-100 rounded-b-lg"
                            >
                                Run LOVAMAP
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {uploadPct !== null && (
                <div className="mt-3 w-full rounded">
                    <div
                        className="h-2 rounded bg-blue-500 transition-all"
                        style={{ width: `${uploadPct}%` }}
                    />
                    <div className="text-xs mt-1 text-gray-600">{uploadPct}%</div>
                </div>
            )}

            {showFileUpload && (
                <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-600">Upload scaffold files</span>
                        <button
                            onClick={() => setShowFileUpload(false)}
                            className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                            <FaTimes size={14} />
                        </button>
                    </div>
                    <UploadFile
                        acceptedFileTypes={{
                            'application/json': ['.json'],
                            'application/vnd.ms-excel': [".xls", ".xlsx"],
                        }}
                        onUploadSubmit={handleUploadSubmitFile}
                        onUploadError={handleUploadError}
                    />
                </div>
            )}

            {isLoading ? (
                <LoadingSpinner />
            ) : (
                <ScaffoldGroupLibrary
                    scaffoldGroups={uploadedScaffoldGroups}
                    publications={publications}
                    isAdmin={isAdmin}
                    onInteractGroup={(group, scaffoldId) => navigateToVisualization(group, scaffoldId)}
                    onDeleteGroup={handleDeleteGroup}
                    onUploadImages={handleUploadSubmitImage}
                    onUpdateImage={handleImageUpdate}
                    onDeleteImage={handleImageDelete}
                    onMoveScaffold={handleMoveScaffold}
                    onUpdateVisibility={handleVisibilityChange}
                />
            )}
        </div>
    );
};

export default observer(ScaffoldGroupUploads);
