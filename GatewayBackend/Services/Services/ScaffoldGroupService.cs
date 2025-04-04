
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data;
using Data.Models;
using Repositories.IRepositories;
using Infrastructure.DTOs;
using Infrastructure.IHelpers;
using Services.IServices;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using CloudinaryDotNet;

namespace Services.Services
{	public class ScaffoldGroupService : IScaffoldGroupService
	{
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
		private readonly IUserAuthHelper _userAuthHelper;
		private readonly IScaffoldGroupRepository _scaffoldGroupRepository;
		private readonly IDescriptorService _descriptorService;
		private readonly IDownloadService _downloadService;
		private readonly ITagService _tagService;
		private readonly IImageService _imageService;
		private readonly ILogger<ScaffoldGroupService> _logger;

		public ScaffoldGroupService(DataContext context, IModelMapper modelMapper, 
			IScaffoldGroupRepository scaffoldGroupRepository, IDescriptorService descriptorService, 
			IDownloadService downloadService, ITagService tagService, IUserAuthHelper userAuthHelper,
			IImageService imageService, ILogger<ScaffoldGroupService> logger)
		{
			_context = context;
			_modelMapper = modelMapper;
			_userAuthHelper = userAuthHelper;
			_scaffoldGroupRepository = scaffoldGroupRepository;
			_descriptorService = descriptorService;
			_imageService = imageService;
			_downloadService = downloadService;
			_tagService = tagService;
			_logger = logger;
		}

		public async Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupBaseDto? CreatedScaffoldGroup)> CreateScaffoldGroup(ScaffoldGroupToCreateDto scaffoldGroupToCreate, string? userId)
		{
			var (succeeded, errorMessage, createdScaffoldGroups) = await CreateScaffoldGroups([scaffoldGroupToCreate], userId);

			return (succeeded, errorMessage, createdScaffoldGroups?.FirstOrDefault());
		}

		public async Task<(bool Succeeded, string ErrorMessage, IEnumerable<ScaffoldGroupBaseDto>? CreatedScaffoldGroups)> CreateScaffoldGroups(IEnumerable<ScaffoldGroupToCreateDto> scaffoldGroupsToCreate, string? userId)
		{
			try
			{
				var createdScaffoldGroups = new List<ScaffoldGroupBaseDto>();
				foreach (var dto in scaffoldGroupsToCreate)
				{
					var isAdmin = false;
					if (!string.IsNullOrWhiteSpace(userId))
					{
						isAdmin = await _userAuthHelper.IsInRole(userId, "administrator");
						dto.UploaderId = userId;
					}

					var scaffoldGroup = await _modelMapper.MapToScaffoldGroup(dto);

					if (scaffoldGroup.UploaderId != null && isAdmin == true)
					{
						scaffoldGroup.IsPublic = true;
					}

					if (scaffoldGroup.UploaderId == null)
					{
						var uploader = await _userAuthHelper.GetFirstUserByRoleAsync("administrator");
						if (uploader != null)
						{
							scaffoldGroup.Uploader = uploader;  // Attach the uploader object
							scaffoldGroup.UploaderId = uploader.Id;  // Ensure the ID is set
							scaffoldGroup.IsPublic = true;
						}
					}

					var autogeneratedTags = await _tagService.GetAutogeneratedTagsForScaffold(scaffoldGroup);
					var tagNames = autogeneratedTags.Select(tag => tag.Tag.Name).ToList();

					foreach (var scaffold in scaffoldGroup.Scaffolds)
					{
						scaffold.ScaffoldTags = autogeneratedTags.ToList();
					}

					_scaffoldGroupRepository.Add(scaffoldGroup);
					var scaffoldGroupToReturn = _modelMapper.MapToScaffoldGroupSummaryDto(scaffoldGroup, [], tagNames, userId ?? scaffoldGroup.UploaderId!);
					createdScaffoldGroups.Add(scaffoldGroupToReturn);
				}

				await _context.SaveChangesAsync();
				return (true, "", createdScaffoldGroups);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to create scaffold groups");
				return (false, "UnexpectedError", null);
			}
		}

		// public async Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupBaseDto? scaffoldGroup)> GetScaffoldGroup(int id, string userId, int? numReplicates)
		// {
		// 	try
		// 	{
		// 		// ScaffoldGroup? scaffoldGroup = await _scaffoldGroupRepository.Get(id); 

		// 		var filter = new ScaffoldFilter {
		// 			ScaffoldGroupIds = [id]
		// 		};

