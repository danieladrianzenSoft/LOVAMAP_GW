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
using System.Linq.Expressions;
using Microsoft.Extensions.Logging;

namespace Repositories.Repositories
{
	public class ScaffoldGroupRepository : IScaffoldGroupRepository
	{
		private readonly DataContext _context;
		private readonly ILogger<ScaffoldGroupRepository> _logger;

		public ScaffoldGroupRepository(DataContext context, ILogger<ScaffoldGroupRepository> logger)
		{
			_context = context;
			_logger = logger;
		}

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(ScaffoldGroup scaffoldGroup)
		{
			_context.ScaffoldGroups.Add(scaffoldGroup);
		}

		public void Delete(ScaffoldGroup scaffoldGroup)
		{
			_context.ScaffoldGroups.Remove(scaffoldGroup);
		}

		public async Task<ScaffoldGroup?> Get(int id)
		{
			return await _context.ScaffoldGroups
					.Where(sg => sg.Id == id)
					.Include(sg => sg.InputGroup)
						.ThenInclude(ig => ig.ParticlePropertyGroups)
					.Include(sg => sg.Scaffolds)
						.ThenInclude(s => s.ScaffoldTags)
							.ThenInclude(st => st.Tag)
					.Include(sg => sg.Scaffolds)
						.ThenInclude(s => s.Domains)
					.Include(sg => sg.Scaffolds)
						.ThenInclude(s => s.Images)
					.Include(sg => sg.Images)
					.FirstOrDefaultAsync();		
		}

		public async Task<ScaffoldGroupSummaryDto?> GetSummary(int id)
		{
			var query = from sg in _context.ScaffoldGroups
						join ig in _context.InputGroups on sg.Id equals ig.ScaffoldGroupId into igJoin
						from ig in igJoin.DefaultIfEmpty()
						where sg.Id == id
						select new { ScaffoldGroup = sg, InputGroup = ig };

			var result = await query.FirstOrDefaultAsync();
			if (result == null) return null;

			var scaffoldGroup = result.ScaffoldGroup;
			scaffoldGroup.InputGroup = result.InputGroup;

			// Get the number of scaffolds for this ScaffoldGroup
			var numReplicates = await _context.Scaffolds
				.Where(s => s.ScaffoldGroupId == id)
				.CountAsync();

			// Fetch particle properties for the InputGroup
			var particleProperties = await _context.ParticlePropertyGroups
				.Where(pp => pp.InputGroupId == scaffoldGroup.InputGroup.Id)
				.Select(pp => new ParticlePropertyBaseDto
				{
					Shape = pp.Shape,
					Stiffness = pp.Stiffness,
					Dispersity = pp.Dispersity,
					SizeDistributionType = pp.SizeDistributionType,
					MeanSize = pp.MeanSize,
					StandardDeviationSize = pp.StandardDeviationSize,
					Proportion = pp.Proportion
				}).ToListAsync();

			var scaffoldIds = await _context.Scaffolds
				.Where(s => s.ScaffoldGroupId == scaffoldGroup.Id) // Only fetch IDs for relevant groups
				.Select (s => s.Id)
				.ToListAsync();

			var scaffoldIdsWithDomainsLookup = await (
				from s in _context.Scaffolds
				join d in _context.Domains on s.Id equals d.ScaffoldId
				where scaffoldIds.Contains(s.Id)
				select s.Id
			).Distinct().ToListAsync();

			return new ScaffoldGroupSummaryDto
			{
				Id = scaffoldGroup.Id,
				Name = scaffoldGroup.Name,
				CreatedAt = scaffoldGroup.CreatedAt,
				IsSimulated = scaffoldGroup.IsSimulated,
				Comments = scaffoldGroup.Comments,
				UploaderId = scaffoldGroup.UploaderId,
				IsPublic = scaffoldGroup.IsPublic,
				NumReplicates = numReplicates,
				Inputs = scaffoldGroup.InputGroup != null
					? new InputGroupBaseDto
					{
						ContainerShape = scaffoldGroup.InputGroup.ContainerShape,
						ContainerSize = scaffoldGroup.InputGroup.ContainerSize,
						PackingConfiguration = scaffoldGroup.InputGroup.PackingConfiguration.ToString(),
						Particles = particleProperties
					}
					: new InputGroupBaseDto(),
				ScaffoldIds = scaffoldIds,
				ScaffoldIdsWithDomains = scaffoldIdsWithDomainsLookup
			};	
		}

