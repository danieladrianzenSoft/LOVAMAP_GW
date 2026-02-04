namespace Repositories.IRepositories
{
	public interface IRdfScaffoldRepository
	{
		Task<string> GetScaffoldsRawAsync(
			IDictionary<string, string>? filters = null,
			CancellationToken ct = default);
		Task<List<Infrastructure.DTOs.RdfScaffoldMeasurementDto>> GetScaffoldsAsync(
			IDictionary<string, string>? filters = null,
			CancellationToken ct = default
		);
		Task AddScaffoldAsync(Infrastructure.DTOs.RdfScaffoldCreateDto scaffold, CancellationToken ct = default);
		Task UpdateScaffoldAsync(int scaffoldId, Infrastructure.DTOs.RdfScaffoldCreateDto scaffold, CancellationToken ct = default);
		Task DeleteScaffoldAsync(int scaffoldId, CancellationToken ct = default);
		Task<string> GetAllScaffoldsRawAsync(CancellationToken ct = default);
		Task<List<Infrastructure.DTOs.RdfScaffoldAllDto>> GetAllScaffoldsAsync(CancellationToken ct = default);
	}
}
