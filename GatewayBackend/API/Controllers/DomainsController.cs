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

    public DomainsController(ILogger<AuthController> logger, IDomainService domainService)
    {
        _logger = logger;
        _domainService = domainService;
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
	[HttpGet("{scaffoldId}")]
    public async Task<IActionResult> Visualize(int scaffoldId)
    {
        try
		{
			var (succeeded, errorMessage, mesh, domainMetadata) = await _domainService.GetDomain(scaffoldId);

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
			Response.Headers.Append("X-Mesh-FilePath", domainMetadata?.MeshFilePath);

			// Stream the `.glb` file for immediate rendering
			return File(mesh!, "model/gltf-binary", domainMetadata?.MeshFilePath);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the domain");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the domain"));
		}
    }
}