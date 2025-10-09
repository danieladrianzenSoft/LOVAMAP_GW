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
		Publication MapToPublication(PublicationToCreateDto dto);
		Task<ScaffoldGroup> MapToScaffoldGroup(ScaffoldGroupToCreateDto dto);
    	Task<Scaffold> MapToScaffold(ScaffoldToCreateDto dto, int replicateNumber);
		InputGroup MapToInputGroup(InputGroupToCreateDto dto);
		ParticlePropertyGroup MapToParticlePropertyGroup(ParticlePropertyGroupToCreateDto dto);
		Tag MapToTag(TagToCreateDto dto);
		Tag MapToTag(TagToSeedDto dto);
		Task<ScaffoldTag> MapToScaffoldTag(ScaffoldTagToCreateDto dto);
		DescriptorType MapToDescriptorType(DescriptorTypeToCreateDto dto);
		Task<GlobalDescriptor> MapToGlobalDescriptor(GlobalDescriptorToCreateDto dto);
		Task<PoreDescriptor> MapToPoreDescriptor(PoreDescriptorToCreateDto dto);
		Task<OtherDescriptor> MapToOtherDescriptor(OtherDescriptorToCreateDto dto);
		Image MapToImage(ImageForCreationDto dto, string uploaderId);
		Job MapToJob(JobSubmissionDto dto);

		// Maps to DTOs
		Task<AuthenticatedUserDto> MapToAuthenticatedUserDto(User user, string token);
		TagForFilterDto MapTagToDto(Tag tag);
		DescriptorTypeDto MapDescriptorTypeToDto(DescriptorType descriptorType);
		ScaffoldGroupBaseDto MapScaffoldGroupToDto(ScaffoldGroup scaffoldGroup, IEnumerable<Scaffold> scaffolds, IEnumerable<Image> images, IEnumerable<string> tags, string userId, bool isDetailed);
		ScaffoldGroupSummaryDto MapToScaffoldGroupSummaryDto(ScaffoldGroup scaffoldGroup, IEnumerable<Image> images, IEnumerable<string> tags, string userId);
		ScaffoldGroupDetailedDto MapToScaffoldGroupDetailedDto(ScaffoldGroup scaffoldGroup, IEnumerable<Scaffold> scaffolds, IEnumerable<Image> images, string userId);
		ImageToShowDto MapImageToDto(Image image);

	}
}