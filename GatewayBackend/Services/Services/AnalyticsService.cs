using Repositories.IRepositories;
using Services.IServices;

namespace Services.Services
{
	public sealed class AnalyticsService : IAnalyticsService
	{
		private readonly IAnalyticsRepository _repository;

		public AnalyticsService(IAnalyticsRepository repository)
		{
			_repository = repository;
		}

		public Task<Infrastructure.DTOs.DashboardAnalyticsDto> GetDashboardAnalyticsAsync(CancellationToken ct = default)
		{
			return _repository.GetDashboardAnalyticsAsync(ct);
		}
	}
}
