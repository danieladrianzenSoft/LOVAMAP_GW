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
using System.Security.Cryptography;
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
	public async Task<IActionResult> UploadResult([FromRoute] string jobId, CancellationToken cancellationToken)
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

		// var resultsDir = _configuration["OutputPaths:JobResults"]
        //          ?? Environment.GetEnvironmentVariable("JOB_RESULTS_PATH")
        //          ?? "Data/JobResults";
		var resultsDir = _jobService.GetJobResultsDir();

		Directory.CreateDirectory(resultsDir);

		// Temp path: extension is just .tmp because we don't yet know the format
		var tmpPath = Path.Combine(resultsDir, $"{jobId}.{Guid.NewGuid():N}.tmp");

		string? computedHex = null;

		try
		{
			const int bufferSize = 80 * 1024; // 80 KB
			var buffer = new byte[bufferSize];

			using var incrementalHash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);

			await using (var fs = System.IO.File.Create(tmpPath))
			{
				var requestStream = Request.Body;

				while (true)
				{
					var read = await requestStream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken);
					if (read == 0) break;

					await fs.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
					incrementalHash.AppendData(buffer, 0, read);
				}

				await fs.FlushAsync(cancellationToken);
			}

			// Compute hash
			var computedBytes = incrementalHash.GetHashAndReset();
			computedHex = Convert.ToHexString(computedBytes).ToLowerInvariant();

			// Optional Digest header verification
			if (Request.Headers.TryGetValue("Digest", out var digestHeader))
			{
				var provided = digestHeader.ToString()
					.Replace("sha256=", "", StringComparison.OrdinalIgnoreCase)
					.Replace("sha-256=", "", StringComparison.OrdinalIgnoreCase)
					.Trim()
					.ToLowerInvariant();

				if (!string.Equals(provided, computedHex, StringComparison.OrdinalIgnoreCase))
				{
					_logger.LogWarning("Digest mismatch for job {JobId}: provided={Provided}, computed={Computed}",
						jobId, provided, computedHex);

					System.IO.File.Delete(tmpPath);
					return BadRequest(new { error = "Digest mismatch", provided, computed = computedHex });
				}
			}

			// Delegate format detection + conversion + job update to the service
			var contentType = Request.ContentType; // may be null
			var (succeeded, errorMessage, finalPath) = await _jobService.UploadJobResultAsync(
				jobGuid,
				tmpPath,
				computedHex,
				contentType,
				cancellationToken
			);

			if (!succeeded)
			{
				_logger.LogWarning("Processing uploaded result failed for job {JobId}: {Error}", jobId, errorMessage);
				return BadRequest(new { jobId, error = errorMessage });
			}

			_logger.LogInformation("Stored result for job {JobId} at {Path} (sha256={Digest})",
				jobId, finalPath, computedHex);

			return Ok(new { jobId, path = finalPath, sha256 = computedHex, stored = true });
		}
		catch (OperationCanceledException)
		{
			_logger.LogWarning("Upload cancelled for {JobId}", jobId);
			if (System.IO.File.Exists(tmpPath)) System.IO.File.Delete(tmpPath);
			return StatusCode(499); // client closed request
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to store result for job {JobId}", jobId);
			if (System.IO.File.Exists(tmpPath)) System.IO.File.Delete(tmpPath);
			return StatusCode(500, "Failed to store result");
		}
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
