namespace Repositories.IRepositories
{
	public interface IRdfRepository
	{
		Task<string> QueryAsync(string sparqlQuery, CancellationToken ct = default);
		Task<string> UpdateAsync(string sparqlUpdate, CancellationToken ct = default);
	}
}
