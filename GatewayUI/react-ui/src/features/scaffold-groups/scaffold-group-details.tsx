import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import Tag from '../../app/common/tag/tag';
import { Formik } from 'formik';
import { downloadScaffoldGroupAsExcel, triggerDownload } from '../../app/common/excel-generator/excel-generator';
import { useStore } from '../../app/stores/store';
import { observer } from 'mobx-react-lite';
import { FaSpinner } from 'react-icons/fa';
import { openPreviewInNewTab } from '../../app/common/new-tab-preview/new-tab-preview';
import { PoreInfoForScaffold } from '../../app/models/poreInfo';
import { HistogramPlot } from '../plotting/histogram-plot';
import PlotSelector from '../../app/common/plot-selector/plot-selector';
import History from "../../app/helpers/History";
import { PORE_DESCRIPTOR_MAP, PoreDescriptorUIConfig } from '../../constants/pore-descriptors';
import { DescriptorType } from '../../app/models/descriptorType';
import { useDescriptorTypes } from '../../app/common/hooks/useDescriptorTypes';

interface ScaffoldGroupDetailsProps {
    scaffoldGroup: ScaffoldGroup;
    isVisible: boolean;
    toggleDetails: () => void;
}

const categoryOrder: { [key: string]: number } = {
	Particles: 0,
    ExteriorPores: 1,
    InteriorPores: 2,
    ParticleSizeDistribution: 3,
    Other: 4
};

