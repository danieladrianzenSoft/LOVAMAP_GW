
using System;
using Infrastructure.IHelpers;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Helpers
{	
	public class DomainFileService : IDomainFileService
	{
		private static readonly string basePath = Path.Combine(Directory.GetParent(Directory.GetCurrentDirectory())!.FullName, "Data", "Domains");

		private readonly ILogger<DomainFileService> _logger;

		public DomainFileService(ILogger<DomainFileService> logger)
		{
			_logger = logger;
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

		public async Task<bool> DeleteFile(string filePath)
		{
			try
			{
				if (File.Exists(filePath))
				{
					await Task.Run(() => File.Delete(filePath)); // Run in background thread
					return true;
				}
				return false; // File not found
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, $"Failed to delete file: {filePath}");
				return false;
			}
		}
	}
}