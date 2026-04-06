using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IPublicationService
	{
		Task CreatePublication(PublicationToCreateDto publicationToCreate);
		Task<(bool Succeeded, string ErrorMessage)> DeletePublication(int publicationId);
		Task<(bool Succeeded, string ErrorMessage, PublicationSummaryDto? publication)> GetPublicationSummaryByIdAsync(int publicationId);
		Task<(bool Succeeded, string ErrorMessage, IEnumerable<PublicationSummaryDto>? publications)> GetPublicationSummaries(PublicationFilter filter);
	}
}