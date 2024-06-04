import React from 'react';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import Tag from '../../app/common/tag/tag';
import { FaCaretDown, FaCaretRight } from 'react-icons/fa';
import { Formik } from 'formik';
import TextInput from '../../app/common/form/text-input';
import { downloadScaffoldGroupAsExcel } from '../../app/common/excel-generator/excel-generator';
import { useStore } from '../../app/stores/store';

interface ScaffoldGroupDetailsProps {
    scaffoldGroup: ScaffoldGroup;
    isVisible: boolean;
    toggleDetails: () => void;
}

const ScaffoldGroupDetails: React.FC<ScaffoldGroupDetailsProps> = ({ scaffoldGroup, isVisible, toggleDetails }) => {
    const {scaffoldGroupStore} = useStore();
	const {getDetailedScaffoldGroupById} = scaffoldGroupStore;

	const download = async (values: any, setErrors: Function) => {
		try {
			const downloadedData = await getDetailedScaffoldGroupById({scaffoldGroupId: values.scaffoldGroup});
			if (downloadedData)
			{
				downloadScaffoldGroupAsExcel(downloadedData)
			}
		} catch (error) {
			console.error("Error downloading data:", error);
			setErrors({ submit: 'Failed to download data. Please try again.' });
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
						<p>Figures</p>
						{/* Additional figures as needed */}
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
								<td className="font-medium text-gray-900 align-top">Anisotropic:</td>
								<td>{scaffoldGroup.inputs?.isAnisotropic ? 'yes' : 'no'}</td>
							</tr>
								<tr>
									<td className="w-32 align-top font-medium text-gray-900">Particles:</td>
									<td>
									<table className="w-full text-sm text-left text-gray-500">
										<tbody>
											{scaffoldGroup.inputs?.particles?.map((particle, index, array) => (
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
														<td></td>  {/* Empty cell for alignment */}
														<td className="text-gray-500">dispersity: {particle.dispersity}</td>
													</tr>
													<tr>
														<td></td>  {/* Empty cell for alignment */}
														<td className="text-gray-500">size distribution: {particle.sizeDistributionType}</td>
													</tr>
													<tr>
														<td></td>  {/* Empty cell for alignment */}
														<td className="text-gray-500">standard deviation of diameter: {particle.standardDeviationSize} μm</td>
													</tr>
												</React.Fragment>
											))}
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
														<button type="submit" className='button-outline self-start'>Download Descriptors</button>
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

export default ScaffoldGroupDetails;