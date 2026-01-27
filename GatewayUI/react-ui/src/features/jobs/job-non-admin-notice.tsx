import { observer } from "mobx-react-lite";
import { FaGithub, FaFlask, FaCubes, FaEnvelope, FaClock } from "react-icons/fa";

interface JobNonAdminNoticeProps {
	isLoggedIn: boolean;
	isAdmin: boolean;
	onRunOnlineClick?: () => void;
}

const JobNonAdminNotice: React.FC<JobNonAdminNoticeProps> = ({
  isLoggedIn,
  isAdmin,
  onRunOnlineClick
}) => {

  const clickable = isAdmin && !!onRunOnlineClick;

  return (
    <div className="min-h-[calc(90vh-8rem)] flex flex-col">
      	{/* Hero */}
		<div className="space-y-8">
			<div
				onClick={clickable ? onRunOnlineClick : undefined}
				className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${clickable
					? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
					: "cursor-default"}
				`}
			>
				<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div className="max-w-2xl">
						<div className="flex items-center gap-2 text-sm font-medium text-gray-500">
						<FaClock className="opacity-80" />
							Run LOVAMAP online
						</div>
						<h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
							Coming soon
						</h2>
						<p className="mt-2 text-gray-600">
							We’re integrating the full LOVAMAP pipeline into lovamap.com. In the meantime,
							you can run the legacy MATLAB version locally on your machine, and generate 
							LOVAMAP-ready JSON inputs from microscope TIF stacks using our 3D particle segmentation tools.
						</p>

						{/* Optional: small “workflow” chips */}
						<div className="mt-4 flex flex-wrap gap-2">
							<span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
								TIF stacks → segmentation → JSON
							</span>
							<span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
								JSON → LOVAMAP (MATLAB)
							</span>
							<span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
								Online jobs → soon
							</span>
						</div>
					</div>

					{/* Right-side “status” card */}
					<div className="w-full md:w-80">
						<div className="rounded-xl bg-gray-50 p-4">
							<div className="flex items-center justify-between">
								<div className="text-sm font-medium text-gray-700">Online runner</div>
								<span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
									In progress
								</span>
							</div>
							<div className="mt-3 space-y-2 text-sm text-gray-600">
								<div className="flex items-center gap-2">
									<FaCubes className="opacity-70" />
									Job queue + results UI
								</div>
								<div className="flex items-center gap-2">
									<FaFlask className="opacity-70" />
									Dataset runs & analysis
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Repo cards */}
			<div className="grid gap-4 md:grid-cols-2">
				<a
					href="https://github.com/seguralab/lovamap"
					target="_blank"
					rel="noreferrer"
					className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
				>
				<div className="flex items-start justify-between gap-4">
					<div>
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
					<div className="mt-4 inline-flex items-center text-sm font-semibold text-blue-700 group-hover:underline">
						Open repo →
					</div>
					</div>
				</div>
				</a>

				<a
					href="https://github.com/seguralab/3d-particle-segmentation"
					target="_blank"
					rel="noreferrer"
					className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
					<div className="mt-4 inline-flex items-center text-sm font-semibold text-blue-700 group-hover:underline">
						Open repo →
					</div>
				</a>
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
					className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
				>
					<FaEnvelope />
					Contact us
				</a>
			</div>
		</div>
    </div>
  );
}

export default observer(JobNonAdminNotice);