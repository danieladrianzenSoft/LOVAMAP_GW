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

export interface UserConfirmEmail {
	email: string;
	token: string;
}

export interface UserResetPassword {
	email: string;
	newPassword: string;
	token: string;
}

export interface UserChangePassword {
	oldPassword: string;
	newPassword: string;
}

