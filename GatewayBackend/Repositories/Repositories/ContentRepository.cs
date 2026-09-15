using Data;
using Data.Models;
using Microsoft.EntityFrameworkCore;
using Repositories.IRepositories;

namespace Repositories.Repositories
{
	public class ContentRepository : IContentRepository
	{
		private readonly DataContext _context;

		public ContentRepository(DataContext context)
		{
			_context = context;
		}

		public async Task<List<ContentPage>> GetPagesByArea(string area)
		{
			return await _context.ContentPages
				.AsNoTracking()
				.Where(p => p.Area == area)
				.OrderBy(p => p.SortOrder)
				.ToListAsync();
		}

		public async Task<ContentPage?> GetPageBySlug(string slug)
		{
			return await _context.ContentPages
				.AsNoTracking()
				.Include(p => p.Sections.OrderBy(s => s.SortOrder))
				.FirstOrDefaultAsync(p => p.Slug == slug);
		}

		public async Task<ContentPage?> GetPageById(int id)
		{
			return await _context.ContentPages
				.Include(p => p.Sections.OrderBy(s => s.SortOrder))
				.FirstOrDefaultAsync(p => p.Id == id);
		}

		public async Task<ContentSection?> GetSectionById(int sectionId)
		{
			return await _context.ContentSections
				.FirstOrDefaultAsync(s => s.Id == sectionId);
		}

		public void AddPage(ContentPage page)
		{
			_context.ContentPages.Add(page);
		}

		public void AddSection(ContentSection section)
		{
			_context.ContentSections.Add(section);
		}

		public void RemoveSection(ContentSection section)
		{
			_context.ContentSections.Remove(section);
		}

		public void RemovePage(ContentPage page)
		{
			_context.ContentPages.Remove(page);
		}

		public async Task<bool> SlugExists(string slug, int? excludePageId = null)
		{
			return await _context.ContentPages
				.AnyAsync(p => p.Slug == slug && (excludePageId == null || p.Id != excludePageId));
		}

		public async Task<bool> SaveChangesAsync()
		{
			return await _context.SaveChangesAsync() > 0;
		}
	}
}
