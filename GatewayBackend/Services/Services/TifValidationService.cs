using System.Text.RegularExpressions;
using BitMiracle.LibTiff.Classic;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Services.IServices;

namespace Services.Services
{
	public class TifValidationService : ITifValidationService
	{
		private readonly ILogger<TifValidationService> _logger;

		public TifValidationService(ILogger<TifValidationService> logger)
		{
			_logger = logger;
		}

		public async Task<TifValidationResult> ValidateAsync(IFormFile tifFile)
		{
			var result = new TifValidationResult();

			// Copy to a temp file because LibTiff needs a seekable stream
			var tempPath = Path.GetTempFileName();
			try
			{
				await using (var fs = File.Create(tempPath))
				{
					await tifFile.CopyToAsync(fs);
				}

				using var tif = Tiff.Open(tempPath, "r");
				if (tif == null)
				{
					result.Errors.Add("File is not a valid TIFF.");
					return result;
				}

				// --- Channel count ---
				int samplesPerPixel = 1;
				var sppField = tif.GetField(TiffTag.SAMPLESPERPIXEL);
				if (sppField != null && sppField.Length > 0)
					samplesPerPixel = sppField[0].ToInt();

				// Also check ImageJ description for channels=
				int channels = samplesPerPixel;
				string? imageDescription = null;
				var descField = tif.GetField(TiffTag.IMAGEDESCRIPTION);
				if (descField != null && descField.Length > 0)
					imageDescription = descField[0].ToString();

				if (!string.IsNullOrEmpty(imageDescription))
				{
					var channelMatch = Regex.Match(imageDescription, @"channels=(\d+)");
					if (channelMatch.Success)
						channels = int.Parse(channelMatch.Groups[1].Value);
				}

				result.ChannelCount = channels;

				if (channels != 1)
				{
					result.Errors.Add($"TIFF has {channels} channels; expected single-channel (1). Please provide a binarized single-channel image.");
				}

				// --- Binarization check ---
				result.IsBinarized = CheckBinarized(tif);
				if (result.IsBinarized == false)
				{
					result.Errors.Add("TIFF does not appear to be binarized. Expected only 2 unique pixel values (e.g. 0/1 or 0/255).");
				}

				// --- Extract dx, dy, dz from metadata ---
				ExtractResolution(tif, imageDescription, result);

				result.IsValid = result.Errors.Count == 0;
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error validating TIFF file {FileName}", tifFile.FileName);
				result.Errors.Add($"Error reading TIFF: {ex.Message}");
			}
			finally
			{
				try { File.Delete(tempPath); } catch { /* best effort */ }
			}

			return result;
		}

		private static bool? CheckBinarized(Tiff tif)
		{
			try
			{
				var bpsField = tif.GetField(TiffTag.BITSPERSAMPLE);
				int bitsPerSample = 8;
				if (bpsField != null && bpsField.Length > 0)
					bitsPerSample = bpsField[0].ToInt();

				// 1-bit images are inherently binary
				if (bitsPerSample == 1)
					return true;

				// For 8-bit or 16-bit, sample pixels to check if only 2 unique values
				int width = tif.GetField(TiffTag.IMAGEWIDTH)[0].ToInt();
				int height = tif.GetField(TiffTag.IMAGELENGTH)[0].ToInt();

				var uniqueValues = new HashSet<int>();
				int scanlineSize = tif.ScanlineSize();
				byte[] buffer = new byte[scanlineSize];

				// Sample up to 50 rows evenly spaced
				int step = Math.Max(1, height / 50);
				for (int row = 0; row < height; row += step)
				{
					if (!tif.ReadScanline(buffer, row))
						continue;

					if (bitsPerSample == 8)
					{
						for (int col = 0; col < Math.Min(width, buffer.Length); col++)
						{
							uniqueValues.Add(buffer[col]);
							if (uniqueValues.Count > 2) return false;
						}
					}
					else if (bitsPerSample == 16)
					{
						for (int col = 0; col < Math.Min(width, buffer.Length / 2); col++)
						{
							int val = buffer[col * 2] | (buffer[col * 2 + 1] << 8);
							uniqueValues.Add(val);
							if (uniqueValues.Count > 2) return false;
						}
					}
				}

				return uniqueValues.Count <= 2;
			}
			catch
			{
				return null; // could not determine
			}
		}

		private static void ExtractResolution(Tiff tif, string? imageDescription, TifValidationResult result)
		{
			// Try TIFF XResolution / YResolution tags
			double? xRes = GetRationalTag(tif, TiffTag.XRESOLUTION);
			double? yRes = GetRationalTag(tif, TiffTag.YRESOLUTION);

			// ResolutionUnit: 1=No unit, 2=inch, 3=centimeter
			int resUnit = 1;
			var resUnitField = tif.GetField(TiffTag.RESOLUTIONUNIT);
			if (resUnitField != null && resUnitField.Length > 0)
				resUnit = resUnitField[0].ToInt();

			// For microscopy TIFFs, resolution is often pixels-per-unit where unit is µm
			// XResolution = pixels per µm → dx = 1/XResolution
			if (xRes.HasValue && xRes.Value > 0)
				result.Dx = 1.0 / xRes.Value;
			if (yRes.HasValue && yRes.Value > 0)
				result.Dy = 1.0 / yRes.Value;

			// Parse ImageJ metadata for spacing (z) and unit
			if (!string.IsNullOrEmpty(imageDescription))
			{
				// ImageJ format: "spacing=0.5\nunit=um\n..."
				var spacingMatch = Regex.Match(imageDescription, @"spacing=([\d.eE+-]+)");
				if (spacingMatch.Success && double.TryParse(spacingMatch.Groups[1].Value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out double dz))
					result.Dz = dz;

				var unitMatch = Regex.Match(imageDescription, @"unit=(\S+)");
				if (unitMatch.Success)
					result.Unit = unitMatch.Groups[1].Value;

				// OME-XML fallback: <Pixels PhysicalSizeX="0.5" PhysicalSizeY="0.5" PhysicalSizeZ="1.0">
				if (imageDescription.Contains("<Pixels"))
				{
					var sxMatch = Regex.Match(imageDescription, @"PhysicalSizeX=""([\d.eE+-]+)""");
					var syMatch = Regex.Match(imageDescription, @"PhysicalSizeY=""([\d.eE+-]+)""");
					var szMatch = Regex.Match(imageDescription, @"PhysicalSizeZ=""([\d.eE+-]+)""");

					if (sxMatch.Success && double.TryParse(sxMatch.Groups[1].Value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out double sx))
						result.Dx = sx;
					if (syMatch.Success && double.TryParse(syMatch.Groups[1].Value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out double sy))
						result.Dy = sy;
					if (szMatch.Success && double.TryParse(szMatch.Groups[1].Value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out double sz))
						result.Dz = sz;
				}
			}
		}

		private static double? GetRationalTag(Tiff tif, TiffTag tag)
		{
			var field = tif.GetField(tag);
			if (field == null || field.Length == 0)
				return null;

			return field[0].ToDouble();
		}
	}
}
