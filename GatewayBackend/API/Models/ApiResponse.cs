using System;
using System.Threading.Tasks;
namespace API.Models
{
    public class ApiResponse<T>(int statusCode, string? message = null, T? data = default)
    {
        public int StatusCode { get; set; } = statusCode;
        public bool Succeeded { get; set; } = statusCode >= 200 && statusCode < 300;  // Typical success status code range
        public string Message { get; set; } = message ?? GetDefaultMessageForStatusCode(statusCode);
        public T? Data { get; set; } = data;
        public string? ErrorCode { get; set; }

        public static ApiResponse<T> Fail(int statusCode, string errorCode, string message)
        {
            return new ApiResponse<T>(statusCode, message)
            {
                ErrorCode = errorCode
            };
        }

        private static string GetDefaultMessageForStatusCode(int statusCode)
        {
            return statusCode switch
            {
                200 => "Operation successfull",
                201 => "Entity created",
                400 => "Action failed", //bad request
                401 => "Not authorized", //unauthorized
                403 => "Forbidden",
                404 => "Not found", //not found
                500 => "Server error", //server error
                _ => "Unknown error"
            };
        }
    }
}
