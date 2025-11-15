
namespace Infrastructure.IHelpers
{
	public interface ICoreApiClient
	{
		Task<HttpResponseMessage> SubmitJobAsync(MultipartFormDataContent form, CancellationToken ct = default);
	}
}