import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import ScaffoldGroupFilters from "../scaffold-groups/scaffold-group-filter";
import { ScaffoldGroup } from "../../app/models/scaffoldGroup";
import DescriptorFilters from "../descriptors/descriptor-filters";
import { DescriptorType } from "../../app/models/descriptorType";
import { FaSpinner } from 'react-icons/fa';
import { downloadExperimentsAsExcel, triggerDownload } from '../../app/common/excel-generator/excel-generator';
import { IoIosCloseCircleOutline } from "react-icons/io";
import ExperimentSidebar from "./experiment-sidebar";
import ScaffoldGroupsFilterResults from "../scaffold-groups/scaffold-group-filter-results";
import { useScaffoldGroupFiltering } from "../../app/common/hooks/useScaffoldGroupFiltering";
import AISearchBar from "../../app/common/ai-search-bar/ai-seach-bar";
import { SearchContextSummary } from "../../app/common/ai-search-bar/search-context-summary";
import { Sidebar } from "../../app/common/sidebar/sidebar";
import AcknowledgementModal from "../acknowledgement/acknowledgement-modal";
import { openPreviewInNewTab } from "../../app/common/new-tab-preview/new-tab-preview";

type OptionKey = 'excelFileOption' | 'sheetOption' | 'columnOption' | 'stackedColumnOption';

