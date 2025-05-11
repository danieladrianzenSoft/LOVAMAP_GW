import { useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { useStore } from "../../app/stores/store";
import { Formik, Form, Field, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import logo from '../../../src/LOVAMAP_logo.png';
import History from '../../app/helpers/History';
import { observer } from 'mobx-react-lite';
import { FaSpinner } from 'react-icons/fa';

const ResetPasswordPage = observer(() => {
	const { userStore } = useStore();
	const [searchParams] = useSearchParams();
	const [error, setError] = useState<string | null>(null);
  
	const email = searchParams.get('email') ?? '';
	const token = searchParams.get('token') ?? '';
  
	const validationSchema = Yup.object({
	  newPassword: Yup.string().min(6, 'Must be at least 6 characters').required('Required'),
	});
  
	const handleSubmit = async (
	  values: { newPassword: string },
	  { setSubmitting }: FormikHelpers<{ newPassword: string }>
	) => {
	  setError(null);
  
	  const result = await userStore.resetPassword({
		email,
		token,
		newPassword: values.newPassword,
	  });
  
	  setSubmitting(false);
  
	  if (!result) {
		History.push('/login');
	  } else {
		setError(result);
	  }
	};
  
	if (!email || !token) {
	  return (
		<div className="flex justify-center items-center h-screen bg-gray-200">
		  <p className="text-red-600 text-center text-lg font-medium">
			Invalid or missing reset link parameters.
		  </p>
		</div>
	  );
	}
  
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
					  initialValues={{ newPassword: '' }}
					  validationSchema={validationSchema}
					  onSubmit={handleSubmit}
					>
					  {({ handleSubmit, errors, touched, isSubmitting }) => (
						<Form onSubmit={handleSubmit}>
						  <p className="mb-4">Enter your new password</p>
						  <Field
							name="newPassword"
							type="password"
							placeholder="New Password"
							className="w-full border p-2 rounded mb-2"
						  />
						  {touched.newPassword && errors.newPassword && (
							<p className="text-red-500 text-xs mb-2">{errors.newPassword}</p>
						  )}
						  <div className="text-center pt-1 mb-6 pb-1">
							<button
							  className="button-primary w-full flex items-center justify-center space-x-2"
							  type="submit"
							  disabled={isSubmitting}
							>
							  Reset Password
							  {isSubmitting && (
								<FaSpinner className="animate-spin ml-2" size={20} />
							  )}
							</button>
							{error && (<div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>)}
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
  
  export default ResetPasswordPage;