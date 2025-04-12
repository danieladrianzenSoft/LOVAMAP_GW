
using System;
using Infrastructure.IHelpers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Helpers
{	
	public class DomainFileService : IDomainFileService
	{
		private readonly string _basePath;
		private readonly ILogger<DomainFileService> _logger;

		public DomainFileService(string basePath, ILogger<DomainFileService> logger)
		{
			_logger = logger;
			_basePath = basePath;

			if (!Directory.Exists(basePath))
			{
				Directory.CreateDirectory(basePath);
			}
		}
		public async Task<string> SaveGLBFile(byte[] glbBytes, int scaffoldId)
		{
			var filePath = Path.Combine(_basePath, $"{scaffoldId}_{Guid.NewGuid()}.glb");
			await File.WriteAllBytesAsync(filePath, glbBytes);
			return filePath;
		}

		public string GetFilePath(int domainId)
		{
			var file = Directory.GetFiles(_basePath, $"{domainId}_*.glb").FirstOrDefault();
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