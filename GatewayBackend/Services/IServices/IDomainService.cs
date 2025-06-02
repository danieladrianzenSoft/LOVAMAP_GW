using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;
using System.Text.Json;

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
	}
}