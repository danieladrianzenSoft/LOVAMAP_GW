import { makeAutoObservable, runInAction } from "mobx";
import agent from "../api/agent";
import { User, UserLogin, UserRegister } from "../models/user";
import history from "../helpers/History";
import { store } from "./store";
import toast from "react-hot-toast";
import ToastNotification from "../common/notification/toast-notification";

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
			store.commonStore.setToken(user.accessToken);
			runInAction(() => {
				this.user = user;
				console.log('Login successful. Redirecting...');
				store.commonStore.setActiveTab(0);
				history.push('/');
				console.log(user)
			});
		} catch (error) {
			throw error;
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