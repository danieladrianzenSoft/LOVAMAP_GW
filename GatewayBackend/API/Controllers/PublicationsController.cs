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
	private readonly IPublicationDatasetService _datasetService;


	public PublicationsController(ILogger<PublicationsController> logger,
		IPublicationService publicationService, IPublicationDatasetService datasetService)
	{
		_logger = logger;
		_datasetService = datasetService;
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

	[AllowAnonymous]
	[HttpGet("{publicationId:int}")]
	public async Task<IActionResult> GetPublication(int publicationId)
	{
		try
		{
			var (succeeded, errorMessage, publication) = await _publicationService.GetPublicationSummaryByIdAsync(publicationId);

			if (publication == null) return NotFound(new ApiResponse<string>(404, $"Publication {publicationId} not found"));

			if (!succeeded)
			{
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}
			return Ok(new ApiResponse<PublicationSummaryDto>(200, "", publication));

		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get publications");
			return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the publications"));
		}
	}


	[HttpPost("{publicationId:int}/datasets")]
	public async Task<IActionResult> CreatePublicationDataset(
		int publicationId,
		[FromBody] PublicationDatasetForCreationDto dto)
	{
		if (dto is null) return BadRequest("Body required.");
		if (publicationId != dto.PublicationId)
			return BadRequest("Path publicationId does not match body PublicationId.");

		var (succeeded, errorMessage, result) = await _datasetService.CreatePublicationDatasetAsync(dto);

		if (!succeeded)
			return BadRequest(new ApiResponse<string>(400, errorMessage));

		return Ok(new ApiResponse<PublicationDatasetDto>(201, "Publication dataset created", result));
	}

	[HttpGet("datasets/{datasetId:int}")]
	public async Task<ActionResult<PublicationDatasetDto>> GetPublicationDatasetById(int datasetId)
	{
		var (succeeded, errorMessage, result) = await _datasetService.GetPublicationDatasetByIdAsync(datasetId);

		if (!succeeded)
			return BadRequest(new ApiResponse<string>(400, errorMessage));

		return Ok(new ApiResponse<PublicationDatasetDto>(201, null, result));
	}

	// ---------- Optional v1.1: replace helpers ----------

    // PUT /api/publications/datasets/{datasetId}/scaffolds (replace semantics)
    // [HttpPut("datasets/{datasetId:int}/scaffolds")]
    // public async Task<ActionResult> ReplaceDatasetScaffolds(int datasetId, [FromBody] int[] scaffoldIds)
    // {
    //     var datasetExists = await _context.PublicationDatasets.AnyAsync(d => d.Id == datasetId);
    //     if (!datasetExists) return NotFound($"Dataset {datasetId} not found.");

    //     // Replace semantics
    //     await _context.PublicationDatasetScaffolds
    //         .Where(x => x.PublicationDatasetId == datasetId)
    //         .ExecuteDeleteAsync();

    //     if (scaffoldIds?.Length > 0)
    //     {
    //         var distinct = scaffoldIds.Distinct().ToArray();
    //         var rows = distinct.Select(id => new PublicationDatasetScaffold
    //         {
    //             PublicationDatasetId = datasetId,
    //             ScaffoldId = id
    //         });
    //         await _context.PublicationDatasetScaffolds.AddRangeAsync(rows);
    //     }

    //     await _context.SaveChangesAsync();
    //     return NoContent();
    // }

    // // PUT /api/publications/datasets/{datasetId}/rules (your replace semantics)
    // [HttpPut("datasets/{datasetId:int}/rules")]
    // public async Task<ActionResult> ReplaceDatasetRules(int datasetId, [FromBody] List<PublicationDatasetDescriptorRuleDto> rules)
    // {
    //     var dto = new PublicationDatasetForCreationDto
    //     {
    //         PublicationId = await _context.PublicationDatasets
    //             .Where(d => d.Id == datasetId)
    //             .Select(d => d.PublicationId)
    //             .FirstOrDefaultAsync(),
    //         Name = "__unused__", // service ignores Name on replace call below
    //         DescriptorRules = rules ?? []
    //     };

    //     if (dto.PublicationId == 0) return NotFound($"Dataset {datasetId} not found.");

    //     // Reuse your repository method via a tiny helper service method if you prefer,
    //     // or inline like you already do. Keeping it concise here:
    //     await _context.PublicationDatasetDescriptorRules
    //         .Where(x => x.PublicationDatasetId == datasetId)
    //         .ExecuteDeleteAsync();

    //     if (rules?.Count > 0)
    //     {
    //         var incoming = rules
    //             .GroupBy(r => r.DescriptorTypeId)
    //             .Select(g =>
    //                 new PublicationDatasetDescriptorRule
    //                 {
    //                     PublicationDatasetId = datasetId,
    //                     DescriptorTypeId = g.Last().DescriptorTypeId,
    //                     JobMode = g.Last().JobMode,
    //                     JobId = g.Last().JobId
    //                 });

    //         await _context.PublicationDatasetDescriptorRules.AddRangeAsync(incoming);
    //     }

    //     await _context.SaveChangesAsync();
    //     return NoContent();
    // }
}