
namespace Infrastructure.IHelpers
{
	public interface ICoreTokenProvider
	{
		Task<string> GetAccessTokenAsync(CancellationToken ct = default);
		Task ForceRefreshAsync(); // used when we get a 401
	}

}
