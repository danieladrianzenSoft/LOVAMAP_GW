namespace Infrastructure.IHelpers
{
	public interface IFusekiClient
	{
		Task<string> QueryAsync(string sparqlQuery, CancellationToken ct = default);
		Task<string> UpdateAsync(string sparqlUpdate, CancellationToken ct = default);
		Task<string> QueryRawAsync(string sparqlQuery, string accept, CancellationToken ct = default);
		Task<string> UploadTurtleAsync(string turtleContent, CancellationToken ct = default);
	}
}
