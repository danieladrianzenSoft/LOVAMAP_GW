using Infrastructure.DTOs;
using Infrastructure.Helpers;

namespace Services.IServices
{
	public interface IJobAdminStatsService
	{
		Task<JobAdminStatsDto> GetJobAdminStatsAsync(DateTime from, DateTime to);
		Task<PagedList<UserFailureRankingDto>> GetUserFailureRankingsAsync(DateTime from, DateTime to, PagingParams pagingParams);
	}
}
