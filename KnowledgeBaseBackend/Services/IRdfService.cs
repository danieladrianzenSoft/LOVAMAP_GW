using KnowledgeBaseApi.DTOs;

namespace KnowledgeBaseApi.Services
{
	public interface IRdfService
	{
		Task<RdfGraphDto> GetGraphAsync(int? limit = null, CancellationToken ct = default);
		Task<RdfOntologySummaryDto> GetOntologySummaryAsync(CancellationToken ct = default);
		Task<List<PaperDto>> GetPapersAsync(CancellationToken ct = default);
		Task<List<AuthorDto>> GetAuthorsAsync(CancellationToken ct = default);
		Task<List<JournalDto>> GetJournalsAsync(CancellationToken ct = default);
		Task<List<MaterialDto>> GetMaterialsAsync(CancellationToken ct = default);
		Task<List<ExperimentDto>> GetExperimentsAsync(CancellationToken ct = default);
		Task<List<OutcomeDto>> GetOutcomesAsync(CancellationToken ct = default);
		Task<List<FabricationMethodDto>> GetFabricationMethodsAsync(CancellationToken ct = default);
		Task<List<GeometryProfileDto>> GetGeometryProfilesAsync(CancellationToken ct = default);
	}
}
