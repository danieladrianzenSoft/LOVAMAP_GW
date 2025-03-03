
using System;
using Infrastructure.IHelpers;

namespace Infrastructure.Helpers
{	
	public class DomainFileService : IDomainFileService
	{
		private static readonly string basePath = Path.Combine(Directory.GetParent(Directory.GetCurrentDirectory())!.FullName, "Data", "Domains");

		public DomainFileService()
		{
        
			if (!Directory.Exists(basePath))
			{
				Directory.CreateDirectory(basePath);
			}
		}
		public async Task<string> SaveGLBFile(byte[] glbBytes, int scaffoldId)
		{
			var filePath = Path.Combine(basePath, $"{scaffoldId}_{Guid.NewGuid()}.glb");
			await File.WriteAllBytesAsync(filePath, glbBytes);
			return filePath;
		}

		public string GetFilePath(int domainId)
		{
			var file = Directory.GetFiles(basePath, $"{domainId}_*.glb").FirstOrDefault();
			return file ?? string.Empty;
		}

		public bool DeleteFile(string filePath)
		{
			if (File.Exists(filePath))
			{
				File.Delete(filePath);
				return true;
			}
			return false;
		}
	}
}