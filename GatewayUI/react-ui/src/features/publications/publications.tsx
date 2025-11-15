import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../app/stores/store';
import { FaSpinner } from 'react-icons/fa';
import { Publication } from '../../app/models/publication';
import History from "../../app/helpers/History";
import { MdOutlineCloudDownload, MdOutlineRemoveRedEye } from "react-icons/md";

const Publications: React.FC = () => {
	const { publicationStore } = useStore();
	const { getPublications } = publicationStore;
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [publications, setPublications] = useState<Publication[]>([]);

	const handleViewInExplore = (pubId: number) => {
		// publication-wide scope (union of all datasets)
		History.push(`/explore?publicationId=${pubId}&restrictToPublicationDataset=true`);
	};

	// If you later show datasets per pub and want dataset-level scope:
	const handleViewDatasetInExplore = (datasetId: number) => {
		History.push(`/explore?publicationDatasetId=${datasetId}&restrictToPublicationDataset=true`);
	};


	useEffect(() => {
		const fetchData = async () => {
			setIsLoading(true);
			const results = await getPublications();
			console.log(results);
			setPublications(results);
			setIsLoading(false);
		};
		fetchData();
	}, [getPublications]);

	// const handleRowClick = (group: any) => {
	// 	setSelectedGroup(group); // Set selected group
	// 	setIsModalOpen(true); // Open modal
	// };

	return (
		<div className={`container mx-auto py-8 px-2`}>
			<div className="text-3xl text-gray-700 font-bold mb-12">Publications</div>
			{isLoading ? (
				<div className="flex justify-center items-center py-8">
					<FaSpinner className="animate-spin" size={40} />
				</div>
			) : (
				<div className="flex">
					<div className="w-full overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
									<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publication</th>
									<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOI</th>
									<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{publications?.map((pub, index) => (
									<tr key={pub.id} className="hover:bg-gray-50">
										<td className="px-4 py-4 text-sm text-gray-700">{index + 1}</td>
										<td className="px-4 py-4">
											<div className="font-semibold text-gray-800">{pub.title}</div>
											<div className="text-xs text-gray-500 mt-1">{pub.authors}</div>
											<div className="text-xs text-gray-500">{pub.journal}</div>
											<div className="text-xs text-gray-400">{new Date(pub.publishedAt).toLocaleDateString()}</div>
										</td>
										<td className="px-4 py-4 text-sm text-blue-600 break-all">
											<a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
												{pub.doi}
											</a>
										</td>
										
										<td>
											<div className="text-xl text-gray-600 hover:text-blue-600 cursor-pointer">
													{/* <MdOutlineCloudDownload /> */}
													<button
														className="text-xl text-gray-600 hover:text-blue-600"
														onClick={() => handleViewInExplore(pub.id)}
														title="View in Explore"
														>
														<MdOutlineRemoveRedEye />
													</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
};

export default observer(Publications);