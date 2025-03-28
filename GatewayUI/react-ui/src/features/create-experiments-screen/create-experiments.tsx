import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import ScaffoldGroupDetails from "../scaffold-groups/scaffold-group-details";
import ScaffoldGroupFilters from "../scaffold-groups/scaffold-group-filter";
import ScaffoldGroupCard from "../scaffold-groups/scaffold-group-card";
import { ScaffoldGroup } from "../../app/models/scaffoldGroup";
import { FaTimes } from 'react-icons/fa';
import DescriptorFilters from "../descriptors/descriptor-filters";
import { DescriptorType } from "../../app/models/descriptorType";
import { FaSpinner } from 'react-icons/fa';
import { downloadExperimentsAsExcel } from '../../app/common/excel-generator/excel-generator';
import { IoIosCloseCircleOutline } from "react-icons/io";
import ExperimentSidebar from "./experiment-sidebar";

type OptionKey = 'excelFileOption' | 'sheetOption' | 'columnOption' | 'stackedColumnOption';

const CreateExperiments = () => {
    const { scaffoldGroupStore } = useStore();
    const { scaffoldGroups, getDetailedScaffoldGroupsForExperiment } = scaffoldGroupStore;
    const [visibleDetails, setVisibleDetails] = useState<number | null>(null);
    const [numberOfColumns, setNumberOfColumns] = useState(3);
    const [selectedScaffoldGroups, setSelectedScaffoldGroups] = useState<ScaffoldGroup[]>([]);
    const [selectedDescriptorTypes, setSelectedDescriptorTypes] = useState<DescriptorType[]>([]);
    const [experimentStage, setExperimentStage] = useState(1);
    const [numFiles, setNumFiles] = useState(2);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarVisible, setSidebarVisible] = useState(false);

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
            selectedDescriptorTypes.map(dt => dt.id)
          );
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
        <>
            <div className="fixed-vertical-button-container">
                <button
                    onClick={() => setSidebarVisible(true)}
                    className="fixed-vertical-button"
                >
                    Experiment Summary
                </button>
            </div>
            <div className={`container mx-auto py-8 px-2`}>
                <div className="text-3xl text-gray-700 font-bold mb-12">Create experiments</div>
                {/* Toggle sidebar on small screens */}
                
                <div className="flex h-full">
                    {experimentStage === 1 && 
                        <div className="lg:w-3/4 sm:w-full mb-12">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center md:mr-6">
                                <p className="text-xl mb-2 md:mb-4 w-full">1. Select the scaffold groups to include in your experiment</p>
                                <div className="flex justify-end space-x-1 w-full md:w-auto">
                                    <button className="button-outline" onClick={() => setExperimentStage(2)}>Next</button>
                                </div>
                            </div>
                            <div className="h-full overflow-y-auto">
                            <ScaffoldGroupFilters condensed={true} allFiltersVisible={true} setIsLoading={setIsLoading} />
                                {isLoading ? (
                                    <div className="flex justify-center items-center py-8">
                                        <FaSpinner className="animate-spin" size={40} />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="col-span-3 px-3">
                                            {rows.map((row, index) => (
                                                <React.Fragment key={index}>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {row.map(scaffoldGroup => {
                                                            const isSelected = selectedScaffoldGroups.some(group => group.id === scaffoldGroup.id);
                                                            return (
                                                                <ScaffoldGroupCard
                                                                    key={scaffoldGroup.id}
                                                                    scaffoldGroup={scaffoldGroup}
                                                                    isVisible={visibleDetails === scaffoldGroup.id}
                                                                    toggleDetails={() => toggleDetails(scaffoldGroup.id)}
                                                                    isSelected={isSelected}
                                                                    isSelectable={true}
                                                                    onSelect={() => isSelected ? handleUnselectScaffoldGroup(scaffoldGroup.id) : handleSelectScaffoldGroup(scaffoldGroup)}
                                                                />
                                                            )}
                                                        )}
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
                                    </div>
                                )}
                            </div>
                        </div>
                    }
                    {experimentStage === 2 && 
                        <div className="lg:w-3/4 sm:w-full mb-12">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center md:mr-6">
                                <p className="text-xl mb-2 md:mb-4 w-full">2. Select the descriptors to output in your experiment</p>
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
                        <div className="lg:w-3/4 sm:w-full sm:flex-row mb-12">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center md:mr-6">
                                <p className="text-xl mb-2 md:mb-4 w-full">3. Design your output layout</p>
                                <div className="flex justify-end space-x-1 w-full md:w-auto">
                                    <button className="button-outline whitespace-nowrap" onClick={() => setExperimentStage(2)}>Back</button>
                                    {/* <button className="button-outline" onClick={() => handleGetExperiment()}>Generate Output</button> */}
                                    <button className="button-outline flex items-center gap-2 whitespace-nowrap" onClick={() => handleGetExperiment()}>
                                        Generate Output
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

                    <div className="hidden lg:block w-1/4 h-full">
                        <ExperimentSidebar
                            experimentStage={experimentStage}
                            options={options}
                            selectedDescriptorTypes={selectedDescriptorTypes}
                            selectedScaffoldGroups={selectedScaffoldGroups}
                            showTitle={true}
                            handleUnselectDescriptorType={handleUnselectDescriptorType}
                            handleUnselectScaffoldGroup={handleUnselectScaffoldGroup}
                        />
                    </div>

                    {isSidebarVisible && (
                    <div className="fixed inset-0 z-50 lg:hidden h-full">
                        <div
                            className="absolute inset-0 bg-black opacity-40"
                            onClick={() => setSidebarVisible(false)}
                        ></div>

                        <div className="absolute right-0 top-0 h-full w-11/12 max-w-sm bg-white shadow-lg overflow-y-auto p-4 transition-transform duration-300 transform translate-x-0">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">Experiment Summary</h2>
                                <button
                                onClick={() => setSidebarVisible(false)}
                                className="text-gray-500 hover:text-gray-700"
                                >
                                <FaTimes />
                                </button>
                            </div>

                            <ExperimentSidebar
                                experimentStage={experimentStage}
                                options={options}
                                selectedDescriptorTypes={selectedDescriptorTypes}
                                selectedScaffoldGroups={selectedScaffoldGroups}
                                showTitle={false}
                                handleUnselectDescriptorType={handleUnselectDescriptorType}
                                handleUnselectScaffoldGroup={handleUnselectScaffoldGroup}
                            />
                        </div>
                    </div>
                    )}

                    {/* <div className="w-1/4 p-4 bg-gray-100">
                        <h2 className="text-lg font-bold text-gray-700 mb-6">Experiment</h2>
                        {experimentStage >= 3 && 
                        <div className="mb-8">
                            <h3 className="text-gray-700 font-bold mb-3">Output Layout</h3>
                            <ul>
                                <li key={options.excelFileOption} className="my-4">
                                    <div>{"Excel Files - " + options.excelFileOption}</div>
                                </li>
                                <li key={options.sheetOption} className="my-4">
                                    <div>{"Sheets - " + options.sheetOption}</div>
                                </li>
                                
                                <li key={options.columnOption} className="my-4">
                                    <div>{"Columns - " + options.columnOption}</div>
                                </li>
                            </ul>
                        </div>
                        }
                        {(experimentStage >= 2 || selectedDescriptorTypes.length > 0) && 
                        <div className="mb-8">
                            <h3 className="text-gray-700 font-bold mb-3">Selected Descriptors</h3>
                            <ul>
                                {selectedDescriptorTypes.length === 0 ? 
                                    <p className="italic">None selected</p> : 
                                    selectedDescriptorTypes.map(descriptorType => (
                                        <li key={descriptorType.id} className="my-4">
                                            <div className="flex justify-left items-center">
                                                <button 
                                                    className="bg-gray-300 text-gray-700 p-2 rounded-full mr-2 text-xs hover:shadow-md"
                                                    onClick={() => handleUnselectDescriptorType(descriptorType.id)}
                                                >
                                                    <FaTimes />
                                                </button>
                                                {descriptorType.label + (descriptorType.unit?.length > 0 ? " (" + descriptorType.unit + ")" : "")}
                                            </div>
                                        </li>
                                    ))
                                }
                            </ul>
                        </div>
                        }
                        <div className="">
                            <h3 className="text-gray-700 font-bold mb-3">Selected Scaffold Groups</h3>
                            <ul>
                                {selectedScaffoldGroups.length === 0 ? 
                                    <p className="italic">None selected</p> : 
                                    selectedScaffoldGroups.map(group => (
                                        <li key={group.id} className="my-4">
                                            <div className="flex justify-left items-center">
                                                <button 
                                                    className="bg-gray-300 text-gray-700 p-2 rounded-full mr-2 text-xs hover:shadow-md"
                                                    onClick={() => handleUnselectScaffoldGroup(group.id)}
                                                >
                                                    <FaTimes />
                                                </button>
                                                {group.name}
                                            </div>
                                            <Formik
                                                initialValues={{scaffoldGroup:group.id, replicates: 1 }}
                                                onSubmit={(values, {setErrors}) => console.log(values, setErrors)}
                                            >
                                                {formik => (
                                                    <form onSubmit={formik.handleSubmit}>
                                                        <div className='flex flex-col items-end'>
                                                            <div className='flex items-center space-x-2'>
                                                                <TextInput
                                                                    type="number"
                                                                    name="replicates"
                                                                    placeholder={'1'}
                                                                    errors={formik.errors}
                                                                    touched={formik.touched}
                                                                    min={1}
                                                                    max={group.numReplicates}
                                                                    step={1}
                                                                    className="p-1 text-sm w-12 appearance-none"
                                                                />
                                                                <p className="text-sm ml-2 my-auto mb-5">{` of ${group.numReplicates} replicates`}</p>
                                                            </div>
                                                        </div>							
                                                    </form>
                                                )}
                                            </Formik>
                                        </li>
                                    ))
                                }
                            </ul>
                        </div>
                    </div> */}
                </div>
            </div>
        </>
        
    );
};

export default observer(CreateExperiments);