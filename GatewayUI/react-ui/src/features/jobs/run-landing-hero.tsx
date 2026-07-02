import { observer } from "mobx-react-lite";
import { FaGithub, FaMicroscope, FaProjectDiagram, FaCubes, FaEnvelope } from "react-icons/fa";

interface RunLandingHeroProps {
	isLoggedIn: boolean;
	onCtaClick: () => void;
}

const RunLandingHero: React.FC<RunLandingHeroProps> = ({
	isLoggedIn,
	onCtaClick,
}) => {
	return (
		<div className="min-h-[calc(90vh-8rem)] flex flex-col">
			{/* Hero */}
			<div className="space-y-8">
				<div className="rounded-xl bg-white p-6 shadow-sm">
					<div className="max-w-2xl">
						<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-amber-100 text-amber-700">
							Beta
						</span>
						<h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
							Run LOVAMAP Online
						</h2>
						<p className="mt-2 text-gray-600">
							Submit jobs directly from your browser — segment particles from microscope images,
							run LOVAMAP analysis on your datasets, and generate meshes from segmentation outputs.
							Results are stored and available for download when complete.
						</p>
						<button
							onClick={onCtaClick}
							className="button-secondary mt-5"
						>
							{isLoggedIn ? "Go to Jobs" : "Log in to get started"}
						</button>
					</div>
				</div>

				{/* Job type cards */}
				<div className="grid gap-4 md:grid-cols-3">
					<div className="rounded-xl bg-white p-5 shadow-sm">
						<FaMicroscope className="text-xl text-gray-400" />
						<h3 className="mt-3 text-sm font-semibold text-gray-900">Particle Segmentation</h3>
						<p className="mt-1 text-sm text-gray-500">
							Convert microscope TIF stacks into labeled particle data.
						</p>
					</div>

					<div className="rounded-xl bg-white p-5 shadow-sm">
						<FaProjectDiagram className="text-xl text-gray-400" />
						<div className="mt-3 flex items-center gap-1.5">
							<h3 className="text-sm font-semibold text-gray-900">LOVAMAP Analysis</h3>
							<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 leading-none">
								Beta
							</span>
						</div>
						<p className="mt-1 text-sm text-gray-500">
							Analyze scaffold geometry and void-space topology.
						</p>
					</div>

					<div className="rounded-xl bg-white p-5 shadow-sm">
						<FaCubes className="text-xl text-gray-400" />
						<h3 className="mt-3 text-sm font-semibold text-gray-900">Mesh Generation</h3>
						<p className="mt-1 text-sm text-gray-500">
							Generate 3D meshes from segmentation outputs.
						</p>
					</div>
				</div>

				{/* GitHub repos */}
				<div>
					<h3 className="text-sm font-medium text-gray-500 mb-3">Run locally</h3>
					<div className="grid gap-4 md:grid-cols-2">
						<a
							href="https://github.com/seguralab/lovamap"
							target="_blank"
							rel="noreferrer"
							className="group flex flex-col rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
						>
							<div className="flex items-center gap-2 text-sm font-medium text-gray-500">
								<FaGithub className="opacity-80" />
								GitHub Repository
							</div>
							<h3 className="mt-2 text-lg font-semibold text-gray-900">
								LOVAMAP (MATLAB)
							</h3>
							<p className="mt-2 text-sm text-gray-600">
								The MATLAB implementation used in many publications. Run locally and analyze
								scaffold geometries via JSON inputs.
							</p>
							<div className="mt-auto pt-4 inline-flex items-center text-sm font-semibold text-link-100 group-hover:underline">
								Open repo →
							</div>
						</a>

						<a
							href="https://github.com/seguralab/3d-particle-segmentation"
							target="_blank"
							rel="noreferrer"
							className="group flex flex-col rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
						>
							<div className="flex items-center gap-2 text-sm font-medium text-gray-500">
								<FaGithub className="opacity-80" />
								GitHub Repository
							</div>
							<h3 className="mt-2 text-lg font-semibold text-gray-900">
								3D Particle Segmentation (Python)
							</h3>
							<p className="mt-2 text-sm text-gray-600">
								Converts microscope TIF stacks into LOVAMAP-ready JSON files by segmenting
								particles in 3D.
							</p>
							<div className="mt-auto pt-4 inline-flex items-center text-sm font-semibold text-link-100 group-hover:underline">
								Open repo →
							</div>
						</a>
					</div>
				</div>
			</div>

			{/* Contact */}
			<div className="mt-auto pt-10">
				<div className="flex flex-col gap-2 border-t border-gray-200 pt-6 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
					<div>
						<h4 className="text-base font-semibold text-gray-900">
							Need help with simulations or dataset analysis?
						</h4>
						<p className="mt-1 text-sm text-gray-600">
							For inquiries (e.g., specific scaffold configurations or experimental dataset analysis),
							reach out and we'll point you to the best path.
						</p>
					</div>
					<a
						href="mailto:admin@lovamap.com"
						className="button-primary"
					>
						<FaEnvelope className="mr-2"/>
						Contact us
					</a>
				</div>
			</div>
		</div>
	);
}

export default observer(RunLandingHero);
