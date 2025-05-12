using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IUserService
	{
		string? GetCurrentUserId();
		Task<bool> IsAdmin(string userId);
		Task<(bool Succeeded, string ErrorMessage, string? UserId)> GetAdminUserIdAsync();
		Task<(bool Succeeded, string ErrorMessage, User? User)> CreateUser(UserToCreateDto userToCreate);
		Task<(bool Succeeded, string ErrorMessage, AuthenticatedUserDto? User)> AuthenticateUser(UserToAuthenticateDto userToAuthenticate);
		Task<(bool Succeeded, string ErrorMessage, AuthenticatedUserDto? User)> GetCurrentUser();
		Task<(bool Succeeded, string ErrorMessage)> AddUserToRole(User user, string role);
		Task<(bool Succeeded, string ErrorMessage)> SendConfirmEmailRequestAsync(string email);
		Task<(bool Succeeded, string ErrorMessage)> ConfirmEmailAsync(ConfirmEmailDto confirmEmailDto);
		Task<(bool Succeeded, string ErrorMessage)> SendPasswordResetEmailAsync(string email);
		Task<(bool Succeeded, string ErrorMessage)> ResetPasswordAsync(string email, string token, string newPassword);
		Task<(bool Succeeded, string ErrorMessage)> ChangePassword(string email, ChangePasswordDto dto);

	}
}