using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Repositories.IRepositories;
using Data;
using Data.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Data.SqlTypes;
using Infrastructure.DTOs;
using System.Runtime.CompilerServices;
using Npgsql;

namespace Repositories.Repositories
{
	public class ScaffoldGroupRepository : IScaffoldGroupRepository
	{
		private readonly DataContext _context;

		public ScaffoldGroupRepository(DataContext context)
		{
			_context = context;
		}

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(ScaffoldGroup scaffoldGroup)
		{
			_context.ScaffoldGroups.Add(scaffoldGroup);
		}

		public async Task<ScaffoldGroup?> Get(int id)
		{
			return await _context.ScaffoldGroups
				.Where(sg => sg.Id == id)
				.Include(sg => sg.InputGroup)
					.ThenInclude (ig => ig != null ? ig.ParticlePropertyGroups : null)
				.Include(sg => sg.Scaffolds)
					.ThenInclude(s => s.ScaffoldTags)
						.ThenInclude(st => st.Tag)
				.FirstOrDefaultAsync();
		}

		public async Task<ICollection<ScaffoldGroup>?> GetFilteredScaffoldGroupsByRelevance(ScaffoldFilter filter, string currentUserId)
		{
			var query = _context.ScaffoldGroups.AsQueryable();

			// Filter by uploader based on visibility and user context
			if (!string.IsNullOrEmpty(filter.UserId))
			{
				query = filter.UserId == currentUserId
					? query.Where(sg => sg.UploaderId == filter.UserId)
					: query.Where(sg => sg.UploaderId == filter.UserId && sg.IsPublic);
			}
			else
			{
				query = query.Where(sg => sg.UploaderId == currentUserId || sg.IsPublic);
			}

			// Apply particle size filter if it exists
			if (filter.ParticleSizes?.Count > 0)
			{
				var ranges = filter.ParticleSizes.Select(ps => new { Lower = ps - 5, Upper = ps + 9 }).ToList();
				var inputGroupIds = new HashSet<int>();

				foreach (var range in ranges)
				{
					var idsForCurrentRange = await _context.ParticlePropertyGroups
						.Where(ppg => ppg.MeanSize > range.Lower && ppg.MeanSize < range.Upper)
						.Select(ppg => ppg.InputGroupId)
						.ToListAsync();

					if (inputGroupIds.Count == 0)
					{
						inputGroupIds.UnionWith(idsForCurrentRange);
					}
					else
					{
						inputGroupIds.IntersectWith(idsForCurrentRange);
					}
				}

				query = query.Where(sg => sg.InputGroup != null && inputGroupIds.Contains(sg.InputGroup.Id));
			}

			// Apply tag filters if they exist
			if (filter.TagIds?.Count > 0 || filter.Tags?.Count > 0)
			{
				var tagIds = filter.TagIds ?? new List<int>();
				var tagNames = filter.Tags ?? new List<string>();
				query = query.Select(sg => new
				{
					ScaffoldGroup = sg,
					MatchingTagsCount = sg.Scaffolds
						.SelectMany(s => s.ScaffoldTags)
						.Where(st => tagIds.Contains(st.TagId) || tagNames.Contains(st.Tag.Name))
						.Select(st => st.TagId)
						.Distinct()
						.Count(),
				})
				.Where(sg => sg.MatchingTagsCount > 0) // Ensure groups without matching tags are filtered out
				.OrderByDescending(sg => sg.MatchingTagsCount) // Primary sort by tag relevance
				.Select(sg => sg.ScaffoldGroup); // Extract ScaffoldGroup from the projection
			}

			var scaffoldGroups = await query
				.AsNoTracking()
				.AsSplitQuery()
				.Include(sg => sg.InputGroup)
					.ThenInclude(ig => ig != null ? ig.ParticlePropertyGroups : null)
				.Include(sg => sg.Scaffolds)
					.ThenInclude(s => s.ScaffoldTags)
						.ThenInclude(st => st.Tag)
				.ToListAsync();

			return scaffoldGroups;

			//////////////////
			
			// var query = _context.ScaffoldGroups.AsQueryable();

			// // Filter by uploader based on visibility and user context
			// if (!string.IsNullOrEmpty(filter.UserId))
			// {
			// 	query = filter.UserId == currentUserId
			// 		? query.Where(sg => sg.UploaderId == filter.UserId)
			// 		: query.Where(sg => sg.UploaderId == filter.UserId && sg.IsPublic);
			// }
			// else
			// {
			// 	query = query.Where(sg => sg.UploaderId == currentUserId || sg.IsPublic);
			// }

			// // Separate query for particle size filtering
			// List<int> matchingInputGroupIds = new List<int>();
			// if (filter.ParticleSizes?.Count > 0)
			// {
			// 	var ranges = filter.ParticleSizes.Select(ps => new { Lower = ps - 5, Upper = ps + 9 }).ToList();
			// 	var particleQuery = _context.ParticlePropertyGroups.AsQueryable();

			// 	foreach (var range in ranges)
			// 	{
			// 		particleQuery = particleQuery.Where(ppg => ppg.MeanSize > range.Lower && ppg.MeanSize < range.Upper);
			// 	}

			// 	matchingInputGroupIds = await particleQuery.Select(ppg => ppg.InputGroupId).Distinct().ToListAsync();
			// }

			// // Apply combined filters if they exist
			// if (filter.ParticleSizes?.Count > 0 || filter.TagIds?.Count > 0 || filter.Tags?.Count > 0)
			// {
			// 	var tagIds = filter.TagIds ?? new List<int>();
			// 	var tagNames = filter.Tags ?? new List<string>();

			// 	query = query.Select(sg => new
			// 	{
			// 		ScaffoldGroup = sg,
			// 		MatchingParticleCount = sg.InputGroup != null && matchingInputGroupIds.Contains(sg.InputGroup.Id)
			// 			? sg.InputGroup.ParticlePropertyGroups.Count(ppg => matchingInputGroupIds.Contains(ppg.InputGroupId))
			// 			: 0,
			// 		MatchingTagsCount = sg.Scaffolds
			// 			.SelectMany(s => s.ScaffoldTags)
			// 			.Where(st => tagIds.Contains(st.TagId) || tagNames.Contains(st.Tag.Name))
			// 			.Select(st => st.TagId)
			// 			.Distinct()
			// 			.Count(),
			// 	})
			// 	.Where(sg => sg.MatchingParticleCount > 0 || sg.MatchingTagsCount > 0)
			// 	.OrderByDescending(sg => sg.MatchingParticleCount)
			// 	.ThenByDescending(sg => sg.MatchingTagsCount)
			// 	.Select(sg => sg.ScaffoldGroup);
			// }

			// var scaffoldGroups = await query
			// 	.AsNoTracking()
			// 	.AsSplitQuery()
			// 	.Include(sg => sg.InputGroup)
			// 		.ThenInclude(ig => ig != null ? ig.ParticlePropertyGroups : null)
			// 	.Include(sg => sg.Scaffolds)
			// 		.ThenInclude(s => s.ScaffoldTags)
			// 			.ThenInclude(st => st.Tag)
			// 	.ToListAsync();

			// return scaffoldGroups;
		}

