using Infrastructure.DTOs;

namespace Services.IServices
{
	public interface IPublicationExportService
	{
		Task<(bool Succeeded, string ErrorMessage, PublicationComprehensiveExport? Export)> PrepareComprehensiveExportAsync(int publicationId, string userId);
		Task WriteComprehensiveExportZipAsync(PublicationComprehensiveExport export, Stream output, CancellationToken cancellationToken = default);
	}

	public class PublicationComprehensiveExport
	{
		public PublicationSummaryDto Publication { get; set; } = null!;
		public IReadOnlyList<ScaffoldGroupDetailedDto> ScaffoldGroups { get; set; } = [];
		public string ZipFileName { get; set; } = "publication_data.zip";
	}
}
