using System.Text;
using API.Extensions;
using API.Models;
using Infrastructure.DTOs;
using Infrastructure.Helpers;
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
	private readonly IJobAdminStatsService _jobAdminStatsService;
	private readonly ILogger<AdminController> _logger;

	public AdminController(IDomainService domainService, IJobAdminStatsService jobAdminStatsService, ILogger<AdminController> logger)
	{
		_domainService = domainService;
		_jobAdminStatsService = jobAdminStatsService;
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

	[HttpGet("domains/original-filenames")]
	public async Task<IActionResult> GetAllOriginalFileNames()
	{
		var entries = await _domainService.GetAllOriginalFileNamesAsync();
		var content = string.Join("\n", entries.Select(e => $"{e.Category}, {e.FileName}"));
		var bytes = Encoding.UTF8.GetBytes(content);
		return File(bytes, "text/plain", "mesh-original-filenames.txt");
	}

	[HttpGet("job-stats")]
	public async Task<ActionResult<ApiResponse<JobAdminStatsDto>>> GetJobStats(
		[FromQuery] DateTime? from,
		[FromQuery] DateTime? to)
	{
		var toDate = to.HasValue ? DateTime.SpecifyKind(to.Value, DateTimeKind.Utc) : DateTime.UtcNow;
		var fromDate = from.HasValue ? DateTime.SpecifyKind(from.Value, DateTimeKind.Utc) : toDate.AddMonths(-12);

		var stats = await _jobAdminStatsService.GetJobAdminStatsAsync(fromDate, toDate);
		return Ok(new ApiResponse<JobAdminStatsDto>(200, "Job stats retrieved", stats));
	}

	[HttpGet("user-failure-rankings")]
	public async Task<IActionResult> GetUserFailureRankings(
		[FromQuery] DateTime? from,
		[FromQuery] DateTime? to,
		[FromQuery] PagingParams pagingParams)
	{
		var toDate = to.HasValue ? DateTime.SpecifyKind(to.Value, DateTimeKind.Utc) : DateTime.UtcNow;
		var fromDate = from.HasValue ? DateTime.SpecifyKind(from.Value, DateTimeKind.Utc) : toDate.AddMonths(-12);

		var result = await _jobAdminStatsService.GetUserFailureRankingsAsync(fromDate, toDate, pagingParams);
		Response.AddPaginationHeader(new Pagination
		{
			CurrentPage = result.CurrentPage,
			ItemsPerPage = result.PageSize,
			TotalItems = result.TotalCount,
			TotalPages = result.TotalPages
		});
		return Ok(new ApiResponse<IEnumerable<UserFailureRankingDto>>(200, "", result));
	}
}
