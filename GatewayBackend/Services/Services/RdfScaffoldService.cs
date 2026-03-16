using Repositories.IRepositories;
using Services.IServices;

namespace Services.Services
{
	public sealed class RdfScaffoldService : IRdfScaffoldService
	{
		private readonly IRdfScaffoldRepository _repository;

		public RdfScaffoldService(IRdfScaffoldRepository repository)
		{
			_repository = repository;
		}

		public Task<string> GetScaffoldsRawAsync(
			IDictionary<string, string>? filters = null,
			CancellationToken ct = default)
		{
			return _repository.GetScaffoldsRawAsync(filters, ct);
		}

		public Task<List<Infrastructure.DTOs.RdfScaffoldMeasurementDto>> GetScaffoldsAsync(
			IDictionary<string, string>? filters = null,
			CancellationToken ct = default)
		{
			return _repository.GetScaffoldsAsync(filters, ct);
		}

		public Task AddScaffoldAsync(Infrastructure.DTOs.RdfScaffoldCreateDto scaffold, CancellationToken ct = default)
		{
			return _repository.AddScaffoldAsync(scaffold, ct);
		}

		public Task UpdateScaffoldAsync(
			int scaffoldId,
			Infrastructure.DTOs.RdfScaffoldCreateDto scaffold,
			CancellationToken ct = default)
		{
			return _repository.UpdateScaffoldAsync(scaffoldId, scaffold, ct);
		}

		public Task DeleteScaffoldAsync(int scaffoldId, CancellationToken ct = default)
		{
			return _repository.DeleteScaffoldAsync(scaffoldId, ct);
		}

		public Task<string> GetAllScaffoldsRawAsync(CancellationToken ct = default)
		{
			return _repository.GetAllScaffoldsRawAsync(ct);
		}

		public Task<List<Infrastructure.DTOs.RdfScaffoldAllDto>> GetAllScaffoldsAsync(
			CancellationToken ct = default)
		{
			return _repository.GetAllScaffoldsAsync(ct);
		}

		public Task<Infrastructure.DTOs.RdfGraphDto> GetGraphAsync(
			int? limit = null,
			CancellationToken ct = default)
		{
			return _repository.GetGraphAsync(limit, ct);
		}

		public Task<Infrastructure.DTOs.RdfOntologySummaryDto> GetOntologySummaryAsync(
			CancellationToken ct = default)
		{
			return _repository.GetOntologySummaryAsync(ct);
		}
	}
}
