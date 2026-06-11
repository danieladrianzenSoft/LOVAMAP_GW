using Microsoft.AspNetCore.Http;

namespace Services.IServices
{
	public class TifValidationResult
	{
		public bool IsValid { get; set; }
		public List<string> Errors { get; set; } = new();
		public double? Dx { get; set; }
		public double? Dy { get; set; }
		public double? Dz { get; set; }
		public string? Unit { get; set; }
		public int? ChannelCount { get; set; }
		public bool? IsBinarized { get; set; }
	}

	public interface ITifValidationService
	{
		Task<TifValidationResult> ValidateAsync(IFormFile tifFile);
	}
}
