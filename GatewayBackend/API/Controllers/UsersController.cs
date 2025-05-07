using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

using Infrastructure.DTOs;
using Services.IServices;
using API.Models;
using Infrastructure;
using Data.Models;
using Services.Services;
using Infrastructure.Helpers;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ILogger<UsersController> _logger;
    private readonly IScaffoldGroupService _scaffoldGroupService;
	private readonly IUserService _userService;
    private readonly IEmailService _emailService;

    public UsersController(ILogger<UsersController> logger, 
		IScaffoldGroupService scaffoldGroupService,
        IEmailService emailService,
		IUserService userService)
    {
        _scaffoldGroupService = scaffoldGroupService;
        _emailService = emailService;
		_userService = userService;
		_logger = logger;
    }

	[HttpGet("getCurrentUser")]
    public async Task<IActionResult> GetCurrentUser()
    {
        try
        {

            var (succeeded, errorMessage, user) = await _userService.GetCurrentUser();
            
			if (!succeeded)
            {
                return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));
            }

            return Ok(new ApiResponse<AuthenticatedUserDto>(200, "User info obtained successfully", user));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to authenticate the user");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while authenticating the user"));
        }
    }

    [HttpGet("me/scaffoldgroups")]
    public async Task<IActionResult> GetUploadedScaffoldGroups()
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

   			var filter = new ScaffoldFilter { UserId = currentUserId };

			var (succeeded, errorMessage, scaffoldGroups) = await _scaffoldGroupService.GetFilteredScaffoldGroups(filter, currentUserId);

			if (!succeeded) {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			var summarizedGroups = scaffoldGroups?.OfType<ScaffoldGroupSummaryDto>();

			return Ok(new ApiResponse<IEnumerable<ScaffoldGroupSummaryDto>>(200, "", summarizedGroups));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the uploaded scaffold groups");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the uploaded scaffold grous"));
		}
    }

    [HttpPost("test-send-email")]
    public async Task<IActionResult> TestSendEmail([FromQuery] string toEmail)
    {
        var details = EmailTemplates.Map[EmailTemplate.Welcome];

        var variables = new Dictionary<string, string>
        {
            { "link", "https://lovamap.com/login" }
        };

        try
        {
            var (succeeded, errorMessage) = await _emailService.SendEmailAsync(toEmail, details.Subject, details.TemplateId, variables);
            if (!succeeded) return BadRequest(new ApiResponse<string>(400, errorMessage));

            return Ok(new ApiResponse<string>(200, "Test email sent successfully."));
        }
        catch (Exception)
        {
            return StatusCode(500, new ApiResponse<string>(500, "An error occurred while trying to send the test email"));
        }
    }

}
