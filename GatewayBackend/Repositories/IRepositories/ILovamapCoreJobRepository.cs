using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;
using Infrastructure.Helpers;

namespace Repositories.IRepositories
{
	public interface ILovamapCoreJobRepository
	{
		bool HasChanges();
		void Add(Job job);
		Task<Job?> GetJobByIdAsync(Guid jobId);
		Task<PagedList<Job>> GetJobsByCreatorIdAsync(string creatorId, PagingParams pagingParams);
		Task<PagedList<Job>> GetAllJobsAsync(PagingParams pagingParams);
		Task<IEnumerable<Job>> GetActiveJobsAsync();
		Task<Job?> MarkJobCompletedAsync(Guid jobId, string resultFilePath, string sha256);
		Task<Job?> UpdateJobFromCoreAsync(Guid jobId, JobStatus status, string? resultPath, string? errorMessage, DateTime? completedAt);
	}
}