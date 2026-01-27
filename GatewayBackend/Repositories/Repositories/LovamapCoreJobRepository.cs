using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Repositories.IRepositories;
using Data;
using Data.Models;
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

		public async Task<IEnumerable<Job>> GetJobsByCreatorIdAsync(string creatorId)
		{
			return await _context.Jobs.Where(j => j.CreatorId == creatorId).OrderByDescending(j => j.SubmittedAt).ToListAsync();
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

	}
}