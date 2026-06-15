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
using Microsoft.EntityFrameworkCore;
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
		private readonly ITifValidationService _tifValidationService;
		private readonly IScaffoldGroupService _scaffoldGroupService;
		private readonly IDomainFileService _domainFileService;

		public LovamapCoreJobService(IHttpClientFactory httpClientFactory,
			IJwtGeneratorHelper jwtGeneratorHelper,
			IConfiguration configuration,
			ILovamapCoreJobRepository jobRepository,
			IModelMapper modelMapper,
			DataContext context,
			ICoreApiClient coreApiClient,
			IHostEnvironment env,
			ILogger<LovamapCoreJobService> logger,
			ITifValidationService tifValidationService,
			IScaffoldGroupService scaffoldGroupService,
			IDomainFileService domainFileService)
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
			_tifValidationService = tifValidationService;
			_scaffoldGroupService = scaffoldGroupService;
			_domainFileService = domainFileService;
		}

		public async Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitJob(JobSubmissionDto dto)
		{
			// 0) Enforce exactly one file (Core reads only a single "file")
			var hasCsv = dto.CsvFile is not null;
			var hasDat = dto.DatFile is not null;
			var hasJson = dto.JsonFile is not null;

			var fileCount = (hasCsv ? 1 : 0) + (hasDat ? 1 : 0) + (hasJson ? 1 : 0);
			if (fileCount == 0)
				return (false, "No file supplied.", null);

			if (fileCount > 1)
				return (false, "Provide exactly one file (CSV, DAT, or JSON).", null);

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
			else if (hasDat)
			{
				var s = dto.DatFile!.OpenReadStream();
				var content = new StreamContent(s);
				content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
				form.Add(content, "file", dto.DatFile.FileName);
			}
			else if (hasJson)
			{
				var s = dto.JsonFile!.OpenReadStream();
				var content = new StreamContent(s);
				content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
				form.Add(content, "file", dto.JsonFile.FileName);
			}

			// 4) Required fields that Core expects
			form.Add(new StringContent(job.Id.ToString()), "jobId");
			form.Add(new StringContent(string.IsNullOrWhiteSpace(dto.Dx) ? "1" : dto.Dx), "dx");
			form.Add(new StringContent(uploadUrl), "uploadUrl");
			form.Add(new StringContent(uploadToken), "uploadToken");
			form.Add(new StringContent("true"), "generateMesh");
			form.Add(new StringContent("true"), "generateParticleMesh");

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

		public async Task<IEnumerable<Job>> GetActiveJobsAsync()
		{
			return await _jobRepository.GetActiveJobsAsync();
		}

		public async Task<(bool StatusChanged, Job? Job)> SyncJobStatusAsync(Guid jobId)
		{
			var job = await _jobRepository.GetJobByIdAsync(jobId);
			if (job == null) return (false, null);

			HttpResponseMessage response;
			try
			{
				response = await _coreApiClient.GetJobStatusAsync(jobId.ToString());
			}
			catch (Exception ex)
			{
				_logger.LogWarning(ex, "Failed to fetch status from Core for job {JobId}", jobId);
				return (false, job);
			}

			if (!response.IsSuccessStatusCode)
			{
				_logger.LogWarning("Core returned {Status} when polling job {JobId}", response.StatusCode, jobId);

				// 404 means Core doesn't have this job yet (or it was lost).
				// Tolerate up to 10 consecutive 404s before marking as failed,
				// since Core may still be initializing the job.
				if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
				{
					job.RetryCount++;
					if (job.RetryCount >= 10)
					{
						await _jobRepository.UpdateJobFromCoreAsync(
							jobId,
							JobStatus.Failed,
							null,
							"Job not found on processing server after multiple attempts.",
							DateTime.UtcNow);
						await _context.SaveChangesAsync();
						_logger.LogInformation("Job {JobId} marked as Failed — not found on Core after {Retries} polls", jobId, job.RetryCount);
						return (true, job);
					}

					await _context.SaveChangesAsync();
					_logger.LogDebug("Job {JobId} not found on Core (attempt {Attempt}/10)", jobId, job.RetryCount);
					return (false, job);
				}

				return (false, job);
			}

			var body = await response.Content.ReadAsStringAsync();
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
				_logger.LogWarning(ex, "Failed to deserialize Core status for job {JobId}", jobId);
				return (false, job);
			}

			if (coreJob == null) return (false, job);

			// Reset retry count on successful poll
			if (job.RetryCount > 0)
			{
				job.RetryCount = 0;
				await _context.SaveChangesAsync();
			}

			var coreStatus = (JobStatus)coreJob.Status;
			_logger.LogDebug("Job {JobId}: Core status int={CoreStatusInt} enum={CoreStatus}, GW status={GwStatus}",
				jobId, coreJob.Status, coreStatus, job.Status);
			if (coreStatus == job.Status) return (false, job);

			var oldStatus = job.Status;
			await _jobRepository.UpdateJobFromCoreAsync(
				jobId,
				coreStatus,
				coreJob.ResultPath,
				coreJob.ErrorMessage,
				coreJob.CompletedAt);
			await _context.SaveChangesAsync();

			_logger.LogInformation("Job {JobId} transitioned from {OldStatus} to {NewStatus}", jobId, oldStatus, coreStatus);
			return (true, job);
		}

		public async Task<Job?> TimeoutJobAsync(Guid jobId)
		{
			var job = await _jobRepository.UpdateJobFromCoreAsync(
				jobId,
				JobStatus.Failed,
				null,
				"Job timed out — no status update received from processing server.",
				DateTime.UtcNow);
			if (job != null)
				await _context.SaveChangesAsync();
			return job;
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

		public async Task<(bool Succeeded, string? ErrorMessage, byte[]? MeshBytes)>
			FetchJobMeshFromCoreAsync(string jobId, CancellationToken cancellationToken = default)
		{
			try
			{
				var response = await _coreApiClient.GetJobMeshAsync(jobId, cancellationToken);

				if (!response.IsSuccessStatusCode)
				{
					var msg = $"lovamap_core returned {response.StatusCode} for mesh of job {jobId}";
					_logger.LogWarning("FetchJobMeshFromCoreAsync: {Message}", msg);
					return (false, msg, null);
				}

				var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);

				if (bytes == null || bytes.Length == 0)
				{
					var msg = $"Empty mesh for job {jobId} from lovamap_core.";
					_logger.LogWarning("FetchJobMeshFromCoreAsync: {Message}", msg);
					return (false, msg, null);
				}

				return (true, null, bytes);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error fetching mesh from lovamap_core for job {JobId}", jobId);
				return (false, "Error connecting to lovamap_core or reading mesh.", null);
			}
		}

		public async Task<(bool Succeeded, string? ErrorMessage, byte[]? MeshBytes)>
			FetchJobParticleMeshFromCoreAsync(Guid jobId, CancellationToken cancellationToken = default)
		{
			var job = await _jobRepository.GetJobByIdAsync(jobId);
			if (job == null)
				return (false, "Job not found.", null);

			// Chained from ParticleSegmentation: Core resolves mesh-gen from the source job
			string meshId;
			if (!string.IsNullOrEmpty(job.SourceJobId))
				meshId = job.SourceJobId;
			else if (job.JobType == JobType.Lovamap)
				meshId = job.Id.ToString() + "-mesh-gen";
			else
				return (false, "Job does not have a particle mesh.", null);

			return await FetchJobMeshFromCoreAsync(meshId, cancellationToken);
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


		public async Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitSegmentationJob(SegmentationJobSubmissionDto dto)
		{
			// 1) Validate the TIF file
			var validation = await _tifValidationService.ValidateAsync(dto.TifFile);
			if (!validation.IsValid)
			{
				var errorMsg = string.Join("; ", validation.Errors);
				_logger.LogWarning("TIF validation failed: {Errors}", errorMsg);
				return (false, errorMsg, null);
			}

			// 2) Create local GW job record
			var job = new Job
			{
				Id = Guid.NewGuid(),
				JobType = JobType.ParticleSegmentation,
				CreatorId = dto.CreatorId,
				SubmittedAt = DateTime.UtcNow,
				Status = JobStatus.Pending
			};
			_jobRepository.Add(job);
			await _context.SaveChangesAsync();

			// 3) Prepare upload token + URL for Core callback
			var uploadToken = _jwtGeneratorHelper.GenerateUploadJwt(job.Id.ToString(), job.CreatorId);
			var uploadUrl = _configuration["LOVAMAP_GW:URL"] + $"/jobs/{job.Id}/upload";

			// 4) Build multipart form for Core
			using var form = new MultipartFormDataContent();

			var s = dto.TifFile.OpenReadStream();
			var fileContent = new StreamContent(s);
			fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/tiff");
			form.Add(fileContent, "file", dto.TifFile.FileName);

			form.Add(new StringContent(job.Id.ToString()), "jobId");
			form.Add(new StringContent("ParticleSegmentation"), "jobType");
			form.Add(new StringContent(dto.FluorescentLabel), "fluorescentLabel");
			form.Add(new StringContent(dto.RadiusUm), "radiusUm");
			form.Add(new StringContent(uploadUrl), "uploadUrl");
			form.Add(new StringContent(uploadToken), "uploadToken");

			// Use DTO values if provided, otherwise use extracted metadata
			var dx = dto.Dx ?? validation.Dx?.ToString(System.Globalization.CultureInfo.InvariantCulture);
			var dy = dto.Dy ?? validation.Dy?.ToString(System.Globalization.CultureInfo.InvariantCulture);
			var dz = dto.Dz ?? validation.Dz?.ToString(System.Globalization.CultureInfo.InvariantCulture);

			if (!string.IsNullOrWhiteSpace(dx)) form.Add(new StringContent(dx), "dx");
			if (!string.IsNullOrWhiteSpace(dy)) form.Add(new StringContent(dy), "dy");
			if (!string.IsNullOrWhiteSpace(dz)) form.Add(new StringContent(dz), "dz");

			// 5) Call Core
			HttpResponseMessage response;
			try
			{
				response = await _coreApiClient.SubmitJobAsync(form);
			}
			catch (HttpRequestException ex)
			{
				_logger.LogError(ex, "Lovamap Core unreachable for segmentation job.");
				return (false, "Lovamap Core could not be reached", null);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unexpected error submitting segmentation job to Core.");
				return (false, "Unexpected error communicating with Lovamap Core.", null);
			}

			var body = await response.Content.ReadAsStringAsync();

			if (!response.IsSuccessStatusCode)
			{
				_logger.LogWarning("Core returned {Status} for segmentation job: {Body}", response.StatusCode, body);
				return (false, $"Lovamap Core returned {response.StatusCode}: {body}", null);
			}

			// 6) Parse response
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
				_logger.LogError(ex, "Failed to deserialize Core segmentation job response.");
				return (false, "Failed to deserialize Core Job.", null);
			}

			if (coreJob is null)
				return (false, "Lovamap Core returned empty body.", null);

			var mapped = _modelMapper.MapToJob(coreJob);
			mapped.JobType = JobType.ParticleSegmentation;
			return (true, null, mapped);
		}

		public async Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitMeshJob(MeshJobSubmissionDto dto)
		{
			// 1) Validate workflow value
			var validWorkflows = new[] { "mesh_generation", "unite_meshes" };
			if (!validWorkflows.Contains(dto.MeshWorkflow))
				return (false, $"Invalid mesh workflow '{dto.MeshWorkflow}'. Must be 'mesh_generation' or 'unite_meshes'.", null);

			// 2) Validate file extension
			var ext = Path.GetExtension(dto.File.FileName).ToLowerInvariant();
			var validExtensions = new[] { ".json", ".csv", ".dat" };
			if (!validExtensions.Contains(ext))
				return (false, $"Invalid file type '{ext}'. Accepted: .json, .csv, .dat.", null);

			// 3) Create local GW job record
			var job = new Job
			{
				Id = Guid.NewGuid(),
				JobType = JobType.MeshProcessing,
				CreatorId = dto.CreatorId,
				SubmittedAt = DateTime.UtcNow,
				Status = JobStatus.Pending
			};
			_jobRepository.Add(job);
			await _context.SaveChangesAsync();

			// 4) Prepare upload token + URL for Core callback
			var uploadToken = _jwtGeneratorHelper.GenerateUploadJwt(job.Id.ToString(), job.CreatorId);
			var uploadUrl = _configuration["LOVAMAP_GW:URL"] + $"/jobs/{job.Id}/upload";

			// 5) Build multipart form for Core
			using var form = new MultipartFormDataContent();

			var s = dto.File.OpenReadStream();
			var fileContent = new StreamContent(s);
			fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
			form.Add(fileContent, "file", dto.File.FileName);

			form.Add(new StringContent(job.Id.ToString()), "jobId");
			form.Add(new StringContent("MeshProcessing"), "jobType");
			form.Add(new StringContent(dto.MeshWorkflow), "meshWorkflow");
			form.Add(new StringContent(uploadUrl), "uploadUrl");
			form.Add(new StringContent(uploadToken), "uploadToken");

			// 6) Call Core
			HttpResponseMessage response;
			try
			{
				response = await _coreApiClient.SubmitJobAsync(form);
			}
			catch (HttpRequestException ex)
			{
				_logger.LogError(ex, "Lovamap Core unreachable for mesh job.");
				return (false, "Lovamap Core could not be reached", null);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unexpected error submitting mesh job to Core.");
				return (false, "Unexpected error communicating with Lovamap Core.", null);
			}

			var body = await response.Content.ReadAsStringAsync();

			if (!response.IsSuccessStatusCode)
			{
				_logger.LogWarning("Core returned {Status} for mesh job: {Body}", response.StatusCode, body);
				return (false, $"Lovamap Core returned {response.StatusCode}: {body}", null);
			}

			// 7) Parse response
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
				_logger.LogError(ex, "Failed to deserialize Core mesh job response.");
				return (false, "Failed to deserialize Core Job.", null);
			}

			if (coreJob is null)
				return (false, "Lovamap Core returned empty body.", null);

			var mapped = _modelMapper.MapToJob(coreJob);
			mapped.JobType = JobType.MeshProcessing;
			return (true, null, mapped);
		}

		public async Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitLovamapFromSourceJob(LovamapFromSourceJobDto dto)
		{
			// 1) Look up the source job
			var sourceJob = await _jobRepository.GetJobByIdAsync(dto.SourceJobId);
			if (sourceJob == null)
				return (false, "Source job not found.", null);

			// 2) Validate: must be completed ParticleSegmentation
			if (sourceJob.Status != JobStatus.Completed)
				return (false, "Source job is not completed.", null);

			if (sourceJob.JobType != JobType.ParticleSegmentation)
				return (false, "Source job is not a ParticleSegmentation job.", null);

			// 3) Create new GW job record
			var job = new Job
			{
				Id = Guid.NewGuid(),
				JobType = JobType.Lovamap,
				CreatorId = dto.CreatorId,
				SubmittedAt = DateTime.UtcNow,
				Status = JobStatus.Pending,
				SourceJobId = dto.SourceJobId.ToString()
			};
			_jobRepository.Add(job);
			await _context.SaveChangesAsync();

			// 4) Prepare upload token + URL for Core callback
			var uploadToken = _jwtGeneratorHelper.GenerateUploadJwt(job.Id.ToString(), job.CreatorId);
			var uploadUrl = _configuration["LOVAMAP_GW:URL"] + $"/jobs/{job.Id}/upload";

			// 5) Build multipart form for Core (no file — Core resolves from sourceJobId)
			using var form = new MultipartFormDataContent();
			form.Add(new StringContent(job.Id.ToString()), "jobId");
			form.Add(new StringContent("Lovamap"), "jobType");
			form.Add(new StringContent(dto.SourceJobId.ToString()), "sourceJobId");
			form.Add(new StringContent(string.IsNullOrWhiteSpace(dto.Dx) ? "1" : dto.Dx), "dx");
			form.Add(new StringContent(dto.GenerateMesh.ToString().ToLower()), "generateMesh");
			form.Add(new StringContent(uploadUrl), "uploadUrl");
			form.Add(new StringContent(uploadToken), "uploadToken");

			// 6) Call Core
			HttpResponseMessage response;
			try
			{
				response = await _coreApiClient.SubmitJobAsync(form);
			}
			catch (HttpRequestException ex)
			{
				_logger.LogError(ex, "Lovamap Core unreachable for lovamap-from-source job.");
				return (false, "Lovamap Core could not be reached", null);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unexpected error submitting lovamap-from-source job to Core.");
				return (false, "Unexpected error communicating with Lovamap Core.", null);
			}

			var body = await response.Content.ReadAsStringAsync();

			if (!response.IsSuccessStatusCode)
			{
				_logger.LogWarning("Core returned {Status} for lovamap-from-source job: {Body}", response.StatusCode, body);
				return (false, $"Lovamap Core returned {response.StatusCode}: {body}", null);
			}

			// 7) Parse response
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
				_logger.LogError(ex, "Failed to deserialize Core lovamap-from-source job response.");
				return (false, "Failed to deserialize Core Job.", null);
			}

			if (coreJob is null)
				return (false, "Lovamap Core returned empty body.", null);

			var mapped = _modelMapper.MapToJob(coreJob);
			mapped.JobType = JobType.Lovamap;
			mapped.SourceJobId = dto.SourceJobId.ToString();
			return (true, null, mapped);
		}

		public async Task<(bool Succeeded, string? ErrorMessage, int? ScaffoldGroupId, int? ScaffoldId)> SaveResultAsScaffoldAsync(
			Guid jobId, SaveLovamapResultDto dto, string userId, bool isAdmin)
		{
			// 1) Fetch and validate job
			var job = await _jobRepository.GetJobByIdAsync(jobId);
			if (job == null)
				return (false, "Job not found.", null, null);

			if (job.Status != JobStatus.Completed)
				return (false, "Job is not completed.", null, null);

			if (job.CreatorId != userId && !isAdmin)
				return (false, "Unauthorized.", null, null);

			// 2) Load result JSON
			var (fileOk, fileError, resultFile) = await GetJobResultFileAsync(jobId);
			if (!fileOk || resultFile == null)
				return (false, fileError ?? "Could not load job results.", null, null);

			JsonDocument resultsJson;
			try
			{
				var jsonBytes = await System.IO.File.ReadAllBytesAsync(resultFile.FullPath);
				resultsJson = JsonDocument.Parse(jsonBytes);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to parse result JSON for job {JobId}", jobId);
				return (false, "Failed to parse job result JSON.", null, null);
			}

			// 3) Map result to scaffold DTO
			var scaffoldDto = LovamapResultMapper.MapResultToScaffold(resultsJson);
			var (meanSize, stdDev) = LovamapResultMapper.GetParticleDiameterStats(resultsJson);

			// 4) Build ScaffoldGroupToCreateDto
			var particleGroup = new ParticlePropertyGroupToCreateDto
			{
				Shape = dto.Shape,
				Stiffness = dto.Stiffness,
				Dispersity = dto.Dispersity,
				MeanSize = meanSize,
				StandardDeviationSize = stdDev,
				Proportion = 1
			};

			var inputGroup = new InputGroupToCreateDto
			{
				ContainerShape = dto.ContainerShape,
				ContainerDimensions = dto.ContainerDimensions,
				PackingConfiguration = dto.PackingConfiguration,
				ParticlePropertyGroups = new List<ParticlePropertyGroupToCreateDto> { particleGroup }
			};

			var sgDto = new ScaffoldGroupToCreateDto
			{
				IsSimulated = true,
				InputGroup = inputGroup,
				Scaffolds = new List<ScaffoldToCreateDto> { scaffoldDto }
			};

			int scaffoldGroupId;

			if (dto.ScaffoldGroupId == null)
			{
				// 5a) Create new group
				var (created, createError, createdGroup) =
					await _scaffoldGroupService.CreateScaffoldGroup(sgDto, userId);

				if (!created || createdGroup == null)
					return (false, createError ?? "Failed to create scaffold group.", null, null);

				scaffoldGroupId = createdGroup.Id;

				// Mark new group as private
				var groupEntity = await _context.ScaffoldGroups.FindAsync(scaffoldGroupId);
				if (groupEntity != null)
				{
					groupEntity.IsPublic = false;
					groupEntity.OriginalFileName = $"LOVAMAP Job {jobId}";
				}
			}
			else
			{
				// 5b) Append to existing group
				scaffoldGroupId = dto.ScaffoldGroupId.Value;

				var (appended, appendError, _) =
					await _scaffoldGroupService.AppendScaffoldsToGroup(scaffoldGroupId, sgDto, userId);

				if (!appended)
					return (false, appendError ?? "Failed to append scaffold to group.", null, null);

				// Update the group's InputGroup particle properties
				var groupEntity = await _context.ScaffoldGroups
					.Include(g => g.InputGroup)
						.ThenInclude(ig => ig.ParticlePropertyGroups)
					.FirstOrDefaultAsync(g => g.Id == scaffoldGroupId);

				if (groupEntity?.InputGroup != null)
				{
					var ppg = groupEntity.InputGroup.ParticlePropertyGroups.FirstOrDefault();
					if (ppg != null)
					{
						ppg.Shape = dto.Shape;
						ppg.Stiffness = dto.Stiffness;
						ppg.Dispersity = dto.Dispersity;
						ppg.MeanSize = meanSize;
						ppg.StandardDeviationSize = stdDev;
					}
				}
			}

			// 6) Link job ↔ scaffold
			var scaffold = await _context.Scaffolds
				.Where(s => s.ScaffoldGroupId == scaffoldGroupId)
				.OrderByDescending(s => s.Id)
				.FirstOrDefaultAsync();

			if (scaffold != null)
			{
				scaffold.LatestJobId = jobId;
				job.ScaffoldId = scaffold.Id;
			}

			await _context.SaveChangesAsync();

			// 7) Auto-create domain entities from job meshes
			if (scaffold != null)
			{
				await CreateDomainsFromJobMeshesAsync(job, scaffold.Id, resultsJson);
			}

			return (true, null, scaffoldGroupId, scaffold?.Id);
		}

		public async Task<MeshStatusDto> GetMeshJobStatusesAsync(Guid jobId)
		{
			var job = await _jobRepository.GetJobByIdAsync(jobId);
			if (job == null)
				return new MeshStatusDto();

			var result = new MeshStatusDto();

			// Fetch children of the lovamap job (pore mesh-unite, and possibly mesh-gen for standalone)
			var lovamapChildren = await FetchChildJobsFromCoreAsync(jobId.ToString());

			if (lovamapChildren == null)
			{
				// Core is unreachable — report as unavailable
				result.PoreMeshStatus = "Unavailable";
				result.ParticleMeshStatus = "Unavailable";
				return result;
			}

			// Pore mesh: child whose jobId contains "mesh-unite"
			var poreMeshChild = lovamapChildren.FirstOrDefault(c =>
				c.JobId != null && c.JobId.Contains("mesh-unite"));
			result.PoreMeshStatus = poreMeshChild != null
				? ((JobStatus)poreMeshChild.Status).ToString()
				: null;

			// Particle mesh: depends on whether this is a chained or standalone job
			if (!string.IsNullOrEmpty(job.SourceJobId))
			{
				// Chained from segmentation — particle mesh is a child of the source job
				var sourceChildren = await FetchChildJobsFromCoreAsync(job.SourceJobId);
				if (sourceChildren == null)
				{
					result.ParticleMeshStatus = "Unavailable";
				}
				else
				{
					var particleMeshChild = sourceChildren.FirstOrDefault(c =>
						c.JobId != null && c.JobId.Contains("mesh-gen"));
					result.ParticleMeshStatus = particleMeshChild != null
						? ((JobStatus)particleMeshChild.Status).ToString()
						: null;
				}
			}
			else
			{
				// Standalone — particle mesh is a child of the lovamap job itself
				var particleMeshChild = lovamapChildren.FirstOrDefault(c =>
					c.JobId != null && c.JobId.Contains("mesh-gen"));
				result.ParticleMeshStatus = particleMeshChild != null
					? ((JobStatus)particleMeshChild.Status).ToString()
					: null;
			}

			return result;
		}

		private async Task<List<CoreJobDto>?> FetchChildJobsFromCoreAsync(string parentJobId)
		{
			try
			{
				var response = await _coreApiClient.GetJobChildrenAsync(parentJobId);

				if (!response.IsSuccessStatusCode)
				{
					_logger.LogWarning("Core returned {Status} for children of job {JobId}", response.StatusCode, parentJobId);
					return response.StatusCode == System.Net.HttpStatusCode.NotFound
						? new List<CoreJobDto>()
						: null;
				}

				var body = await response.Content.ReadAsStringAsync();
				var children = JsonSerializer.Deserialize<List<CoreJobDto>>(body, new JsonSerializerOptions
				{
					PropertyNameCaseInsensitive = true
				});

				return children ?? new List<CoreJobDto>();
			}
			catch (HttpRequestException ex)
			{
				_logger.LogWarning(ex, "Core unreachable when fetching children for job {JobId}", parentJobId);
				return null; // Core is down
			}
			catch (Exception ex)
			{
				_logger.LogWarning(ex, "Failed to fetch children for job {JobId}", parentJobId);
				return null;
			}
		}

		private async Task CreateDomainsFromJobMeshesAsync(Job job, int scaffoldId, JsonDocument resultsJson)
		{
			// Pore mesh: fetch from Core using the LOVAMAP job ID
			try
			{
				var (poreOk, _, poreMeshBytes) = await FetchJobMeshFromCoreAsync(job.Id.ToString());
				if (poreOk && poreMeshBytes != null && poreMeshBytes.Length > 0)
				{
					var filePath = await _domainFileService.SaveGLBFile(poreMeshBytes, scaffoldId);
					var poreDomain = new Domain
					{
						ScaffoldId = scaffoldId,
						Category = DomainCategory.Pores,
						MeshFilePath = filePath,
						DomainSize = "N/A",
						CreatedAt = DateTime.UtcNow,
						OriginalFileName = $"job_{job.Id}_pore_mesh.glb",
						Metadata = LovamapResultMapper.BuildPoreDomainMetadata(resultsJson),
					};
					_context.Domains.Add(poreDomain);
					_logger.LogInformation("Created Pores domain for scaffold {ScaffoldId} from job {JobId}", scaffoldId, job.Id);
				}
				else
				{
					_logger.LogWarning("Could not fetch pore mesh for job {JobId} — skipping Pores domain", job.Id);
				}
			}
			catch (Exception ex)
			{
				_logger.LogWarning(ex, "Failed to create Pores domain for scaffold {ScaffoldId}", scaffoldId);
			}

			// Particle mesh: from source ParticleSegmentation job or standalone Lovamap auto-gen
			string? particleMeshId = null;
			if (!string.IsNullOrEmpty(job.SourceJobId))
				particleMeshId = job.SourceJobId;
			else if (job.JobType == JobType.Lovamap)
				particleMeshId = job.Id.ToString() + "-mesh-gen";

			if (particleMeshId != null)
			{
				try
				{
					var (particleOk, _, particleMeshBytes) = await FetchJobMeshFromCoreAsync(particleMeshId);
					if (particleOk && particleMeshBytes != null && particleMeshBytes.Length > 0)
					{
						var filePath = await _domainFileService.SaveGLBFile(particleMeshBytes, scaffoldId);
						var particleDomain = new Domain
						{
							ScaffoldId = scaffoldId,
							Category = DomainCategory.Particles,
							MeshFilePath = filePath,
							DomainSize = "N/A",
							CreatedAt = DateTime.UtcNow,
							OriginalFileName = $"job_{job.Id}_particle_mesh.glb",
							Metadata = LovamapResultMapper.BuildParticleDomainMetadata(resultsJson),
						};
						_context.Domains.Add(particleDomain);
						_logger.LogInformation("Created Particles domain for scaffold {ScaffoldId} from mesh {MeshId}", scaffoldId, particleMeshId);
					}
					else
					{
						_logger.LogWarning("Could not fetch particle mesh {MeshId} — skipping Particles domain", particleMeshId);
					}
				}
				catch (Exception ex)
				{
					_logger.LogWarning(ex, "Failed to create Particles domain for scaffold {ScaffoldId}", scaffoldId);
				}
			}

			try
			{
				await _context.SaveChangesAsync();
			}
			catch (Exception ex)
			{
				_logger.LogWarning(ex, "Failed to persist domain entities for scaffold {ScaffoldId}", scaffoldId);
			}
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