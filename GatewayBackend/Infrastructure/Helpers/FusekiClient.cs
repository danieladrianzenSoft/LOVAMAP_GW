using System.Net.Http.Headers;
using System.Text;
using Infrastructure.DTOs;
using Infrastructure.IHelpers;
using Microsoft.Extensions.Options;

namespace Infrastructure.Helpers
{
	public sealed class FusekiClient : IFusekiClient
	{
		private readonly HttpClient _http;
		private readonly FusekiOptions _options;

		public FusekiClient(HttpClient http, IOptions<FusekiOptions> options)
		{
			_http = http;
			_options = options.Value ?? new FusekiOptions();

			if (string.IsNullOrWhiteSpace(_options.BaseUrl))
			{
				throw new ArgumentException("Fuseki BaseUrl is required.");
			}

			_http.BaseAddress = new Uri(_options.BaseUrl.TrimEnd('/') + "/");
			_http.Timeout = TimeSpan.FromSeconds(30);

			if (!string.IsNullOrWhiteSpace(_options.Username))
			{
				var authValue = Convert.ToBase64String(
					Encoding.UTF8.GetBytes($"{_options.Username}:{_options.Password}")
				);
				_http.DefaultRequestHeaders.Authorization =
					new AuthenticationHeaderValue("Basic", authValue);
			}
		}

		public async Task<string> QueryAsync(string sparqlQuery, CancellationToken ct = default)
		{
			if (string.IsNullOrWhiteSpace(sparqlQuery))
			{
				throw new ArgumentException("SPARQL query is required.", nameof(sparqlQuery));
			}

			return await QueryRawAsync(
				sparqlQuery,
				"application/sparql-results+json",
				ct
			);
		}

		public async Task<string> QueryRawAsync(string sparqlQuery, string accept, CancellationToken ct = default)
		{
			if (string.IsNullOrWhiteSpace(sparqlQuery))
			{
				throw new ArgumentException("SPARQL query is required.", nameof(sparqlQuery));
			}

			if (string.IsNullOrWhiteSpace(accept))
			{
				throw new ArgumentException("Accept header is required.", nameof(accept));
			}

			var endpoint = BuildEndpoint(_options.QueryPath);
			using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
			{
				Content = new StringContent(sparqlQuery, Encoding.UTF8, "application/sparql-query")
			};
			request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(accept));

			using var response = await _http.SendAsync(request, ct);
			response.EnsureSuccessStatusCode();
			return await response.Content.ReadAsStringAsync(ct);
		}

		public async Task<string> UpdateAsync(string sparqlUpdate, CancellationToken ct = default)
		{
			if (string.IsNullOrWhiteSpace(sparqlUpdate))
			{
				throw new ArgumentException("SPARQL update is required.", nameof(sparqlUpdate));
			}

			var endpoint = BuildEndpoint(_options.UpdatePath);
			using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
			{
				Content = new StringContent(sparqlUpdate, Encoding.UTF8, "application/sparql-update")
			};

			using var response = await _http.SendAsync(request, ct);
			response.EnsureSuccessStatusCode();
			return await response.Content.ReadAsStringAsync(ct);
		}

		public async Task<string> UploadTurtleAsync(string turtleContent, CancellationToken ct = default)
		{
			if (string.IsNullOrWhiteSpace(turtleContent))
			{
				throw new ArgumentException("Turtle content is required.", nameof(turtleContent));
			}

			var endpoint = BuildEndpoint(_options.DataPath);
			using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
			{
				Content = new StringContent(turtleContent, Encoding.UTF8, "text/turtle")
			};

			using var response = await _http.SendAsync(request, ct);
			response.EnsureSuccessStatusCode();
			return await response.Content.ReadAsStringAsync(ct);
		}

		private string BuildEndpoint(string path)
		{
			var trimmedPath = (path ?? string.Empty).TrimStart('/');
			if (string.IsNullOrWhiteSpace(_options.Dataset))
			{
				return trimmedPath;
			}

			return $"{_options.Dataset.Trim('/')}/{trimmedPath}";
		}
	}
}
