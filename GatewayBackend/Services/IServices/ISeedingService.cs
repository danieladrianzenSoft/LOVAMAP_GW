using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface ISeedingService
	{
		Task SeedAllAsync();
		// Task<DescriptorSeedResultDto> SeedDescriptorAsync(string descriptorName);
		Task<List<int>> GetEligibleScaffoldIdsForDescriptorSeeding(string descriptorName);
		Task<DescriptorSeedResultDto> SeedDescriptorAsync(string descriptorName, List<int> scaffoldIds);
	}
}