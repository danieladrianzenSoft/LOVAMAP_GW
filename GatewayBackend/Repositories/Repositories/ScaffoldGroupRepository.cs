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
				.Include(sg => sg.Images)
				.FirstOrDefaultAsync();
			
			// var scaffoldGroup = await (from sg in _context.ScaffoldGroups
			// 	where sg.Id == id
			// 	join ig in _context.InputGroups on sg.Id equals ig.ScaffoldGroupId
			// 	join ppg in _context.ParticlePropertyGroups on ig.Id equals ppg.InputGroupId
			// 	join s in _context.Scaffolds on sg.Id equals s.ScaffoldGroupId
			// 	join st in _context.ScaffoldTags on s.Id equals st.ScaffoldId
			// 	join t in _context.Tags on st.TagId equals t.Id
			// 	join im in _context.Images on sg.Id equals im.ScaffoldGroupId into imGroup
			// 	from ims in imGroup.DefaultIfEmpty()
			// 	select sg).Include(sg => sg.Images)
			// 	.FirstOrDefaultAsync();
			 
			// return scaffoldGroup;
			
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

		// public async Task<ICollection<ScaffoldGroup>?> GetSpecificScaffoldGroupsById(ScaffoldFilter filter, string currentUserId)
		// {
		// 	var query = _context.ScaffoldGroups.AsQueryable();

		// 	// Filter by uploader based on visibility and user context
		// 	if (!string.IsNullOrEmpty(filter.UserId))
		// 	{
		// 		query = filter.UserId == currentUserId
		// 			? query.Where(sg => sg.UploaderId == filter.UserId)
		// 			: query.Where(sg => sg.UploaderId == filter.UserId && sg.IsPublic);
		// 	}
		// 	else
		// 	{
		// 		query = query.Where(sg => sg.UploaderId == currentUserId || sg.IsPublic);
		// 	}

		// 	if (filter.ScaffoldGroupIds?.Count > 0)
		// 	{
		// 		var scaffoldGroupIds = filter.ScaffoldGroupIds ?? new List<int>();
		// 		query = query.Where(sg => scaffoldGroupIds.Contains(sg.Id));
		// 	}
		// }

		public async Task<ICollection<ScaffoldGroup>?> GetFilteredScaffoldGroupsByRelevance(ScaffoldFilter filter, string currentUserId)
		{
			// var query = _context.ScaffoldGroups.AsNoTracking();

			// // Filter by uploader visibility and context
			// if (!string.IsNullOrEmpty(filter.UserId))
			// {
			// 	if (filter.UserId == currentUserId)
			// 		query = query.Where(sg => sg.UploaderId == filter.UserId);
			// 	else
			// 		query = query.Where(sg => sg.UploaderId == filter.UserId && sg.IsPublic);
			// }
			// else
			// {
			// 	query = query.Where(sg => sg.UploaderId == currentUserId || sg.IsPublic);
			// }

			// // Apply filters if present, otherwise return all scaffold groups for the user
			// if (filter.ScaffoldGroupIds?.Count > 0)
			// {
			// 	query = query.Where(sg => filter.ScaffoldGroupIds.Contains(sg.Id));
			// }
			// else
			// {
			// 	bool hasParticleSizeFilter = filter.ParticleSizes?.Count > 0;
			// 	bool hasTagFilter = filter.TagIds?.Count > 0;

			// 	// Apply particle size filter if provided
			// 	if (hasParticleSizeFilter)
			// 	{
			// 		var ranges = filter.ParticleSizes.Select(ps => new { Lower = ps - 5, Upper = ps + 9 }).ToList();
			// 		query = from sg in query
			// 				join pp in _context.ParticlePropertyGroups
			// 				on sg.InputGroup.Id equals pp.InputGroupId
			// 				where ranges.Any(r => pp.MeanSize > r.Lower && pp.MeanSize <= r.Upper)
			// 				select sg;
			// 	}

			// 	// Apply tag filter if provided
			// 	if (hasTagFilter)
			// 	{
			// 		query = from sg in query
			// 				join s in _context.Scaffolds on sg.Id equals s.ScaffoldGroupId
			// 				join st in _context.ScaffoldTags on s.Id equals st.ScaffoldId
			// 				where filter.TagIds.Contains(st.TagId)
			// 				select sg;
			// 	}

			// 	// If either filter is applied, ensure that we order by relevance
			// 	if (hasParticleSizeFilter || hasTagFilter)
			// 	{
			// 		query = query.Select(sg => new
			// 		{
			// 			ScaffoldGroup = sg,
			// 			MatchingParticleCount = sg.InputGroup.ParticlePropertyGroups
			// 				.Count(ppg => filter.ParticleSizes != null && filter.ParticleSizes.Any(ps => ppg.MeanSize > ps - 5 && ppg.MeanSize <= ps + 9)), // Null-check for ParticleSizes
			// 			MatchingTagsCount = sg.Scaffolds
			// 				.SelectMany(s => s.ScaffoldTags)
			// 				.Count(st => filter.TagIds != null && filter.TagIds.Contains(st.TagId)) // Null-check for TagIds
			// 		})
			// 		.Where(sg => sg.MatchingParticleCount > 0 || sg.MatchingTagsCount > 0)
			// 		.OrderByDescending(sg => sg.MatchingParticleCount + sg.MatchingTagsCount)
			// 		.Select(sg => sg.ScaffoldGroup);
			// 	}
			// }

			// // Fetch related data with split queries for large result sets
			// query = query
			// 	.Include(sg => sg.InputGroup)
			// 		.ThenInclude(ig => ig.ParticlePropertyGroups)
			// 	.Include(sg => sg.Scaffolds)
			// 		.ThenInclude(s => s.ScaffoldTags)
			// 			.ThenInclude(st => st.Tag)
			// 	.AsSplitQuery();

			// var scaffoldGroups = await query.ToListAsync();
			// return scaffoldGroups;
			
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

			// if (filter.ScaffoldGroupIds?.Count > 0)
			// {
			// 	var scaffoldGroupIds = filter.ScaffoldGroupIds ?? new List<int>();
			// 	query = query.Where(sg => scaffoldGroupIds.Contains(sg.Id));
			// }
			// else
			// {

			// 	// Separate query for particle size filtering
			// 	List<int> matchingInputGroupIds = new List<int>();
			// 	if (filter.ParticleSizes?.Count > 0)
			// 	{
			// 		var ranges = filter.ParticleSizes.Select(ps => new { Lower = ps - 5, Upper = ps + 9 }).ToList();
			// 		var particleQuery = _context.ParticlePropertyGroups.AsQueryable();

			// 		foreach (var range in ranges)
			// 		{
			// 			particleQuery = particleQuery.Where(ppg => ppg.MeanSize > range.Lower && ppg.MeanSize < range.Upper);
			// 		}

			// 		matchingInputGroupIds = await particleQuery.Select(ppg => ppg.InputGroupId).Distinct().ToListAsync();
			// 	}

			// 	// Apply combined filters if they exist
			// 	if (filter.ParticleSizes?.Count > 0 || filter.TagIds?.Count > 0)
			// 	{
			// 		var tagIds = filter.TagIds ?? new List<int>();

			// 		query = query.Select(sg => new
			// 		{
			// 			ScaffoldGroup = sg,
			// 			MatchingParticleCount = sg.InputGroup != null && matchingInputGroupIds.Contains(sg.InputGroup.Id)
			// 				? sg.InputGroup.ParticlePropertyGroups.Count(ppg => matchingInputGroupIds.Contains(ppg.InputGroupId))
			// 				: 0,
			// 			MatchingTagsCount = sg.Scaffolds
			// 				.SelectMany(s => s.ScaffoldTags)
			// 				.Where(st => tagIds.Contains(st.TagId))
			// 				.Select(st => st.TagId)
			// 				.Distinct()
			// 				.Count(),
			// 		})
			// 		.Where(sg => sg.MatchingParticleCount > 0 || sg.MatchingTagsCount > 0)
			// 		.OrderByDescending(sg => sg.MatchingParticleCount)
			// 		.ThenByDescending(sg => sg.MatchingTagsCount)
			// 		.Select(sg => sg.ScaffoldGroup);
			// 	}
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


