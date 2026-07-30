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
		public async Task<PagedList<Job>> GetAllJobsAsync(PagingParams pagingParams)
		{
			var query = _context.Jobs
				.Include(j => j.Scaffold)
				.Include(j => j.Creator)
				.OrderByDescending(j => j.SubmittedAt);

			return await PagedList<Job>.CreateAsync(query, pagingParams.PageNumber, pagingParams.PageSize);
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

	}
}