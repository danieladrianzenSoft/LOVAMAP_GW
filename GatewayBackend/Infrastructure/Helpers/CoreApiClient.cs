using Infrastructure.IHelpers;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Helpers
{
	public sealed class CoreApiClient : ICoreApiClient
	{
		private readonly HttpClient _http;
		private readonly Uri _prodBaseUri;
		private static readonly HttpRequestOptionsKey<bool> SkipCoreAuthKey =
        	new HttpRequestOptionsKey<bool>("SkipCoreAuth");

		public CoreApiClient(HttpClient http, IConfiguration config)
		{
			var baseUrl = (config["LOVAMAP_CORE:URL"] ?? "").TrimEnd('/') + "/";
			_http = http;
			_http.BaseAddress = new Uri(baseUrl);
			_http.Timeout = TimeSpan.FromMinutes(5);

			// Prod base URL for debug/result pulls
			var prodUrl = (config["LOVAMAP_CORE:URL_PROD"] ?? baseUrl).TrimEnd('/') + "/";
			_prodBaseUri = new Uri(prodUrl);
		}

		public Task<HttpResponseMessage> SubmitJobAsync(MultipartFormDataContent form, CancellationToken ct = default)
		{
			Console.WriteLine($"CoreApiClient BaseAddress: {_http.BaseAddress}");
			return _http.PostAsync("jobs", form, ct);
		}

		public Task<HttpResponseMessage> GetJobRawResultAsync(string jobId, CancellationToken ct = default)
		{
			// Adjust this path to match whatever endpoint you add on lovamap_core
			var relativePath = $"jobs/{jobId}/raw-results";

			// Use absolute URI so we bypass BaseAddress and explicitly hit prod
			var uri = new Uri(_prodBaseUri, relativePath);
			var request = new HttpRequestMessage(HttpMethod.Get, uri);

			Console.WriteLine($"Calling core at: {uri}");

			request.Options.Set(SkipCoreAuthKey, true);

			return _http.SendAsync(request, ct);
		}
	}
}

