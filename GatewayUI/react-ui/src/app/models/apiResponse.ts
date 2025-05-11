export interface ApiResponse<T> {
    statusCode: number;
    succeeded: boolean;
    message: string;
    data: T;
    errorCode?: string;
}