using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Services.IServices
{
    public interface IModelMapper
    {

		// Maps to model entities
		Role MapToRole(RoleToCreateDto dto);
		User MapToUser(UserToCreateDto dto);
		Task<ScaffoldGroup> MapToScaffoldGroup(ScaffoldGroupToCreateDto dto);
    	Task<Scaffold> MapToScaffold(ScaffoldToCreateDto dto, int replicateNumber);
		InputGroup MapToInputGroup(InputGroupToCreateDto dto);
		ParticlePropertyGroup MapToParticlePropertyGroup(ParticlePropertyGroupToCreateDto dto);
		Tag MapToTag(TagToCreateDto dto);
		Task<ScaffoldTag> MapToScaffoldTag(ScaffoldTagToCreateDto dto);
		DescriptorType MapToDescriptorType(DescriptorTypeToCreateDto dto);
		Task<GlobalDescriptor> MapToGlobalDescriptor(GlobalDescriptorToCreateDto dto);
		Task<PoreDescriptor> MapToPoreDescriptor(PoreDescriptorToCreateDto dto);
		Task<OtherDescriptor> MapToOtherDescriptor(OtherDescriptorToCreateDto dto);

		// Maps to DTOs
		Task<AuthenticatedUserDto> MapToAuthenticatedUserDto(User user, string token);
		TagForFilterDto MapTagToDto(Tag tag);

		ScaffoldGroupBaseDto MapScaffoldGroupToDto(ScaffoldGroup scaffoldGroup, IEnumerable<Scaffold> scaffolds, string userId, bool isDetailed);
		ScaffoldGroupSummaryDto MapToScaffoldGroupSummaryDto(ScaffoldGroup scaffoldGroup, string userId);
		ScaffoldGroupDetailedDto MapToScaffoldGroupDetailedDto(ScaffoldGroup scaffoldGroup, IEnumerable<Scaffold> scaffolds, string userId);

	}
}