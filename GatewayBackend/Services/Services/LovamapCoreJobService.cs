using System.Net.Http.Headers;
using System.Text.Json;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Infrastructure.IHelpers;
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
		private readonly IJwtGeneratorHelper _jwtGeneratorHelper;
		private readonly ILovamapCoreJobRepository _jobRepository;
		private readonly ICoreApiClient _coreApiClient;
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
    	private readonly ILogger<LovamapCoreJobService> _logger;

		public LovamapCoreJobService(IHttpClientFactory httpClientFactory,
			IJwtGeneratorHelper jwtGeneratorHelper,
			IConfiguration configuration,
			ILovamapCoreJobRepository jobRepository,
			IModelMapper modelMapper,
			DataContext context,
			ICoreApiClient coreApiClient,
			ILogger<LovamapCoreJobService> logger)
		{
			_httpClientFactory = httpClientFactory;
			_configuration = configuration;
			_jwtGeneratorHelper = jwtGeneratorHelper;
			_jobRepository = jobRepository;
			_modelMapper = modelMapper;
			_coreApiClient = coreApiClient;
			_context = context;
			_logger = logger;
		}

		public async Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitJob(JobSubmissionDto dto)
		{
			// 0) Enforce exactly one file (Core reads only a single "file")
			var hasCsv = dto.CsvFile is not null;
			var hasDat = dto.DatFile is not null;

			if (!hasCsv && !hasDat)
				return (false, "No file supplied.", null);

			if (hasCsv && hasDat)
				return (false, "Provide either CSV or DAT, not both.", null);

			// 1) Create and save the local GW job to get job.Id (you wanted this)
			var job = _modelMapper.MapToJob(dto);
			_jobRepository.Add(job);
			await _context.SaveChangesAsync();  // guarantees job.Id exists now

			// 2) Prepare upload token+URL that Core will call back to GW with
			var uploadToken = _jwtGeneratorHelper.GenerateUploadJwt(job.Id.ToString(), job.CreatorId);
			var uploadUrl = _configuration["LOVAMAP_GW:URL"] + $"/jobs/{job.Id}/upload";

			Console.WriteLine($"[DEBUG] uploadToken: {uploadToken}, uploadUrl: {uploadUrl}");

			using var form = new MultipartFormDataContent();

			// 3) Attach exactly one file under the "file" name
			if (hasCsv)
			{
				var s = dto.CsvFile!.OpenReadStream();             // stream disposed by form.Dispose()
				var content = new StreamContent(s);
				content.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
				form.Add(content, "file", dto.CsvFile.FileName);
			}
			else
			{
				var s = dto.DatFile!.OpenReadStream();
				var content = new StreamContent(s);
				content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
				form.Add(content, "file", dto.DatFile.FileName);
			}

			// 4) Required fields that Core expects
			form.Add(new StringContent(job.Id.ToString()), "jobId");
			form.Add(new StringContent(string.IsNullOrWhiteSpace(dto.Dx) ? "1" : dto.Dx), "dx");
			form.Add(new StringContent(uploadUrl), "uploadUrl");
			form.Add(new StringContent(uploadToken), "uploadToken");

			// 5) Call Core via the typed client (auth injected by CoreClientAuthHandler)
			HttpResponseMessage response;
			try
			{
				response = await _coreApiClient.SubmitJobAsync(form);
			}
			catch (HttpRequestException ex)
			{
				_logger.LogError(ex, "Lovamap Core unreachable.");
				return (false, "Lovamap Core could not be reached", null);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unexpected error communicating with Lovamap Core.");
				return (false, "Unexpected error communicating with Lovamap Core.", null);
			}

			var body = await response.Content.ReadAsStringAsync();

			if (!response.IsSuccessStatusCode)
			{
				_logger.LogWarning("Core returned {Status}: {Body}", response.StatusCode, body);
				return (false, $"Lovamap Core returned {response.StatusCode}: {body}", null);
			}

			// 6) Map Core’s response
			CoreJobDto? coreJob;
			try
			{
				coreJob = JsonSerializer.Deserialize<CoreJobDto>(body, new JsonSerializerOptions
				{
					PropertyNameCaseInsensitive = true
				});
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to deserialize Core Job DTO.");
				return (false, "Failed to deserialize Core Job.", null);
			}

			if (coreJob is null)
				return (false, "Lovamap Core returned empty body.", null);

			// 7) OPTIONAL: update your local GW job with Core metadata if you keep a link
			// (Uncomment/adjust if you have fields like CoreJobId, etc.)
			// job.CoreJobId = coreJob.Id;
			// job.CoreJobExternalKey = coreJob.JobId;
			// job.Status = MapCoreStatus(coreJob.Status);
			// await _context.SaveChangesAsync();

			// If you prefer to return a brand-new mapped Job object:
			var mapped = _modelMapper.MapToJob(coreJob);
			return (true, null, mapped);
		}


		// public async Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitJob(
		// 	JobSubmissionDto dto)
		// {
		// 	var client = _httpClientFactory.CreateClient();
		// 	var lovamapCoreUrl = _configuration["LOVAMAP_CORE:URL"];
		// 	var requestUrl = lovamapCoreUrl + "/jobs";
		// 	using var form = new MultipartFormDataContent();

		// 	if (dto.CsvFile != null)
		// 	{
		// 		var csvStream = dto.CsvFile.OpenReadStream();
		// 		var csvContent = new StreamContent(csvStream);
		// 		csvContent.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
		// 		form.Add(csvContent, "file", dto.CsvFile.FileName);
		// 	}

		// 	if (dto.DatFile != null)
		// 	{
		// 		var datStream = dto.DatFile.OpenReadStream();
		// 		var datContent = new StreamContent(datStream);
		// 		datContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
		// 		form.Add(datContent, "file", dto.DatFile.FileName);
		// 	}

		// 	var job = _modelMapper.MapToJob(dto);
		// 	_jobRepository.Add(job);
		// 	await _context.SaveChangesAsync();

		// 	var uploadToken = _jwtGeneratorHelper.GenerateUploadJwt(job.Id.ToString(), job.CreatorId);
		// 	var uploadUrl = _configuration["LOVAMAP_GW:URL"] + $"/jobs/{job.Id}/upload";

		// 	Console.WriteLine($"[DEBUG] uploadToken: {uploadToken}, uploadUrl: {uploadUrl}");

		// 	// Add form parameters: jobId, dxValue, uploadUrl and token
		// 	form.Add(new StringContent(job.Id.ToString()), "jobId");
		// 	form.Add(new StringContent(string.IsNullOrWhiteSpace(dto.Dx) ? "1" : dto.Dx), "dx");
		// 	form.Add(new StringContent(uploadUrl), "uploadUrl");
    	// 	form.Add(new StringContent(uploadToken), "uploadToken");

		// 	try
		// 	{
		// 		Console.WriteLine($"[DEBUG] Sent job submission to {requestUrl}");
		// 		var response = await client.PostAsync(requestUrl, form);

		// 		if (response.IsSuccessStatusCode)
		// 		{
		// 			var responseContent = await response.Content.ReadAsStringAsync();

		// 			try
		// 			{
		// 				var coreJob = JsonSerializer.Deserialize<CoreJobDto>(responseContent, new JsonSerializerOptions
		// 				{
		// 					PropertyNameCaseInsensitive = true
		// 				});

		// 				if (coreJob == null)
		// 				{
		// 					_logger.LogWarning("Lovamap Core returned empty body.");
		// 					return (false, "Lovamap Core returned empty body.", null);
		// 				}

		// 				var mappedJob = _modelMapper.MapToJob(coreJob);

		// 				return (true, null, mappedJob);
		// 			}
		// 			catch (Exception ex)
		// 			{
		// 				_logger.LogError(ex, "Failed to deserialize job from Lovamap Core.");
		// 				return (false, "Failed to deserialize job from Lovamap Core.", null);
		// 			}
		// 		}
		// 		else
		// 		{
		// 			var content = await response.Content.ReadAsStringAsync();
		// 			_logger.LogWarning($"Lovamap Core returned {response.StatusCode}: {content}");
		// 			return (false, $"Lovamap Core returned {response.StatusCode}: {content}", null);
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
	}
}