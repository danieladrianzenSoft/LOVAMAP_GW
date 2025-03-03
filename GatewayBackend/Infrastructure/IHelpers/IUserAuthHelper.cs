
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;
using Microsoft.AspNetCore.Identity;

namespace Infrastructure.IHelpers
{	public interface IUserAuthHelper
	{
		Task<IdentityResult> CreateUser(User user, string password);
		Task<SignInResult> AuthenticateUser(User user, string password);
		Task<ICollection<string>> GetUserRoles(User user);
		Task CreateRole(Role role);
		Task<bool> IsInRole(string userId, string roleName);
		Task<IdentityResult> AddToRole(User user, string role);
		Task<User?> GetFirstUserByRoleAsync(string role);
		Task<User?> GetUserById(string userId);
		Task<User?> GetUserByEmail(string email);

	}
}


