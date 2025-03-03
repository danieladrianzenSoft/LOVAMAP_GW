using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Infrastructure.IHelpers
{
	public interface IDomainFileService
	{
		Task<string> SaveGLBFile(byte[] glbBytes, int scaffoldId);
		string GetFilePath(int domainId);
		bool DeleteFile(string filePath);
	}
}