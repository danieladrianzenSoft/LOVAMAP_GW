import { Formik } from "formik";
import { observer } from "mobx-react-lite";
import { FaTimes } from "react-icons/fa";
import TextInput from "../../app/common/form/text-input";

const ExperimentSidebar = ({
	experimentStage,
	options,
	selectedDescriptorTypes,
	selectedScaffoldGroups,
	showTitle,
	handleUnselectDescriptorType,
	handleUnselectScaffoldGroup,
	onReplicatesChange
  }: {
	experimentStage: number;
	options: any;
	selectedDescriptorTypes: any[];
	selectedScaffoldGroups: any[];
	showTitle: boolean;
	handleUnselectDescriptorType: (id: number) => void;
	handleUnselectScaffoldGroup: (id: number) => void;
	onReplicatesChange: (groupId: number, numReplicates: number) => void;
  }) => {
	return (
	<div className="w-full h-full p-4 bg-gray-100">
		{showTitle && <h2 className="text-lg font-bold text-gray-700 mb-6">Data to download</h2>}
		
		
		{experimentStage >= 3 && (
		<div className="mb-8">
			<h3 className="text-gray-700 font-bold mb-3">Output layout</h3>
			<ul>
			<li className="my-4">Excel Files - {options.excelFileOption}</li>
			<li className="my-4">Sheets - {options.sheetOption}</li>
			<li className="my-4">Columns - {options.columnOption}</li>
			</ul>
		</div>
		)}

		{(experimentStage >= 2 || selectedDescriptorTypes.length > 0) && (
		<div className="mb-8">
			<h3 className="text-gray-700 font-bold mb-3">Selected descriptors</h3>
			<ul>
			{selectedDescriptorTypes.length === 0 ? (
				<p className="italic">None selected</p>
			) : (
				selectedDescriptorTypes.map((d) => (
				<li key={d.id} className="my-4">
					<div className="flex items-center">
					<button
						className="bg-gray-300 text-gray-700 p-2 rounded-full mr-2 text-xs hover:shadow-md"
						onClick={() => handleUnselectDescriptorType(d.id)}
					>
						<FaTimes />
					</button>
					{d.label + (d.unit ? ` (${d.unit})` : "")}
					</div>
				</li>
				))
			)}
			</ul>
		</div>
		)}

		<div>
			<h3 className="text-gray-700 font-bold mb-3">Selected scaffold groups</h3>
			<ul>
				{selectedScaffoldGroups.length === 0 ? (
					<p className="italic">None selected</p>
				) : (
					selectedScaffoldGroups.map((group) => (
						<li key={group.id} className="my-4">
							<div className="flex items-center">
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
													errors={formik.errors}
													touched={formik.touched}
													min={1}
													max={group.numReplicates}
													step={1}
													className="p-1 text-sm w-12 appearance-none"
													onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
														const value = Number(e.target.value);
														formik.setFieldValue('replicates', value);
														onReplicatesChange(group.id, Number(e.target.value));
													}}
													compact={true}
													value={formik.values.replicates}
												/>
												<p className="text-sm ml-2 my-auto mb-7">{` of ${group.numReplicates} replicates`}</p>
											</div>
										</div>							
									</form>
								)}
							</Formik>
						</li>
					))
				)}
			</ul>
		</div>
	</div>
	);
};

export default observer(ExperimentSidebar);