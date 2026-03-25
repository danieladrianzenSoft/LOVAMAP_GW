using Microsoft.AspNetCore.Mvc;
using Infrastructure.DTOs;
using Services.IServices;
using API.Models;
using Data.Models;
using Microsoft.AspNetCore.Authorization;
using Infrastructure.IHelpers;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class JobsController : ControllerBase
{
	private readonly ILogger<JobsController> _logger;
	private readonly ILovamapCoreJobService _jobService;
	private readonly IConfiguration _configuration;
	private readonly IUserService _userService;
	private readonly IUserAuthHelper _userAuthHelper;

	public JobsController(ILogger<JobsController> logger, ILovamapCoreJobService jobService, IConfiguration configuration, IUserService userService, IUserAuthHelper userAuthHelper)
	{
		_logger = logger;
		_jobService = jobService;
		_configuration = configuration;
		_userService = userService;
		_userAuthHelper = userAuthHelper;
	}

	[HttpPost("submit-job")]
	public async Task<IActionResult> SubmitJob([FromForm] JobSubmissionDto jobSubmission)
	{

        var currentUserId = _userService.GetCurrentUserId();

		if (!ModelState.IsValid)
		{
			return BadRequest(new ApiResponse<string>(400, "Model state not valid"));
		}

		jobSubmission.CreatorId = currentUserId;

		var (succeeded, errorMessage, job) = await _jobService.SubmitJob(jobSubmission);

		if (succeeded && job != null)
		{
			return Ok(new ApiResponse<Job>(201, "Job submitted", job));
		}

		else if (job != null)
		{
			// Lovamap Core returned an error → propagate their status and message
			// var content = await response.Content.ReadAsStringAsync();
			// return StatusCode((int)response.StatusCode, new
			// {
			// 	error = "Lovamap Core returned an error",
			// 	details = content
			// });
			return BadRequest(new ApiResponse<string>(400, $"Lovamap Error - {errorMessage}"));
		}

		return StatusCode(503, new ApiResponse<string>(503, "Lovamap Core did not respond"));
	}
	
	[Authorize]
	[HttpPut("{jobId}/upload")]
	public async Task<IActionResult> UploadResult([FromRoute] string jobId, [FromBody] JobResultUploadDto body)
	{
		// 1) Sanity check: token jobId vs route
		var tokenJobId = User.FindFirst("jobId")?.Value;
		if (string.IsNullOrEmpty(tokenJobId) || tokenJobId != jobId)
		{
			_logger.LogWarning("Upload rejected: token jobId mismatch (token:{TokenJobId}, route:{RouteJobId})", tokenJobId, jobId);
			return Forbid();
		}

		if (!Guid.TryParse(jobId, out var jobGuid))
		{
			_logger.LogWarning("UploadResult: jobId {JobId} is not a valid GUID", jobId);
			return BadRequest(new { error = "Invalid jobId" });
		}

		if (string.IsNullOrWhiteSpace(body.ResultPath))
			return BadRequest(new { error = "resultPath is required" });

		var (succeeded, errorMessage) = await _jobService.UploadJobResultAsync(
			jobGuid,
			body.ResultPath,
			body.Sha256
		);

		if (!succeeded)
		{
			_logger.LogWarning("Failed to store result path for job {JobId}: {Error}", jobId, errorMessage);
			return BadRequest(new { jobId, error = errorMessage });
		}

		_logger.LogInformation("Stored result path for job {JobId}: {Path}", jobId, body.ResultPath);

		return Ok(new { jobId, path = body.ResultPath, stored = true });
	}

	[Authorize]
	[HttpGet("{jobId}/result")]
	public async Task<IActionResult> DownloadJobResult([FromRoute] string jobId, CancellationToken ct)
	{
		if (!Guid.TryParse(jobId, out var jobGuid))
			return BadRequest(new { error = "Invalid jobId" });

		var currentUserId = _userService.GetCurrentUserId();
		if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));
		var isAdmin = await _userAuthHelper.IsInRole(currentUserId, "administrator");
		var job = await _jobService.GetByIdAsync(jobGuid);

		if (job == null)
			return NotFound(new ApiResponse<string>(404, "Job not found"));

		if (job.CreatorId != currentUserId && !isAdmin) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

		var (succeeded, errorMessage, file) =
			await _jobService.GetJobResultFileAsync(jobGuid);

		if (!succeeded)
			return NotFound(new { jobId, error = errorMessage });

		// Stream it to avoid loading into memory
		var stream = System.IO.File.OpenRead(file!.FullPath);
		return File(stream, file.ContentType, file.DownloadFileName);
	}

	[HttpGet("{jobId}")]
    public async Task<IActionResult> GetJob(Guid jobId)
    {
        var job = await _jobService.GetByIdAsync(jobId);
        if (job == null) return NotFound();

        return Ok(job);
    }

	[HttpGet("me")]
	public async Task<IActionResult> GetJobsSubmittedByUser()
	{
		try
		{
			var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var jobs = await _jobService.GetJobsByCreatorIdAsync(currentUserId);

			return Ok(new ApiResponse<IEnumerable<JobToReturnDto>>(200, "", jobs));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the user's jobs");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the user's jobs"));
		}
	}
}
