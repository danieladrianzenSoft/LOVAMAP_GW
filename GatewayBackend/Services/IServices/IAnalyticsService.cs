namespace Services.IServices
{
	public interface IAnalyticsService
	{
		Task<Infrastructure.DTOs.DashboardAnalyticsDto> GetDashboardAnalyticsAsync(CancellationToken ct = default);
	}
}