const CreateExperiments = () => {
    const { scaffoldGroupStore } = useStore();
    const {
        scaffoldGroups,
		segmentedScaffoldGroups: { exact, related },
        getDetailedScaffoldGroupsForExperiment,
    } = scaffoldGroupStore;
    const [visibleDetails, setVisibleDetails] = useState<number | null>(null);
    const [numberOfColumns, setNumberOfColumns] = useState(3);
    const [selectedScaffoldGroups, setSelectedScaffoldGroups] = useState<ScaffoldGroup[]>([]);
    const [selectedDescriptorTypes, setSelectedDescriptorTypes] = useState<DescriptorType[]>([]);
    const [replicatesByGroup, setReplicatesByGroup] = useState<Record<number, number>>({});
    const [experimentStage, setExperimentStage] = useState(1);
    const [numFiles, setNumFiles] = useState(2);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarVisible, setSidebarVisible] = useState(false);
    const [showAcknowledgement, setShowAcknowledgement] = useState(false);

    const maxNumFiles = 2;
    const numSheets = 4;
    const numRows = 5;
    const numCols = 4;

    const [options, setOptions] = useState({
        excelFileOption: 'Scaffold Groups',
        sheetOption: 'Scaffold Replicates',
        columnOption: 'Descriptors',
        stackedColumnOption: 'False'
    });

    const {
        selectedParticleSizeIds,
        setSelectedParticleSizeIds,
        selectedTags,
        setSelectedTags,
        selectedTagNames,
        removeFilterTag,
        loadAIResults,
        aiSearchUsed,
        setAiSearchUsed,
    } = useScaffoldGroupFiltering(true, setIsLoading);

    const clearFilters = () => {
		setSelectedTags({});
		setSelectedParticleSizeIds([]);
        setAiSearchUsed(false);
	};

    const handleSelectDescriptorType = (descriptorType: DescriptorType) => {
        setSelectedDescriptorTypes(prev => {
            setError(null);
            if (prev.some(descriptor => descriptor.id === descriptorType.id)) {
                return prev.filter(descriptor => descriptor.id !== descriptorType.id);
            } else {
                return [...prev, descriptorType];
            }
        });
    };

    const handleUnselectDescriptorType = (descriptorTypeId: number) => {
        setError(null);
        setSelectedDescriptorTypes(selectedDescriptorTypes.filter(descriptor => descriptor.id !== descriptorTypeId));
    };

    const handleSelectScaffoldGroup = (scaffoldGroup: ScaffoldGroup) => {
        setError(null);
        if (!selectedScaffoldGroups.some(group => group.id === scaffoldGroup.id)) {
            setSelectedScaffoldGroups([...selectedScaffoldGroups, scaffoldGroup]);
        }
    };

    const handleUnselectScaffoldGroup = (scaffoldGroupId: number) => {
        setError(null);
        setSelectedScaffoldGroups(selectedScaffoldGroups.filter(group => group.id !== scaffoldGroupId));
    };

    // const handleDownloadClick = () => {
    //     setShowAcknowledgement(true);
    // };

    const handleConfirmAcknowledgement = () => {
        setShowAcknowledgement(false);
        handleGetExperiment();
    };

    // const generatePreviewWorkbook = (data: {
    //     scaffoldGroups: ScaffoldGroup[];
    //     selectedDescriptorTypes: DescriptorType[];
    //     options: any;
    // }): { file: XLSX.WorkBook; filename: string } => {
    //     const { scaffoldGroups, selectedDescriptorTypes, options } = data;
    //     const result = downloadExperimentsAsExcel(scaffoldGroups, selectedDescriptorTypes, options, true);

    //     if (!result || !result.files || result.files.length === 0) {
    //         throw new Error("No workbook files returned for preview.");
    //     }

    //     // Return only the first file for preview
    //     return result.files[0];
    // };

    const handlePreviewClick = async () => {
        setError(null);

        if (selectedScaffoldGroups.length === 0) {
            setError("You must first select the scaffold groups you want to preview");
            return;
        }

        if (selectedDescriptorTypes.length === 0) {
            setError("You must first select the descriptors you want to preview");
            return;
        }

        setIsLoading(true);

        try {
            const scaffoldGroups = await getDetailedScaffoldGroupsForExperiment(
                selectedScaffoldGroups.map((sg) => sg.id),
                selectedDescriptorTypes.map((dt) => dt.id),
                replicatesByGroup
            );

            if (scaffoldGroups) {
                const result = downloadExperimentsAsExcel(scaffoldGroups, selectedDescriptorTypes, options, true);

                if (result && result.files.length > 0) {
                    const [firstFile] = result.files;
                    // const { file, filename, headingRowsBySheet } = firstFile;

                    // Determine the first sheet name
                    // const firstSheetName = file.SheetNames[0];
                    // const headingRows = headingRowsBySheet?.[firstSheetName] ?? [0]; // fallback to [0]

                    openPreviewInNewTab(
                        firstFile,         // includes file, filename, headingRowsBySheet
                        triggerDownload,
                        result.files,
                        100
                    );
                } else {
                    setError("Preview failed: no files were generated.");
                }
            }
        } catch (err) {
            console.error("Preview failed:", err);
            setError("Something went wrong while generating the preview.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetExperiment = async () => {
        if (selectedScaffoldGroups.length === 0) {
            setError('You must first select the scaffold groups you want to download');
            return;
        }
        if (selectedDescriptorTypes.length === 0) {
            setError('You must first select the descriptors you want to download');
            return;
        }
        setError(null);
        setIsLoading(true);
        try {
          const scaffoldGroups = await getDetailedScaffoldGroupsForExperiment(
            selectedScaffoldGroups.map(sg => sg.id),
            selectedDescriptorTypes.map(dt => dt.id),
            replicatesByGroup
          );
        //   console.log(scaffoldGroups);
          if (scaffoldGroups) {
            downloadExperimentsAsExcel(scaffoldGroups, selectedDescriptorTypes, options);
          }
          setError(null);
        } catch (error) {
          console.error("Failed to get scaffold groups for experiment", error);
        } finally {
          setIsLoading(false);
        }
    };

    const handleOptionChange = (optionName: OptionKey, value: string) => {
        let newOptions = { ...options, [optionName]: value };
        
        // All available options
        const allOptions = ['Descriptors', 'Scaffold Replicates', 'Scaffold Groups'];
    
        // Function to check for duplicates
        // const hasDuplicates = (opts: { [key: string]: string }) => {
        //     const values = Object.values(opts);
        //     return values.length !== new Set(values).size;
        // };
    
        // Adjust options to avoid duplicates
        const adjustOptions = (changedOption: OptionKey) => {
            const usedValues = new Set<string>([newOptions[changedOption]]);
            const optionKeys: OptionKey[] = ['columnOption', 'sheetOption', 'excelFileOption'];
    
            optionKeys.forEach((key) => {
                if (key !== changedOption) {
                    if (usedValues.has(newOptions[key])) {
                        // Find the first available option not used yet
                        const availableOption = allOptions.find(opt => !usedValues.has(opt));
                        if (availableOption) {
                            newOptions[key] = availableOption;
                            usedValues.add(availableOption);
                        }
                    } else {
                        usedValues.add(newOptions[key]);
                    }
                }
            });
        };
    
        // Apply adjustments for no duplicate states
        adjustOptions(optionName);
    
        // Check if 'stackedColumnOption' should be adjusted based on user change
        if (optionName === 'stackedColumnOption') {
            newOptions.stackedColumnOption = value;
        } else {
            // Handle the case where 'stackedColumnOption' needs to be automatically set
            const isReplicatesSelected = newOptions.excelFileOption === 'Scaffold Replicates' ||
                                         newOptions.columnOption === 'Scaffold Replicates' ||
                                         newOptions.sheetOption === 'Scaffold Replicates';
    
            if (isReplicatesSelected) {
                newOptions.stackedColumnOption = 'True';
                setNumFiles(1);
            } else if (newOptions.stackedColumnOption !== 'True') {
                // Allow the stacked option to be 'False' if no auto-setting is required
                newOptions.stackedColumnOption = 'False';
                setNumFiles(maxNumFiles);
            }
        }
    
        // Set the new options state
        setOptions(newOptions);
    };
    
    
    useEffect(() => {
        const updateNumberOfColumns = () => {
            const width = window.innerWidth;
            if (width < 640) setNumberOfColumns(1);
            else setNumberOfColumns(2);
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

    const getTablePlaceholderData = (option: string, optionKey: string) => {
        let numVals = 4;
        if (optionKey === "excelFileOption"){
            numVals = numFiles;
        }
        else if (optionKey === "sheetOption") {
            numVals = numSheets;
        }
        else if (optionKey === "rowOption") {
            numVals = numRows;
        }
        else {
            numVals = numCols;
        }
        switch (option) {
            case "Descriptors":
                // return selectedDescriptorTypes.map(descriptor => descriptor.label + (descriptor.unit.length > 0 ? " (" + descriptor.unit + ")" : "")).slice(0, numVals);
                return Array.from({ length: numVals }, (_, i) => "Descriptor " + (i + 1).toString());
            case "Scaffold Groups":
                // return selectedScaffoldGroups.map(group => group.name).slice(0, numVals);
                return Array.from({ length: numVals }, (_, i) => "Scaffold Group " + (i + 1).toString());
            case "Scaffold Replicates":
                // const maxReplicates = Math.max(...selectedScaffoldGroups.map(group => group.numReplicates));
                // return Array.from({ length: maxReplicates < numVals ? maxReplicates : numVals }, (_, i) => (i + 1).toString());
                return Array.from({ length: numVals }, (_, i) => "Replicate " + (i + 1).toString());
            case "Data":
                return new Array(numVals).fill("data");
            default:
                return selectedDescriptorTypes.map(descriptor => descriptor.label + (descriptor.unit?.length > 0 ? " (" + descriptor.unit + ")" : "")).slice(0, numVals);
        }
    }

    const renderPlaceholderTable = (columnOption: string) => {
        const tableHeaders = getTablePlaceholderData(columnOption, "columnOption");
        const replicatesAlongRows = options.stackedColumnOption === 'True' && (options.columnOption !== "Scaffold Replicates" && options.sheetOption !== "Scaffold Replicates");
        const rowOption = replicatesAlongRows ? "Scaffold Replicates" : "Data"
        const tableRows = getTablePlaceholderData(rowOption, "rowOption")
    
        return (
            <table className="table-auto w-full text-xs">
                <thead>
                    <tr>
                        {replicatesAlongRows &&
                            <th className="border py-1">{rowOption}</th>
                        }
                        {tableHeaders.map((header, index) => (
                            // columnOption === "Scaffold Replicates" ? 
                            //     <th key={index} className="border py-1">{"Replicate " + header}</th>
                            //     :
                            <th key={index} className="border py-1">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {tableRows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {replicatesAlongRows && <td className="border py-1 italic text-gray-300">{row}</td>}
                            {tableHeaders.map((_, colIndex) => (
                                <td key={colIndex} className={`py-1 italic text-gray-300 ${colIndex === numRows - 1 ? "border-b-0" : "border"}`}>data</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const renderSheetOptionsTable = (sheetOption: string) => {
        const tableFooters = getTablePlaceholderData(sheetOption, "sheetOption");        
        return (
            <div className="bg-gray-100 h-2 -mt-1 mb-12">
                <table className="table-auto w-full my-0 text-xs text-gray-500 border-collapse">
                    <thead>
                        <tr>
                            {tableFooters.map((footer, index) => (
                                <th key={index} className={`py-1 border border-gray-300  ${index === 0 ? 'rounded-bl-md rounded-br-md shadow-md bg-white border-gray-300' : index<3 ? 'bg-gray-100 border-b-0' : "bg-gray-100 border border-b-0 border-r-0 min-w-32 border-t-1 border-gray-300"}`}>
                                    {index<3 ? footer : ""}
                                </th>
                            ))}
                        </tr>
                    </thead>
                </table>
            </div>
        );
    };



    return (
        <div className="flex mx-auto py-8 px-2">
            <div className="flex-1 space-y-12 pr-4">
                <div className="text-3xl text-gray-700 font-bold mb-12">Customize downloads</div>                        
                <div className="flex h-full w-full">
                    {experimentStage === 1 && 
                        <div className="w-full mb-12">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                                <p className="text-xl mb-2 md:mb-4 w-full">1. Select the scaffold groups to include in your download</p>
                                <div className="flex justify-end space-x-1 w-full md:w-auto">
                                    <button className="button-outline" onClick={() => setExperimentStage(2)}>Next</button>
                                </div>
                            </div>

                            <div className="md:flex-row mb-4">
                                <AISearchBar onSearch={loadAIResults} onClear={clearFilters}/>
                                <SearchContextSummary aiSearchUsed={aiSearchUsed} selectedTagNames={selectedTagNames} selectedParticleSizeIds={selectedParticleSizeIds}/>
                            </div>

                            <ScaffoldGroupFilters 
                                setIsLoading={setIsLoading} 
                                condensed={true} 
                                allFiltersVisible={true}
                                selectedParticleSizeIds={selectedParticleSizeIds}
                                setSelectedParticleSizeIds={setSelectedParticleSizeIds}
                                selectedTags={selectedTags}
                                setSelectedTags={setSelectedTags}
                            />

                            {isLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <FaSpinner className="animate-spin" size={40} />
                                </div>
                            ) : (
                                <>
                                    <ScaffoldGroupsFilterResults
                                        scaffoldGroups={scaffoldGroups}
                                        exact={exact}
                                        related={related}
                                        selectedScaffoldGroups={selectedScaffoldGroups}
                                        visibleDetails={visibleDetails}
                                        toggleDetails={toggleDetails}
                                        onSelect={handleSelectScaffoldGroup}
                                        onUnselect={handleUnselectScaffoldGroup}
                                        selectedTagNames={selectedTagNames}
                                        selectedParticleSizeIds={selectedParticleSizeIds}
                                        onRemoveTag={removeFilterTag}
                                        largeScreenColumns={2}
                                    />
                                </>
                            )}
                        </div>
                    }
                    {experimentStage === 2 && 
                        <div className="w-full mb-12">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                                <p className="text-xl mb-2 md:mb-4 w-full">2. Select the descriptors to output</p>
                                <div className="flex justify-end space-x-1 w-full md:w-auto">
                                    <button className="button-outline whitespace-nowrap" onClick={() => setExperimentStage(1)}>Back</button>
                                    <button className="button-outline whitespace-nowrap" onClick={() => setExperimentStage(3)}>Next</button>
                                </div>
                            </div>
                            <DescriptorFilters 
                                selectedDescriptorTypes={selectedDescriptorTypes}
                                onSelect={handleSelectDescriptorType}
                            />
                        </div>
                    }
                    {experimentStage === 3 && 
                        <div className="w-full sm:flex-row mb-12">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                                <p className="text-xl mb-2 md:mb-4 w-full">3. Design your output layout</p>
                                <div className="flex justify-end space-x-1 w-full md:w-auto">
                                    <button className="button-outline whitespace-nowrap" onClick={() => setExperimentStage(2)}>Back</button>
                                    {/* <button className="button-outline flex items-center gap-2 whitespace-nowrap" onClick={() => handleDownloadClick()}>
                                        Download Data
                                        {isLoading && <FaSpinner className="animate-spin text-current text-[1em]" />}
                                    </button> */}
                                    <button className="button-outline flex items-center gap-2 whitespace-nowrap" onClick={handlePreviewClick}>
                                        Preview Data
                                        {isLoading && <FaSpinner className="animate-spin text-current text-[1em]" />}
                                    </button>
                                </div>
                            </div>
                            {error && (
                                <div className="mr-6">
                                    <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                                        <strong className="font-bold">Error: </strong>
                                        <span className="block sm:inline">{error}</span>
                                        <button
                                            className="absolute top-0 bottom-0 right-0 px-4 py-3"
                                            onClick={() => setError(null)}
                                        >
                                            <IoIosCloseCircleOutline />
                                        </button>
                                    </div>
                                </div>
                                
                            )}
                            <div className="flex w-full justify-between items-stretch">
                                <div className="w-1/5 mt-4">
                                    <div className="mb-4">
                                        <h3 className="text-md font-bold mb-2">Columns</h3>
                                        <select value={options.columnOption} onChange={(e) => handleOptionChange('columnOption', e.target.value)} className="w-full border px-2 py-1 text-md">
                                            <option value="Scaffold Groups">Scaffold Groups</option>
                                            <option value="Descriptors">Descriptors</option>
                                            <option value="Scaffold Replicates">Scaffold Replicates</option>
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <h3 className="text-md font-bold mb-2">Sheets</h3>
                                        <select value={options.sheetOption} onChange={(e) => handleOptionChange('sheetOption', e.target.value)} className="w-full border px-2 py-1 text-md">
                                            <option value="Scaffold Replicates">Scaffold Replicates</option>
                                            <option value="Descriptors">Descriptors</option>
                                            <option value="Scaffold Groups">Scaffold Groups</option>
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <h3 className="text-md font-bold mb-2">Excel files</h3>
                                        <select value={options.excelFileOption} onChange={(e) => handleOptionChange('excelFileOption', e.target.value)} className="w-full border px-2 py-1 text-md">
                                            <option value="Descriptors">Descriptors</option>
                                            <option value="Scaffold Replicates">Scaffold Replicates</option>
                                            <option value="Scaffold Groups">Scaffold Groups</option>
                                        </select>
                                    </div>
                                    {options.sheetOption !== "Scaffold Replicates" && options.columnOption !== "Scaffold Replicates" &&
                                    <div className="mb-4">
                                        <h3 className="text-md font-bold mb-2">Stack replicates in single file?</h3>
                                        <select value={options.stackedColumnOption} onChange={(e) => handleOptionChange('stackedColumnOption', e.target.value)} className="w-full border px-2 py-1 text-md">
                                            <option value='False'>No</option>
                                            <option value='True'>Yes</option>
                                        </select>
                                    </div>
                                    }
                                    
                                </div>
                                <div className="w-4/5 px-6">
                                    {Array.from({ length: numFiles }, (_, i) => (
                                        <div className="" key={i}>
                                            <p className="mb-1 mt-5">{options.stackedColumnOption === 'True' ? "experiment.xlsx" : options.excelFileOption.toLowerCase().replace(" ", "_") + "_" + i + ".xlsx"}</p>
                                            {renderPlaceholderTable(options.columnOption)}
                                            {/* <p className="text-xs italic font-bold mb-0 pb-0">Sheets</p> */}
                                            {renderSheetOptionsTable(options.sheetOption)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    }
                </div>
            </div>
            <Sidebar
                isVisible={isSidebarVisible}
                onClose={() => setSidebarVisible(false)}
                onOpen={() => setSidebarVisible(true)}
                title="Download Summary"
                toggleButtonLabel="Download Summary"
                className="w-1/4 shrink-0 bg-gray-100 p-0"
                >
                <ExperimentSidebar
                    experimentStage={experimentStage}
                    options={options}
                    selectedDescriptorTypes={selectedDescriptorTypes}
                    selectedScaffoldGroups={selectedScaffoldGroups}
                    showTitle={false}
                    handleUnselectDescriptorType={handleUnselectDescriptorType}
                    handleUnselectScaffoldGroup={handleUnselectScaffoldGroup}
                    onReplicatesChange={(groupId, numReplicates) => {
                        setReplicatesByGroup((prev) => ({
                            ...prev,
                            [groupId]: numReplicates
                        }));
                    }}
                />
            </Sidebar>
            <AcknowledgementModal
                isOpen={showAcknowledgement}
                onClose={() => setShowAcknowledgement(false)}
                onConfirm={handleConfirmAcknowledgement}
            />
        </div>        
    );
};

export default observer(CreateExperiments);