using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Repositories.IRepositories
{
	public interface ILovamapCoreJobRepository
	{
		bool HasChanges();
		void Add(Job job);
		Task<Job?> GetJobByIdAsync(Guid jobId);
		Task<IEnumerable<Job>> GetJobsByCreatorIdAsync(string creatorId);
		Task<IEnumerable<Job>> GetAllJobsAsync();
		Task<Job?> MarkJobCompletedAsync(Guid jobId, string resultFilePath, string sha256);
	}
}