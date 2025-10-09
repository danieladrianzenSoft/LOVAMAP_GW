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

	public JobsController(ILogger<JobsController> logger, ILovamapCoreJobService jobService, IConfiguration configuration, IUserService userService)
	{
		_logger = logger;
		_jobService = jobService;
		_configuration = configuration;
		_userService = userService;
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
			return BadRequest(new ApiResponse<string>(400, $"Lovamp Error - {errorMessage}"));
		}

		return StatusCode(503, new ApiResponse<string>(503, "Lovamap Core did not respond"));
	}
	
	[Authorize]
	[HttpPut("{jobId}/upload")]
	public async Task<IActionResult> UploadResult([FromRoute] string jobId, CancellationToken cancellationToken)
	{
		// 1) Quick sanity check: token jobId vs route (simple, required)
		var tokenJobId = User.FindFirst("jobId")?.Value;
		if (string.IsNullOrEmpty(tokenJobId) || tokenJobId != jobId)
		{
			_logger.LogWarning("Upload rejected: token jobId does not match route (token:{TokenJobId}, route:{RouteJobId})", tokenJobId, jobId);
			return Forbid();
		}

		var resultsDir = _configuration["RESULTS_PATH"] ?? Path.Combine(AppContext.BaseDirectory, "results");
		Directory.CreateDirectory(resultsDir);

		// Temporary file (unique)
		var tmpPath = Path.Combine(resultsDir, $"{jobId}.{Guid.NewGuid():N}.json.tmp");
		var finalPath = Path.Combine(resultsDir, $"{jobId}.json");

		try
		{
			// 2) Stream request body to tmp file while incrementally hashing (no full buffering)
			const int bufferSize = 80 * 1024; // 80 KB
			var buffer = new byte[bufferSize];

			// Use IncrementalHash to compute SHA256 on the fly
			using var incrementalHash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);

			await using (var fs = System.IO.File.Create(tmpPath))
			{
				var requestStream = Request.Body;

				while (true)
				{
					var read = await requestStream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken);
					if (read == 0) break;

					// write chunk to file
					await fs.WriteAsync(buffer.AsMemory(0, read), cancellationToken);

					// update hash with same bytes
					incrementalHash.AppendData(buffer, 0, read);
				}

				await fs.FlushAsync(cancellationToken);
			}

			// Get computed digest hex
			var computedBytes = incrementalHash.GetHashAndReset();
			var computedHex = Convert.ToHexString(computedBytes).ToLowerInvariant();

			// 3) Optional: verify Digest header if the client provided one
			if (Request.Headers.TryGetValue("Digest", out var digestHeader))
			{
				// Accept forms like "sha256=<hex>" or just "<hex>"
				var provided = digestHeader.ToString()
					.Replace("sha256=", "", StringComparison.OrdinalIgnoreCase)
					.Replace("sha-256=", "", StringComparison.OrdinalIgnoreCase)
					.Trim()
					.ToLowerInvariant();

				if (!string.Equals(provided, computedHex, StringComparison.OrdinalIgnoreCase))
				{
					_logger.LogWarning("Digest mismatch for job {JobId}: provided={Provided}, computed={Computed}", jobId, provided, computedHex);
					System.IO.File.Delete(tmpPath);
					return BadRequest(new { error = "Digest mismatch", provided, computed = computedHex });
				}
			}

			// 4) Rename temp -> final (atomic move on most OS)
			if (System.IO.File.Exists(finalPath)) System.IO.File.Delete(finalPath);
			System.IO.File.Move(tmpPath, finalPath);

			// 5) Return success with verification info so you can inspect
			_logger.LogInformation("Stored result for job {JobId} at {Path} (sha256={Digest})", jobId, finalPath, computedHex);
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

}
