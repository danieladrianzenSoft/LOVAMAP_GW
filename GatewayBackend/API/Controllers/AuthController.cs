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

            // return CreatedAtRoute("GetUserById", new { id = user.Id }, new ApiResponse<User?>(201, "User created successfully", user));
            return Ok(new ApiResponse<string>(201, "User created"));
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
            var (succeeded, errorMessage, user) = await _userService.AuthenticateUser(userToAuthenticate);
            if (!succeeded)
            {
                var error = GetErrorMessageByCode(errorMessage);
                return BadRequest(new ApiResponse<string>(400, error));
            }

            if (user == null)
            {
                var error = GetErrorMessageByCode("UserNotFound");
                return NotFound(new ApiResponse<string>(404, error));
            }

            return Ok(new ApiResponse<AuthenticatedUserDto>(200, "Authentication successful", user));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to authenticate the user");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while authenticating the user"));
        }
    }  

    private string GetErrorMessageByCode(string errorCode)
    {
        return errorCode switch
        {
            "UserNotFound" => "User does not exist",
            "UserLockedOut" => "User account is locked out",
            "SignInNotAllowed" => "User is not allowed to sign in",
            "RequiresTwoFactor" => "Two-factor authentication is required",
            "InvalidCredentials" => "Invalid credentials",
            _ => "An unexpected error occurred"
        };
    }
}