		public async Task<ScaffoldGroupSummaryDto?> GetSummaryByScaffoldId(int scaffoldId)
		{
			var query = from sg in _context.ScaffoldGroups
						join s in _context.Scaffolds on sg.Id equals s.ScaffoldGroupId
						join ig in _context.InputGroups on sg.Id equals ig.ScaffoldGroupId into igJoin
						from ig in igJoin.DefaultIfEmpty()
						where s.Id == scaffoldId
						select new { ScaffoldGroup = sg, InputGroup = ig };

			var result = await query.FirstOrDefaultAsync();
			if (result == null) return null;

			var scaffoldGroup = result.ScaffoldGroup;
			scaffoldGroup.InputGroup = result.InputGroup;

			// Get the number of scaffolds for this ScaffoldGroup
			var numReplicates = await _context.Scaffolds
				.Where(s => s.ScaffoldGroupId == scaffoldGroup.Id)
				.CountAsync();

			// Fetch particle properties for the InputGroup
			var particleProperties = await _context.ParticlePropertyGroups
				.Where(pp => pp.InputGroupId == scaffoldGroup.InputGroup.Id)
				.Select(pp => new ParticlePropertyBaseDto
				{
					Shape = pp.Shape,
					Stiffness = pp.Stiffness,
					Dispersity = pp.Dispersity,
					SizeDistributionType = pp.SizeDistributionType,
					MeanSize = pp.MeanSize,
					StandardDeviationSize = pp.StandardDeviationSize,
					Proportion = pp.Proportion
				}).ToListAsync();

			var scaffoldIds = await _context.Scaffolds
				.Where(s => s.ScaffoldGroupId == scaffoldGroup.Id) // Only fetch IDs for relevant groups
				.Select (s => s.Id)
				.ToListAsync();

			var scaffoldIdsWithDomainsLookup = await (
				from s in _context.Scaffolds
				join d in _context.Domains on s.Id equals d.ScaffoldId
				where scaffoldIds.Contains(s.Id)
				select s.Id
			).Distinct().ToListAsync();

			return new ScaffoldGroupSummaryDto
			{
				Id = scaffoldGroup.Id,
				Name = scaffoldGroup.Name,
				CreatedAt = scaffoldGroup.CreatedAt,
				IsSimulated = scaffoldGroup.IsSimulated,
				Comments = scaffoldGroup.Comments,
				UploaderId = scaffoldGroup.UploaderId,
				IsPublic = scaffoldGroup.IsPublic,
				NumReplicates = numReplicates,
				Inputs = scaffoldGroup.InputGroup != null
					? new InputGroupBaseDto
					{
						ContainerShape = scaffoldGroup.InputGroup.ContainerShape,
						ContainerSize = scaffoldGroup.InputGroup.ContainerSize,
						PackingConfiguration = scaffoldGroup.InputGroup.PackingConfiguration.ToString(),
						Particles = particleProperties
					}
					: new InputGroupBaseDto(),
				ScaffoldIds = scaffoldIds,
				ScaffoldIdsWithDomains = scaffoldIdsWithDomainsLookup
			};	
		}

		public async Task<ICollection<Image>> GetScaffoldGroupImages(int scaffoldGroupId) 
		{
			var scaffoldGroupImages = await (from im in _context.Images
				join sg in _context.ScaffoldGroups on im.ScaffoldGroupId equals sg.Id
				where sg.Id == scaffoldGroupId
				select im)
				.ToListAsync();
			 
			return scaffoldGroupImages;
		}

