import React, { useState } from 'react';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import Tag from '../../app/common/tag/tag';
import { Formik } from 'formik';
import TextInput from '../../app/common/form/text-input';
import { downloadScaffoldGroupAsExcel } from '../../app/common/excel-generator/excel-generator';
import { useStore } from '../../app/stores/store';
import { observer } from 'mobx-react-lite';
import { FaSpinner } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

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
	const navigate = useNavigate();

	const download = async (values: any, setErrors: Function) => {
		setIsLoading(true);
		try {
			const downloadedData = await getDetailedScaffoldGroupById({scaffoldGroupId: values.scaffoldGroup});
			// console.log(downloadedData);
			if (downloadedData)
			{
				downloadScaffoldGroupAsExcel(downloadedData)
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
				<div className="flex justify-center items-center space-x-4">
					<div className="flex-1 p-4">
						{/* Container for figures */}
                        {/* <p className="text-lg font-semibold mb-4">Figures</p> */}
						{/* Additional figures as needed */}
						{scaffoldGroup.images.length > 0 ? (
							<div className="grid grid-cols-2 gap-0">
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
						
						{scaffoldGroup.scaffoldIdsWithDomains.length === 0 ? (
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
						)}
						
					</div>
					<div className="flex-1 p-4">
						<div className="flex flex-wrap mb-4">
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
															<td className="font-bold" colSpan={2}>{particle.proportion*100}% {particle.meanSize}μm diameter {particle.shape}</td>
															<td></td>
														</tr>
														<tr>
															<td className="w-9"></td>
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
															<td className="text-gray-500">standard deviation of diameter: {particle.standardDeviationSize} μm</td>
														</tr>
													</React.Fragment>
												))
											}
											</tbody>
										</table>
									</td>
								</tr>
								<tr>
									<td className="font-medium text-gray-900 align-top">Replicates:</td>
									<td>
										<Formik
											initialValues={{scaffoldGroup:scaffoldGroup.id, replicates: 1 }}
											onSubmit={(values, {setErrors}) => download(values, setErrors)}
										>
											{formik => (
												<form onSubmit={formik.handleSubmit}>
													<div className='flex flex-col'>
														<div className='flex items-center space-x-2'>
															<TextInput
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
															<p className="text-sm ml-2 my-auto mb-5">{` of ${scaffoldGroup.numReplicates}`}</p>
														</div>
														<button type="submit" className="button-outline self-start flex items-center gap-2">
															Download Descriptors
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
				</div>
				
			</div>
            <div style={{ maxHeight: maxHeight, transition: 'max-height 0.5s ease-in-out', overflow: 'hidden' }}>
                
            </div>
        </div>
    );
};

export default observer(ScaffoldGroupDetails);