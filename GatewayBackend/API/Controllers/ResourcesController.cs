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
    private readonly IDescriptorService _descriptorService;

    public ResourcesController(ITagService tagService, IDescriptorService descriptorService, ILogger<ResourcesController> logger)
    {
		_tagService = tagService;
        _descriptorService = descriptorService;
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

    [HttpGet("descriptorTypes")]
    public async Task<IActionResult> GetDescriptors()
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
}