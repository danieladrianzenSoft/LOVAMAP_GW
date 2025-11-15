using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Repositories.IRepositories
{
	public interface IPublicationDatasetRepository
	{
		bool HasChanges();
		void Add(PublicationDataset publicationDataset);
		Task<bool> PublicationDatasetNameExistsAsync(int publicationId, string name);
		Task AddPublicationDatasetScaffolds(int datasetId, IEnumerable<int> scaffoldIds);
		Task AddPublicationDatasetDescriptorRules(int datasetId, IEnumerable<PublicationDatasetDescriptorRule> rules);
		Task<PublicationDatasetDto?> GetPublicationDatasetByIdAsync(int datasetId);
	}
}