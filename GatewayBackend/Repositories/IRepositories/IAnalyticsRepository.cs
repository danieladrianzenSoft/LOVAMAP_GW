namespace Repositories.IRepositories
{
	public interface IAnalyticsRepository
	{
		Task<Infrastructure.DTOs.DashboardAnalyticsDto> GetDashboardAnalyticsAsync(CancellationToken ct = default);
	}
}
