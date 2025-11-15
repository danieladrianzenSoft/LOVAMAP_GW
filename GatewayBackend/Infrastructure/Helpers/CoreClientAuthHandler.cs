using Infrastructure.IHelpers;

namespace Infrastructure.Helpers
{
	public sealed class CoreClientAuthHandler : DelegatingHandler
	{
		private readonly ICoreTokenProvider _tokenProvider;

		public CoreClientAuthHandler(ICoreTokenProvider tokenProvider)
		{
			_tokenProvider = tokenProvider;
		}

		protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
		{
			// 1st attempt with cached/active token
			var token = await _tokenProvider.GetAccessTokenAsync(ct);
			request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

			var response = await base.SendAsync(request, ct);
			if (response.StatusCode != System.Net.HttpStatusCode.Unauthorized)
				return response;

			// Try a single forced refresh + replay
			response.Dispose();
			await _tokenProvider.ForceRefreshAsync();

			token = await _tokenProvider.GetAccessTokenAsync(ct);
			request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

			// Must clone content when retrying with body; easier to build requests per send.
			// For MultipartFormDataContent you're creating it fresh for each call (good).
			return await base.SendAsync(request, ct);
		}
	}
}