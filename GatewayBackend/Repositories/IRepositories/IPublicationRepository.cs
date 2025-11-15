using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Repositories.IRepositories
{
	public interface IPublicationRepository
	{
		bool HasChanges();
		void Add(Publication publication);
		Task<PublicationSummaryDto?> GetPublicationSummaryByIdAsync(int publicationId);
		Task<bool> ExistsAsync(int publicationId);
		Task<List<PublicationSummaryDto>> GetAllPublicationSummariesAsync();
	}
}