		public async Task<ICollection<ScaffoldGroupSummaryDto>?> GetFilteredScaffoldGroupSummaries(ScaffoldFilter filter, string currentUserId)
		{
			var query = _context.ScaffoldGroups.AsNoTracking();
			
			// Apply primary filters
			query = ApplyFilters(query, filter, currentUserId);

			// Get additional filtering data
			var matchingInputGroupIds = await GetMatchingInputGroupIds(filter);
			var tagIds = filter?.TagIds?.ToList() ?? new List<int>();

			// Apply optimized joins instead of .Include()
			query = ApplyJoins(query, matchingInputGroupIds, tagIds);

			var scaffoldGroups = await (from sg in query
                            join ig in _context.InputGroups on sg.Id equals ig.ScaffoldGroupId into igJoin
                            from ig in igJoin.DefaultIfEmpty()
                            select new
                            {
                                ScaffoldGroup = sg,
                                InputGroup = ig
                            }).ToListAsync();
			
			var inputGroupIds = scaffoldGroups
				.Where(sg => sg.InputGroup != null)
				.Select(sg => sg.InputGroup.Id)
				.Distinct()
				.ToList();

			var particleGroupsLookup = await _context.ParticlePropertyGroups
				.Where(pp => inputGroupIds.Contains(pp.InputGroupId))
				.GroupBy(pp => pp.InputGroupId)
				.ToDictionaryAsync(g => g.Key, g => g.Select(pp => new ParticlePropertyBaseDto
				{
					Shape = pp.Shape,
					Stiffness = pp.Stiffness,
					Dispersity = pp.Dispersity,
					SizeDistributionType = pp.SizeDistributionType,
					MeanSize = pp.MeanSize,
					StandardDeviationSize = pp.StandardDeviationSize,
					Proportion = pp.Proportion
				}).ToList());

			var scaffoldIdsLookup = await _context.Scaffolds
				.Where(s => query.Select(sg => sg.Id).Contains(s.ScaffoldGroupId)) // Only fetch IDs for relevant groups
				.GroupBy(s => s.ScaffoldGroupId)
				.ToDictionaryAsync(g => g.Key, g => g.Select(s => s.Id).ToList());

			var scaffoldIdsWithDomainsLookup = await (
				from s in _context.Scaffolds
				join d in _context.Domains on s.Id equals d.ScaffoldId
				where _context.Scaffolds
					.Where(sc => scaffoldIdsLookup.Keys.Contains(sc.ScaffoldGroupId)) // Filter using scaffold group IDs
					.Select(sc => sc.Id)
					.Contains(s.Id) // Only select scaffolds in the lookup
				select s.Id
			).Distinct().ToListAsync();

			// var scaffoldIdsWithDomainsLookup = await _context.Domains
			// 	.Where(d => query.SelectMany(sg => sg.Scaffolds).Select(s => s.Id).Contains(d.ScaffoldId)) // Filter only scaffolds linked to your ScaffoldGroups
			// 	.Select(d => new { d.Scaffold.ScaffoldGroupId, d.ScaffoldId }) // Fetch relevant fields only
			// 	.Distinct() // Ensure unique scaffold IDs
			// 	.GroupBy(d => d.ScaffoldGroupId)
			// 	.ToDictionaryAsync(g => g.Key, g => g.Select(d => d.ScaffoldId).ToList());

			var scaffoldCounts = await _context.Scaffolds
				.GroupBy(s => s.ScaffoldGroupId)
				.Select(g => new { ScaffoldGroupId = g.Key, NumReplicates = g.Count() })
				.ToDictionaryAsync(g => g.ScaffoldGroupId, g => g.NumReplicates);

			var scaffoldGroupResults = scaffoldGroups.Select(sg => new ScaffoldGroupSummaryDto
			{
				Id = sg.ScaffoldGroup.Id,
				Name = sg.ScaffoldGroup.Name,
				CreatedAt = sg.ScaffoldGroup.CreatedAt,
				IsSimulated = sg.ScaffoldGroup.IsSimulated,
				Comments = sg.ScaffoldGroup.Comments,
				UploaderId = sg.ScaffoldGroup.UploaderId,
				IsPublic = sg.ScaffoldGroup.IsPublic,
				NumReplicates = scaffoldCounts.ContainsKey(sg.ScaffoldGroup.Id) ? scaffoldCounts[sg.ScaffoldGroup.Id] : 0,
				Inputs = sg.InputGroup != null ? new InputGroupBaseDto
				{
					ContainerShape = sg.InputGroup.ContainerShape,
					ContainerSize = sg.InputGroup.ContainerSize,
					PackingConfiguration = sg.InputGroup.PackingConfiguration.ToString(),
					Particles = particleGroupsLookup.ContainsKey(sg.InputGroup.Id) 
						? particleGroupsLookup[sg.InputGroup.Id] 
						: new List<ParticlePropertyBaseDto>(),
					SizeDistribution = sg.InputGroup.SizeDistribution
				} : new InputGroupBaseDto(),
				ScaffoldIds = scaffoldIdsLookup.ContainsKey(sg.ScaffoldGroup.Id)
					? scaffoldIdsLookup[sg.ScaffoldGroup.Id] 
					: new List<int>(),
				ScaffoldIdsWithDomains = scaffoldIdsLookup.ContainsKey(sg.ScaffoldGroup.Id)
					? scaffoldIdsLookup[sg.ScaffoldGroup.Id].Where(sid => scaffoldIdsWithDomainsLookup.Contains(sid)).ToList()
					: new List<int>()
				// ScaffoldIdsWithDomains = scaffoldIdsWithDomainsLookup.ContainsKey(sg.ScaffoldGroup.Id)
				// 	? scaffoldIdsWithDomainsLookup[sg.ScaffoldGroup.Id]
				// 	: new List<int>() // Only scaffold IDs that have a linked domain
			}).ToList();

			return scaffoldGroupResults;
		}

