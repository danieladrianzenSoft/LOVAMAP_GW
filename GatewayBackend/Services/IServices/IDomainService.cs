using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Infrastructure.Helpers;
using Data.Models;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace Services.IServices
{
	public interface IDomainService
	{
		Task<(bool Succeeded, string ErrorMessage, Byte[]? Mesh, DomainToVisualizeDto? Domain)> GetDomain(int scaffoldId, DomainCategory category);
		Task<(bool Succeeded, string ErrorMessage, JsonDocument? DomainMetadata)> GetDomainMetadata(int domainId);
		Task<(bool Succeeded, string ErrorMessage, DomainToVisualizeDto? Domain)> CreateDomain(DomainToCreateDto domainToCreate);
		Task<(bool Succeeded, string ErrorMessage)> UpdateDomainMetadata(DomainMetadataToUpdateDto dto);
		Task<(bool Succeeded, string ErrorMessage)> DeleteDomain(int domainId, string userId);
		Task<int?> GetRandomScaffoldIdForDomainAsync();
		Task<(bool Succeeded, string ErrorMessage, BatchReplaceResultDto? Result)> BatchReplaceMeshFiles(BatchReplaceRequestDto request);
		Task<List<(string FileName, string Category)>> GetAllOriginalFileNamesAsync();
		Task<PagedList<DomainListItemDto>> GetDomainList(DomainFilterParams filterParams);
		Task<DomainSummaryDto> GetDomainSummary();
		Task<(bool Succeeded, string ErrorMessage, BatchMetadataUpdateResultDto? Result)> BatchUpdateMetadata(BatchMetadataUpdateRequestDto request);
		Task<List<DomainLookupItemDto>> GetDomainLookupList();
		Task<(bool Succeeded, string ErrorMessage, BatchMetadataUpdateResultDto? Result)> BatchUpdateMetadataFromUpload(
			IList<IFormFile> metadataFiles, IList<IFormFile>? meshFiles, List<MetadataUploadMappingDto> mappings, bool includeMeshes);
		Task<List<int>> GetDomainsWithInvalidMeshes();
	}
}