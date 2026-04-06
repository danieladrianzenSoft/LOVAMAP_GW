import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../app/stores/store';
import { Publication } from '../../app/models/publication';
import LoadingSpinner from '../../app/common/loading-spinner/loading-spinner';
import History from "../../app/helpers/History";
import { MdOutlineCloudDownload, MdOutlineRemoveRedEye } from "react-icons/md";
import DataTable, { DataTableColumn } from '../../app/common/data-table/data-table';

const Publications: React.FC = () => {
	const { publicationStore, userStore} = useStore();
	const { getPublications } = publicationStore;
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [publications, setPublications] = useState<Publication[]>([]);

	const isAdmin = userStore.user?.roles?.includes("administrator") ?? false;

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

	const columns: DataTableColumn<Publication>[] = [
		{
			header: '#',
			render: (_pub, index) => index + 1,
		},
		{
			header: 'Publication',
			render: (pub) => (
				<>
					<div className="font-semibold text-gray-800">{pub.title}</div>
					<div className="text-xs text-gray-500 mt-1">{pub.authors}</div>
					<div className="text-xs text-gray-500">{pub.journal}</div>
					<div className="text-xs text-gray-400">{new Date(pub.publishedAt).toLocaleDateString()}</div>
				</>
			),
			cellClassName: '!text-gray-800',
		},
		{
			header: 'DOI',
			render: (pub) => (
				<a
					href={`https://doi.org/${pub.doi}`}
					target="_blank"
					rel="noopener noreferrer"
					className="hover:underline"
				>
					{pub.doi}
				</a>
			),
			cellClassName: '!text-link-100 break-all',
		},
		{
			header: '',
			render: (pub) => (
				<button
					className="text-xl text-gray-600 hover:text-link-200"
					onClick={() => handleViewInExplore(pub.id)}
					title="View in Explore"
				>
					<MdOutlineRemoveRedEye />
				</button>
			),
		},
	];

	return (
		<div className={`container mx-auto py-8 px-6`}>
			<div className="text-3xl text-gray-700 font-bold mb-12">Publications</div>
			{isLoading ? (
				<LoadingSpinner />
			) : (
				<>
					{isAdmin && 
						<div className='flex justify-end'>
							<button className="button-primary items-center content-center w-24 mb-2">
								Add
							</button>
						</div>
					}
					<div className="flex">
						<DataTable
							data={publications ?? []}
							columns={columns}
							rowKey={(pub) => pub.id}
						/>
					</div>
				</>
			)}
		</div>
	);
};

export default observer(Publications);