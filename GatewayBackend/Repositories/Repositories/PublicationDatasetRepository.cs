using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Repositories.IRepositories;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Runtime.Intrinsics.Arm;

namespace Repositories.Repositories
{
	public class PublicationDatasetRepository : IPublicationDatasetRepository
	{
		private readonly DataContext _context;

		public PublicationDatasetRepository(DataContext context)
		{
			_context = context;
		}

		public void Add(PublicationDataset publicationDataset)
		{
			_context.PublicationDatasets.Add(publicationDataset);
		}

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}

		public async Task<bool> PublicationDatasetNameExistsAsync(int publicationId, string name)
		{
			return await _context.PublicationDatasets.AsNoTracking()
				.AnyAsync(d => d.PublicationId == publicationId && d.Name == name);
		}

		public async Task AddPublicationDatasetScaffolds(int datasetId, IEnumerable<int> scaffoldIds)
		{
			var rows = scaffoldIds.Distinct()
				.Select(sid => new PublicationDatasetScaffold
				{
					PublicationDatasetId = datasetId,
					ScaffoldId = sid
				});
			await _context.PublicationDatasetScaffolds.AddRangeAsync(rows);
		}

		public async Task AddPublicationDatasetDescriptorRules(int datasetId, IEnumerable<PublicationDatasetDescriptorRule> rules)
		{
			var incoming = rules
				.GroupBy(r => r.DescriptorTypeId)
				.Select(g => g.Last()) // last wins if duplicates provided
				.ToList();

			if (incoming.Count == 0) return;

			// Replace semantics in two statements:
			await _context.PublicationDatasetDescriptorRules
				.Where(x => x.PublicationDatasetId == datasetId)
				.ExecuteDeleteAsync(); // wipes old rules for this dataset

			await _context.PublicationDatasetDescriptorRules
				.AddRangeAsync(incoming); // insert fresh set
		}

		public async Task<PublicationDatasetDto?> GetPublicationDatasetByIdAsync(int datasetId)
		{
			var ds = await _context.PublicationDatasets
			.AsNoTracking()
			.Where(d => d.Id == datasetId)
			.Select(d => new PublicationDatasetDto
			{
				Id = d.Id,
				PublicationId = d.PublicationId,
				Name = d.Name,
				CreatedAt = d.CreatedAt,
				ScaffoldIds = d.PublicationDatasetScaffolds.Select(s => s.ScaffoldId).ToList(),
				DescriptorRules = d.PublicationDatasetDescriptorRules.Select(r => new PublicationDatasetDescriptorRuleDto
				{
					PublicationDatasetId = r.PublicationDatasetId,
					DescriptorTypeId = r.DescriptorTypeId,
					JobMode = r.JobMode,
					JobId = r.JobId
				}).ToList()
			})
			.FirstOrDefaultAsync();

			return ds;
		}
	}
}