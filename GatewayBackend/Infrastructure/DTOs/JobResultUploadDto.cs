namespace Infrastructure.DTOs
{
	public class JobResultUploadDto
	{
		public string ResultPath { get; set; } = default!;
		public string? Sha256 { get; set; }
	}
}
