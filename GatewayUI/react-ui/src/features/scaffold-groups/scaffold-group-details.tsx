import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import { useStore } from '../../app/stores/store';
import { observer } from 'mobx-react-lite';
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
    squareTopLeft?: boolean;
    squareTopRight?: boolean;
}

const domainCategories = [
	{ key: 'Particles', label: 'Particles' },
	{ key: 'ExteriorPores', label: 'Edge Pores' },
	{ key: 'InteriorPores', label: 'Interior Pores' },
];

const ScaffoldGroupDetails: React.FC<ScaffoldGroupDetailsProps> = ({ scaffoldGroup, isVisible, toggleDetails, squareTopLeft = false, squareTopRight = false }) => {
    const {scaffoldGroupStore, descriptorStore} = useStore();
	const { descriptorTypes } = useDescriptorTypes();

	const {navigateToVisualization} = scaffoldGroupStore;
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

	const openPreview = useCallback(() => {
		window.open(`/preview/scaffold-group/${scaffoldGroup.id}`, '_blank');
	}, [scaffoldGroup.id]);

	const navigateToCustomExperiment = useCallback(() => {
		History.push(`/experiments?scaffoldGroupId=${scaffoldGroup.id}`);
	}, [scaffoldGroup.id]);

	const getPoreInfo = useCallback(async (scaffoldGroupId: number, descriptorTypeIds: number[]) => {
		setIsLoading(true);
		try {
			const groupData = await descriptorStore.getPoreInfoForScaffoldGroup(scaffoldGroupId, descriptorTypeIds);
			if (groupData?.scaffolds?.length) {
				setPoreInfo(groupData.scaffolds[0]);
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
	}, [isVisible, scaffoldGroup.id, detailDescriptorTypeIds, getPoreInfo]);

	// Build a map of category -> image for the domain images row
	const imageByCategory = useMemo(() => {
		const map: Record<string, typeof scaffoldGroup.images[0]> = {};
		for (const img of scaffoldGroup.images) {
			if (!map[img.category]) {
				map[img.category] = img;
			}
		}
		return map;
	}, [scaffoldGroup.images]);

	// Get the first particle for metadata display
	const firstParticle = scaffoldGroup.inputs?.particles?.[0];

    return (
        <div>
			<div className={`${isVisible ? 'block' : 'hidden'} bg-white p-6 rounded-2xl shadow-md ${squareTopLeft ? 'rounded-tl-none' : ''} ${squareTopRight ? 'rounded-tr-none' : ''}`}>

				{/* ===== TOP: Domain Images Row ===== */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					{domainCategories.map(({ key, label }) => {
						const image = imageByCategory[key];
						return (
							<div key={key} className="flex flex-col items-center">
								<p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
								<div className="relative w-full aspect-square overflow-hidden rounded-lg bg-gray-100">
									{image ? (
										<img
											src={image.url}
											alt={label}
											className="w-full h-full object-cover scale-[1.4]"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
											No image
										</div>
									)}
								</div>
							</div>
						);
					})}

					{/* 4th card: interact card */}
					<div className="flex flex-col items-center">
						<p className="text-sm font-medium text-gray-700 mb-2">&nbsp;</p>
						<div
							className="relative w-full aspect-square overflow-hidden rounded-lg bg-gray-100 cursor-pointer group transition-shadow hover:shadow-lg hover:scale-[1.01]"
							onClick={() => navigateToVisualization(scaffoldGroup)}
						>
							{imageByCategory['HalfHalf'] ? (
								<img
									src={imageByCategory['HalfHalf'].url}
									alt="Scaffold overview"
									className="w-full h-full object-cover scale-[1.4]"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
									No image
								</div>
							)}
							{/* INTERACT label - more noticeable on hover */}
							<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition duration-300">
								<button
									className="button-muted opacity-80"
									onClick={(e) => {
										e.stopPropagation(); // prevent click from bubbling
										navigateToVisualization(scaffoldGroup);
									}}
								>
									INTERACT
								</button>
							</div>
							{/* <div className="absolute inset-0 flex items-center justify-center">
								<span className="button-muted">
									INTERACT
								</span>
							</div> */}
						</div>
					</div>
				</div>

				{/* ===== BOTTOM: metadata + descriptors side-by-side, download wraps below ===== */}
				<div className="flex flex-wrap gap-6">

					{/* --- Column 1: Scaffold Metadata --- */}
					<div className="min-w-[200px] flex-1">
						<h3 className="text-lg font-bold text-gray-900 mb-3">Scaffold Metadata</h3>
						<table className="w-full text-sm text-left text-gray-600">
							<tbody>
								<tr>
									<td className="font-medium text-gray-500 py-0.5 pr-3 align-top whitespace-nowrap">Source:</td>
									<td className="py-0.5">{scaffoldGroup.isSimulated ? 'simulated' : 'experimental'}</td>
								</tr>
								{firstParticle && (
									<>
										<tr>
											<td className="font-medium text-gray-500 py-0.5 pr-3 align-top" colSpan={2}>Particles:</td>
										</tr>
										<tr>
											<td className="font-medium text-gray-400 py-0.5 pr-3 pl-4 align-top whitespace-nowrap">Shape:</td>
											<td className="py-0.5">{firstParticle.shape}</td>
										</tr>
										<tr>
											<td className="font-medium text-gray-400 py-0.5 pr-3 pl-4 align-top whitespace-nowrap">Size:</td>
											<td className="py-0.5">{firstParticle.meanSize?.toPrecision(3)}&#956;m diameter</td>
										</tr>
										<tr>
											<td className="font-medium text-gray-400 py-0.5 pr-3 pl-4 align-top whitespace-nowrap">Composition:</td>
											<td className="py-0.5">{firstParticle.dispersity?.toLowerCase()}</td>
										</tr>
										<tr>
											<td className="font-medium text-gray-400 py-0.5 pr-3 pl-4 align-top whitespace-nowrap">Configuration:</td>
											<td className="py-0.5">{scaffoldGroup.inputs?.packingConfiguration?.toLowerCase() ?? 'unknown'}</td>
										</tr>
										<tr>
											<td className="font-medium text-gray-400 py-0.5 pr-3 pl-4 align-top whitespace-nowrap">Size distribution:</td>
											<td className="py-0.5">{firstParticle.sizeDistributionType?.toLowerCase() === 'delta' ? 'delta (spike)' : firstParticle.sizeDistributionType}</td>
										</tr>
										<tr>
											<td className="font-medium text-gray-400 py-0.5 pr-3 pl-4 align-top whitespace-nowrap">Stiffness:</td>
											<td className="py-0.5">{firstParticle.stiffness}</td>
										</tr>
										<tr>
											<td className="font-medium text-gray-400 py-0.5 pr-3 pl-4 align-top whitespace-nowrap">Friction:</td>
											<td className="py-0.5">{firstParticle.friction}</td>
										</tr>
									</>
								)}
								<tr>
									<td className="font-medium text-gray-500 py-0.5 pr-3 align-top whitespace-nowrap">Container:</td>
									<td className="py-0.5">{scaffoldGroup.inputs?.containerShape ?? 'n/a'}</td>
								</tr>
							</tbody>
						</table>

						<button
							className="button-link mt-3"
							onClick={() => setShowMore(!showMore)}
						>
							{showMore ? 'Hide' : 'Show more'}
						</button>

						{showMore && (
							<table className="w-full text-sm text-left text-gray-600 mt-2">
								<tbody>
									<tr>
										<td className="font-medium text-gray-500 py-0.5 pr-3 align-top whitespace-nowrap">Id:</td>
										<td className="py-0.5">{scaffoldGroup.id}</td>
									</tr>
									<tr>
										<td className="font-medium text-gray-500 py-0.5 pr-3 align-top whitespace-nowrap">Replicates:</td>
										<td className="py-0.5">{scaffoldGroup.numReplicates}</td>
									</tr>
									{scaffoldGroup.inputs?.particles && scaffoldGroup.inputs.particles.length > 1 && (
										<tr>
											<td className="font-medium text-gray-500 py-0.5 pr-3 align-top whitespace-nowrap" colSpan={2}>
												Additional particle groups:
											</td>
										</tr>
									)}
									{scaffoldGroup.inputs?.particles?.slice(1).map((particle, index) => (
										<React.Fragment key={index}>
											<tr>
												<td className="font-medium text-gray-400 py-0.5 pr-3 pl-4 align-top" colSpan={2}>
													{(particle.proportion * 100).toPrecision(3)}% {particle.meanSize.toPrecision(3)}&#956;m {particle.shape}
												</td>
											</tr>
										</React.Fragment>
									))}
								</tbody>
							</table>
						)}
					</div>

					{/* --- Column 2: Interior Pore Descriptor Data --- */}
					<div className="min-w-[340px] flex-[2]">
						<h3 className="text-lg font-bold text-gray-900 mb-3">Interior Pore Descriptor Data</h3>
						{Object.keys(descriptorValueMap).length > 0 ? (
							<PlotSelector
								initialKey="Volume"
								plots={[
									...detailedDescriptors.map(({ key, descriptor }) => ({
										key,
										label: descriptor.label,
										itemClassName:
											key === 'AspectRatio' ? 'hidden xl:inline-flex' :
											key === 'LongestLength' ? 'hidden lg:inline-flex' :
											undefined,
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
						) : (
							<p className="text-sm text-gray-400 italic">No descriptor data available</p>
						)}
					</div>

					{/* --- Column 3: Download Data --- */}
					<div className="w-full lg:w-40 flex-shrink-0">
						<h3 className="text-lg font-bold text-gray-900 mb-3">Download Data</h3>
						<div className="flex flex-col gap-3 mt-4">
							<button
								type="button"
								onClick={openPreview}
								className="button-base bg-secondary-200 hover:bg-secondary-100"
							>
								COMPREHENSIVE
							</button>
							<button
								type="button"
								onClick={navigateToCustomExperiment}
								className="button-secondary"
							>
								CUSTOM
							</button>
						</div>
					</div>
				</div>
			</div>
        </div>
    );
};

export default observer(ScaffoldGroupDetails);
