using Infrastructure.DTOs;
using Infrastructure.Helpers;
using Repositories.IRepositories;
using Services.IServices;

namespace Services.Services
{
	public sealed class JobAdminStatsService : IJobAdminStatsService
	{
		private readonly ILovamapCoreJobRepository _repository;

		public JobAdminStatsService(ILovamapCoreJobRepository repository)
		{
			_repository = repository;
		}

		public Task<JobAdminStatsDto> GetJobAdminStatsAsync(DateTime from, DateTime to)
		{
			return _repository.GetJobAdminStatsAsync(from, to);
		}

		public Task<PagedList<UserFailureRankingDto>> GetUserFailureRankingsAsync(DateTime from, DateTime to, PagingParams pagingParams)
		{
			return _repository.GetUserFailureRankingsAsync(from, to, pagingParams);
		}
	}
}
