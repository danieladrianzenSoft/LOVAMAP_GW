export interface User {
	id: number;
	email: string;
	accessToken: string;
	roles: string[];
}

export interface UserLogin {
	email: string;
	password: string;
}

export interface UserRegister {
	email: string;
	password: string;
}