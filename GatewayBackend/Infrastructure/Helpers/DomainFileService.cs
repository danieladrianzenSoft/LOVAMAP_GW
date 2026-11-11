
using System;
using Infrastructure.IHelpers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Helpers
{
	public class DomainFileService : IDomainFileService
	{
		private readonly string _basePath;
		private readonly string _stagingPath;
		private readonly ILogger<DomainFileService> _logger;

		public DomainFileService(string basePath, string stagingPath, ILogger<DomainFileService> logger)
		{
			_logger = logger;
			_basePath = basePath;
			_stagingPath = stagingPath;

			if (!Directory.Exists(basePath))
			{
				Directory.CreateDirectory(basePath);
			}
			if (!Directory.Exists(stagingPath))
			{
				Directory.CreateDirectory(stagingPath);
			}
		}
		// GLB magic bytes: "glTF" = 0x67 0x6C 0x54 0x46
		private static readonly byte[] GlbMagic = { 0x67, 0x6C, 0x54, 0x46 };

		private const int MaxWriteRetries = 3;
		private const int VerifyDelayMs = 100;
		private const int ChunkSize = 512 * 1024; // 512KB — NFS mount from Docker fails on writes > ~512KB

		public async Task<string> SaveGLBFile(byte[] glbBytes, int scaffoldId)
		{
			if (glbBytes.Length < 12 || !glbBytes.AsSpan(0, 4).SequenceEqual(GlbMagic))
			{
				var preview = System.Text.Encoding.UTF8.GetString(glbBytes, 0, Math.Min(glbBytes.Length, 100));
				throw new InvalidOperationException(
					$"Refusing to save invalid GLB for scaffold {scaffoldId}: " +
					$"expected glTF magic bytes but got {glbBytes.Length} bytes starting with: {preview}");
			}

			var filePath = Path.Combine(_basePath, $"{scaffoldId}_{Guid.NewGuid()}.glb");

			for (int attempt = 1; attempt <= MaxWriteRetries; attempt++)
			{
				// Write with explicit flush to force data to underlying storage
				await using (var fs = new FileStream(filePath, FileMode.Create, FileAccess.Write,
					FileShare.None, bufferSize: 4096, FileOptions.WriteThrough))
				{
					await fs.WriteAsync(glbBytes);
					await fs.FlushAsync();
				}

				// Small delay to let mounted filesystem sync
				await Task.Delay(VerifyDelayMs);

				// Read back and verify
				var verification = new byte[4];
				await using (var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read))
				{
					var bytesRead = await fs.ReadAsync(verification);
					if (bytesRead == 4 && verification.AsSpan().SequenceEqual(GlbMagic))
					{
						// Also verify file length matches
						if (fs.Length == glbBytes.Length)
						{
							_logger.LogInformation("GLB verified on disk: {FilePath} ({Bytes} bytes, attempt {Attempt})",
								filePath, glbBytes.Length, attempt);
							return filePath;
						}
					}
				}

				_logger.LogWarning(
					"GLB verification failed for {FilePath} (attempt {Attempt}/{Max}): " +
					"first4=[{B0:X2} {B1:X2} {B2:X2} {B3:X2}]",
					filePath, attempt, MaxWriteRetries,
					verification[0], verification[1], verification[2], verification[3]);
			}

			// All retries exhausted — clean up and fail
			try { File.Delete(filePath); } catch { /* best effort */ }
			throw new IOException(
				$"Failed to write valid GLB to disk after {MaxWriteRetries} attempts for scaffold {scaffoldId}. " +
				$"The mounted volume may have write issues.");
		}

		public async Task<(string StagingPath, string FinalPath)> SaveGLBToStaging(byte[] glbBytes, int scaffoldId)
		{
			if (glbBytes.Length < 12 || !glbBytes.AsSpan(0, 4).SequenceEqual(GlbMagic))
			{
				var preview = System.Text.Encoding.UTF8.GetString(glbBytes, 0, Math.Min(glbBytes.Length, 100));
				throw new InvalidOperationException(
					$"Refusing to save invalid GLB for scaffold {scaffoldId}: " +
					$"expected glTF magic bytes but got {glbBytes.Length} bytes starting with: {preview}");
			}

			var fileName = $"{scaffoldId}_{Guid.NewGuid()}.glb";
			var stagingPath = Path.Combine(_stagingPath, fileName);
			var finalPath = Path.Combine(_basePath, fileName);

			// Local disk write — fast and reliable, no retry needed
			await File.WriteAllBytesAsync(stagingPath, glbBytes);

			_logger.LogInformation("GLB staged: {StagingPath} ({Bytes} bytes) → final {FinalPath}",
				stagingPath, glbBytes.Length, finalPath);

			return (stagingPath, finalPath);
		}

		public async Task<bool> TransferFromStaging(string stagingPath, string finalPath)
		{
			try
			{
				if (!File.Exists(stagingPath))
				{
					_logger.LogWarning("Staging file not found: {StagingPath}", stagingPath);
					return false;
				}

				var sourceBytes = await File.ReadAllBytesAsync(stagingPath);
				if (sourceBytes.Length < 12 || !sourceBytes.AsSpan(0, 4).SequenceEqual(GlbMagic))
				{
					_logger.LogError("Staging file has invalid GLB content: {StagingPath}", stagingPath);
					return false;
				}

				// Ensure destination directory exists
				var destDir = Path.GetDirectoryName(finalPath);
				if (destDir != null && !Directory.Exists(destDir))
				{
					Directory.CreateDirectory(destDir);
				}

				// Write to mount in 512KB chunks — NFS from Docker can't handle large writes
				for (int attempt = 1; attempt <= MaxWriteRetries; attempt++)
				{
					await using (var fs = new FileStream(finalPath, FileMode.Create, FileAccess.Write,
						FileShare.None, bufferSize: ChunkSize, FileOptions.WriteThrough))
					{
						for (int offset = 0; offset < sourceBytes.Length; offset += ChunkSize)
						{
							var length = Math.Min(ChunkSize, sourceBytes.Length - offset);
							await fs.WriteAsync(sourceBytes.AsMemory(offset, length));
							await fs.FlushAsync();
						}
					}

					await Task.Delay(VerifyDelayMs);

					var verification = new byte[4];
					await using (var fs = new FileStream(finalPath, FileMode.Open, FileAccess.Read, FileShare.Read))
					{
						var bytesRead = await fs.ReadAsync(verification);
						if (bytesRead == 4 && verification.AsSpan().SequenceEqual(GlbMagic) && fs.Length == sourceBytes.Length)
						{
							// Transfer verified — delete staging copy
							try { File.Delete(stagingPath); } catch { /* best effort */ }

							_logger.LogInformation("Transferred from staging: {StagingPath} → {FinalPath} ({Bytes} bytes, attempt {Attempt})",
								stagingPath, finalPath, sourceBytes.Length, attempt);
							return true;
						}
					}

					_logger.LogDebug("Transfer verification failed for {FinalPath} (attempt {Attempt}/{Max})",
						finalPath, attempt, MaxWriteRetries);
				}

				_logger.LogDebug("Failed to transfer {StagingPath} → {FinalPath} after {Max} attempts",
					stagingPath, finalPath, MaxWriteRetries);
				return false;
			}
			catch (IOException)
			{
				// Expected when mount is down — worker summary handles logging
				return false;
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unexpected error transferring {StagingPath} → {FinalPath}", stagingPath, finalPath);
				return false;
			}
		}

		public string? GetStagingPath(string finalPath)
		{
			var fileName = Path.GetFileName(finalPath);
			var stagingPath = Path.Combine(_stagingPath, fileName);
			return File.Exists(stagingPath) ? stagingPath : null;
		}

		public IEnumerable<string> GetStagedFiles()
		{
			if (!Directory.Exists(_stagingPath))
				return Enumerable.Empty<string>();

			return Directory.GetFiles(_stagingPath, "*.glb");
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
