using API.Models;
using Infrastructure.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.IServices;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "administrator")]
public class AdminController : ControllerBase
{
	private readonly IDomainService _domainService;
	private readonly ILogger<AdminController> _logger;

	public AdminController(IDomainService domainService, ILogger<AdminController> logger)
	{
		_domainService = domainService;
		_logger = logger;
	}

	[HttpPost("domains/batch-replace")]
	public async Task<ActionResult<ApiResponse<BatchReplaceResultDto>>> BatchReplaceMeshFiles(
		[FromBody] BatchReplaceRequestDto request)
	{
		_logger.LogInformation("BatchReplaceMeshFiles called with SourcePath={SourcePath}, DryRun={DryRun}",
			request.SourcePath, request.DryRun);

		var (succeeded, errorMessage, result) = await _domainService.BatchReplaceMeshFiles(request);

		if (!succeeded)
		{
			return BadRequest(new ApiResponse<BatchReplaceResultDto>(400, errorMessage));
		}

		return Ok(new ApiResponse<BatchReplaceResultDto>(200, "Batch replace completed", result));
	}
}
