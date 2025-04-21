using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

using Infrastructure.DTOs;
using Services.IServices;
using API.Models;
using Infrastructure;
using Data.Models;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DescriptorsController : ControllerBase
{
    private readonly ILogger<DescriptorsController> _logger;
    private readonly IDescriptorService _descriptorService;
	private readonly IUserService _userService;

    public DescriptorsController(ILogger<DescriptorsController> logger, 
		IDescriptorService descriptorService, IUserService userService)
    {
        _descriptorService = descriptorService;
		_userService = userService;
		_logger = logger;
    }

	[AllowAnonymous]
	[HttpGet("{scaffoldGroupId}")]
    public async Task<IActionResult> GetPoreInfo(int scaffoldGroupId)
    {
		try
		{
			var (succeeded, errorMessage, poreInfo) = await _descriptorService.GetPoreInfo(scaffoldGroupId);

			if (!succeeded) {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			return Ok(new ApiResponse<PoreInfoDto>(200, "", poreInfo));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the pore info");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the pore info"));
		}
    }
}