using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Services.IServices
{
	public interface IPublicationDatasetService
	{
		Task<(bool Succeeded, string ErrorMessage, PublicationDatasetDto? publicationDatasetDto)> CreatePublicationDatasetAsync(PublicationDatasetForCreationDto datasetForCreationDto, string? currentUserId, bool isAdmin);
		Task<(bool Succeeded, string ErrorMessage, PublicationDatasetDto? publicationDatasetDto, bool? isNew)>UpsertPublicationDatasetAsync(PublicationDatasetForCreationDto datasetForUpsertDto, string? currentUserId, bool isAdmin);
		Task<(bool Succeeded, string ErrorMessage, PublicationDatasetDto? publicationDatasetDto)> UpdatePublicationScaffoldGroupsAsync(int publicationId, PublicationScaffoldGroupsUpdateDto dto, string? currentUserId, bool isAdmin);
		Task<(bool Succeeded, string ErrorMessage, PublicationDatasetDto? PublicationDataset)> GetPublicationDatasetByIdAsync(int datasetId);
	}
}
