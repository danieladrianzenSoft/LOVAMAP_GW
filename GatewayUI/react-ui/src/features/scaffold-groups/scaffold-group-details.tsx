import React, { useState } from 'react';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import Tag from '../../app/common/tag/tag';
import { Formik } from 'formik';
// import TextInput from '../../app/common/form/text-input';
import { downloadScaffoldGroupAsExcel, triggerDownload } from '../../app/common/excel-generator/excel-generator';
import { useStore } from '../../app/stores/store';
import { observer } from 'mobx-react-lite';
import { FaSpinner } from 'react-icons/fa';
import { openPreviewInNewTab } from '../../app/common/new-tab-preview/new-tab-preview';

interface ScaffoldGroupDetailsProps {
    scaffoldGroup: ScaffoldGroup;
    isVisible: boolean;
    toggleDetails: () => void;
}

const categoryOrder: { [key: string]: number } = {
    ExteriorPores: 0,
    InteriorPores: 1,
    ParticleSizeDistribution: 2,
    Other: 3 // Additional categories if needed
};

const ScaffoldGroupDetails: React.FC<ScaffoldGroupDetailsProps> = ({ scaffoldGroup, isVisible, toggleDetails }) => {
    const {scaffoldGroupStore} = useStore();
	const {getDetailedScaffoldGroupById, navigateToVisualization} = scaffoldGroupStore;
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const download = async (values: any, setErrors: Function) => {
		setIsLoading(true);
		try {
			const downloadedData = await getDetailedScaffoldGroupById({scaffoldGroupId: values.scaffoldGroup});
			// console.log(downloadedData);
			if (downloadedData)
			{
				// downloadScaffoldGroupAsExcel(downloadedData)
				// setPreviewData(downloadedData); // Set the data for preview
				openPreviewInNewTab(
					downloadedData,
					downloadScaffoldGroupAsExcel,
					triggerDownload,
					[0,4],
					100
				);
			}
		} catch (error) {
			console.error("Error downloading data:", error);
			setErrors({ submit: 'Failed to download data. Please try again.' });
		} finally {
			setIsLoading(false);
		}
	}
	
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
                        {/* <p className="text-lg font-semibold mb-4">Figures</p> */}
						{/* Additional figures as needed */}
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
											<img 
												src={image.url} 
												alt={image.category} 
												className="w-full h-64 object-cover mb-2"
											/>
											<p className="text-sm text-gray-600">{image.category}</p>
										</div>
								))}
                        	</div>
							// <div className="grid grid-cols-2 gap-0">
							// 	{scaffoldGroup.images.map((image, index) => (
							// 		<div key={index} className="flex flex-col items-center">
							// 			<img 
							// 				src={image.url} 
							// 				alt={image.category} 
							// 				className="w-full h-auto max-h-48 object-contain mb-2"
							// 			/>
							// 			<p className="text-sm text-gray-600">{image.category}</p>
							// 		</div>
							// 	))}
							// </div>
						) : (
							<p className="text-sm text-gray-500 italic">No figures added</p>
						)}

							<button
								className={`mt-4 px-4 py-2 rounded transition ${
										"bg-blue-600 text-white hover:bg-blue-700"
								}`}
								onClick={() => navigateToVisualization(scaffoldGroup)}
							>
								Interact
							</button>
						
						{/* {scaffoldGroup.scaffoldIdsWithDomains.length === 0 ? (
							<p className="text-sm text-gray-500 italic mt-2">No meshes available for visualization</p>
						) : (
							<button
								className={`mt-4 px-4 py-2 rounded transition ${
									scaffoldGroup.scaffoldIdsWithDomains.length > 0
										? "bg-blue-600 text-white hover:bg-blue-700"
										: "bg-blue-600 text-white hover:bg-blue-700 cursor-not-allowed"
								}`}
								onClick={() => navigateToVisualization(scaffoldGroup)}
								disabled={scaffoldGroup.scaffoldIdsWithDomains.length === 0}
							>
								Interact
							</button>
						)} */}
						
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
									<td className="font-medium text-gray-900 align-top w-32">Id:</td>
									<td>{scaffoldGroup.id}</td>
								</tr>
								<tr>
									<td className="font-medium text-gray-900 align-top w-32">Simulated:</td>
									<td>{scaffoldGroup.isSimulated ? 'yes' : 'no'}</td>
								</tr>
								<tr>
									<td className="font-medium text-gray-900 align-top w-32">Container Shape:</td>
									<td>{scaffoldGroup.inputs?.containerShape ?? 'n/a'}</td>
								</tr>
								<tr>
									<td className="font-medium text-gray-900 align-top w-32">Container Size:</td>
									<td>{scaffoldGroup.inputs?.containerSize ?? 'n/a'}</td>
								</tr>
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
									<td className="w-32 font-medium text-gray-900 align-top">Replicates:</td>
									<td>
										<Formik
											initialValues={{scaffoldGroup:scaffoldGroup.id, replicates: 1 }}
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
														<button type="submit" className="button-outline self-start flex items-center gap-2 mt-2">
															Preview Data
															{isLoading && <FaSpinner className="animate-spin text-current text-[1em]" />}
														</button>
													</div>							
												</form>
											)}
										</Formik>	
									</td>
								</tr>
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