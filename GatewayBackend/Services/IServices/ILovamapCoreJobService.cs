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
		Task<(bool Succeeded, string? ErrorMessage, Job? Job)> SubmitJob(
			IFormFile? csvFile, IFormFile? datFile, string? jobId, string? dx);
	}
}