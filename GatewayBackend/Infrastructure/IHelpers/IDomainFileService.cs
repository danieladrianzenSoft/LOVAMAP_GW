using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Infrastructure.IHelpers
{
	public interface IDomainFileService
	{
		Task<string> SaveGLBFile(byte[] glbBytes, int scaffoldId);
		Task<(string StagingPath, string FinalPath)> SaveGLBToStaging(byte[] glbBytes, int scaffoldId);
		Task<bool> TransferFromStaging(string stagingPath, string finalPath);
		string? GetStagingPath(string finalPath);
		string GetFilePath(int domainId);
		Task<bool> DeleteFile(string filePath);
		IEnumerable<string> GetStagedFiles();
	}
}
