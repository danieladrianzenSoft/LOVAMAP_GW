using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Repositories.IRepositories;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Infrastructure.Helpers;
using Microsoft.EntityFrameworkCore;


namespace Repositories.Repositories
{
	public class LovamapCoreJobRepository : ILovamapCoreJobRepository
	{
		private readonly DataContext _context;

		public LovamapCoreJobRepository(DataContext context)
		{
			_context = context;
		}

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(Job job)
		{
			_context.Jobs.Add(job);
		}

		public async Task<Job?> GetJobByIdAsync(Guid jobId)
		{
			return await _context.Jobs.FindAsync(jobId);
		}

		public async Task<PagedList<Job>> GetJobsByCreatorIdAsync(string creatorId, PagingParams pagingParams)
		{
			var query = _context.Jobs
				.Include(j => j.Scaffold)
				.Include(j => j.Creator)
				.Where(j => j.CreatorId == creatorId)
				.OrderByDescending(j => j.SubmittedAt);

			return await PagedList<Job>.CreateAsync(query, pagingParams.PageNumber, pagingParams.PageSize);
		}

		// 4/13 JacklynX changed - get all jobs for admin use
		public async Task<PagedList<Job>> GetAllJobsAsync(JobFilterParams filterParams)
		{
			var query = _context.Jobs
				.Include(j => j.Scaffold)
				.Include(j => j.Creator)
				.AsQueryable();

			if (filterParams.Status.HasValue)
				query = query.Where(j => j.Status == filterParams.Status.Value);

			if (filterParams.JobType.HasValue)
				query = query.Where(j => j.JobType == filterParams.JobType.Value);

			if (!string.IsNullOrWhiteSpace(filterParams.Search))
			{
				var search = filterParams.Search.Trim().ToLower();
				query = query.Where(j =>
					(j.Creator != null && j.Creator.Email != null && j.Creator.Email.ToLower().Contains(search)) ||
					(j.Creator != null && j.Creator.UserName != null && j.Creator.UserName.ToLower().Contains(search)) ||
					j.Id.ToString().ToLower().Contains(search));
			}

			query = query.OrderByDescending(j => j.SubmittedAt);

			return await PagedList<Job>.CreateAsync(query, filterParams.PageNumber, filterParams.PageSize);
		}

		public async Task<IEnumerable<Job>> GetActiveJobsAsync()
		{
			return await _context.Jobs
				.Include(j => j.Creator)
				.Where(j => (j.Status == JobStatus.Pending || j.Status == JobStatus.Running)
				          && j.IsSubmittedToCore)
				.ToListAsync();
		}

		public async Task<Job?> MarkJobCompletedAsync(Guid jobId, string resultFilePath, string sha256)
		{
			var job = await _context.Jobs.FindAsync(jobId);
			if (job == null) return null; // or throw

			job.Status = JobStatus.Completed;
			job.CompletedAt = DateTime.UtcNow;
			job.ResultFilePath = resultFilePath;
			job.ResultHash = sha256;

			return job;
		}

		public async Task<Job?> UpdateJobFromCoreAsync(Guid jobId, JobStatus status, string? resultPath, string? errorMessage, DateTime? completedAt)
		{
			var job = await _context.Jobs.FindAsync(jobId);
			if (job == null) return null;

			job.Status = status;
			job.ResultFilePath = resultPath ?? job.ResultFilePath;
			job.ErrorMessage = errorMessage ?? job.ErrorMessage;
			job.CompletedAt = completedAt ?? job.CompletedAt;

			return job;
		}

		public async Task<JobAdminStatsDto> GetJobAdminStatsAsync(DateTime from, DateTime to)
		{
			var jobs = _context.Jobs
				.Where(j => j.SubmittedAt >= from && j.SubmittedAt <= to);

			var statusGroups = await jobs
				.GroupBy(j => j.Status)
				.Select(g => new { Status = g.Key, Count = g.Count() })
				.ToListAsync();

			var completedCount = statusGroups.FirstOrDefault(g => g.Status == JobStatus.Completed)?.Count ?? 0;
			var failedCount = statusGroups.FirstOrDefault(g => g.Status == JobStatus.Failed)?.Count ?? 0;
			var pendingCount = statusGroups.FirstOrDefault(g => g.Status == JobStatus.Pending)?.Count ?? 0;
			var runningCount = statusGroups.FirstOrDefault(g => g.Status == JobStatus.Running)?.Count ?? 0;
			var stoppedCount = statusGroups.FirstOrDefault(g => g.Status == JobStatus.Stopped)?.Count ?? 0;

			var typeCounts = await jobs
				.GroupBy(j => j.JobType)
				.Select(g => new JobTypeCountDto
				{
					JobType = g.Key.ToString(),
					Count = g.Count()
				})
				.ToListAsync();

			var monthlyCounts = await jobs
				.GroupBy(j => new { j.SubmittedAt.Year, j.SubmittedAt.Month })
				.Select(g => new JobMonthlyCountDto
				{
					Period = g.Key.Year + "-" + g.Key.Month.ToString().PadLeft(2, '0'),
					Total = g.Count(),
					Completed = g.Count(j => j.Status == JobStatus.Completed),
					Failed = g.Count(j => j.Status == JobStatus.Failed),
					Other = g.Count(j => j.Status != JobStatus.Completed && j.Status != JobStatus.Failed)
				})
				.OrderBy(m => m.Period)
				.ToListAsync();

			return new JobAdminStatsDto
			{
				TotalJobs = statusGroups.Sum(g => g.Count),
				CompletedCount = completedCount,
				FailedCount = failedCount,
				PendingCount = pendingCount,
				RunningCount = runningCount,
				StoppedCount = stoppedCount,
				JobTypeCounts = typeCounts,
				MonthlyCounts = monthlyCounts
			};
		}

		public async Task<PagedList<UserFailureRankingDto>> GetUserFailureRankingsAsync(DateTime from, DateTime to, PagingParams pagingParams)
		{
			var baseQuery = _context.Jobs
				.Where(j => j.SubmittedAt >= from && j.SubmittedAt <= to && j.Status == JobStatus.Failed && j.CreatorId != null);

			var totalUsers = await baseQuery.Select(j => j.CreatorId).Distinct().CountAsync();

			var rankings = await baseQuery
				.GroupBy(j => j.CreatorId)
				.Select(g => new
				{
					CreatorId = g.Key,
					FailureCount = g.Count(),
					LastFailureAt = g.Max(j => j.SubmittedAt)
				})
				.OrderByDescending(r => r.FailureCount)
				.Skip((pagingParams.PageNumber - 1) * pagingParams.PageSize)
				.Take(pagingParams.PageSize)
				.ToListAsync();

			var creatorIds = rankings.Select(r => r.CreatorId).ToList();
			var users = await _context.Users
				.Where(u => creatorIds.Contains(u.Id))
				.Select(u => new { u.Id, u.Email, u.UserName })
				.ToDictionaryAsync(u => u.Id);

			var items = rankings.Select(r =>
			{
				users.TryGetValue(r.CreatorId!, out var user);
				return new UserFailureRankingDto
				{
					UserId = r.CreatorId ?? "",
					Email = user?.Email,
					UserName = user?.UserName,
					FailureCount = r.FailureCount,
					LastFailureAt = r.LastFailureAt
				};
			}).ToList();

			return new PagedList<UserFailureRankingDto>(items, totalUsers, pagingParams.PageNumber, pagingParams.PageSize);
		}

	}
}