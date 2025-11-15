using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Services.IServices
{
	public interface IPublicationDatasetService
	{
		Task<(bool Succeeded, string ErrorMessage, PublicationDatasetDto? publicationDatasetDto)> CreatePublicationDatasetAsync(PublicationDatasetForCreationDto datasetForCreationDto);
		Task<(bool Succeeded, string ErrorMessage, PublicationDatasetDto? PublicationDataset)> GetPublicationDatasetByIdAsync(int datasetId);
	}
}