import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import History from "../helpers/History";
import { store } from "../stores/store";
import { User, UserLogin, UserRegister } from "../models/user";
import { ApiResponse } from "../models/apiResponse";
import { Tag } from "../models/tag";
import { ScaffoldGroup } from "../models/scaffoldGroup";

axios.defaults.baseURL = 'https://localhost:44381/api';

axios.interceptors.request.use(async (config) => {
    const token = store.commonStore.getAccessToken;
	const isLoggedIn = store.commonStore.isLoggedIn();
	console.log('IsLoggedIn:', isLoggedIn)

    if (!isLoggedIn && !token && !isPublicRoute(config.url ?? '')) {
        // Redirect to login page if there is no token and the route is not a public route
		console.log('redirecting back to login')
        History.push('/login');
        // Correct way to construct an AxiosError with a message and the config
		const mockResponse = {
            data: { message: "Not authorized" },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
            request: {},
        };
        return Promise.reject(new AxiosError('Not authorized.', 'ECONNABORTED', config, null, mockResponse));
    }

    config.headers.Authorization = `Bearer ${token || ''}`;
    return config;
});

function isPublicRoute(url: string) {
    const publicRoutes = ['/auth/login', '/auth/register', '/scaffoldGroups/public', '/resources'];
    return publicRoutes.some(route => url.includes(route));
}

axios.interceptors.response.use(response => {
    return response;
}, (error: AxiosError) => {
    if (!error.response) {
        console.error('AxiosError without response:', error);
        return Promise.reject(error);
    }
    
    const {data, status} = error.response;
    switch (status) {
        case 400:
            console.error('Bad request:', data);
            break;
        case 401:
            store.userStore.logout();
            History.push('/login');
            break;
        case 404:
            console.error('Not found:', data);
            break;
        case 500:
            console.error('Server error:', data);
            break;
    }
    return Promise.reject(error);
});

const responseBody = <T> (response: AxiosResponse<T>) => response.data;

const requests = {
	get: <T> (url: string) => axios.get<T>(url).then(responseBody),
	post: <T> (url: string, body: {}) => axios.post<T>(url, body).then(responseBody),
	put: <T> (url: string, body: {}) => axios.put<T>(url, body).then(responseBody),
	del: <T> (url: string) => axios.delete<T>(url).then(responseBody),
}

const Resources = {
	getAutogeneratedTags: () => requests.get<ApiResponse<Tag[]>>('/resources/tags')
}

const Users = {
	getCurrent: () => requests.get<ApiResponse<User>>('/users/getCurrentUser'),
	login: (user: UserLogin) => requests.post<ApiResponse<User>>('/auth/login', user),
	register: (user: UserRegister) => requests.post<ApiResponse<User>>('/auth/register', user),
}

const ScaffoldGroups = {
	getSummarized: (queryParams: string) => requests.get<ApiResponse<ScaffoldGroup[]>>('/scaffoldGroups' + queryParams),
	getPublic: (queryParams: string) => requests.get<ApiResponse<ScaffoldGroup[]>>('/scaffoldGroups/public' + queryParams),
	getDetailed: (id: number) => requests.get<ApiResponse<ScaffoldGroup>>('/scaffoldGroups/' + id)
}

const agent = {
	Resources,
	Users,
	ScaffoldGroups
}

export default agent;