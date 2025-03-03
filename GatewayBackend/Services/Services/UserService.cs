
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Infrastructure.IHelpers;
using Services.IServices;
using Infrastructure;

namespace Services.Services
{	public class UserService : IUserService
	{
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
		private readonly IUserAuthHelper _userAuthHelper;
		private readonly IUserContextHelper _userContextHelper;
		private readonly IJwtGeneratorHelper _jwtGeneratorHelper;
		private readonly ILogger<UserService> _logger;

		public UserService(DataContext context, IModelMapper modelMapper, 
			IUserAuthHelper userAuthHelper, IUserContextHelper userContextHelper, 
			ILogger<UserService> logger,IJwtGeneratorHelper jwtGeneratorHelper)
		{
			_context = context;
			_modelMapper = modelMapper;
			_userAuthHelper = userAuthHelper;
			_userContextHelper = userContextHelper;
			_jwtGeneratorHelper = jwtGeneratorHelper;
			_logger = logger;
		}
		public string? GetCurrentUserId()
		{
			var userId = _userContextHelper.GetCurrentUserId();
			if (string.IsNullOrEmpty(userId))
			{
				return null;
			}
			return userId;
		}
		public async Task<(bool Succeeded, string ErrorMessage, string? UserId)> GetAdminUserIdAsync()
		{
			try
			{
				var adminUser = await _userAuthHelper.GetFirstUserByRoleAsync("administrator");
				if (adminUser == null)
				{
					return (false, "UserNotFound", null);
				}
				return (true, "", adminUser.Id);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error finding administrator account");
				return (false, "UnexpectedError", null);
			}
		}
		public async Task<(bool Succeeded, string ErrorMessage, User? User)> CreateUser(UserToCreateDto userToCreate)
		{
			try
			{
				var user = _modelMapper.MapToUser(userToCreate);
				var result = await _userAuthHelper.CreateUser(user, userToCreate.Password);
				if (!result.Succeeded)
				{
					return (false, string.Join(", ", result.Errors.Select(e => e.Description)), null);
				}
				return (true, "", user);

			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error creating user with email: {Email}", userToCreate.Email);
        		return (false, "UnexpectedError", null);
			}
			
		}
		public async Task<(bool Succeeded, string ErrorMessage, AuthenticatedUserDto? User)> AuthenticateUser(UserToAuthenticateDto userToAuthenticate)
		{
			try
			{
				var user = await _userAuthHelper.GetUserByEmail(userToAuthenticate.Email);

				if (user == null) 
				{
					return (false, "UserNotFound", null);
				}			

				var result = await _userAuthHelper.AuthenticateUser(user, userToAuthenticate.Password);

				if (!result.Succeeded)
				{
					if (result.IsLockedOut)
					{
						return (false, "UserLockedOut", null);
					}
					if (result.IsNotAllowed)
					{
						return (false, "SignInNotAllowed", null);
					}
					if (result.RequiresTwoFactor)
					{
						return (false, "RequiresTwoFactor", null);
					}
					return (false, "InvalidCredentials", null);
				}

				var token = await _jwtGeneratorHelper.GenerateJwtToken(user);

				var userToReturn = await _modelMapper.MapToAuthenticatedUserDto(user, token);

				return (true, "", userToReturn); // No error code needed on success

			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error authenticating user with email: {Email}", userToAuthenticate.Email);
        		return (false, "UnexpectedError", null);
			}
			
		}

		public async Task<(bool Succeeded, string ErrorMessage, AuthenticatedUserDto? User)> GetCurrentUser()
		{
			try
			{
				var userId = _userContextHelper.GetCurrentUserId();

				if (string.IsNullOrEmpty(userId)) return (false, "Unauthorized", null);

				var result = await _userAuthHelper.GetUserById(userId);

				if (result == null) return (false, "NotFound", null);

				var token = await _jwtGeneratorHelper.GenerateJwtToken(result);

				var userToReturn = await _modelMapper.MapToAuthenticatedUserDto(result, token);
				
				return (true, "", userToReturn);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error getting current user");
        		return (false, "UnexpectedError", null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage)> AddUserToRole(User user, string role)
		{
			try
			{
				var result = await _userAuthHelper.AddToRole(user,role);

				if (!result.Succeeded)
				{
					return (false, string.Join(", ", result.Errors.Select(e => e.Description)));
				}
				return (true, "");
			}
			catch (Exception ex)
			{
				
				_logger.LogError(ex, "Error adding user {Email} to {role}", user.Email, role);
        		return (false, "UnexpectedError");
			}

		}

	}
}


