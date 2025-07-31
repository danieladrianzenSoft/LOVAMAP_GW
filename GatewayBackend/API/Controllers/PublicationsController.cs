using API.Models;
using Infrastructure.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.IServices;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PublicationsController : ControllerBase
{
	private readonly ILogger<PublicationsController> _logger;
	private readonly IPublicationService _publicationService;

	public PublicationsController(ILogger<PublicationsController> logger, IPublicationService publicationService)
	{
		_logger = logger;
		_publicationService = publicationService;
	}

	[AllowAnonymous]
	[HttpGet]
	public async Task<IActionResult> GetAllPublications()
	{
		try
		{
			var (succeeded, errorMessage, publications) = await _publicationService.GetAllPublicationSummaries();

			if (!succeeded)
			{
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}
			return Ok(new ApiResponse<IEnumerable<PublicationSummaryDto>>(200, "", publications));

		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get publications");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the publications"));
		}
	}
}