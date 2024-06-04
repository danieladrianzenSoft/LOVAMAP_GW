import { makeAutoObservable, reaction } from "mobx";

export default class CommonStore {
	accessToken: string | null = window.localStorage.getItem('accessToken');
	appLoaded = false;
	activeTab = 0;

	constructor() {
		makeAutoObservable(this);
		reaction(
			() => this.accessToken,
			accessToken => {
				if (accessToken) {
					window.localStorage.setItem('accessToken', accessToken)
				} else {
					window.localStorage.removeItem('accessToken')
				}
			}
		)
	}

	isLoggedIn = () =>{
		return this.accessToken != null;
	}

	setToken = (accessToken: string | null) => {
		this.accessToken = accessToken;
	}

	setActiveTab = (activeTab: number) => { 
		this.activeTab = activeTab;
	}

	setAppLoaded = () => {
		this.appLoaded = true;
	}
}