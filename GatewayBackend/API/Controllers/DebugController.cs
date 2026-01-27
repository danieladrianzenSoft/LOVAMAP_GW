using API.Models;
using Infrastructure.IHelpers;
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
	private readonly IDescriptorProtobufCodec _descriptorProtobufCodec;

	public DebugController(ILogger<JobsController> logger, 
		ILovamapCoreJobService jobService, 
		IDescriptorProtobufCodec descriptorProtobufCodec, 
		IConfiguration configuration, 
		IUserService userService)
	{
		_logger = logger;
		_jobService = jobService;
		_descriptorProtobufCodec = descriptorProtobufCodec;
		_configuration = configuration;
		_userService = userService;
	}

	/// <summary>
    /// Upload a protobuf-compressed descriptor file and get the decoded JSON back.
    /// DEV/ADMIN ONLY.
    /// </summary>
	/// 
    [HttpPost("protobufDecode")]
		public async Task<IActionResult> Decode([FromForm] IFormFile file, [FromQuery] bool compact = true)
	{
		if (file == null || file.Length == 0)
			return BadRequest(new ApiResponse<string>(400, "File is required"));

		byte[] bytes;
		await using (var ms = new MemoryStream())
		{
			await file.CopyToAsync(ms);
			bytes = ms.ToArray();
		}

		string json;
		try
		{
			json = _descriptorProtobufCodec.ProtobufToJson(bytes, compact: compact);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to decode protobuf in DebugController.Decode");

			return BadRequest(new ApiResponse<string>(
				400,
				"Failed to decode as descriptor protobuf.",
				ex.Message
			));
		}

		return Content(json, "application/json");
	}

	/// <summary>
	/// Fetch a job result directly from lovamap_core by jobId, decode protobuf, and return JSON.
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

		// 2) Decode protobuf → JSON
		string json;
		try
		{
			json = _descriptorProtobufCodec.ProtobufToJson(resultBytes, compact: true);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to decode protobuf result from core for job {JobId}", jobId);

			return BadRequest(new ApiResponse<string>(
				400,
				"Fetched result from core but failed to decode as descriptor protobuf.",
				ex.Message
			));
		}

		// 3) Return JSON as ApiResponse<string> for now
		return Content(json, "application/json");

		// return Ok(new ApiResponse<string>(
		// 	200,
		// 	"Successfully fetched and decoded result from lovamap_core",
		// 	json
		// ));
	}

}