using Data.Models;

namespace Repositories.IRepositories
{
	public interface IContentRepository
	{
		Task<List<ContentPage>> GetPagesByArea(string area);
		Task<ContentPage?> GetPageBySlug(string slug);
		Task<ContentPage?> GetPageById(int id);
		Task<ContentSection?> GetSectionById(int sectionId);
		void AddPage(ContentPage page);
		void AddSection(ContentSection section);
		void RemoveSection(ContentSection section);
		void RemovePage(ContentPage page);
		Task<bool> SlugExists(string slug, int? excludePageId = null);
		Task<bool> SaveChangesAsync();
	}
}
