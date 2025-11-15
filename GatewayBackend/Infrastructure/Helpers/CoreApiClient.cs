using Infrastructure.IHelpers;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Helpers
{
	public sealed class CoreApiClient : ICoreApiClient
	{
		private readonly HttpClient _http;

		public CoreApiClient(HttpClient http, IConfiguration config)
		{
			var baseUrl = (config["LOVAMAP_CORE:URL"] ?? "").TrimEnd('/') + "/";
			_http = http;
			_http.BaseAddress = new Uri(baseUrl);
			_http.Timeout = TimeSpan.FromMinutes(5);
		}

		public Task<HttpResponseMessage> SubmitJobAsync(MultipartFormDataContent form, CancellationToken ct = default)
			=> _http.PostAsync("jobs", form, ct);
	}
}

