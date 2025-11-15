using System.Net.Http.Json;
using Infrastructure.IHelpers;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Helpers
{
	public sealed class CoreTokenProvider : ICoreTokenProvider
	{
		private readonly IHttpClientFactory _httpClientFactory;
		private readonly IConfiguration _config;
		private readonly IMemoryCache _cache;
		private readonly ILogger<CoreTokenProvider> _logger;
		private readonly SemaphoreSlim _gate = new(1,1);
		private const string CacheKey = "core_access_token";

		public CoreTokenProvider(IHttpClientFactory httpClientFactory, IConfiguration config, IMemoryCache cache, ILogger<CoreTokenProvider> logger)
		{
			_httpClientFactory = httpClientFactory;
			_config = config;
			_cache = cache;
			_logger = logger;
		}

		public async Task<string> GetAccessTokenAsync(CancellationToken ct = default)
		{
			if (_cache.TryGetValue<string>(CacheKey, out var cached) && cached is not null)
				return cached;

			await _gate.WaitAsync(ct);
			try
			{
				if (_cache.TryGetValue<string>(CacheKey, out cached) && cached is not null)
					return cached;

				var coreUrl = _config["LOVAMAP_CORE:URL"]!;
				var clientId = _config["LOVAMAP_CORE:ClientId"]!;
				var clientSecret = _config["LOVAMAP_CORE:ClientSecret"]!;
				var scopes = _config["LOVAMAP_CORE:Scopes"];

				var connectClient = _httpClientFactory.CreateClient(); // no auth here
				var request = new CoreClientConnectRequest(clientId, clientSecret, scopes);

				using var resp = await connectClient.PostAsJsonAsync($"{coreUrl}/clients/connect", request, ct);
				if (!resp.IsSuccessStatusCode)
				{
					var body = await resp.Content.ReadAsStringAsync(ct);

					_logger.LogError($"Connect failed: {(int)resp.StatusCode} {resp.ReasonPhrase} - {body}");
					throw new InvalidOperationException($"Connect failed: {(int)resp.StatusCode} {resp.ReasonPhrase} - {body}");
				}

				var token = await resp.Content.ReadFromJsonAsync<CoreClientTokenResponse>(cancellationToken: ct)
							?? throw new InvalidOperationException("Connect deserialization returned null.");
				
				// Cache with small skew to avoid edge expiry
				var ttl = TimeSpan.FromSeconds(Math.Max(60, token.expires_in - 60));
				_cache.Set(CacheKey, token.access_token, ttl);
				return token.access_token;
			}
			finally
			{
				_gate.Release();
			}
		}

		public async Task ForceRefreshAsync()
		{
			await _gate.WaitAsync();
			try { _cache.Remove(CacheKey); }
			finally { _gate.Release(); }
		}
	}
}