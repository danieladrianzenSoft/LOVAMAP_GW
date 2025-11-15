// ScaffoldGroupDetailsForm.tsx
import React from "react";
import { Formik, Form, FieldArray, Field } from "formik";
import * as Yup from "yup";
import { useStore } from "../../app/stores/store";
import { InputGroup } from "../../app/models/inputGroup";
import { ParticlePropertyGroup } from "../../app/models/particlePropertyGroup";
import { ScaffoldGroupMatch } from "../../app/models/scaffoldGroup";
import { PACKING_CONFIGS } from "../../constants/packing-configurations";
import { PARTICLE_SHAPES } from "../../constants/particle-shapes";
import { PARTICLE_STIFFNESSES } from "../../constants/particle-stiffnesses";
import TextInput from "../../app/common/form/text-input";
import SelectInput from "../../app/common/form/select-input";
import { PARTICLE_DISPERSITIES } from "../../constants/particle-dispersities";
import { CONTAINER_SHAPES } from "../../constants/container-shapes";


type Props = {
  initial?: Partial<InputGroup>;
  onMatchesFound?: (matches: ScaffoldGroupMatch[]) => void;
  onReady?: (inputGroup: InputGroup) => void; // parent keeps prepared input group
  onStatus?: (msg: string) => void;
};

const defaultParticle = (): Partial<ParticlePropertyGroup> => ({
  shape: "spheres",
  stiffness: "rigid",
  dispersity: "monodisperse",
  meanSize: 100,
  standardDeviationSize: 0,
  proportion: 1,
});

