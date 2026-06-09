using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Infrastructure.IHelpers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
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
		private readonly IHostEnvironment _env;

		public LovamapCoreJobService(IHttpClientFactory httpClientFactory,
			IJwtGeneratorHelper jwtGeneratorHelper,
			IConfiguration configuration,
			ILovamapCoreJobRepository jobRepository,
			IModelMapper modelMapper,
			DataContext context,
			ICoreApiClient coreApiClient,
			IHostEnvironment env,
			ILogger<LovamapCoreJobService> logger)
		{
			_httpClientFactory = httpClientFactory;
			_configuration = configuration;
			_jwtGeneratorHelper = jwtGeneratorHelper;
			_jobRepository = jobRepository;
			_modelMapper = modelMapper;
			_coreApiClient = coreApiClient;
			_env = env;
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

		public async Task<(bool Succeeded, string? ErrorMessage)> UploadJobResultAsync(
			Guid jobId,
			string resultFilePath,
			string? sha256)
		{
			try
			{
				var (succeeded, errorMessage, _) =
					await MarkJobCompletedAsync(jobId, resultFilePath, sha256 ?? "");

				if (!succeeded)
					return (false, errorMessage);

				return (true, null);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error storing result path for job {JobId}", jobId);
				return (false, "Internal error while storing job result path");
			}
		}

		public async Task<(bool Succeeded, string? ErrorMessage, JobResultFile? File)>
			GetJobResultFileAsync(Guid jobId)
		{
			var job = await _jobRepository.GetJobByIdAsync(jobId);
			if (job == null) return (false, "Job not found", null);

			if (string.IsNullOrWhiteSpace(job.ResultFilePath))
				return (false, "Job has no result file", null);

			// Resolve the stored path — it may be absolute (shared drive) or relative
			var storedPath = job.ResultFilePath;
			var fullFile = Path.IsPathRooted(storedPath)
				? storedPath
				: Path.GetFullPath(Path.Combine(GetJobResultsDir(), storedPath));

			var downloadName = $"job_{jobId}_results.json";
			var contentType = "application/json";

			// If the file exists locally (prod / Docker shared volume), serve from disk
			if (System.IO.File.Exists(fullFile))
			{
				return (true, null, new JobResultFile
				{
					FullPath = fullFile,
					DownloadFileName = downloadName,
					ContentType = contentType
				});
			}

			// Fallback: file not on disk (local dev against remote core) → fetch from core
			_logger.LogInformation("Result file not found locally for job {JobId}, fetching from core", jobId);

			var (fetchSucceeded, fetchError, resultBytes) =
				await FetchRawResultFromCoreAsync(jobId.ToString());

			if (!fetchSucceeded || resultBytes == null || resultBytes.Length == 0)
				return (false, fetchError ?? "Result file not found locally and could not be fetched from core", null);

			// Write to a temp file so the controller can stream it
			var tempPath = Path.Combine(Path.GetTempPath(), $"job_{jobId}_{Guid.NewGuid():N}.json");
			await System.IO.File.WriteAllBytesAsync(tempPath, resultBytes);

			return (true, null, new JobResultFile
			{
				FullPath = tempPath,
				DownloadFileName = downloadName,
				ContentType = contentType
			});
		}

		public async Task<Job?> GetByIdAsync(Guid jobId)
		{
			return await _jobRepository.GetJobByIdAsync(jobId);
		}

		public async Task<IEnumerable<JobToReturnDto>> GetJobsByCreatorIdAsync(string creatorId)
		{
			var jobs = await _jobRepository.GetJobsByCreatorIdAsync(creatorId);
			var jobToReturn = jobs.Select(_modelMapper.MapToJobToReturnDto).ToList();
			return jobToReturn;
		}

		// 4/13 JacklynX changed - get all jobs for admin use in dataset descriptor rules
		public async Task<IEnumerable<JobToReturnDto>> GetAllJobsAsync()
		{
			var jobs = await _jobRepository.GetAllJobsAsync();
			var jobToReturn = jobs.Select(_modelMapper.MapToJobToReturnDto).ToList();
			return jobToReturn;
		}

		public async Task<(bool Succeeded, string? ErrorMessage, Job? Job)> MarkJobCompletedAsync(Guid jobId, string resultFilePath, string sha256)
		{
			try
			{
				var resultingJob = await _jobRepository.MarkJobCompletedAsync(jobId, resultFilePath, sha256);
				if (resultingJob == null) return (false, "Job not found", null);

				await _context.SaveChangesAsync();
				return (true, null, resultingJob);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to mark job {JobId} as completed.", jobId);
				return (false, ex.Message, null);
			}
		}

		public async Task<(bool Succeeded, string? ErrorMessage, byte[]? ResultBytes)>
			FetchRawResultFromCoreAsync(string jobId, CancellationToken cancellationToken = default)
		{
			try
			{
				var response = await _coreApiClient.GetJobRawResultAsync(jobId, cancellationToken);

				if (!response.IsSuccessStatusCode)
				{
					var msg = $"lovamap_core returned {response.StatusCode} for job {jobId}";
					_logger.LogWarning("FetchRawResultFromCoreAsync: {Message}", msg);
					return (false, msg, null);
				}

				var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);

				if (bytes == null || bytes.Length == 0)
				{
					var msg = $"Empty result for job {jobId} from lovamap_core.";
					_logger.LogWarning("FetchRawResultFromCoreAsync: {Message}", msg);
					return (false, msg, null);
				}

				return (true, null, bytes);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error fetching raw result from lovamap_core for job {JobId}", jobId);
				return (false, "Error connecting to lovamap_core or reading result.", null);
			}
		}

		public string GetJobResultsDir()
		{
			var configured =
				_configuration["OutputPaths:JobResults"]
				?? Environment.GetEnvironmentVariable("JOB_RESULTS_PATH")
				?? "Data/JobResults";

			// If absolute (Docker: /app/Data/JobResults), use as-is.
			if (Path.IsPathRooted(configured))
				return configured;

			// In local dev, API content root is .../GatewayBackend/API
			// We want .../GatewayBackend/<configured>
			var gatewayBackendRoot = Directory.GetParent(_env.ContentRootPath)!.FullName;

			return Path.GetFullPath(Path.Combine(gatewayBackendRoot, configured));
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