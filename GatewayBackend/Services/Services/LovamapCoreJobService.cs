using System.Net.Http.Headers;
using System.Text.Json;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Repositories.IRepositories;
using Services.IServices;

namespace Services.Services
{	public class LovamapCoreJobService : ILovamapCoreJobService
	{
		private readonly IHttpClientFactory _httpClientFactory;
		private readonly IConfiguration _configuration;
    	private readonly ILogger<LovamapCoreJobService> _logger;

		public LovamapCoreJobService(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<LovamapCoreJobService> logger)
		{
			_httpClientFactory = httpClientFactory;
			_configuration = configuration;
			_logger = logger;
		}

		// public async Task<(bool Succeeded, string? ErrorMessage, HttpResponseMessage? Response)> SubmitJob(
		// 	IFormFile? csvFile, IFormFile? datFile, string? jobId, string? dx)
		// {
		// 	var client = _httpClientFactory.CreateClient();
		// 	var lovamapCoreUrl = _configuration["LOVAMAP_CORE:URL"];
		// 	var requestUrl = lovamapCoreUrl + "/jobs";

		// 	using var form = new MultipartFormDataContent();

		// 	if (csvFile != null)
		// 	{
		// 		var csvStream = csvFile.OpenReadStream();
		// 		var csvContent = new StreamContent(csvStream);
		// 		csvContent.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
		// 		form.Add(csvContent, "file", csvFile.FileName);
		// 	}

		// 	if (datFile != null)
		// 	{
		// 		var datStream = datFile.OpenReadStream();
		// 		var datContent = new StreamContent(datStream);
		// 		datContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
		// 		form.Add(datContent, "file", datFile.FileName);
		// 	}

		// 	// Add jobId and dxValue
		// 	if (!string.IsNullOrWhiteSpace(jobId))
		// 		form.Add(new StringContent(jobId), "jobId");

		// 	if (!string.IsNullOrWhiteSpace(dx))
		// 		form.Add(new StringContent(dx), "dx");

		// 	try
		// 	{
		// 		var response = await client.PostAsync(requestUrl, form);

		// 		if (response.IsSuccessStatusCode)
		// 		{
		// 			return (true, null, response);
		// 		}
		// 		else
		// 		{
		// 			var content = await response.Content.ReadAsStringAsync();
		// 			_logger.LogWarning($"Lovamap Core returned {response.StatusCode}: {content}");
		// 			return (false, $"Lovamap Core returned {response.StatusCode}: {content}", response);
		// 		}

		// 	}
		// 	catch (HttpRequestException ex)
		// 	{
		// 		_logger.LogError(ex, $"Lovamap Core could not be reached at {requestUrl}");
		// 		return (false, $"Lovamap Core could not be reached at {requestUrl}", null);
		// 	}
		// 	catch (Exception ex)
		// 	{
		// 		_logger.LogError(ex, "Unexpected error communicating with Lovamap Core.");
        // 		return (false, "Unexpected error communicating with Lovamap Core.", null);
		// 	}
		// }

		public async Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitJob(
			IFormFile? csvFile, IFormFile? datFile, string? jobId, string? dx)
		{
			var client = _httpClientFactory.CreateClient();
			var lovamapCoreUrl = _configuration["LOVAMAP_CORE:URL"];
			var requestUrl = lovamapCoreUrl + "/jobs";

			using var form = new MultipartFormDataContent();

			if (csvFile != null)
			{
				var csvStream = csvFile.OpenReadStream();
				var csvContent = new StreamContent(csvStream);
				csvContent.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
				form.Add(csvContent, "file", csvFile.FileName);
			}

			if (datFile != null)
			{
				var datStream = datFile.OpenReadStream();
				var datContent = new StreamContent(datStream);
				datContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
				form.Add(datContent, "file", datFile.FileName);
			}

			// Add jobId and dxValue
			if (!string.IsNullOrWhiteSpace(jobId))
				form.Add(new StringContent(jobId), "jobId");

			if (!string.IsNullOrWhiteSpace(dx))
				form.Add(new StringContent(dx), "dx");

			try
			{
				var response = await client.PostAsync(requestUrl, form);

				if (response.IsSuccessStatusCode)
				{
					var responseContent = await response.Content.ReadAsStringAsync();

					try
					{
						var job = JsonSerializer.Deserialize<Job>(responseContent, new JsonSerializerOptions
						{
							PropertyNameCaseInsensitive = true
						});

						return (true, null, job);
					}
					catch (Exception ex)
					{
						_logger.LogError(ex, "Failed to deserialize job from Lovamap Core.");
						return (false, "Failed to deserialize job from Lovamap Core.", null);
					}
				}
				else
				{
					var content = await response.Content.ReadAsStringAsync();
					_logger.LogWarning($"Lovamap Core returned {response.StatusCode}: {content}");
					return (false, $"Lovamap Core returned {response.StatusCode}: {content}", null);
				}

			}
			catch (HttpRequestException ex)
			{
				_logger.LogError(ex, $"Lovamap Core could not be reached at {requestUrl}");
				return (false, $"Lovamap Core could not be reached at {requestUrl}", null);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unexpected error communicating with Lovamap Core.");
        		return (false, "Unexpected error communicating with Lovamap Core.", null);
			}
		}
	}
}