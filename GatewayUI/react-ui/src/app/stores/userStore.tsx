import { makeAutoObservable, runInAction } from "mobx";
import agent from "../api/agent";
import { User, UserLogin, UserRegister } from "../models/user";
import history from "../helpers/History";
import { store } from "./store";
import toast from "react-hot-toast";
import ToastNotification from "../common/notification/toast-notification";
import { AxiosError } from "axios";

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
		} catch (error) {
			let errorMessage = "An unknown error occurred";
			if (error instanceof AxiosError) {
				if (error.response) {
					errorMessage = error.response.data.message || "Login failed";
				} else if (error.request) {
					errorMessage = "No response from server";
				}
			} else if (error instanceof Error) {
				errorMessage = error.message;
			}

			return { success: false, error: errorMessage }; // Return structured error
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