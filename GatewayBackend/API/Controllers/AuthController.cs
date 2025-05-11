using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Services.IServices;
using API.Models;
using Data.Models;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;
    private readonly IUserService _userService;

    public AuthController(ILogger<AuthController> logger, IUserService userService)
    {
        _logger = logger;
        _userService = userService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(UserToCreateDto userToCreate)
    {
        try
        {
            var (succeeded, errorMessage, user) = await _userService.CreateUser(userToCreate);
            if (!succeeded || user == null) 
            {
                return BadRequest(new ApiResponse<string>(400, errorMessage));
            }

            var (succeededRole, errorRole) = await _userService.AddUserToRole(user, "standard");
            
            if (!succeededRole)
            {
                _logger.LogError("Error adding user {email} to {role}, error: {error}", user.Email, "standard", errorRole);
            }

            var (succeededEmailConfirmRequest, errorEmailConfirmRequest) = await _userService.SendConfirmEmailRequestAsync(userToCreate.Email);

            if (!succeededEmailConfirmRequest)
            {
                _logger.LogWarning("User {email} created but confirmation email failed: {error}", user.Email, errorEmailConfirmRequest);
            }

            return Ok(new ApiResponse<string>(201, "User created. Please check your email to verify your account"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create the user");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while creating the user"));
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(UserToAuthenticateDto userToAuthenticate)
    {
        try
        {
            var (succeeded, errorCode, user) = await _userService.AuthenticateUser(userToAuthenticate);
            if (!succeeded || user == null)
            {
                var (statusCode, errorMessage) = GetErrorObjectByMessage(errorCode);
                
                return StatusCode(statusCode, ApiResponse<string>.Fail(statusCode, errorCode, errorMessage));

            }

            return Ok(new ApiResponse<AuthenticatedUserDto>(200, "Authentication successful", user));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to authenticate the user");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while authenticating the user"));
        }
    } 

    [HttpPost("confirm-email-request")]
    public async Task<IActionResult> SendConfirmationEmail([FromBody] ConfirmEmailRequestDto dto)
    {

        var (success, error) = await _userService.SendConfirmEmailRequestAsync(dto.Email);

        return success
        ? Ok(new ApiResponse<string>(200, "Email sent"))
        : BadRequest(new ApiResponse<string>(400, error));
    }

    [HttpPost("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailDto dto)
    {
        var result = await _userService.ConfirmEmailAsync(dto);

        return result.Succeeded
        ? Ok(new ApiResponse<string>(200, "Email confirmed"))
        : BadRequest(new ApiResponse<string>(400, result.ErrorMessage));
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto dto)
    {       
        var result = await _userService.SendPasswordResetEmailAsync(dto.Email);

        return result.Succeeded
            ? Ok(new ApiResponse<string>(200, "If the email exists, a password reset link has been sent."))
            : BadRequest(new ApiResponse<string>(400, result.ErrorMessage));
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var result = await _userService.ResetPasswordAsync(dto.Email, dto.Token, dto.NewPassword);

        return result.Succeeded
            ? Ok(new ApiResponse<string>(200, "Password has been reset successfully."))
            : BadRequest(new ApiResponse<string>(400, result.ErrorMessage));
    } 

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var (succeeded, errorMessage, user) = await _userService.GetCurrentUser();
        
        if (!succeeded || user == null)
        {
            return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));
        }

        var result = await _userService.ChangePassword(user.Email, dto);

        return result.Succeeded
            ? Ok(new ApiResponse<string>(200, "Password has been changed successfully."))
            : BadRequest(new ApiResponse<string>(400, result.ErrorMessage));
    } 

    private (int code, string message) GetErrorObjectByMessage(string errorCode)
    {
        return errorCode switch
        {
            "UserNotFound" =>(404, "User does not exist"),
            "UserLockedOut" => (403, "User account is locked out"),
            "EmailNotConfirmed" => (403, "Email not confirmed"),
            "SignInNotAllowed" => (403, "User is not allowed to sign in"),
            "RequiresTwoFactor" => (401, "Two-factor authentication is required"),
            "InvalidCredentials" => (401, "Invalid credentials"),
            _ => (400, "An unexpected error occurred")
        };
    }
}
