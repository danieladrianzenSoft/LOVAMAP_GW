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
public class ScaffoldGroupsController : ControllerBase
{
    private readonly ILogger<ScaffoldGroupsController> _logger;
    private readonly IScaffoldGroupService _scaffoldGroupService;
	private readonly IUserService _userService;

    public ScaffoldGroupsController(ILogger<ScaffoldGroupsController> logger, 
		IScaffoldGroupService scaffoldGroupService,
		IUserService userService)
    {
        _scaffoldGroupService = scaffoldGroupService;
		_userService = userService;
		_logger = logger;
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create(ScaffoldGroupToCreateDto scaffoldGroupToCreate)
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, scaffoldGroup) = await _scaffoldGroupService.CreateScaffoldGroup(scaffoldGroupToCreate, currentUserId);

			if (!succeeded) {
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}

			return Ok(new ApiResponse<ScaffoldGroupBaseDto>(201, "Scaffold group created", scaffoldGroup));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to create the scaffold group");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while creating the scaffold group"));
		}
    }

	[HttpPost("createBatch")]
    public async Task<IActionResult> CreateBatch(IEnumerable<ScaffoldGroupToCreateDto> scaffoldGroupsToCreate)
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, scaffoldGroups) = await _scaffoldGroupService.CreateScaffoldGroups(scaffoldGroupsToCreate, currentUserId);

			if (!succeeded) {
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}

			return Ok(new ApiResponse<IEnumerable<ScaffoldGroupBaseDto>>(201, "Scaffold groups created", scaffoldGroups));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to create the scaffold groups in batch");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while creating the scaffold groups in batch"));
		}
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDetailedScaffoldGroup(int id, int? numReplicates = null)
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();
			
			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, scaffoldGroup) = await _scaffoldGroupService.GetScaffoldGroup(id, currentUserId, numReplicates);

			if (!succeeded || scaffoldGroup == null) {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			var detailedScaffoldGroup = scaffoldGroup as ScaffoldGroupDetailedDto;

			return Ok(new ApiResponse<ScaffoldGroupDetailedDto>(200, "", detailedScaffoldGroup));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold group");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold group"));
		}
    }

	[HttpGet]
    public async Task<IActionResult> GetSummarizedScaffoldGroups([FromQuery] ScaffoldFilter filter)
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, scaffoldGroups) = await _scaffoldGroupService.GetFilteredScaffoldGroups(filter, currentUserId);

			if (!succeeded) {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			var summarizedGroups = scaffoldGroups?.OfType<ScaffoldGroupSummaryDto>();

			return Ok(new ApiResponse<IEnumerable<ScaffoldGroupSummaryDto>>(200, "", summarizedGroups));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold groups");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold grous"));
		}
    }


	[AllowAnonymous]
	[HttpGet("public")]
    public async Task<IActionResult> GetPublicSummarizedScaffoldGroups([FromQuery] ScaffoldFilter filter)
    {
		try
		{
            var (succeeded, errorMessage, adminUserId) = await _userService.GetAdminUserIdAsync();

			if (!succeeded || adminUserId == null) return StatusCode(500, new ApiResponse<string>(500, errorMessage));

			filter.UserId = null; // Ensure public access
			var (succeededQuery, errorMessageQuery, scaffoldGroups) = await _scaffoldGroupService.GetFilteredScaffoldGroups(filter, adminUserId);

			if (!succeededQuery) {
				return NotFound(new ApiResponse<string>(404, errorMessageQuery));
			}

			var summarizedGroups = scaffoldGroups?.OfType<ScaffoldGroupSummaryDto>();

			return Ok(new ApiResponse<IEnumerable<ScaffoldGroupSummaryDto>>(200, "", summarizedGroups));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold groups");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold grous"));
		}
    }


	[HttpGet("detailed")]
    public async Task<IActionResult> GeDetailedScaffoldGroups([FromQuery] ScaffoldFilter filter)
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, scaffoldGroups) = await _scaffoldGroupService.GetFilteredScaffoldGroups(filter, currentUserId, true);

			if (!succeeded) {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			var detailedGroups = scaffoldGroups?.OfType<ScaffoldGroupDetailedDto>();

			return Ok(new ApiResponse<IEnumerable<ScaffoldGroupDetailedDto>>(200, "", detailedGroups));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold groups");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold grous"));
		}
    }

}