		private IQueryable<ScaffoldGroup> ApplyFilters(IQueryable<ScaffoldGroup> query, ScaffoldFilter filter, string currentUserId)
		{
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

			// Filter by scaffold group IDs if provided
			if (filter.ScaffoldGroupIds?.Count > 0)
			{
				var scaffoldGroupIds = filter.ScaffoldGroupIds ?? new List<int>();
				query = query.Where(sg => scaffoldGroupIds.Contains(sg.Id));
			}

			return query;
		}

		private async Task<List<int>> GetMatchingInputGroupIds(ScaffoldFilter filter)
		{
			if (filter.ParticleSizes?.Count > 0)
			{
				var ranges = filter.ParticleSizes.Select(ps => new { Lower = ps - 5, Upper = ps + 9 }).ToList();

				// Construct the query dynamically
				var query = _context.ParticlePropertyGroups.AsQueryable();
				var predicate = PredicateBuilder.False<ParticlePropertyGroup>();

				foreach (var range in ranges)
				{
					var tempRange = range;
					predicate = predicate.Or(ppg => ppg.MeanSize > tempRange.Lower && ppg.MeanSize <= tempRange.Upper);
				}

				var inputGroupIds = await query.Where(predicate)
                                        .Select(ppg => ppg.InputGroupId)
                                        .Distinct()
                                        .ToListAsync();
				
				return inputGroupIds;
			}

			return new List<int>(); // Return empty if no filtering needed
		}

		private IQueryable<ScaffoldGroup> ApplyJoins(IQueryable<ScaffoldGroup> query, List<int> matchingInputGroupIds, List<int> tagIds)
		{
			if (matchingInputGroupIds.Count > 0 || tagIds.Count > 0)
			{
				query = from sg in query
					join ig in _context.InputGroups on sg.Id equals ig.ScaffoldGroupId into igJoin
        			from ig in igJoin.DefaultIfEmpty()

					join ppg in _context.ParticlePropertyGroups on sg.InputGroup.Id equals ppg.InputGroupId into ppgJoin
					from ppg in ppgJoin.DefaultIfEmpty()

					join s in _context.Scaffolds on sg.Id equals s.ScaffoldGroupId into sJoin
					from s in sJoin.DefaultIfEmpty()

					join st in _context.ScaffoldTags on s.Id equals st.ScaffoldId into stJoin
					from st in stJoin.DefaultIfEmpty()

					where (!matchingInputGroupIds.Any() || matchingInputGroupIds.Contains(ig.Id))
						&& (tagIds.Count == 0 || st != null && tagIds.Contains(st.TagId))

					group new { sg, ppg, st } by sg into grouped
					orderby grouped.Count(g => g.ppg != null) + grouped.Count(g => g.st != null) descending
					select grouped.Key;
			}

			var sql = query.ToQueryString();

			return query;
		}