		// 		ScaffoldGroup? scaffoldGroup = await _scaffoldGroupRepository.GetFilteredScaffoldGroupSummaries(new ScaffoldFilter)

		// 		if (scaffoldGroup == null){
		// 			return (false, "NotFound", null);
		// 		}

		// 		if (scaffoldGroup.IsPublic == false && scaffoldGroup.UploaderId != userId)
		// 		{
		// 			return (false, "Unauthorized", null);
		// 		}

		// 		var scaffolds = numReplicates.HasValue ? scaffoldGroup.Scaffolds.Take(numReplicates.Value) : scaffoldGroup.Scaffolds;
       	// 		var scaffoldIds = scaffolds.Select(s => s.Id).ToList();

		// 		var (globalDescriptors, poreDescriptors, otherDescriptors) = await _descriptorService.GetFilteredDescriptorsForScaffolds(scaffoldIds, new ScaffoldFilter());

		// 		var images = await _imageService.GetThumbnails(scaffoldGroup.Id);

		// 		var detailedDto = _modelMapper.MapScaffoldGroupToDto(scaffoldGroup, scaffolds, images, [], userId, true);

		// 		var descriptorTypeIds = globalDescriptors.Select(g => g.DescriptorTypeId)
		// 							.Concat(poreDescriptors.Select(p => p.DescriptorTypeId))
		// 							.Concat(otherDescriptors.Select(o => o.DescriptorTypeId))
		// 							.Distinct().ToList();

		// 		// Create download record
		// 		await _downloadService.CreateDownloadRecord(userId, scaffoldIds, descriptorTypeIds);

		// 		return (true, "", detailedDto);

		// 	}
		// 	catch (Exception ex)
		// 	{
		// 		_logger.LogError(ex, "Failed to get scaffold group {id}", id);
        // 		return (false, "UnexpectedError", null);
		// 	}
		// }

