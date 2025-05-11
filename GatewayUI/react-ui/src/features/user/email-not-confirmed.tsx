import { NavLink, useLocation } from "react-router-dom";
import logo from '../../../src/LOVAMAP_logo.png';
import { useStore } from "../../app/stores/store";
import { useState } from "react";
import { FaSpinner } from "react-icons/fa";

const EmailNotConfirmed = () => {
	const { userStore } = useStore();
	const location = useLocation();
	const emailFromRedirect = new URLSearchParams(location.search).get('email') ?? '';
	
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleResend = async () => {
		if (!emailFromRedirect) {
		setError("Missing email address.");
		return;
		}

		setLoading(true);
		setMessage(null);
		setError(null);

		const result = await userStore.resendConfirmationEmail(emailFromRedirect);

		if (result) {
		setError(result);
		} else {
		setMessage("Confirmation email sent. Please check your inbox.");
		}

		setLoading(false);
	};
	return (
	  <div className="gradient-form bg-gray-200 h-screen w-full">
		<div className="justify-center py-12 px-6 h-full">
		  <div className="flex justify-center items-center flex-wrap h-full g-6 text-gray-800">
			<div className="xl:w-4/12">
			  <div className="block bg-white shadow-lg rounded-lg">
				<div className="p-8 md:p-12 text-center">
				  <img className="mx-auto w-52 mb-8" src={logo} alt="logo" />
				  <h2 className="text-xl font-semibold mb-4">Email Not Confirmed</h2>
				  <p className="text-gray-700 text-sm mb-6">
				  You must confirm your email before logging in.
				  Please check your inbox and click the confirmation link we sent to activate your account.
				  </p>
				  <button
					className="button-primary w-full flex items-center justify-center"
					onClick={handleResend}
					disabled={loading}
				>
					{loading ? (
					<>
						<FaSpinner className="animate-spin mr-2" /> Sending...
					</>
					) : (
					"Resend Confirmation Email"
					)}
				</button>

				{message && (<div className="text-green-600 text-sm bg-green-50 p-2 rounded mt-4 mb-2">{message}</div>)}
				{error && (<div className="text-red-600 text-sm bg-red-50 p-2 rounded mt-4 mb-2">{error}</div>)}
				<NavLink to="/login" className="text-blue-600 text-sm">
					Back to Login
				</NavLink>
				</div>
			  </div>
			</div>
		  </div>
		</div>
	  </div>
	);
  };

  export default EmailNotConfirmed;