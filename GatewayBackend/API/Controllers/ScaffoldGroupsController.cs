using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

using Infrastructure.DTOs;
using Services.IServices;
using API.Models;
using Infrastructure;
using Data.Models;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ScaffoldGroupsController : ControllerBase
{
    private readonly ILogger<ScaffoldGroupsController> _logger;
    private readonly IScaffoldGroupService _scaffoldGroupService;
	private readonly IImageService _imageService;
	private readonly IAISearchService _aiSearchService;
	private readonly IUserService _userService;

    public ScaffoldGroupsController(ILogger<ScaffoldGroupsController> logger, 
		IScaffoldGroupService scaffoldGroupService, IImageService imageService,
		IAISearchService aiSearchService, IUserService userService)
    {
        _scaffoldGroupService = scaffoldGroupService;
		_aiSearchService = aiSearchService;
		_userService = userService;
		_imageService = imageService;
		_logger = logger;
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create(ScaffoldGroupToCreateDto scaffoldGroupToCreate)
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, scaffoldGroup) = await _scaffoldGroupService.CreateScaffoldGroup(scaffoldGroupToCreate, currentUserId);

			if (!succeeded) {
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}

			return Ok(new ApiResponse<ScaffoldGroupBaseDto>(201, "Scaffold group created", scaffoldGroup));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to create the scaffold group");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while creating the scaffold group"));
		}
    }

	[HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage) = await _scaffoldGroupService.DeleteScaffoldGroup(id, currentUserId);

			if (!succeeded) {
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}

			return Ok(new ApiResponse<string>(200, "Scaffold group deleted"));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to delete the scaffold group");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while deleting the scaffold group"));
		}
    }

	[HttpPost("createBatch")]
    public async Task<IActionResult> CreateBatch(IEnumerable<ScaffoldGroupToCreateDto> scaffoldGroupsToCreate)
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, scaffoldGroups) = await _scaffoldGroupService.CreateScaffoldGroups(scaffoldGroupsToCreate, currentUserId);

			if (!succeeded) {
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			}

			return Ok(new ApiResponse<IEnumerable<ScaffoldGroupBaseDto>>(201, "Scaffold groups created", scaffoldGroups?.OrderByDescending(sg => sg.CreatedAt)));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to create the scaffold groups in batch");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while creating the scaffold groups in batch"));
		}
    }

	[AllowAnonymous]
	[HttpGet("{id}/summary")]
    public async Task<IActionResult> GetSummarizedScaffoldGroup(int id)
    {
		try
		{
			var (succeeded, errorMessage, scaffoldGroup) = await _scaffoldGroupService.GetScaffoldGroupSummary(id, "0");

			if (!succeeded) {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			return Ok(new ApiResponse<ScaffoldGroupSummaryDto>(200, "", scaffoldGroup));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold groups");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold grous"));
		}
    }

	[AllowAnonymous]
	[HttpGet("scaffold/{scaffoldId}/summary")]
    public async Task<IActionResult> GetSummarizedScaffoldGroupByScaffoldId(int scaffoldId)
    {
		try
		{
			var (succeeded, errorMessage, scaffoldGroup) = await _scaffoldGroupService.GetScaffoldGroupSummaryByScaffoldId(scaffoldId, "0");

			if (!succeeded) {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			return Ok(new ApiResponse<ScaffoldGroupSummaryDto>(200, "", scaffoldGroup));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold groups");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold grous"));
		}
    }


    [HttpGet("{id}")]
    public async Task<IActionResult> GetDetailedScaffoldGroup(int id, int? numReplicates = null)
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();
			
			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, scaffoldGroup) = await _scaffoldGroupService.GetScaffoldGroup(id, currentUserId, numReplicates);

			if (!succeeded || scaffoldGroup == null) {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			var detailedScaffoldGroup = scaffoldGroup as ScaffoldGroupDetailedDto;

			return Ok(new ApiResponse<ScaffoldGroupDetailedDto>(200, "", detailedScaffoldGroup));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold group");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold group"));
		}
    }

	[HttpGet]
    public async Task<IActionResult> GetSummarizedScaffoldGroups([FromQuery] ScaffoldFilter filter)
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, scaffoldGroups) = await _scaffoldGroupService.GetFilteredScaffoldGroups(filter, currentUserId);

			if (!succeeded) {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			var summarizedGroups = scaffoldGroups?.OfType<ScaffoldGroupSummaryDto>();

			return Ok(new ApiResponse<IEnumerable<ScaffoldGroupSummaryDto>>(200, "", summarizedGroups));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold groups");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold grous"));
		}
    }

	[AllowAnonymous]
	[HttpPost("search")]
	public async Task<IActionResult> GetSummarizedScaffoldGroupsBySmartSearch([FromBody]AISearchRequest searchRequest)
	{
		try
		{
			var userId = _userService.GetCurrentUserId();

			if (userId == null) {
				var (succeededAdminUser, errorMessageAdminUser, adminUserId) = await _userService.GetAdminUserIdAsync();
				if (!succeededAdminUser || adminUserId == null) return StatusCode(500, new ApiResponse<string>(500, errorMessageAdminUser));

				userId = adminUserId;
			}

			var (success, errorMessage, searchResult) = await _aiSearchService.RunSearchScaffoldGroupPipeline(searchRequest.Prompt, userId);

			if (!success || searchResult == null) return BadRequest(new ApiResponse<string>(400, errorMessage));

			return Ok(new ApiResponse<AIScaffoldSearchResponse>(200, "", searchResult));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to search the scaffold groups");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while searching the scaffold grous"));
		}
	}

	[AllowAnonymous]
	[HttpGet("public")]
    public async Task<IActionResult> GetPublicSummarizedScaffoldGroups([FromQuery] ScaffoldFilter filter)
    {
		try
		{
            var (succeeded, errorMessage, adminUserId) = await _userService.GetAdminUserIdAsync();

			if (!succeeded || adminUserId == null) return StatusCode(500, new ApiResponse<string>(500, errorMessage));

			filter.UserId = null; // Ensure public access
			var (succeededQuery, errorMessageQuery, scaffoldGroups) = await _scaffoldGroupService.GetFilteredScaffoldGroups(filter, adminUserId);

			if (!succeededQuery) {
				return NotFound(new ApiResponse<string>(404, errorMessageQuery));
			}

			var summarizedGroups = scaffoldGroups?.OfType<ScaffoldGroupSummaryDto>();

			return Ok(new ApiResponse<IEnumerable<ScaffoldGroupSummaryDto>>(200, "", summarizedGroups));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold groups");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold grous"));
		}
    }


	[HttpGet("detailed")]
    public async Task<IActionResult> GeDetailedScaffoldGroups([FromQuery] ScaffoldFilter filter)
    {
		try
		{
            var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, scaffoldGroups) = await _scaffoldGroupService.GetFilteredScaffoldGroups(filter, currentUserId, true);

			if (!succeeded) {
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			var detailedGroups = scaffoldGroups?.OfType<ScaffoldGroupDetailedDto>();

			return Ok(new ApiResponse<IEnumerable<ScaffoldGroupDetailedDto>>(200, "", detailedGroups));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold groups");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold groups"));
		}
    }

	[AllowAnonymous]
	[HttpGet("data/{scaffoldGroupId}")]
	public async Task<IActionResult> GetDataForVisualization(int scaffoldGroupId, [FromQuery] List<int> descriptorTypeIds)
	{
		try
		{
			var currentUserId = _userService.GetCurrentUserId();

			var (succeeded, errorMessage, data) = await _scaffoldGroupService.GetDataForVisualization(scaffoldGroupId, currentUserId, descriptorTypeIds);

			if (!succeeded)
			{
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

			return Ok(new ApiResponse<ScaffoldGroupDataDto>(200, "", data));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold group data");
			return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold group data"));
		}
	}
	
	[AllowAnonymous]
	[HttpGet("data/random")]
    public async Task<IActionResult> GetDataForVisualizationRandomScaffoldGroup([FromQuery] List<int> descriptorTypeIds)
    {
		try
		{
			var currentUserId = _userService.GetCurrentUserId();

			var randomId = await _scaffoldGroupService.GetRandomScaffoldGroupId();

			var (succeeded, errorMessage, data) = await _scaffoldGroupService.GetDataForVisualization(randomId, currentUserId, descriptorTypeIds);

			if (!succeeded)
			{
				return NotFound(new ApiResponse<string>(404, errorMessage));
			}

		return Ok(new ApiResponse<ScaffoldGroupDataDto>(200, "", data));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get the scaffold group data");
			return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting the scaffold group data"));
		}
    }

	[HttpPost("{scaffoldGroupId}/images")]
	public async Task<IActionResult> UploadImageForScaffoldGroup(int scaffoldGroupId, [FromForm] ImageForCreationDto imageToUpload)
	{
		try
		{
			var currentUserId = _userService.GetCurrentUserId();

			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, image) = await _imageService.UploadImage(imageToUpload, currentUserId);

			if (!succeeded) {
				return BadRequest(new ApiResponse <string>(400, errorMessage));
			}

			return Ok(new ApiResponse<ImageToShowDto>(200, "", image));
		}
		catch (Exception ex)
		{
			
			_logger.LogError(ex, "Failed to upload the scaffold group image");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while uploading the image"));
		}
	}

	[HttpPut("{scaffoldGroupId}/images/{imageId}")]
	public async Task<IActionResult> UpdateScaffoldGroupImage(int scaffoldGroupId, [FromBody] ImageToUpdateDto imageToUpdate)
	{
		try
		{
			var currentUserId = _userService.GetCurrentUserId();
			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage, scaffoldGroup) = await _scaffoldGroupService.UpdateScaffoldGroupImage(currentUserId, scaffoldGroupId, imageToUpdate);

			if (!succeeded && errorMessage == "Unauthorized") return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			if (!succeeded) return NotFound(new ApiResponse<string>(404, errorMessage));

			return Ok(new ApiResponse<ScaffoldGroupSummaryDto>(200, "", scaffoldGroup));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to upload the scaffold group image");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred while uploading the image"));
		}
	}

	[HttpDelete("{scaffoldGroupId}/images/{imageId}")]
	public async Task<IActionResult> DeleteScaffoldGroupImage(int scaffoldGroupId, int imageId)
	{
		try
		{
			var currentUserId = _userService.GetCurrentUserId();
			if (currentUserId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var (succeeded, errorMessage) = await _imageService.DeleteImage(imageId, currentUserId);

			if (!succeeded && errorMessage == "Unauthorized") return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			if (!succeeded && errorMessage == "Not_Found") return NotFound(new ApiResponse<string>(404, "The image was not found"));
			if (!succeeded) return BadRequest(new ApiResponse<string>(400, "Unknown error"));

			return Ok(new ApiResponse<bool>(200, "", succeeded));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to delete the scaffold group image");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred deleting the image"));
		}
	}

	[Authorize(Roles = "administrator")]
	[HttpGet("images/missing-thumbnails")]
	public async Task<IActionResult> GetScaffoldsWithMissingThumbnails([FromQuery] ImageCategory? category = null)
	{
		try
		{
			var scaffolds = await _scaffoldGroupService.GetScaffoldsMissingThumbnailsByCategory(category ?? ImageCategory.Particles);

			return Ok(new ApiResponse<List<ScaffoldMissingThumbnailInfoDto>>(200, "", scaffolds));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to get scaffolds with missing thumbnails");
        	return StatusCode(500, new ApiResponse<string>(500, "An error occurred deleting the image"));
		}
	}

	[Authorize(Roles = "administrator")]
	[HttpGet("images/ids-for-deletion")]
	public async Task<IActionResult> GetImageIdsForDeletion([FromQuery] string? category = null, [FromQuery] bool includeThumbnails = false)
	{
		try
		{
			var userId = _userService.GetCurrentUserId();
			if (userId == null) return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			ImageCategory? parsedCategory = null;
			if (!string.IsNullOrWhiteSpace(category))
			{
				if (!Enum.TryParse<ImageCategory>(category, true, out var tempCategory))
					return BadRequest(new ApiResponse<string>(400, "Invalid category"));
				parsedCategory = tempCategory;
			}

			var imageIds = await _imageService.GetImageIdsForDeletion(parsedCategory, includeThumbnails);

			return Ok(new ApiResponse<List<int>>(200, "Images Id's obtained successfully", imageIds));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Error getting image Ids");
			return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting image Ids"));
		}
	}


	[Authorize(Roles = "administrator")]
	[HttpPost("images/batch-delete")]
	public async Task<IActionResult> BatchDeleteImages([FromBody] ImagesToDeleteDto imagesToDelete)
	{
		try
		{
			var userId = _userService.GetCurrentUserId();
			if (userId == null)
				return Unauthorized(new ApiResponse<string>(401, "Unauthorized"));

			var isAdmin = await _userService.IsAdmin(userId);

			if (imagesToDelete.ImageIds == null || !imagesToDelete.ImageIds.Any())
				return BadRequest(new ApiResponse<string>(400, "No image IDs provided"));

			var (success, operationResult) = await _imageService.DeleteImages(imagesToDelete.ImageIds, userId, isAdmin);

			if (!success)
				return BadRequest(new ApiResponse<BatchOperationResult>(400, "Failed to delete images", operationResult));

			return Ok(new ApiResponse<BatchOperationResult>(
				200,
				operationResult.SucceededIds.Count > 0
					? "Images deleted successfully"
					: "Request was processed, but no images were deleted",
				operationResult
			));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Error deleting images");
			return StatusCode(500, new ApiResponse<string>(500, "An error occurred while deleting images"));
		}
	}

	[Authorize(Roles = "administrator")]
	[HttpGet("ids")]
	public async Task<IActionResult> GetAllIds()
	{
		try
		{
			var ids = await _scaffoldGroupService.GetAllIds();
			return Ok(new ApiResponse<List<int>>(200, "Scaffold Group Id's obtained successfully", ids));

		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Error getting scaffold group Id's");
			return StatusCode(500, new ApiResponse<string>(500, "An error occurred while getting scaffold group Id's"));
		}
	}


	[Authorize(Roles = "administrator")]
	[HttpPost("reset-names")]
	public async Task<IActionResult> ResetScaffoldGroupTitles([FromBody] ScaffoldGroupsToResetDto scaffoldGroupsToReset)
	{
		try
		{
			var (success, errorMessage, operationResult) = await _scaffoldGroupService.ResetNamesAndComments(scaffoldGroupsToReset.ScaffoldGroupIds);

			if (!success || operationResult == null)
				return BadRequest(new ApiResponse<BatchOperationResult>(400, errorMessage, operationResult));
			
			return Ok(new ApiResponse<BatchOperationResult>(
				200,
				operationResult.SucceededIds.Count > 0
					? "Scaffold group names & titles reset successfully"
					: "Request was processed, but no scaffold groups were reset",
				operationResult
			));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Error resetting titles");
			return StatusCode(500, new ApiResponse<string>(500, "An error occurred while resetting scaffold group titles"));
		}
	}
}
