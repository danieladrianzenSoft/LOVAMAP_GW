using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IUserService
	{
		string? GetCurrentUserId();
		Task<(bool Succeeded, string ErrorMessage, string? UserId)> GetAdminUserIdAsync();
		Task<(bool Succeeded, string ErrorMessage, User? User)> CreateUser(UserToCreateDto userToCreate);
		Task<(bool Succeeded, string ErrorMessage, AuthenticatedUserDto? User)> AuthenticateUser(UserToAuthenticateDto userToAuthenticate);
		Task<(bool Succeeded, string ErrorMessage, AuthenticatedUserDto? User)> GetCurrentUser();
		Task<(bool Succeeded, string ErrorMessage)> AddUserToRole(User user, string role);

	}
}