		public async Task<ICollection<ScaffoldGroup>?> GetFilteredScaffoldGroupsByRelevance_v1(ScaffoldFilter filter, string currentUserId)
		{
			
			var query = _context.ScaffoldGroups.AsNoTracking();
			
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

			if (filter.ScaffoldGroupIds?.Count > 0)
			{
				var scaffoldGroupIds = filter.ScaffoldGroupIds ?? new List<int>();
				query = query.Where(sg => scaffoldGroupIds.Contains(sg.Id));
			}
			else
			{
				// Apply particle size filter if it exists
				List<int> matchingInputGroupIds = [];
				if (filter.ParticleSizes?.Count > 0)
				{
					var ranges = filter.ParticleSizes.Select(ps => new { Lower = ps - 5, Upper = ps + 9 }).ToList();
					var particlePropertyGroupsQuery = _context.ParticlePropertyGroups.AsQueryable();

					var predicate = PredicateBuilder.False<ParticlePropertyGroup>();
					foreach (var range in ranges)
					{
						var tempRange = range;
						predicate = predicate.Or(ppg => ppg.MeanSize > tempRange.Lower && ppg.MeanSize <= tempRange.Upper);
					}

					matchingInputGroupIds = await _context.ParticlePropertyGroups
						.Where(predicate)
						.Select(ppg => ppg.InputGroupId)
						.Distinct()
						.ToListAsync();
				}
				
				// Apply combined filters if they exist
				if (filter.ParticleSizes?.Count > 0 || filter.TagIds?.Count > 0)
				{
					var tagIds = filter.TagIds ?? new List<int>();

					query = query.Select(sg => new
					{
						ScaffoldGroup = sg,
						MatchingParticleCount = matchingInputGroupIds.Count > 0 && matchingInputGroupIds.Contains(sg.InputGroup.Id)
							? sg.InputGroup.ParticlePropertyGroups.Count(ppg => matchingInputGroupIds.Contains(ppg.InputGroupId))
							: 0,
						MatchingTagsCount = sg.Scaffolds
							.SelectMany(s => s.ScaffoldTags)
							.Where(st => tagIds.Contains(st.TagId))
							.Select(st => st.TagId)
							.Distinct()
							.Count(),
					})
					.Where(sg => sg.MatchingParticleCount > 0 || sg.MatchingTagsCount > 0)
					.OrderByDescending(sg => sg.MatchingParticleCount + sg.MatchingTagsCount)
					// .ThenByDescending(sg => sg.MatchingTagsCount)
					.Select(sg => sg.ScaffoldGroup);
				}
			}

			var scaffoldGroups = await query
				.AsSplitQuery()
				.Include(sg => sg.InputGroup)
					.ThenInclude(ig => ig != null ? ig.ParticlePropertyGroups : null)
				.Include(sg => sg.Scaffolds)
					.ThenInclude(s => s.ScaffoldTags)
						.ThenInclude(st => st.Tag)
				// .OrderByDescending(sg => sg.CreatedAt)
				.ToListAsync();

			return scaffoldGroups;

			//////////////////
			
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
			if (filter.TagIds?.Count > 0)
			{
				var tagIds = filter.TagIds ?? new List<int>();

				// Filter ScaffoldGroups by those whose Scaffolds have all specified Tags exclusively
				query = query.Where(sg => sg.Scaffolds
					.Any(s => s.ScaffoldTags
						.Where(st => (st.IsAutoGenerated && !st.IsPrivate) || (sg.UploaderId == currentUserId))
						.Count(st => tagIds.Contains(st.TagId)) == tagIds.Count));
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

		public async Task<List<ScaffoldMissingThumbnailInfoDto>> GetScaffoldsMissingThumbnailsByCategory(ImageCategory imageCategory = ImageCategory.Particles)
		{
			var domainCategory = CategoryMapper.ToDomainCategory(imageCategory);
			if (domainCategory == null) return new List<ScaffoldMissingThumbnailInfoDto>();

			var scaffolds = await (
				from s in _context.Scaffolds
				join d in _context.Domains on s.Id equals d.ScaffoldId
				where d.Category == domainCategory && d.MeshFilePath != null
				where !_context.Images.Any(img =>
					img.ScaffoldGroupId == s.ScaffoldGroupId &&
					img.IsThumbnail &&
					img.Category == imageCategory)
				select new ScaffoldMissingThumbnailInfoDto
				{
					ScaffoldId = s.Id,
					ScaffoldGroupId = s.ScaffoldGroupId
				}
			).Distinct().ToListAsync();

			return scaffolds;
		}

	}

	public static class PredicateBuilder
	{
		public static Expression<Func<T, bool>> False<T>() { return f => false; }
		public static Expression<Func<T, bool>> True<T>() { return f => true; }

		public static Expression<Func<T, bool>> Or<T>(this Expression<Func<T, bool>> expr1, Expression<Func<T, bool>> expr2)
		{
			var invokedExpr = Expression.Invoke(expr2, expr1.Parameters.Cast<Expression>());
			return Expression.Lambda<Func<T, bool>>(Expression.OrElse(expr1.Body, invokedExpr), expr1.Parameters);
		}
	}
}


