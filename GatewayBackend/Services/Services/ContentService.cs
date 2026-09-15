using Data.Models;
using Infrastructure.DTOs;
using Microsoft.Extensions.Logging;
using Repositories.IRepositories;
using Services.IServices;

namespace Services.Services
{
	public class ContentService : IContentService
	{
		private readonly IContentRepository _repo;
		private readonly ILogger<ContentService> _logger;

		public ContentService(IContentRepository repo, ILogger<ContentService> logger)
		{
			_repo = repo;
			_logger = logger;
		}

		public async Task<List<ContentPageSummaryDto>> GetPagesByArea(string area)
		{
			var pages = await _repo.GetPagesByArea(area);
			return pages.Select(MapToSummary).ToList();
		}

		public async Task<ContentPageDetailDto?> GetPageBySlug(string slug)
		{
			var page = await _repo.GetPageBySlug(slug);
			return page == null ? null : MapToDetail(page);
		}

		public async Task<(bool Succeeded, string ErrorMessage, ContentPageDetailDto? Page)> CreatePage(ContentPageToCreateDto dto)
		{
			try
			{
				if (await _repo.SlugExists(dto.Slug))
					return (false, "A page with this slug already exists.", null);

				var page = new ContentPage
				{
					Slug = dto.Slug,
					Title = dto.Title,
					Area = dto.Area,
					Description = dto.Description,
					ComingSoon = dto.ComingSoon,
					SortOrder = dto.SortOrder,
					Sections = dto.Sections.Select((s, i) => new ContentSection
					{
						Title = s.Title,
						Body = s.Body,
						SortOrder = s.SortOrder > 0 ? s.SortOrder : i
					}).ToList()
				};

				_repo.AddPage(page);
				await _repo.SaveChangesAsync();

				return (true, "", MapToDetail(page));
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to create content page");
				return (false, "UnexpectedError", null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage, ContentPageDetailDto? Page)> UpdatePage(int id, ContentPageToUpdateDto dto)
		{
			try
			{
				var page = await _repo.GetPageById(id);
				if (page == null) return (false, "Page not found.", null);

				if (dto.Title != null) page.Title = dto.Title;
				if (dto.Description != null) page.Description = dto.Description;
				if (dto.ComingSoon.HasValue) page.ComingSoon = dto.ComingSoon.Value;
				if (dto.SortOrder.HasValue) page.SortOrder = dto.SortOrder.Value;
				page.UpdatedAt = DateTime.UtcNow;

				await _repo.SaveChangesAsync();
				return (true, "", MapToDetail(page));
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to update content page {Id}", id);
				return (false, "UnexpectedError", null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage)> DeletePage(int id)
		{
			try
			{
				var page = await _repo.GetPageById(id);
				if (page == null) return (false, "Page not found.");

				_repo.RemovePage(page);
				await _repo.SaveChangesAsync();
				return (true, "");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to delete content page {Id}", id);
				return (false, "UnexpectedError");
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage, ContentSectionDto? Section)> AddSection(int pageId, ContentSectionToCreateDto dto)
		{
			try
			{
				var page = await _repo.GetPageById(pageId);
				if (page == null) return (false, "Page not found.", null);

				var section = new ContentSection
				{
					ContentPageId = pageId,
					Title = dto.Title,
					Body = dto.Body,
					SortOrder = dto.SortOrder
				};

				_repo.AddSection(section);
				await _repo.SaveChangesAsync();
				return (true, "", MapSectionDto(section));
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to add section to page {PageId}", pageId);
				return (false, "UnexpectedError", null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage, ContentSectionDto? Section)> UpdateSection(int sectionId, ContentSectionToUpdateDto dto)
		{
			try
			{
				var section = await _repo.GetSectionById(sectionId);
				if (section == null) return (false, "Section not found.", null);

				if (dto.Title != null) section.Title = dto.Title;
				if (dto.Body != null) section.Body = dto.Body;
				if (dto.SortOrder.HasValue) section.SortOrder = dto.SortOrder.Value;
				section.UpdatedAt = DateTime.UtcNow;

				await _repo.SaveChangesAsync();
				return (true, "", MapSectionDto(section));
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to update section {SectionId}", sectionId);
				return (false, "UnexpectedError", null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage)> DeleteSection(int sectionId)
		{
			try
			{
				var section = await _repo.GetSectionById(sectionId);
				if (section == null) return (false, "Section not found.");

				_repo.RemoveSection(section);
				await _repo.SaveChangesAsync();
				return (true, "");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to delete section {SectionId}", sectionId);
				return (false, "UnexpectedError");
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage)> ReorderSections(int pageId, ReorderSectionsDto dto)
		{
			try
			{
				var page = await _repo.GetPageById(pageId);
				if (page == null) return (false, "Page not found.");

				for (int i = 0; i < dto.SectionIds.Count; i++)
				{
					var section = page.Sections.FirstOrDefault(s => s.Id == dto.SectionIds[i]);
					if (section != null)
					{
						section.SortOrder = i;
						section.UpdatedAt = DateTime.UtcNow;
					}
				}

				await _repo.SaveChangesAsync();
				return (true, "");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to reorder sections for page {PageId}", pageId);
				return (false, "UnexpectedError");
			}
		}

		private static ContentPageSummaryDto MapToSummary(ContentPage page) => new()
		{
			Id = page.Id,
			Slug = page.Slug,
			Title = page.Title,
			Area = page.Area,
			Description = page.Description,
			ComingSoon = page.ComingSoon,
			SortOrder = page.SortOrder
		};

		private static ContentPageDetailDto MapToDetail(ContentPage page) => new()
		{
			Id = page.Id,
			Slug = page.Slug,
			Title = page.Title,
			Area = page.Area,
			Description = page.Description,
			ComingSoon = page.ComingSoon,
			SortOrder = page.SortOrder,
			Sections = page.Sections
				.OrderBy(s => s.SortOrder)
				.Select(MapSectionDto)
				.ToList()
		};

		private static ContentSectionDto MapSectionDto(ContentSection s) => new()
		{
			Id = s.Id,
			Title = s.Title,
			Body = s.Body,
			SortOrder = s.SortOrder
		};
	}
}
