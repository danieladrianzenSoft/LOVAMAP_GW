import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from "../../app/stores/store";
import { Formik, Form, Field, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { NavLink } from 'react-router-dom';
import logo from '../../../src/LOVAMAP_logo.png';
// import History from '../../app/helpers/History';
import { FaSpinner } from 'react-icons/fa';

const ForgotPasswordPage = observer(() => {
	const { userStore } = useStore();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const validationSchema = Yup.object({
	  email: Yup.string().email('Invalid email').required('Required'),
	});

	const handleSubmit = async (
		values: { email: string },
		{ setSubmitting }: FormikHelpers<{ email: string }>
	  ) => {
		setError(null); // clear previous error
		setSuccess(null);
	
		const result = await userStore.forgotPassword(values.email);
		setSubmitting(false);
	
		if (!result) {
		//   History.push('/login');
		  setSuccess("A reset link has been sent to the email provided if it is registered");
		} else {
		  setError(result);
		}
	};
  
	return (
	  <div className="gradient-form bg-gray-200 h-screen w-full">
		<div className="justify-center py-12 px-6 h-full">
		  <div className="flex justify-center items-center flex-wrap h-full g-6 text-gray-800">
			<div className="xl:w-4/12">
			  <div className="block bg-white shadow-lg rounded-lg">
				<div className="lg:w-full px-4 md:px-0">
				  <div className="p-8 md:p-12 md:mx-6">
					<div className="text-center">
					  <NavLink to="/">
						<img className="mx-auto w-52 mb-8" src={logo} alt="logo" />
					  </NavLink>
					</div>
					<Formik
					  initialValues={{ email: '' }}
					  validationSchema={validationSchema}
					  onSubmit={handleSubmit}
					>
					  {({ handleSubmit, errors, touched, isSubmitting }) => (
						<Form onSubmit={handleSubmit}>
						  <p className="mb-4">Please provide your email below</p>
						  <Field
							name="email"
							type="email"
							placeholder="Email"
							className="w-full border p-2 rounded mb-2"
						  />
						  {touched.email && errors.email && (
							<p className="text-red-500 text-xs mb-2">{errors.email}</p>
						  )}
						  <div className="text-center pt-1 mb-6 pb-1">
							<button 
								className="button-primary w-full flex items-center justify-center space-x-2" 
								type="submit"
								disabled={isSubmitting || (success != null)}
							>
							  Send Reset Link
								{isSubmitting && (
									<FaSpinner className="animate-spin ml-2" size={20} />
								)}
							</button>
							{error && <p className="text-sm text-red-600 text-center mt-2">{error}</p>}
							{success && <p className="text-green-600 text-center text-sm mt-2">{success}</p>}
						  </div>
						</Form>
					  )}
					</Formik>
					<div className="flex items-center justify-between pb-6">
					  <NavLink className="text-blue-600 text-sm" to="/login">
						Back to Login
					  </NavLink>
					</div>
				  </div>
				</div>
			  </div>
			</div>
		  </div>
		</div>
	  </div>
	);
  });
  
  export default ForgotPasswordPage;