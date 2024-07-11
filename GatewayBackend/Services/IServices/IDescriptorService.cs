using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IDescriptorService
	{
		Task CreateDescriptorType(DescriptorTypeToCreateDto descriptorType);
		Task <ICollection<DescriptorTypeDto>> GetAllDescriptorTypes();
		Task<(IEnumerable<GlobalDescriptor>, IEnumerable<PoreDescriptor>, IEnumerable<OtherDescriptor>)> GetFilteredDescriptorsForScaffolds(IEnumerable<int> scaffoldIds, ScaffoldFilter filter);

	}
}