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

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResourcesController : ControllerBase
{
    private readonly ILogger<ResourcesController> _logger;
	private readonly ITagService _tagService;

    public ResourcesController(ITagService tagService, ILogger<ResourcesController> logger)
    {
		_tagService = tagService;
		_logger = logger;
    }

	[HttpGet("tags")]
    public async Task<IActionResult> GetTags()
    {
        try
        {
			var tags = await _tagService.GetAutogeneratedTags();
            return Ok(new ApiResponse<ICollection<TagForFilterDto>>(200, "Tags obtained successfully", tags));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get tags for scaffold group filters");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting tags"));
        }
    }
}