export const ScaffoldGroupDetailsForm: React.FC<Props> = ({ initial, onMatchesFound, onReady, onStatus }) => {
	const { scaffoldGroupStore } = useStore();	

	const initialValues = {
		containerShape: initial?.containerShape ?? "cube",
		containerSize: initial?.containerSize ?? 2,
		packingConfiguration: initial?.packingConfiguration ?? "Isotropic",
		particles: initial?.particles ?? [defaultParticle()],
		sizeDistribution: initial?.sizeDistribution ?? "",
		isSimulated: initial?.isSimulated ?? true,
		dx: initial?.dx ?? 2
	};

	const validationSchema = Yup.object({
		particles: Yup.array()
		.of(
			Yup.object().shape({
			meanSize: Yup.number().required("Mean size required"),
			proportion: Yup.number().min(0).max(1).required(),
			})
		)
		.min(1),
	});

	const buildMatchRequest = (values: any) => ({
		containerShape: values.containerShape ?? null,
		containerSize: values.containerSize ?? null,
		packingConfiguration: values.packingConfiguration ?? null,
		particles: values.particles.map((p: any) => ({
			shape: p.shape ?? null,
			stiffness: p.stiffness ?? null,
			dispersity: p.dispersity ?? null,
			meanSize: p.meanSize ?? 0,
			standardDeviationSize: p.standardDeviationSize ?? 0,
			proportion: p.proportion ?? 1,
		})),
		sizeDistribution: values.sizeDistribution ?? null,
		isSimulated: values.isSimulated ?? true,
		dx: values.dx ?? 2
	});

	const getScaffoldGroupMatches = async (values: any, setErrors: Function) => {
		onStatus?.("Preparing match request...");

		const matchRequest = buildMatchRequest(values);

		try {
			let matches: ScaffoldGroupMatch[] = [];
			if (values.isSimulated) {
				onStatus?.("Searching for scaffold group matches...");
				const resp = await scaffoldGroupStore.getScaffoldGroupMatches(matchRequest);
				matches = resp ?? [];
			} else {
				matches = [];
				onStatus?.("Experimental scaffold — will create a new scaffold group.");
			}

			// Build InputGroup typed object for the parent
			const inputGroup: InputGroup = {
				containerShape: values.containerShape ?? null,
				containerSize: values.containerSize ?? null,
				packingConfiguration: values.packingConfiguration ?? null,
				particles: values.particles,
				sizeDistribution: values.sizeDistribution ?? null,
				isSimulated: values.isSimulated ?? true,
			} as any;

			onReady?.(inputGroup);
			onMatchesFound?.(matches);
			onStatus?.(`Found ${matches.length} matches.`);

		} catch (err) {
			console.error("Error finding matches:", err);
			onStatus?.("Error while searching matches. See console.");
		} finally {
		}
	}

	const handleRemoveParticle = (
		idx: number,
		values: any, // use your formik values type if available
		remove: (index: number) => void
	) => {
		if (values.particles.length > 1) {
			remove(idx);
		}
		// else do nothing (button will be disabled anyway)
	};


  return (
    <div className="p-4 bg-white rounded">
		{/* <h3 className="text-lg font-semibold mb-8">1. Select your scaffold's properties</h3> */}
		<Formik
			initialValues={initialValues}
			validationSchema={validationSchema}
			onSubmit={(values, {setErrors}) => 	getScaffoldGroupMatches(values, setErrors)}>
			{({ handleSubmit, errors, touched, values, setFieldValue, isSubmitting }) => (
				
			<Form className="space-y-4" onSubmit={handleSubmit}>
				 <div className="flex flex-col md:flex-row md:justify-between md:items-center">
					{/* <p className="text-xl mb-2 md:mb-4 w-full">1. Select your scaffold's properties</p> */}
					<h3 className="text-lg mb-2 md:mb-4 w-full font-semibold">1. Select your scaffold's properties</h3>
					<div className="flex justify-end space-x-1 w-full md:w-auto">
						<button type="submit" className="button-outline" disabled={isSubmitting}>{isSubmitting ? "Searching..." : "Next"}</button>
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-0">
					<label className="flex flex-col text-sm">
						{/* Container shape
						<Field name="containerShape" className="px-4 py-2 border rounded-md" placeholder="e.g. cube" /> */}
						<SelectInput
							name="containerShape"
							label="Container Shape"
							options={CONTAINER_SHAPES}
							errors={errors}
							touched={touched}
						/>
					</label>
					<label className="flex flex-col text-sm">
						{/* Container size
						<Field name="containerSize" type="number" className="px-4 py-2 border rounded-md" /> */}
						<TextInput name="containerSize" label="Container Size" type='number' errors={errors} touched={touched}
							min={0} step={0.1}
						/>
					</label>
					<label className="flex flex-col text-sm">
						{/* <span className="mb-1">Packing configuration</span>
						<Field
							as="select"
							name="packingConfiguration"
							className="w-full h-10 px-4 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
						>
							{PACKING_CONFIGS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</Field> */}
						<SelectInput
							name="packingConfiguration"
							label="Packing Configuration"
							options={PACKING_CONFIGS}
							errors={errors}
							touched={touched}
						/>

					</label>

					<label className="flex gap-x-2 text-sm items-center mb-2">
						<input
								type="checkbox"
								name="isSimulated"
								checked={values.isSimulated}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldValue("isSimulated", e.target.checked)}
								className="w-5 accent-blue-600 cursor-pointer"
							/>
							<span className="text-sm text-gray-700">Simulated</span>
						{/* <Field
							type="checkbox"
							name="isSimulated"
							checked={values.isSimulated}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldValue("isSimulated", e.target.checked)}
							className="w-5 accent-blue-600 cursor-pointer"
						/>
						<span className="select-none">Is Scaffold Simulated?</span>
						<label key={descriptor.id} className="flex items-center space-x-2 cursor-pointer">
							<input
								type="checkbox"
								checked={checked}
								onChange={() => handleToggle(descriptor)}
								className="accent-blue-600"
							/>
							<span className="text-sm text-gray-700">{descriptor.label || descriptor.name}</span>
							</label> */}
					</label>
				</div>
				<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-2">
					{values.isSimulated === true && (
						<label className="flex flex-col text-sm">
							<TextInput name="dx" label="dx" type='number' errors={errors} touched={touched}
								min={0} step={0.1}
							/>
						</label>
						
					)}
				</div>

				<div>
					<div className="w-full flex justify-between mb-2 mt-8">
						<div className="font-semibold">Particles</div>
						<button type="button" onClick={() => setFieldValue("particles", [...values.particles, defaultParticle()])} className="px-3 py-1 bg-blue-100 rounded">
							+ Add
						</button>
					</div>

					<FieldArray name="particles">
						{({ push, remove }) => (
						<div>
							{values.particles.map((_: any, idx: number) => (
								<div key={idx} className="border rounded p-3 mb-3">
									<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
										<div>
											{/* <label className="block text-sm">Mean size</label>
											<Field name={`particles.${idx}.meanSize`} type="number" className="px-4 py-2 border rounded-md w-full text-sm" />
											<ErrorMessage name={`particles.${idx}.meanSize`} component="div" className="text-red-600 text-sm" /> */}
											<TextInput name={`particles.${idx}.meanSize`} label="Mean size" type='number' errors={errors} touched={touched}
												min={0} step={10}
											/>
										</div>

										<div>
											<TextInput name={`particles.${idx}.proportion`} label="Proportion" type='number' errors={errors} touched={touched}
												min={0} step={0.1} max={1}
											/>
											{/* <label className="block text-sm">Proportion</label>
											<Field name={`particles.${idx}.proportion`} type="number" step="0.01" min="0" max="1" className="px-4 py-2 border rounded-md w-full text-sm" />
											<ErrorMessage name={`particles.${idx}.proportion`} component="div" className="text-red-600 text-sm" /> */}
										</div>

										<div>
											<SelectInput
												name={`particles.${idx}.shape`}
												label="Shape"
												placeholder="Select a shape"
												options={PARTICLE_SHAPES}
												errors={errors}
												touched={touched}
											/>
											{/* <span className="block text-sm">Shape</span>
											<Field
												as="select"
												name={`particles.${idx}.shape`}
												className="w-full px-4 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
											>
												{PARTICLE_SHAPES.map((opt) => (
													<option key={opt.value} value={opt.value}>
														{opt.label}
													</option>
												))}
											</Field> */}
										</div>
										
									</div>

									<div className="mt-3 grid grid-cols-3 gap-2 text-sm">
										<div>
											<TextInput name={`particles.${idx}.standardDeviationSize`} label="Std. Dev." type='number' errors={errors} touched={touched}
												min={0} step={10}
											/>
											{/* <label className="block text-sm">Std dev</label>
											<Field name={`particles.${idx}.standardDeviationSize`} type="number" step="0.01" className="px-4 py-2 border rounded-md w-full text-sm" /> */}
										</div>

										<div>
											{/* <label className="block text-sm">Dispersity</label>
											<Field name={`particles.${idx}.dispersity`} className="px-4 py-2 border rounded-md w-full text-sm" /> */}
											<SelectInput
												name={`particles.${idx}.dispersity`}
												label="Dispersity"
												placeholder="Select a distribution"
												options={PARTICLE_DISPERSITIES}
												errors={errors}
												touched={touched}
											/>
										</div>

										<div>
											{/* <label className="block text-sm text-gray-700 mb-1">Stiffness</label>
											<Field as="select" name={`particles.${idx}.stiffness`} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm">
												<option value="rigid">Rigid</option>
												<option value="semisoft">Semi-soft</option>
												<option value="soft">Soft</option>
											</Field> */}
											<SelectInput
												name={`particles.${idx}.stiffness`}
												label="Stiffness"
												placeholder="Select a stiffness"
												options={PARTICLE_STIFFNESSES}
												errors={errors}
												touched={touched}
											/>
										</div>
									</div>

									<div className="w-full flex flex-end text-sm">
										<div className="w-full flex justify-end">
											<button
												type="button"
												disabled={values.particles.length <= 1}
												onClick={() => handleRemoveParticle(idx, values, remove)}
												className={`
												px-3 py-1 rounded transition
												${values.particles.length > 1
													? "bg-red-100 hover:bg-red-200 cursor-pointer"
													: "bg-gray-200 text-gray-400 cursor-not-allowed"}
												`}
											>
												Remove
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
						)}
					</FieldArray>
				</div>

				{/* <div className="flex gap-3 items-center">
					<button type="submit" className="button-primary px-4 py-2" disabled={isSubmitting}>
						{isSubmitting ? "Searching..." : "Submit"}
					</button>
				</div> */}
			</Form>
			)}
		</Formik>
    </div>
  );
};

export default ScaffoldGroupDetailsForm;