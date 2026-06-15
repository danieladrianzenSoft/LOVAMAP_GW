
namespace Infrastructure.IHelpers
{
	public interface ICoreApiClient
	{
		Task<HttpResponseMessage> SubmitJobAsync(MultipartFormDataContent form, CancellationToken ct = default);
		Task<HttpResponseMessage> GetJobRawResultAsync(string jobId, CancellationToken ct = default);
		Task<HttpResponseMessage> GetJobStatusAsync(string jobId, CancellationToken ct = default);
		Task<HttpResponseMessage> GetJobMeshAsync(string jobId, CancellationToken ct = default);
		Task<HttpResponseMessage> GetJobChildrenAsync(string jobId, CancellationToken ct = default);
	}
}