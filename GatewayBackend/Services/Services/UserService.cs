
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Infrastructure.IHelpers;
using Services.IServices;
using Infrastructure.Helpers;
using Microsoft.Extensions.Configuration;

namespace Services.Services
{	public class UserService : IUserService
	{
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
		private readonly IUserAuthHelper _userAuthHelper;
		private readonly IUserContextHelper _userContextHelper;
		private readonly IJwtGeneratorHelper _jwtGeneratorHelper;
		private readonly IConfiguration _config;
		private readonly IEmailService _emailService;
		private readonly ILogger<UserService> _logger;

		public UserService(DataContext context, IModelMapper modelMapper, 
			IUserAuthHelper userAuthHelper, IUserContextHelper userContextHelper, 
			IEmailService emailService, IConfiguration config,
			ILogger<UserService> logger, IJwtGeneratorHelper jwtGeneratorHelper)
		{
			_context = context;
			_modelMapper = modelMapper;
			_userAuthHelper = userAuthHelper;
			_emailService = emailService;
			_userContextHelper = userContextHelper;
			_jwtGeneratorHelper = jwtGeneratorHelper;
			_config = config;
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

				if (await _userAuthHelper.IsLockedOut(user))
				{
					return (false, "UserLockedOut", null);
				}

				if (!await _userAuthHelper.IsEmailConfirmed(user))
				{
					return (false, "EmailNotConfirmed", null);
				}

				var result = await _userAuthHelper.AuthenticateUser(user, userToAuthenticate.Password);

				if (!result.Succeeded)
				{
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

		public async Task<(bool Succeeded, string ErrorMessage)> ChangePassword(string email, ChangePasswordDto dto)
		{
			try
			{
				var user = await _userAuthHelper.GetUserByEmail(email);

				if (user == null) 
				{
					return (false, "UserNotFound");
				}

				var result = await _userAuthHelper.ChangePassword(user, dto.OldPassword, dto.NewPassword);

				if (!result.Succeeded)
				{
					var errorMessage = string.Join("; ", result.Errors.Select(e => e.Description));
					return (false, errorMessage);
				}

				return (true, "");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error changing password for user account with email: {Email}", email);
        		return (false, "UnexpectedError");
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
		public async Task<(bool Succeeded, string ErrorMessage)> SendConfirmEmailRequestAsync(string email)
		{
			var user = await _userAuthHelper.GetUserByEmail(email);
			if (user == null)
				return (false, "User not found");
				
			var token = await _userAuthHelper.GenerateEmailConfirmationTokenAsync(user);
			var encodedToken = Uri.EscapeDataString(token);
			var confirmUrl = $"{_config["Frontend:URL"]}/confirm-email?email={Uri.EscapeDataString(user.Email!)}&token={encodedToken}";

			var name = user.Email?.Split('@')[0] ?? "User";

			var vars = new Dictionary<string, string>
			{
				{ "name", name},
				{ "link", confirmUrl }
			};

        	var details = EmailTemplates.Map[EmailTemplate.Welcome];

			return await _emailService.SendEmailAsync(user.Email!, details.Subject, details.TemplateId, vars);
		}
		public async Task<(bool Succeeded, string ErrorMessage)> ConfirmEmailAsync(ConfirmEmailDto confirmEmailDto)
		{
			var user = await _userAuthHelper.GetUserByEmail(confirmEmailDto.Email);
			if (user == null)
				return (false, "User not found");

			var decodedToken = Uri.UnescapeDataString(confirmEmailDto.Token);
    		var result = await _userAuthHelper.ConfirmEmailAsync(user, decodedToken);

			if (!result.Succeeded)
			{
				var errors = string.Join("; ", result.Errors.Select(e => e.Description));
				return (false, errors);
			}
			
			return (true, "");
		}
		public async Task<(bool Succeeded, string ErrorMessage)> SendPasswordResetEmailAsync(string email)
		{
			var user = await _userAuthHelper.GetUserByEmail(email);
			// if (user == null || !(await _userAuthHelper.IsEmailConfirmed(user)))
			if (user == null)
				return (false, "User not found or email not confirmed");

			var token = await _userAuthHelper.GeneratePasswordResetTokenAsync(user);

			var name = user.Email?.Split('@')[0] ?? "User";

			var encodedToken = Uri.EscapeDataString(token);
			var resetLink = $"{_config["Frontend:URL"]}/reset-password?email={Uri.EscapeDataString(email)}&token={encodedToken}";

			var vars = new Dictionary<string, string>
			{
				{ "name", name},
				{ "link", resetLink }
			};

        	var details = EmailTemplates.Map[EmailTemplate.PasswordReset];

			return await _emailService.SendEmailAsync(email, details.Subject, details.TemplateId, vars);
		}
		public async Task<(bool Succeeded, string ErrorMessage)> ResetPasswordAsync(string email, string token, string newPassword)
		{
			var user = await _userAuthHelper.GetUserByEmail(email);
			if (user == null)
				return (false, "Invalid email");

			var decodedToken = Uri.UnescapeDataString(token);

			var result = await _userAuthHelper.ResetPasswordAsync(user, decodedToken, newPassword);

			if (!result.Succeeded)
			{
				var errors = string.Join("; ", result.Errors.Select(e => e.Description));
				return (false, errors);
			}

			return (true, "");
		}
	}
}


