using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;
using Microsoft.AspNetCore.Http;

namespace Services.IServices
{
	public interface ILovamapCoreJobService
	{
		// Task<(bool Succeeded, string? ErrorMessage, HttpResponseMessage? Response)> SubmitJob(
		// 		IFormFile? csvFile, IFormFile? datFile, string? jobId, string? dx);
		public string GetJobResultsDir();
		Task<Job?> GetByIdAsync(Guid jobId);
		Task<(bool Succeeeded, string? ErrorMEessage, string? FinalPath)> UploadJobResultAsync(
			Guid jobId,
			string tempFilePath,
			string sha256,
			string? contentType,
			CancellationToken cancellationToken = default
		);
		Task<(bool Succeeded, string? ErrorMessage, JobResultFile? File)> GetJobResultFileAsync(Guid jobId);
		Task<IEnumerable<JobToReturnDto>> GetJobsByCreatorIdAsync(string creatorId);
		Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitJob(JobSubmissionDto jobSubmissionDto);
		Task<(bool Succeeded, string? ErrorMessage, Job? Job)> MarkJobCompletedAsync(Guid jobId, string resultFilePath, string sha256);
		Task<(bool Succeeded, string? ErrorMessage, byte[]? ResultBytes)>FetchRawResultFromCoreAsync(string jobId, CancellationToken cancellationToken = default);
	}
}