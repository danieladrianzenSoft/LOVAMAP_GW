import { makeAutoObservable, runInAction } from "mobx";
import agent from "../api/agent";
import { User, UserChangePassword, UserConfirmEmail, UserLogin, UserRegister, UserResetPassword } from "../models/user";
import history from "../helpers/History";
import { store } from "./store";
import toast from "react-hot-toast";
import ToastNotification from "../common/notification/toast-notification";
import History from "../helpers/History";

export default class UserStore {
	user: User | null = null;

	constructor() {
		makeAutoObservable(this);
		this.loadUser();
	}
	
	get isLoggedIn() {
		return !! this.user
	}

	loadUser = async() => {
		const token = localStorage.getItem('accessToken');
		if (token && !this.user) {
			await this.getCurrentUser();
		}
	};

	getCurrentUser = async () => {
		try {
			const response = await agent.Users.getCurrent();
			runInAction(() => {
				this.user = response.data
				store.commonStore.setToken(response.data.accessToken);
			})
		} catch (error) {
			console.error(error)
		}
	}

	register = async (creds: UserRegister) => {
		try {
			await agent.Users.register(creds);
			runInAction(() => {
				toast.custom((t) => (
					<ToastNotification
						title="Registration Successful"
						message="Redirecting to login..."
						onDismiss={() => toast.dismiss(t.id)}
					/>
				), {
					duration: 4000,
					position: "top-right"
				});
				history.push('/login')
			})
		} catch (error) {
			throw error;
		}
	}

	login = async (creds: UserLogin) => {
		try {
			const response = await agent.Users.login(creds);
			const user = response.data;
			runInAction(() => {
				store.commonStore.setToken(user.accessToken);
				this.user = user;
				console.log('Login successful');
				store.commonStore.setActiveTab(0);
			});
			return { success: true };
		} catch (error: any) {
			if (error?.statusCode === 403 && error?.errorCode === "EmailNotConfirmed") {
				History.push(`/email-not-confirmed?email=${encodeURIComponent(creds.email)}`);
				return { success: false };
			}
		
			const errorMessage = error?.message || "An unknown error occurred";
			return { success: false, error: errorMessage };
		}
	}

	confirmEmail = async (userConfirmEmail: UserConfirmEmail) => {
		try {
			const response = await agent.Users.confirmEmail(userConfirmEmail);
			if (response.statusCode === 200) {
				runInAction(() => {
					toast.custom((t) => (
						<ToastNotification
							title="Email Confirmed Successfully"
							message="Login with your new password..."
							onDismiss={() => toast.dismiss(t.id)}
						/>
					), {
						duration: 4000,
						position: "top-right"
					});
					history.push('/login')
				});
				return undefined;
			}
			return response.message;
		} catch (error: any) {
			console.error(error);
			return error.message;
		}
	}

	resendConfirmationEmail = async (email: string): Promise<string | undefined> => {
		try {
		  const response = await agent.Users.confirmEmailRequest(email);
		  if (response.statusCode === 200) {
			toast.success("Confirmation email resent successfully.");
			runInAction(() => {
				toast.custom((t) => (
					<ToastNotification
						title="Confirmation email resent successfully"
						message="Check your inbox to verify your account"
						onDismiss={() => toast.dismiss(t.id)}
					/>
				), {
					duration: 4000,
					position: "top-right"
				})
		  	});
			return undefined;
		  }
		  return response.message;
		} catch (error: any) {
		  console.error(error);
		  return "Failed to resend confirmation email.";
		}
	  };

	forgotPassword = async (email: string) => {
		try {
			const response = await agent.Users.forgotPassword(email);
			if (response.statusCode === 200) return undefined;
			return response.message;
		} catch (error: any) {
			console.error(error);
			return error.message;
		}
	}

	resetPassword = async (userResetPassword: UserResetPassword) => {
		try {
			const response = await agent.Users.resetPassword(userResetPassword);
			if (response.statusCode === 200) {
				runInAction(() => {
					toast.custom((t) => (
						<ToastNotification
							title="Password Reset Successfully"
							message="Login with your new password..."
							onDismiss={() => toast.dismiss(t.id)}
						/>
					), {
						duration: 4000,
						position: "top-right"
					});
					history.push('/login')
				});
				return undefined;
			}
			return response.message;
		} catch (error: any) {
			console.error(error);
			return error.message;
		}
	}

	changePassword = async (userChangePassword: UserChangePassword) => {
		try {
			const response = await agent.Users.changePassword(userChangePassword);
			if (response.statusCode === 200) {
				runInAction(() => {
					toast.custom((t) => (
						<ToastNotification
							title="Password Changed Successfully"
							message=""
							onDismiss={() => toast.dismiss(t.id)}
						/>
					), {
						duration: 4000,
						position: "top-right"
					});
				});
				return undefined;
			}
			return response.message;
		} catch (error: any) {
			console.error(error);
			return error.message;
		}
	}

	logout = () => {
		store.commonStore.setActiveTab(0);
		store.commonStore.setToken(null);
		window.localStorage.removeItem('accessToken');
		this.user = null;
		history.push('/');
	}
}