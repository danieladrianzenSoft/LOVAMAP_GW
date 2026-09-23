using Infrastructure.DTOs;

namespace Services.IServices
{
	public interface IContentService
	{
		Task<List<ContentPageSummaryDto>> GetPagesByArea(string area);
		Task<ContentPageDetailDto?> GetPageBySlug(string slug);
		Task<(bool Succeeded, string ErrorMessage, ContentPageDetailDto? Page)> CreatePage(ContentPageToCreateDto dto);
		Task<(bool Succeeded, string ErrorMessage, ContentPageDetailDto? Page)> UpdatePage(int id, ContentPageToUpdateDto dto);
		Task<(bool Succeeded, string ErrorMessage)> DeletePage(int id);
		Task<(bool Succeeded, string ErrorMessage, ContentSectionDto? Section)> AddSection(int pageId, ContentSectionToCreateDto dto);
		Task<(bool Succeeded, string ErrorMessage, ContentSectionDto? Section)> UpdateSection(int sectionId, ContentSectionToUpdateDto dto);
		Task<(bool Succeeded, string ErrorMessage)> DeleteSection(int sectionId);
		Task<(bool Succeeded, string ErrorMessage)> ReorderSections(int pageId, ReorderSectionsDto dto);
		Task<(bool Succeeded, string ErrorMessage)> ReorderPages(string area, ReorderPagesDto dto);
	}
}