const ScaffoldGroupDetails: React.FC<ScaffoldGroupDetailsProps> = ({ scaffoldGroup, isVisible, toggleDetails }) => {
    const {scaffoldGroupStore, descriptorStore} = useStore();
	const { descriptorTypes } = useDescriptorTypes();
	
	const {getDetailedScaffoldGroupById, navigateToVisualization} = scaffoldGroupStore;
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [poreInfo, setPoreInfo] = useState<PoreInfoForScaffold>();
	const [showMore, setShowMore] = useState(false);

	const descriptorValueMap = useMemo(() => {
		if (!poreInfo) return {};

		const map: Record<number, number[]> = {};
		for (const d of poreInfo.descriptors) {
			map[d.descriptorTypeId] = d.values ?? [];
		}
		return map;
	}, [poreInfo]);

	const detailedDescriptors = useMemo(() => {
		const descriptorByName = new Map(descriptorTypes.map(d => [d.name, d]));

		return PORE_DESCRIPTOR_MAP
			.filter(cfg => cfg.showInDetails)
			.map(cfg => {
				const descriptor = descriptorByName.get(cfg.key);
				if (!descriptor) return null;
				return { ...cfg, descriptor };
			})
			.filter(Boolean) as Array<PoreDescriptorUIConfig & { descriptor: DescriptorType }>;
	}, [descriptorTypes]);

	const detailDescriptorTypeIds = useMemo(() => {
		return detailedDescriptors.map(d => d.descriptor.id);
	}, [detailedDescriptors]);

	const download = useCallback(async (values: any, setErrors: Function) => {
		setIsLoading(true);
		try {
			const downloadedData = await getDetailedScaffoldGroupById({
				scaffoldGroupId: values.scaffoldGroup
			});
	
			if (downloadedData) {
				const excelResult = downloadScaffoldGroupAsExcel(downloadedData);
				openPreviewInNewTab(
					excelResult,    // { file, filename, headingRowsBySheet }
					triggerDownload,
					[excelResult],  // optional allFiles dropdown (you can omit or include this)
					100
				);
			}
		} catch (error) {
			console.error("Error downloading data:", error);
			setErrors({ submit: "Failed to download data. Please try again." });
		} finally {
			setIsLoading(false);
		}
	}, [getDetailedScaffoldGroupById]);

	const getPoreInfo = useCallback(async (scaffoldGroupId: number, descriptorTypeIds: number[]) => {
		setIsLoading(true);
		try {
			const groupData = await descriptorStore.getPoreInfoForScaffoldGroup(scaffoldGroupId, descriptorTypeIds);
			if (groupData?.scaffolds?.length) {
			// If you only want the first scaffold’s data:
				setPoreInfo(groupData.scaffolds[0]); // a PoreInfoScaffoldDto
			}
		} catch (error) {
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	}, [descriptorStore]);

	const navigateToDataVisualization = ((scaffoldGroupId: number) => {
		History.push(`/data/${scaffoldGroupId.toString()}`);
	})

	useEffect(() => {
		if (isVisible && scaffoldGroup.id && detailDescriptorTypeIds.length > 0) {
			getPoreInfo(scaffoldGroup.id, detailDescriptorTypeIds);
		}
		// Only refetch if scaffoldGroup.id or visibility changes
	}, [isVisible, scaffoldGroup.id, detailDescriptorTypeIds, getPoreInfo]);
	
	const maxHeight = isVisible ? "500px" : "0px";

    return (
        <div className="pl-4">
            {/* <div className="flex items-center cursor-pointer" onClick={toggleDetails}>
                {isVisible ? <FaCaretRight className="transition-transform duration-300" /> : <FaCaretDown className="transition-transform duration-300" />}
            </div> */}
			<div className={`${isVisible ? 'block' : 'hidden'} bg-white p-4 rounded-md`}>
				<div className="flex flex-col lg:flex-row justify-center items-start gap-4">
					<div className="flex-1 p-4 w-full">
						{/* Container for figures */}
						{scaffoldGroup.images.length > 0 ? (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{scaffoldGroup.images
									.slice() // Create a copy to avoid mutating the original array
									.sort((a, b) => {
										// Use categoryOrder mapping, defaulting to 999 if category is unrecognized
										const orderA = categoryOrder[a.category] ?? 999;
										const orderB = categoryOrder[b.category] ?? 999;
										return orderA - orderB;
									})
									.map((image, index) => (
										<div key={index} className="flex flex-col items-center">
										<div
											className="relative w-full h-64 group overflow-hidden rounded-lg transition-shadow duration-300 hover:shadow-lg hover:scale-[1.01] cursor-pointer"
											onClick={() => navigateToVisualization(scaffoldGroup)}
										>
											{/* Top-centered category label */}
											<p className="absolute left-1/2 top-2 transform -translate-x-1/2 bg-white bg-opacity-70 text-sm text-gray-700 px-2 py-0.5 rounded z-10">
												{image.category}
											</p>

											{/* Image */}
											<img 
												src={image.url} 
												alt={image.category} 
												className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>

											{/* Interact Button (visible on hover) */}
											<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition duration-300">
												<button
													className="opacity-0 group-hover:opacity-100 text-white bg-blue-600 hover:bg-blue-700 text-sm px-4 py-1 rounded shadow transition duration-200"
													onClick={(e) => {
														e.stopPropagation(); // prevent click from bubbling
														navigateToVisualization(scaffoldGroup);
													}}
												>
													Interact
												</button>
											</div>
										</div>
									</div>
								))}
                        	</div>
						) : (
							<>
								<p className="text-sm text-gray-500 italic">No figures added</p>
								<button
									className="button-tag"
									onClick={(e) => {
										e.stopPropagation(); // prevent click from bubbling
										navigateToVisualization(scaffoldGroup);
									}}
								>
									Go to Visualization
								</button>
							</>
						)}

						<div className="flex flex-col items-center mt-8">
							<p className="mt-0 -mb-5">Interior Pore Descriptors</p>
							{Object.keys(descriptorValueMap).length > 0 && (
								<PlotSelector
									initialKey="Volume"
									plots={[
										...detailedDescriptors.map(({ key, descriptor }) => ({
											key,
											label: descriptor.label,
											component: descriptorValueMap[descriptor.id]?.length > 0 ? (
												<HistogramPlot
													data={descriptorValueMap[descriptor.id]}
													xlabel={descriptor.unit || ''}
													hideYLabels
													showHoverInfo={true}
													interactive={false}
												/>
											) : (
												<div className="text-sm text-gray-400 mt-4">No data for {descriptor.label}</div>
											)
										})),
										{
											key: 'more',
											label: 'More...',
											component: (
												<div className="text-sm text-gray-400 italic mt-4">Redirecting...</div>
											),
											onClick: () => navigateToDataVisualization(scaffoldGroup.id)
										}
									]}
								/>
							)}
							{/* <PlotSelector
								initialKey="volume"
								plots={[
								...PORE_DESCRIPTOR_MAP.filter(d => d.showInDetails).map(d => ({
									key: d.key,
									label: d.label,
									component: descriptorValueMap[d.typeId]?.length > 0 ? (
									<HistogramPlot
										data={descriptorValueMap[d.typeId]}
										xlabel={d.xlabel}
										hideYLabels
										showHoverInfo={true}
										interactive={false}
									/>
									) : (
									<div className="text-sm text-gray-400 mt-4">No data for {d.label}</div>
									)
								})),
								{
									key: 'more',
									label: 'More...',
									component: (
									<div className="text-sm text-gray-400 italic mt-4">Redirecting...</div>
									),
									onClick: () => { navigateToDataVisualization(scaffoldGroup.id); }
								}
								]}
							/> */}
						</div>
					</div>
					<div className="flex-1 p-4 w-full">
						<div className="flex flex-wrap gap-x-1 gap-y-1 mb-4">
							{scaffoldGroup.tags.map((tag, index) => (
								<Tag key={index} text={tag} />
							))}
						</div>
						<table className="w-full text-sm text-left text-gray-500">
							<tbody>
								<tr>
									<td className="font-medium text-gray-900 align-top w-32">Simulated:</td>
									<td>{scaffoldGroup.isSimulated ? 'yes' : 'no'}</td>
								</tr>
								<tr>
									<td className="font-medium text-gray-900 align-top w-32">Container Shape:</td>
									<td>{scaffoldGroup.inputs?.containerShape ?? 'n/a'}</td>
								</tr>
								{/* <tr>
									<td className="font-medium text-gray-900 align-top w-32">Container Size:</td>
									<td>{scaffoldGroup.inputs?.containerSize ?? 'n/a'}</td>
								</tr> */}
								<tr>
									<td className="font-medium text-gray-900 align-top">Packing Configuration:</td>
									<td>{scaffoldGroup.inputs?.packingConfiguration ?? 'unknown'}</td>
								</tr>
								<tr>
									<td className="w-32 align-top font-medium text-gray-900">Particles:</td>
									<td>
										<table className="w-full text-sm text-left text-gray-500">
											<tbody>
											{ 
												scaffoldGroup.inputs?.particles?.map((particle, index, array) => (
													<React.Fragment key={index}>
														<tr>
															<td className="font-bold" colSpan={2}>{(particle.proportion*100).toPrecision(3)}% {particle.meanSize.toPrecision(3)}μm diameter {particle.shape}</td>
															<td></td>
														</tr>
														<tr>
															<td className="lg:w-5"></td>
															<td className="text-gray-500">stiffness: {particle.stiffness}</td>
														</tr>
														<tr>
															<td></td>
															<td className="text-gray-500">dispersity: {particle.dispersity}</td>
														</tr>
														<tr>
															<td></td>
															<td className="text-gray-500">size distribution: {particle.sizeDistributionType}</td>
														</tr>
														<tr>
															<td></td>
															<td className="text-gray-500">standard deviation of diameter: {particle.standardDeviationSize.toPrecision(3)} μm</td>
														</tr>
													</React.Fragment>
												))
											}
											</tbody>
										</table>
									</td>
								</tr>
								<tr>
									<td></td>
									<td>
										<button type="button" className="button-outline self-start flex items-center gap-2 mt-2">
											Preview Data
											{isLoading && <FaSpinner className="animate-spin text-current text-[1em]" />}
										</button>
									</td>
								</tr>
								<tr>
									<td>
										<div className="flex justify-start items-start pb-2 mt-2">
											<button
												className="text-blue-600 hover:text-blue-800 text-xs"
												onClick={() => setShowMore(!showMore)}
											>
												{`${showMore ? 'Hide' : 'Show more'}`}
											</button>
										</div>
									</td>
									<td></td>
								</tr>
								{showMore && (
									<>
										<tr>
											<td className="font-medium text-gray-900 align-top w-32">Id:</td>
											<td>{scaffoldGroup.id}</td>
										</tr>
										<tr>
											<td className="w-32 font-medium text-gray-900 align-top">Replicates:</td>
											<td>
												<Formik
													initialValues={{scaffoldGroup:scaffoldGroup.id, replicates: 1 }}
													enableReinitialize={true}
													onSubmit={(values, {setErrors}) => download(values, setErrors)}
												>
													{formik => (
														<form onSubmit={formik.handleSubmit}>
															<div className='flex flex-col'>
																<div className='flex items-center space-x-2'>
																	{/* <TextInput
																		type="number"
																		name="replicates"
																		placeholder={'1'}
																		errors={formik.errors}
																		touched={formik.touched}
																		min={1}
																		max={scaffoldGroup.numReplicates}
																		step={1}
																		className="p-1 text-sm w-12 appearance-none"
																	/>
																	<p className="text-sm ml-2 my-auto mb-5">{` of ${scaffoldGroup.numReplicates}`}</p> */}
																	<p>{scaffoldGroup.numReplicates}</p>
																</div>
															</div>							
														</form>
													)}
												</Formik>	
											</td>
										</tr>
									</>
								)}
							</tbody>
						</table>
					</div>
					{/* Conditionally show the preview if data is fetched */}
				</div>
			</div>
            <div style={{ maxHeight: maxHeight, transition: 'max-height 0.5s ease-in-out', overflow: 'hidden' }}>
                
            </div>
        </div>
    );
};

export default observer(ScaffoldGroupDetails);