		public async Task<ICollection<ScaffoldGroup>?> GetFilteredScaffoldGroups(ScaffoldFilter filter, string currentUserId)
		{
			var query = _context.ScaffoldGroups.AsQueryable();

			// Filter by uploader based on visibility and user context
			if (!string.IsNullOrEmpty(filter.UserId))
			{
				query = filter.UserId == currentUserId
					? query.Where(sg => sg.UploaderId == filter.UserId)
					: query.Where(sg => sg.UploaderId == filter.UserId && sg.IsPublic);
			}
			else
			{
				query = query.Where(sg => sg.UploaderId == currentUserId || sg.IsPublic);
			}

			// Handling tags filtering
			if (filter.TagIds?.Count > 0 || filter.Tags?.Count > 0)
			{
				var tagIds = filter.TagIds ?? new List<int>();
				var tagNames = filter.Tags ?? new List<string>();

				// Filter ScaffoldGroups by those whose Scaffolds have all specified Tags exclusively
				query = query.Where(sg => sg.Scaffolds
					.Any(s => s.ScaffoldTags
						.Where(st => (st.IsAutoGenerated && !st.IsPrivate) || (sg.UploaderId == currentUserId))
						.Count(st => tagIds.Contains(st.TagId) || tagNames.Contains(st.Tag.Name)) == tagIds.Count + tagNames.Count));
			}

			var scaffoldGroups = await query
				.Include(sg => sg.InputGroup)
					.ThenInclude (ig => ig != null ? ig.ParticlePropertyGroups : null)
				.Include(sg => sg.Scaffolds)
					.ThenInclude(s => s.ScaffoldTags)
						.ThenInclude(st => st.Tag)
				.ToListAsync();

			return scaffoldGroups;
		}
	}
}


