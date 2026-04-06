using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Repositories.IRepositories;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Repositories.Repositories
{
	public class PublicationRepository : IPublicationRepository
	{
		private readonly DataContext _context;

		public PublicationRepository(DataContext context)
		{
			_context = context;
		}

		public async Task<bool> DeleteAsync(int publicationId)
		{
			var publication = await _context.Publications.FindAsync(publicationId);
			if (publication == null) return false;
			_context.Publications.Remove(publication);
			await _context.SaveChangesAsync();
			return true;
		}

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(Publication publication)
		{
			_context.Publications.Add(publication);
		}

		public async Task<PublicationSummaryDto?> GetPublicationSummaryByIdAsync(int publicationId)
		{
			return await _context.Publications.AsNoTracking()
				.Where(p => p.Id == publicationId)
				.Select(pub => new PublicationSummaryDto
					{
						Id = pub.Id,
						Title = pub.Title,
						Authors = pub.Authors,
						Journal = pub.Journal,
						Doi = pub.Doi,
						PublishedAt = pub.PublishedAt,
						ScaffoldGroupIds = pub.ScaffoldGroupPublications
							.Select(sgp => sgp.ScaffoldGroupId)
							.ToList(),
						DescriptorTypeIds = pub.DescriptorTypes
							.Select(dt => dt.Id)
							.ToList(),
						Citation = pub.Citation
					})
				.FirstOrDefaultAsync();
		}

		public async Task<bool> ExistsAsync(int publicationId)
		{
			return await _context.Publications.AsNoTracking().AnyAsync(p => p.Id == publicationId);
		}

		public async Task<List<PublicationSummaryDto>> GetPublicationSummariesAsync(PublicationFilter filter)
		{
			var publications = _context.Publications.AsQueryable();
			
			if (!string.IsNullOrEmpty(filter.UserId))
			{
				publications = publications.Where(p => p.UploaderId == filter.UserId);
			}
			if (!string.IsNullOrEmpty(filter.Search))
			{
				publications = publications.Where(p => p.Title.Contains(filter.Search) ||
													  p.Authors.Contains(filter.Search) ||
													  p.Journal.Contains(filter.Search) ||
													  p.Doi.Contains(filter.Search));
			}

			return await publications.OrderByDescending(p => p.PublishedAt)
				.Select(pub => new PublicationSummaryDto
				{
					Id = pub.Id,
					Title = pub.Title,
					Authors = pub.Authors,
					Journal = pub.Journal,
					Doi = pub.Doi,
					PublishedAt = pub.PublishedAt,
					ScaffoldGroupIds = pub.ScaffoldGroupPublications
						.Select(sgp => sgp.ScaffoldGroupId)
						.ToList(),
					DescriptorTypeIds = pub.DescriptorTypes
						.Select(dt => dt.Id)
						.ToList()
				})
				.ToListAsync();
		}


	}
}