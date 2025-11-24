using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Services.IServices;
using API.Models;
using Data.Models;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;
using System.Text;
using System.Net.Http.Headers;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DomainsController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;
    private readonly IDomainService _domainService;
	private readonly IUserService _userService;

    public DomainsController(ILogger<AuthController> logger, IDomainService domainService, IUserService userService)
    {
        _logger = logger;
        _domainService = domainService;
		_userService = userService;
    }

	[HttpPost("create")]
    public async Task<IActionResult> Create([FromForm] DomainToCreateDto domainToCreate)
    {
        try
		{
			var (succeeded, errorMessage, domain) = await _domainService.CreateDomain(domainToCreate);

			if (!succeeded) {
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}

			return Ok(new ApiResponse<DomainToVisualizeDto>(201, "Domain created", domain));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to create the domain");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while creating the domain"));
		}
    }

	[AllowAnonymous]
	[HttpGet("visualize/{scaffoldId:int}")]
    public async Task<IActionResult> Visualize(int scaffoldId, [FromQuery] DomainCategory? category = null)
    {
        try
		{
			if (scaffoldId == -1)
			{
				var randomId = await _domainService.GetRandomScaffoldIdForDomainAsync();
				if (randomId == null)
					return NotFound(new ApiResponse<string>(404, "No domains with mesh found."));

				scaffoldId = randomId.Value;
			}

			var resolvedCategory = category ?? DomainCategory.Particles;

			var (succeeded, errorMessage, mesh, domainMetadata) = await _domainService.GetDomain(scaffoldId, resolvedCategory);

			if (!succeeded && (mesh == null || domainMetadata == null))  {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}
			if (!succeeded) {
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}

			// Set metadata in HTTP headers for frontend to extract
			Response.Headers.Append("X-Domain-Id", domainMetadata?.Id.ToString());
			Response.Headers.Append("X-Scaffold-Id", domainMetadata?.ScaffoldId.ToString());
			Response.Headers.Append("X-Category", domainMetadata?.Category.ToString());
			Response.Headers.Append("X-Voxel-Count", domainMetadata?.VoxelCount.ToString());
			Response.Headers.Append("X-Voxel-Size", domainMetadata?.VoxelSize.ToString());
			Response.Headers.Append("X-Domain-Size", domainMetadata?.DomainSize);
			// Response.Headers.Append("X-Mesh-FilePath", domainMetadata?.MeshFilePath);
			Response.Headers.Append("X-Original-Filename", domainMetadata?.OriginalFileName);

			// Stream the `.glb` file for immediate rendering
			return File(mesh!, "model/gltf-binary", domainMetadata?.MeshFilePath);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the domain");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the domain"));
		}
    }

	[AllowAnonymous]
	[HttpGet("{domainId:int}/metadata")]
	public async Task<IActionResult> GetDomainMetadata(int domainId)
	{
		try
		{
			var (succeeded, errorMessage, domainMetadata) = await _domainService.GetDomainMetadata(domainId);

			if (!succeeded || domainMetadata == null) {
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}

			var json = domainMetadata.RootElement;

			return Ok(new ApiResponse<JsonElement>(200, "", json));

		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the domain metadata");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the domain metadata"));
		}
	}

	[HttpPost("{domainId:int}/metadata")]
    public async Task<IActionResult> UpdateDomainMetadata([FromForm] DomainMetadataToUpdateDto dto)
    {
        try
		{
			var (succeeded, errorMessage) = await _domainService.UpdateDomainMetadata(dto);

			if (!succeeded) {
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}

			return Ok(new ApiResponse<string>(200, "Metadata updated"));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to update the domain metadata");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while updating the domain metadata"));
		}
    }

	[HttpDelete("{domainId:int}")]
    public async Task<IActionResult> DeleteDomain(int domainId)
    {
        try
		{
			var currentUserId = _userService.GetCurrentUserId();
			
			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage) = await _domainService.DeleteDomain(domainId, currentUserId);

			if (!succeeded) {
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}

			return Ok(new ApiResponse<string>(201, "Domain deleted"));
			
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the domain");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the domain"));
		}
    }
}