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
		Task<List<PublicationSummaryDto>> GetAllPublicationSummariesAsync();
	}
}