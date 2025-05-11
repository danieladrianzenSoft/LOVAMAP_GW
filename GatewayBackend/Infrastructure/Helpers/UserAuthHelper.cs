
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Data;
using Data.Models;
using Infrastructure.IHelpers;

namespace Infrastructure.Helpers
{	
	public class UserAuthHelper : IUserAuthHelper
	{
		private readonly UserManager<User> _userManager;
		private readonly SignInManager<User> _signInManager;
		private readonly RoleManager<Role> _roleManager;
		private readonly DataContext _context;

		public UserAuthHelper(UserManager<User> userManager, SignInManager<User> signInManager, RoleManager<Role> roleManager, DataContext dataContext)
		{
			_context = dataContext;
			_userManager = userManager;
			_roleManager = roleManager;
			_signInManager = signInManager;
		}

		public async Task<IdentityResult> CreateUser(User user, string password)
		{
			return await _userManager.CreateAsync(user, password);
		}

		public async Task<SignInResult> AuthenticateUser(User user, string password)
		{
			// return await _signInManager.PasswordSignInAsync(user, password, false, false);
			return await _signInManager.CheckPasswordSignInAsync(user, password, false);
		}

		public async Task<ICollection<string>> GetUserRoles(User user)
		{
			return await _userManager.GetRolesAsync(user);
		}

		public async Task CreateRole(Role role)
		{
			var result = await _roleManager.CreateAsync(role);
			if (!result.Succeeded)
			{
				throw new InvalidOperationException($"Failed to create role: {string.Join(", ", result.Errors.Select(e => e.Description))}");
			}
		}

		public async Task<IdentityResult> AddToRole(User user, string role)
		{
			return await _userManager.AddToRoleAsync(user, role);
		}

		public async Task<User?> GetFirstUserByRoleAsync(string role)
		{
			var user = await _context.Users
				.Join(_context.UserRoles, // Join users and userRoles
					user => user.Id,
					userRole => userRole.UserId,
					(user, userRole) => new { user, userRole })
				.Join(_context.Roles, // Join the above result with roles
					userUserRole => userUserRole.userRole.RoleId,
					role => role.Id,
					(userUserRole, role) => new { userUserRole, role })
				.Where(x => x.role.Name == role) // Filter by role name
				.Select(x => x.userUserRole.user) // Select the user
				.FirstOrDefaultAsync();

			return user;
		}

		public async Task<bool> IsInRole(string userId, string roleName)
		{
			var user = await _userManager.FindByIdAsync(userId) ?? throw new ArgumentException("User not found");
            return await _userManager.IsInRoleAsync(user, roleName);
		}

		public async Task<User?> GetUserById(string userId)
		{
			return await _userManager.FindByIdAsync(userId);
		}

		public async Task<User?> GetUserByEmail(string email)
		{
			return await _userManager.FindByEmailAsync(email);
		}

		public async Task<string> GenerateEmailConfirmationTokenAsync(User user)
		{
			var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
			return Uri.EscapeDataString(token);
		}

		public async Task<bool> IsLockedOut(User user)
		{
			return await _userManager.IsLockedOutAsync(user);
		}

		public async Task<bool> IsEmailConfirmed(User user)
		{
			return await _userManager.IsEmailConfirmedAsync(user);
		}
		
		public async Task<IdentityResult> ConfirmEmailAsync(User user, string token)
		{
			return await _userManager.ConfirmEmailAsync(user, token);
		}
		public async Task<IdentityResult> ChangePassword(User user, string oldPassword, string newPassword)
		{
			return await _userManager.ChangePasswordAsync(user, oldPassword, newPassword);
		}
		public async Task<string> GeneratePasswordResetTokenAsync(User user)
		{
			return await _userManager.GeneratePasswordResetTokenAsync(user);
		}
		
		public async Task<IdentityResult> ResetPasswordAsync(User user, string token, string newPassword)
		{
			return await _userManager.ResetPasswordAsync(user, token, newPassword);
		}

	}
}


