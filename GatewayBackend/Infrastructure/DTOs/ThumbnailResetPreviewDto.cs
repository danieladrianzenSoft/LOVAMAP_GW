namespace Infrastructure.DTOs
{
	public class ThumbnailResetPreviewDto
	{
		public List<int> ImageIdsToDelete { get; set; } = new();
		public List<int> ScaffoldsWithMeshIds { get; set; } = new();
		public List<int> OrphanedScaffoldIds { get; set; } = new();
	}
}
