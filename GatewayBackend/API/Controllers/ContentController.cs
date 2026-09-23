using API.Models;
using Infrastructure.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.IServices;

namespace API.Controllers
{
	[ApiController]
	[Route("api/[controller]")]
	[AllowAnonymous]
	public class ContentController : ControllerBase
	{
		private readonly IContentService _contentService;
		private readonly ILogger<ContentController> _logger;

		public ContentController(IContentService contentService, ILogger<ContentController> logger)
		{
			_contentService = contentService;
			_logger = logger;
		}

		[HttpGet("pages")]
		public async Task<IActionResult> GetPages([FromQuery] string area)
		{
			var pages = await _contentService.GetPagesByArea(area);
			return Ok(new ApiResponse<List<ContentPageSummaryDto>>(200, "Success", pages));
		}

		[HttpGet("pages/{slug}")]
		public async Task<IActionResult> GetPageBySlug(string slug)
		{
			var page = await _contentService.GetPageBySlug(slug);
			if (page == null)
				return NotFound(new ApiResponse<string>(404, "Page not found"));
			return Ok(new ApiResponse<ContentPageDetailDto>(200, "Success", page));
		}

		[Authorize(Roles = "administrator")]
		[HttpPost("pages")]
		public async Task<IActionResult> CreatePage(ContentPageToCreateDto dto)
		{
			var (succeeded, errorMessage, page) = await _contentService.CreatePage(dto);
			if (!succeeded)
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			return Ok(new ApiResponse<ContentPageDetailDto>(201, "Page created", page));
		}

		[Authorize(Roles = "administrator")]
		[HttpPut("pages/{id}")]
		public async Task<IActionResult> UpdatePage(int id, ContentPageToUpdateDto dto)
		{
			var (succeeded, errorMessage, page) = await _contentService.UpdatePage(id, dto);
			if (!succeeded)
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			return Ok(new ApiResponse<ContentPageDetailDto>(200, "Page updated", page));
		}

		[Authorize(Roles = "administrator")]
		[HttpDelete("pages/{id}")]
		public async Task<IActionResult> DeletePage(int id)
		{
			var (succeeded, errorMessage) = await _contentService.DeletePage(id);
			if (!succeeded)
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			return Ok(new ApiResponse<string>(200, "Page deleted"));
		}

		[Authorize(Roles = "administrator")]
		[HttpPost("pages/{pageId}/sections")]
		public async Task<IActionResult> AddSection(int pageId, ContentSectionToCreateDto dto)
		{
			var (succeeded, errorMessage, section) = await _contentService.AddSection(pageId, dto);
			if (!succeeded)
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			return Ok(new ApiResponse<ContentSectionDto>(201, "Section added", section));
		}

		[Authorize(Roles = "administrator")]
		[HttpPut("sections/{sectionId}")]
		public async Task<IActionResult> UpdateSection(int sectionId, ContentSectionToUpdateDto dto)
		{
			var (succeeded, errorMessage, section) = await _contentService.UpdateSection(sectionId, dto);
			if (!succeeded)
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			return Ok(new ApiResponse<ContentSectionDto>(200, "Section updated", section));
		}

		[Authorize(Roles = "administrator")]
		[HttpDelete("sections/{sectionId}")]
		public async Task<IActionResult> DeleteSection(int sectionId)
		{
			var (succeeded, errorMessage) = await _contentService.DeleteSection(sectionId);
			if (!succeeded)
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			return Ok(new ApiResponse<string>(200, "Section deleted"));
		}

		[Authorize(Roles = "administrator")]
		[HttpPut("pages/reorder")]
		public async Task<IActionResult> ReorderPages([FromQuery] string area, ReorderPagesDto dto)
		{
			var (succeeded, errorMessage) = await _contentService.ReorderPages(area, dto);
			if (!succeeded)
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			return Ok(new ApiResponse<string>(200, "Pages reordered"));
		}

		[Authorize(Roles = "administrator")]
		[HttpPut("pages/{pageId}/sections/reorder")]
		public async Task<IActionResult> ReorderSections(int pageId, ReorderSectionsDto dto)
		{
			var (succeeded, errorMessage) = await _contentService.ReorderSections(pageId, dto);
			if (!succeeded)
				return BadRequest(new ApiResponse<string>(400, errorMessage));
			return Ok(new ApiResponse<string>(200, "Sections reordered"));
		}
	}
}
