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
	private readonly IScaffoldGroupService _scaffoldGroupService;
	private readonly IDescriptorService _descriptorService;
	private readonly IUserService _userService;

	public DescriptorsController(ILogger<DescriptorsController> logger,
		IScaffoldGroupService scaffoldGroupService,
		IDescriptorService descriptorService, IUserService userService)
	{
		_scaffoldGroupService = scaffoldGroupService;
		_descriptorService = descriptorService;
		_userService = userService;
		_logger = logger;
	}

	[AllowAnonymous]
	[HttpGet]
    public async Task<IActionResult> GetAllDescriptors()
    {
        try
        {
			var descriptors = await _descriptorService.GetAllDescriptorTypes();
            return Ok(new ApiResponse<ICollection<DescriptorTypeDto>>(200, "Descriptors obtained successfully", descriptors));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get descriptors types");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting descriptor types"));
        }
    }   

	[AllowAnonymous]
	[HttpGet("{scaffoldGroupId}")]
	public async Task<IActionResult> GetPoreInfo(int scaffoldGroupId)
	{
		try
		{
			var (succeeded, errorMessage, poreInfo) = await _descriptorService.GetPoreInfo(scaffoldGroupId);

			if (!succeeded)
			{
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

	[AllowAnonymous]
	[HttpGet("data/{scaffoldGroupId}")]
	public async Task<IActionResult> GetDescriptorDataScaffoldGroup(int scaffoldGroupId, [FromQuery] List<int> descriptorTypeIds)
	{
		try
		{
			var (succeeded, errorMessage, poreInfo) = await _descriptorService.GetPoreDescriptorInfoScaffoldGroup(scaffoldGroupId, descriptorTypeIds);

			if (!succeeded)
			{
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			return Ok(new ApiResponse<PoreInfoScaffoldGroupDto>(200, "", poreInfo));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the pore info");
			return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the pore info"));
		}
	}
	
	[AllowAnonymous]
	[HttpGet("data/random")]
    public async Task<IActionResult> GetDescriptorDataRandomScaffoldGroup([FromQuery] List<int> descriptorTypeIds)
    {
		try
		{
			var randomId = await _scaffoldGroupService.GetRandomScaffoldGroupId();

			var (succeeded, errorMessage, poreInfo) = await _descriptorService.GetPoreDescriptorInfoScaffoldGroup(randomId, descriptorTypeIds);

			if (!succeeded) {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			return Ok(new ApiResponse<PoreInfoScaffoldGroupDto>(200, "", poreInfo));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the pore info");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the pore info"));
		}
    }
}