import { Form, Formik, ErrorMessage } from "formik";
import { observer } from "mobx-react-lite";
import React from "react";
import * as Yup from 'yup';
import TextInput from "../../app/common/form/text-input";
import { useStore } from "../../app/stores/store";
// import logo from "../../../src/LOVAMAP_logo_isolated.png";
import logo from '../../../src/LOVAMAP_logo.png';
import { Link, NavLink } from "react-router-dom";
import History from "../../app/helpers/History";
import { useLocation } from "react-router-dom";

const LoginPage: React.FC = () => {
	const { userStore } = useStore();
	const { search } = useLocation();

	const login = async (values: any, setErrors: Function) => {
		const {error, ...user} = values;
		const result = await userStore.login(user)
		if (result.success) {
			const searchParams = new URLSearchParams(search);
			let redirectPath = searchParams.get('redirect') || '/';

			if (redirectPath.startsWith("/login")) {
                redirectPath = "/";
            }

			History.replace(redirectPath); 
		} else {
            setErrors({ error: result.error });
		}
	}

	const loginInitialValues: any = {
		email: '',
		password: '',
		error: null
	}

	const validationSchema = Yup.object({
		email: Yup.string().required('Email is required'),
		password: Yup.string().required('Password is required')
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
										<div className="p-8 md:p-12 md:mx-6">
											<div className="text-center">
												<NavLink to="/">
													<img
														className="mx-auto w-52 mb-8"
														src={logo}
														alt="logo"
													/>
												</NavLink>
												{/* <h4 className="text-xl font-semibold mt-1 mb-12 pb-1">LOVAMAP</h4> */}
											</div>
											{/* FORM GOES HERE */}
											<Formik 
												validationSchema={validationSchema}
												enableReinitialize
												initialValues={loginInitialValues}
												onSubmit={(values, {setErrors}) => 	login(values, setErrors)}>
												{({handleSubmit, errors, touched}) => (
													<Form onSubmit={handleSubmit}>
														<p className="mb-4">Login to your account</p>
														<TextInput name='email' placeholder="Email" type='text' errors={errors} touched={touched}/>
														<TextInput name='password' placeholder="Password" type='password' errors={errors} touched={touched}/>
														<ErrorMessage 
															name='error' 
															render={(error) => 
																<p className="text-red-500 text-xs mt-1 ml-1 mb-2 tracking-wide">
																	{error}
																</p>
																}
														/>
														<div className="text-center pt-1 mb-12 pb-1"> 
															<button className="button-primary"
																type="submit"
																>
																Log in
															</button>
															<a className="text-gray-500" href="#!">Forgot password?</a>
														</div>
													</Form>
												)}
											</Formik>
											<div className="flex items-center justify-between pb-6">
												<p className="mb-0 mr-2">Don't have an account?</p>
													<Link
														type="button"
														className="button-outline"
														data-mdb-ripple="true"
														data-mdb-ripple-color="light"
														to={'/register'}
														>
														Register
													</Link>
											</div>
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

export default observer(LoginPage)