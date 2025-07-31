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

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(Publication publication)
		{
			_context.Publications.Add(publication);
		}

		public async Task<List<PublicationSummaryDto>> GetAllPublicationSummariesAsync()
		{
			return await _context.Publications
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