		public async Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupBaseDto? scaffoldGroup)> GetScaffoldGroup(int id, string userId, int? numReplicates)
		{
			try
			{
				// ScaffoldGroup? scaffoldGroup = await _scaffoldGroupRepository.Get(id); 
				var scaffoldGroup  = await _scaffoldGroupRepository.GetSummary(id);

				if (scaffoldGroup == null)
				{
					return (false, "NotFound", null);
				}
				if (scaffoldGroup.IsPublic == false && scaffoldGroup.UploaderId != userId)
				{
					return (false, "Unauthorized", null);
				}

				var (succeeded, errorMessage, completeScaffoldGroups) = 
					await GetCompleteScaffoldGroupsFromSummaries([scaffoldGroup], userId, isDetailed: true, filter: null);

				if (!succeeded || completeScaffoldGroups == null)
				{
					return (false, errorMessage, null);
				}

				return (true, "", completeScaffoldGroups.First());

			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to get scaffold group {id}", id);
        		return (false, "UnexpectedError", null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupSummaryDto? scaffoldGroup)> GetScaffoldGroupSummary(int id, string userId)
		{
			try
			{
				// ScaffoldGroup? scaffoldGroup = await _scaffoldGroupRepository.Get(id); 
				var scaffoldGroup  = await _scaffoldGroupRepository.GetSummary(id);

				if (scaffoldGroup == null)
				{
					return (false, "NotFound", null);
				}
				if (scaffoldGroup.IsPublic == false && scaffoldGroup.UploaderId != userId)
				{
					return (false, "Unauthorized", null);
				}

				return (true, "", scaffoldGroup);

			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to get scaffold group {id}", id);
        		return (false, "UnexpectedError", null);
			}
		}



		public async Task<(bool Succeeded, string ErrorMessage, IEnumerable<ScaffoldGroupBaseDto>? scaffoldGroups)>
			GetFilteredScaffoldGroups(ScaffoldFilter filter, string userId, bool isDetailed = false)
		{
			try
			{
				// Ensure we have a valid user
				if (string.IsNullOrEmpty(userId))
				{
					var user = await _userAuthHelper.GetFirstUserByRoleAsync("administrator");
					userId = user!.Id;
					isDetailed = false;
				}

				// Fetch scaffold groups with necessary fields
				var scaffoldGroups = await _scaffoldGroupRepository.GetFilteredScaffoldGroupSummaries(filter, userId);

				if (scaffoldGroups == null || !scaffoldGroups.Any())
				{
					return (false, "NotFound", null);
				}

				return await GetCompleteScaffoldGroupsFromSummaries(scaffoldGroups, userId, isDetailed, filter);

			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to get filtered scaffold groups");
				return (false, "UnexpectedError", null);
			}
		}

		private async Task<(bool Succeeded, string ErrorMessage, IEnumerable<ScaffoldGroupBaseDto>? scaffoldGroups)> GetCompleteScaffoldGroupsFromSummaries(IEnumerable<ScaffoldGroupSummaryDto> scaffoldGroups, string userId, bool isDetailed, ScaffoldFilter? filter)
		{
			try
			{
				var scaffoldGroupIds = scaffoldGroups.Select(sg => sg.Id).ToList();

				var imagesLookup = isDetailed
						? await _imageService.GetAllImagesForScaffoldGroups(scaffoldGroupIds)
						: await _imageService.GetThumbnailsForScaffoldGroups(scaffoldGroupIds);
				var tagsLookup = await _tagService.GetTagNamesForScaffoldGroups(scaffoldGroupIds, userId);

				Dictionary<int, List<ScaffoldBaseDto>> scaffoldLookup = [];

				if (isDetailed)
				{
					var scaffoldIds = scaffoldGroups
						.SelectMany(sg => sg.ScaffoldIds)
						.ToList();					
					
					var scaffolds = await _descriptorService.GetScaffoldsWithDescriptorsFromScaffoldIds(scaffoldIds, filter);
					scaffoldLookup = scaffolds
						.GroupBy(s => scaffoldGroups.First(sg => sg.ScaffoldIds.Contains(s.Id)).Id)
						.ToDictionary(g => g.Key, g => g.ToList());
				}

				var scaffoldGroupDtos = scaffoldGroups.Select<ScaffoldGroupSummaryDto, ScaffoldGroupBaseDto>(sg =>
				{
					// Assign images and tags once
					sg.Images = imagesLookup.ContainsKey(sg.Id) ? imagesLookup[sg.Id] : [];
					sg.Tags = tagsLookup.ContainsKey(sg.Id) ? tagsLookup[sg.Id] : [];

					// If isDetailed == false, return sg as it is (remains ScaffoldGroupSummaryDto)
					if (!isDetailed) return sg;

					// Create and return ScaffoldGroupDetailedDto
					return new ScaffoldGroupDetailedDto
					{
						Id = sg.Id,
						Name = sg.Name,
						CreatedAt = sg.CreatedAt,
						UploaderId = sg.UploaderId,
						IsPublic = sg.IsPublic,
						IsSimulated = sg.IsSimulated,
						Tags = sg.Tags,
						NumReplicates = sg.NumReplicates,
						Images = sg.Images,
						Inputs = sg.Inputs,
						ScaffoldIds = sg.ScaffoldIds,
						ScaffoldIdsWithDomains = sg.ScaffoldIdsWithDomains,
						Scaffolds = scaffoldLookup.ContainsKey(sg.Id) ? scaffoldLookup[sg.Id] : []
					};
				}).ToList();

				return (true, "", scaffoldGroupDtos);

			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to get filtered scaffold groups");
				return (false, "UnexpectedError", null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage, ICollection<ImageToShowDto>? scaffoldGroupImages)> GetScaffoldGroupImages(int scaffoldGroupId)
		{
			try
			{
				var images = await _scaffoldGroupRepository.GetScaffoldGroupImages(scaffoldGroupId);
				var imagesToReturn = images.Select(_modelMapper.MapImageToDto).ToList();
				return (true, "", imagesToReturn);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to get scaffold group images");
        		return (false, "UnexpectedError", null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupSummaryDto? updatedScaffoldGroup)> UpdateScaffoldGroupImage(string userId, int scaffoldGroupId, ImageToUpdateDto image)
		{
			try
			{
				var scaffoldGroup = await _scaffoldGroupRepository.Get(scaffoldGroupId);

				if (scaffoldGroup == null) return (false, "ScaffoldGroup not found", null);

				if (scaffoldGroup.UploaderId != userId) return (false, "Unauthorized", null);

				var updatedImage = await _imageService.UpdateImage(image, scaffoldGroup);

				if (updatedImage == null) return (false, "Image not found", null);

				var updatedScaffoldGroup = await _scaffoldGroupRepository.Get(scaffoldGroupId);
				var images = await _scaffoldGroupRepository.GetScaffoldGroupImages(scaffoldGroupId);
				var scaffoldGroupToReturn = _modelMapper.MapToScaffoldGroupSummaryDto(updatedScaffoldGroup!, images, [], userId);

				return (true, "", scaffoldGroupToReturn);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to update scaffold group image");
        		return (false, "UnexpectedError", null);
			}
		}


	}
}


