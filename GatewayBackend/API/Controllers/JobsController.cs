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
public class JobsController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;
    private readonly ILovamapCoreJobService _jobService;

    public JobsController(ILogger<AuthController> logger, ILovamapCoreJobService jobService)
    {
        _logger = logger;
        _jobService = jobService;
    }

	[HttpPost("submit-job")]
	public async Task<IActionResult> SubmitJob([FromForm] JobSubmissionDto jobSubmission)
	{

		if (!ModelState.IsValid)
		{
			return BadRequest(new ApiResponse<string>(400, "Model state not valid"));
		}

		// var (succeeded, errorMessage, response) = await _jobService.SubmitJob(
		// 	jobSubmission.CsvFile, 
		// 	jobSubmission.DatFile, 
		// 	jobSubmission.JobId, 
		// 	jobSubmission.Dx
		// );

		// if (succeeded && response != null)
		// {
		// 	var content = await response.Content.ReadAsStringAsync();
		// 	return Ok(new ApiResponse<string>(201, "Job submitted", content));
		// }

		var (succeeded, errorMessage, job) = await _jobService.SubmitJob(
			jobSubmission.CsvFile, 
			jobSubmission.DatFile, 
			jobSubmission.JobId, 
			jobSubmission.Dx
		);

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
}
