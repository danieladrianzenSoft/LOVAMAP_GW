import { Form, Formik, ErrorMessage } from "formik";
import { observer } from "mobx-react-lite";
import React from "react";
import * as Yup from 'yup';
import TextInput from "../../app/common/form/text-input";
import { useStore } from "../../app/stores/store";
// import logo from "../../../src/LOVAMAP_logo_isolated.png";
import logo from '../../../src/LOVAMAP_logo.png';
import { FaSpinner } from "react-icons/fa";

const RegisterPage: React.FC = () => {
	const {userStore} = useStore();

	const register = (values: any, setErrors: Function) => {
		const {error, ...user} = values;
		userStore.register(user)
		.catch(error => {
			setErrors({error: error.message})
		})
	}

	const registerInitialValues: any = {
		email: '',
		password: '',
		passwordConfirmation: '',
		error: null
	}

	const validationSchema = Yup.object({
		email: Yup.string().required('Email is required'),
		password: Yup.string().required('Password is required'),
		passwordConfirmation: Yup.string().oneOf([Yup.ref('password')], 'Passwords must match')
	})

	return (
		<>
			<div className="gradient-form bg-gray-200 h-screen w-full">
				<div className="justify-center py-12 px-6 h-full">
					<div className="flex justify-center items-center flex-wrap h-full g-6 text-gray-800">
						<div className="xl:w-4/12">
							<div className="block bg-white shadow-lg rounded-lg">
								<div className="lg:flex lg:flex-wrap g-0">
									<div className="lg:w-full px-4 md:px-0">
										<div className="md:p-12 md:mx-6">
											<div className="text-center">
												<img
													className="mx-auto w-52 mb-8"
													src={logo}
													alt="logo"
												/>
												{/* <h4 className="text-xl font-semibold mt-1 mb-12 pb-1">LOVAMAP</h4> */}
											</div>
											{/* FORM GOES HERE */}
											<Formik 
												validationSchema={validationSchema}
												enableReinitialize
												initialValues={registerInitialValues}
												onSubmit={(values, {setErrors}) => 	register(values, setErrors)}>
												{({handleSubmit, errors, touched, isSubmitting}) => (
													<Form onSubmit={handleSubmit}>
														<p className="mb-4">Create your account</p>
														<TextInput name='email' label="Email" type='text' errors={errors} touched={touched} autoComplete="off"/>
														<TextInput name='password' label="Password" type='password' errors={errors} touched={touched} autoComplete="off"/>
														<TextInput name='passwordConfirmation' label="Confirm Password" type='password' errors={errors} touched={touched} autoComplete="off"/>

														<ErrorMessage 
															name='error' 
															render={(error) => 
																<p className="text-red-500 text-xs mt-1 ml-1 mb-2 tracking-wide">
																	{error}
																</p>
																}
														/>
														<div className="text-center pt-1 mb-12 pb-1"> 
															<button className="button-primary flex items-center justify-center space-x-2"
																type="submit"
																disabled={isSubmitting}
																>
																Register
																	{isSubmitting && (
																		<FaSpinner className="animate-spin ml-2" size={20} />
																	)}
															</button>
														</div>
													</Form>
												)}
											</Formik>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}

export default observer(RegisterPage)