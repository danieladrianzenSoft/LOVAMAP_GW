using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.IServices;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "administrator")]
public class DebugController : ControllerBase
{
	private readonly ILogger<JobsController> _logger;
	private readonly ILovamapCoreJobService _jobService;
	private readonly IConfiguration _configuration;
	private readonly IUserService _userService;

	public DebugController(ILogger<JobsController> logger,
		ILovamapCoreJobService jobService,
		IConfiguration configuration,
		IUserService userService)
	{
		_logger = logger;
		_jobService = jobService;
		_configuration = configuration;
		_userService = userService;
	}

	/// <summary>
	/// Fetch a job result directly from lovamap_core by jobId and return raw JSON.
	/// DEV/ADMIN ONLY – meant for recovery / debugging.
	/// </summary>
	[HttpGet("jobs/{jobId}/core-result")]
	public async Task<IActionResult> GetJobResultFromCore(string jobId, CancellationToken cancellationToken)
	{
		// 1) Ask the service to pull the raw result bytes from lovamap_core
		var (succeeded, errorMessage, resultBytes) =
			await _jobService.FetchRawResultFromCoreAsync(jobId, cancellationToken);

		if (!succeeded || resultBytes == null || resultBytes.Length == 0)
		{
			var msg = errorMessage ?? "Failed to retrieve job result from lovamap_core.";
			_logger.LogWarning("Debug GetJobResultFromCore failed for {JobId}: {Message}", jobId, msg);

			return StatusCode(500, new ApiResponse<string>(500, msg));
		}

		// 2) Return raw bytes as JSON (core now sends JSON directly)
		return File(resultBytes, "application/json");
	}

}
