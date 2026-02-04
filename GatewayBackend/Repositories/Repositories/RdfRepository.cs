using Infrastructure.IHelpers;
using Repositories.IRepositories;

namespace Repositories.Repositories
{
	public sealed class RdfRepository : IRdfRepository
	{
		private readonly IFusekiClient _client;

		public RdfRepository(IFusekiClient client)
		{
			_client = client;
		}

		public Task<string> QueryAsync(string sparqlQuery, CancellationToken ct = default)
		{
			return _client.QueryAsync(sparqlQuery, ct);
		}

		public Task<string> UpdateAsync(string sparqlUpdate, CancellationToken ct = default)
		{
			return _client.UpdateAsync(sparqlUpdate, ct);
		}
	}
}
