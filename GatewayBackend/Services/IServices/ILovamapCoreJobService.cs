using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;
using Microsoft.AspNetCore.Http;

namespace Services.IServices
{
	public interface ILovamapCoreJobService
	{
		public string GetJobResultsDir();
		Task<Job?> GetByIdAsync(Guid jobId);
		Task<(bool Succeeded, string? ErrorMessage)> UploadJobResultAsync(
			Guid jobId,
			string resultFilePath,
			string? sha256
		);
		Task<(bool Succeeded, string? ErrorMessage, JobResultFile? File)> GetJobResultFileAsync(Guid jobId);
		Task<IEnumerable<JobToReturnDto>> GetJobsByCreatorIdAsync(string creatorId);
		Task<IEnumerable<JobToReturnDto>> GetAllJobsAsync();
		Task<IEnumerable<Job>> GetActiveJobsAsync();
		Task<(bool StatusChanged, Job? Job)> SyncJobStatusAsync(Guid jobId);
		Task<Job?> TimeoutJobAsync(Guid jobId);
		Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitJob(JobSubmissionDto jobSubmissionDto);
		Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitSegmentationJob(SegmentationJobSubmissionDto dto);
		Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitMeshJob(MeshJobSubmissionDto dto);
		Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitLovamapFromSourceJob(LovamapFromSourceJobDto dto);
		Task<(bool Succeeded, string? ErrorMessage, Job? Job)> MarkJobCompletedAsync(Guid jobId, string resultFilePath, string sha256);
		Task<(bool Succeeded, string? ErrorMessage, byte[]? ResultBytes)>FetchRawResultFromCoreAsync(string jobId, CancellationToken cancellationToken = default);
		Task<(bool Succeeded, string? ErrorMessage, byte[]? MeshBytes)> FetchJobMeshFromCoreAsync(string jobId, CancellationToken cancellationToken = default);
	}
}