using Repositories.IRepositories;
using Data.Models;
using Infrastructure.DTOs;
using Services.IServices;
using Infrastructure.Helpers;
using Infrastructure.IHelpers;
using System.Text.Json;

namespace Services.Services
{
    public class ModelMapper : IModelMapper
    {
        private readonly IDescriptorRepository _descriptorRepository;
        private readonly ITagRepository _tagRepository;
        private readonly IUserAuthHelper _userAuthHelper;

        public ModelMapper(
            IDescriptorRepository descriptorRepository, 
            ITagRepository tagRepository, 
            IUserAuthHelper userAuthHelper)
        {
            _descriptorRepository = descriptorRepository;
            _tagRepository = tagRepository;
            _userAuthHelper = userAuthHelper;
        }

        public Role MapToRole(RoleToCreateDto dto)
        {
            var role = new Role
            {
                Name = dto.Name,
                
            };
            return role;
        }
		public User MapToUser(UserToCreateDto dto)
        {
            var user = new User
            {
                UserName = dto.Email,
                Email = dto.Email
            };

            return user;
        }

        public Publication MapToPublication(PublicationToCreateDto dto)
        {
            var publication = new Publication
            {
                Title = dto.Title,
                Authors = dto.Authors,
                Journal = dto.Journal,
                PublishedAt = dto.PublishedAt,
                Doi = dto.Doi,
                Citation = dto.Citation
            };

            return publication;
        }

        public async Task<ScaffoldGroup> MapToScaffoldGroup(ScaffoldGroupToCreateDto dto)
        {
            var scaffoldGroup = new ScaffoldGroup
            {
                Name = "",
                UploaderId = dto.UploaderId ?? null,
                IsSimulated = dto.IsSimulated,
                OriginalFileName = dto.OriginalFileName,
                Comments = "",
                InputGroup = MapToInputGroup(dto.InputGroup),
                Scaffolds = []
            };

            int replicateNumber = 1;  // Start from 1 or dynamically determine if loading an existing scaffold group

            foreach (var scaffoldDto in dto.Scaffolds)
            {
                var scaffold = await MapToScaffold(scaffoldDto, replicateNumber++);
                scaffoldGroup.Scaffolds.Add(scaffold);
            }

            foreach (var scaffold in scaffoldGroup.Scaffolds)
            {
                scaffold.ScaffoldGroup = scaffoldGroup;
            }

            scaffoldGroup.InputGroup.ScaffoldGroup = scaffoldGroup;

            var namedScaffoldGroup = SetScaffoldGroupNameAndComments(scaffoldGroup);

            return namedScaffoldGroup;
        }
        public async Task<Scaffold> MapToScaffold(ScaffoldToCreateDto dto, int replicateNumber)
        {
            // var tags = new List<ScaffoldTag>();
            // foreach (var st in dto.ScaffoldTags)
            // {
            //     tags.Add(await MapToScaffoldTag(st));  // Await immediately
            // }

            var globalDescriptors = new List<GlobalDescriptor>();
            foreach (var gd in dto.GlobalDescriptors)
            {
                globalDescriptors.Add(await MapToGlobalDescriptor(gd));  // Await immediately
            }

            var poreDescriptors = new List<PoreDescriptor>();
            foreach (var pd in dto.PoreDescriptors)
            {
                poreDescriptors.Add(await MapToPoreDescriptor(pd));  // Await immediately
            }

            var otherDescriptors = new List<OtherDescriptor>();
            foreach (var od in dto.OtherDescriptors)
            {
                otherDescriptors.Add(await MapToOtherDescriptor(od));  // Await immediately
            }

            return new Scaffold
            {
                ReplicateNumber = replicateNumber,
                ScaffoldTags = [],
                GlobalDescriptors = globalDescriptors,
                PoreDescriptors = poreDescriptors,
                OtherDescriptors = otherDescriptors,
            };
        }

        public InputGroup MapToInputGroup(InputGroupToCreateDto dto)
        {
            var inputGroup = new InputGroup
            {
                ContainerShape = dto.ContainerShape,
                ContainerSize = dto.ContainerSize,
                PackingConfiguration = ParsePackingConfiguration(dto.PackingConfiguration), // Map int to enum
                ParticlePropertyGroups = dto.ParticlePropertyGroups.Select(ppg => MapToParticlePropertyGroup(ppg)).ToList(),
                SizeDistribution = dto.SizeDistribution
            };

            foreach (var particlePropertyGroup in inputGroup.ParticlePropertyGroups)
            {
                particlePropertyGroup.InputGroup = inputGroup;
            }

            return inputGroup;
        }
        public ParticlePropertyGroup MapToParticlePropertyGroup(ParticlePropertyGroupToCreateDto dto)
        {
            return new ParticlePropertyGroup
            {
                Shape = dto.Shape ?? "unknown",
                Stiffness = dto.Stiffness,
                Friction = dto.Friction,
                Dispersity = dto.Dispersity ?? "unknown",
                SizeDistributionType = dto.SizeDistributionType,
                MeanSize = dto.MeanSize,
                MedianSize = dto.MedianSize,
                MaxSize = dto.MaxSize,
                MinSize = dto.MinSize,
                StandardDeviationSize = dto.StandardDeviationSize,
                Proportion = dto.Proportion,
            };  
        }

        public Tag MapToTag(TagToCreateDto dto)
        {
            return new Tag
            {
                Name = dto.Name,
            };
        }

        public Tag MapToTag(TagToSeedDto dto)
        {
            return new Tag
            {
                Name = dto.Name,
                ReferenceProperty = dto.ReferenceProperty,
                IsAutoGenerated = dto.IsAutoGenerated
            };
        }

        public async Task<ScaffoldTag> MapToScaffoldTag(ScaffoldTagToCreateDto dto)
        {
            try
            {
                Tag? tag = null;
                bool isAutoGenerated = true;  // Assume the tag is auto-generated
                bool isPrivate = false;  // Assume the tag is auto-generated, and therefore not private

                // Attempt to retrieve the tag by ID if provided
                if (dto.TagId.HasValue)
                {
                    tag = await _tagRepository.GetTagById(dto.TagId.Value);
                }
                
                // If no tag found by ID, try by name or create a new one
                if (tag == null && !string.IsNullOrEmpty(dto.Name))
                {
                    tag = await _tagRepository.GetTagByName(dto.Name);
                    if (tag == null)
                    {
                        if (String.IsNullOrEmpty(dto.ReferenceProperty) == true)
                        {
                            tag = new Tag { Name = dto.Name };
                        }
                        else
                        {
                            tag = new Tag { Name = dto.Name, ReferenceProperty = dto.ReferenceProperty };
                        }
                        isAutoGenerated = false;  // A new tag is created, so it's not auto-generated
                        isPrivate = true; // By default, keep custom tags as private to the uploader
                    }
                }

                // If no tag is available by now, throw error
                if (tag == null) throw new Exception("Error creating Tag");


                return new ScaffoldTag
                {
                    Tag = tag,
                    IsAutoGenerated = isAutoGenerated,
                    IsPrivate = isPrivate
                };
            }
            catch (Exception)
            {
                throw;
            }
        }
        public DescriptorType MapToDescriptorType(DescriptorTypeToCreateDto dto)
        {
            return new DescriptorType
            {
                Name = dto.Name,
                Label = dto.Label,
                TableLabel = dto.TableLabel,
                Category = dto.Category,
                SubCategory = dto.SubCategory,
                ImageUrl = dto.ImageUrl,
                Comments = dto.Comments,
                Unit = dto.Unit,
                DataType = dto.DataType,
                Description = dto.Description,
                PublicationId = dto.PublicationId
            };
        }

        public async Task<GlobalDescriptor> MapToGlobalDescriptor(GlobalDescriptorToCreateDto dto)
        {
            try
            {
                // Fetch the DescriptorType based on the Name provided.
                var descriptorType = await _descriptorRepository.GetDescriptorByName(dto.Name) ?? throw new ArgumentException($"Descriptor {dto.Name} not found");

                // Create the GlobalDescriptor and map the values accordingly.
                var globalDescriptor = new GlobalDescriptor
                {
                    DescriptorTypeId = descriptorType.Id,
                    DescriptorType = descriptorType
                };

                // Determine how to map the value based on the DataType.
                switch (descriptorType.DataType.ToLower())
                {
                    case "string":
                        globalDescriptor.ValueString = dto.Value.ToString();
                        break;
                    case "int":
                        globalDescriptor.ValueInt = (int)dto.Value;
                        break;
                    case "double":
                        globalDescriptor.ValueDouble = dto.Value;
                        break;
                    default:
                        throw new InvalidOperationException("Unsupported DataType for Descriptor");
                }

                return globalDescriptor;
            }
            catch (Exception)
            {
                throw;
            }
            
        }
        public async Task<PoreDescriptor> MapToPoreDescriptor(PoreDescriptorToCreateDto dto)
        {
            try
            {
                // Fetch the DescriptorType based on the name provided
                var descriptorType = await _descriptorRepository.GetDescriptorByName(dto.Name) ?? throw new KeyNotFoundException($"Descriptor {dto.Name} not found");

                // Create the PoreDescriptor object
                var poreDescriptor = new PoreDescriptor
                {
                    DescriptorTypeId = descriptorType.Id,
                    DescriptorType = descriptorType,
                    Values = dto.Values
                };

                return poreDescriptor;
            }
            catch (Exception)
            {
                
                throw;
            }
        
        }
        public async Task<OtherDescriptor> MapToOtherDescriptor(OtherDescriptorToCreateDto dto)
        {
            try
            {
                // Fetch the DescriptorType based on the name provided
                var descriptorType = await _descriptorRepository.GetDescriptorByName(dto.Name) ?? throw new KeyNotFoundException($"Descriptor {dto.Name} not found");

                // Create the PoreDescriptor object
                var otherDescriptor = new OtherDescriptor
                {
                    DescriptorTypeId = descriptorType.Id,
                    DescriptorType = descriptorType,
                    Values = dto.Values
                };

                return otherDescriptor;
            }
            catch (Exception)
            {
                throw;
            }
            
        }

        public async Task<AuthenticatedUserDto> MapToAuthenticatedUserDto(User user, string token)
        {
            var roles = await _userAuthHelper.GetUserRoles(user);

            if (user.Email == null)
                throw new InvalidOperationException("User email cannot be null");

            return new AuthenticatedUserDto 
            {
                Id = user.Id,
                Email = user.Email,
                AccessToken = token,
                Roles = roles
            };
        }

        public ScaffoldGroupBaseDto MapScaffoldGroupToDto(ScaffoldGroup scaffoldGroup, IEnumerable<Scaffold> scaffolds, IEnumerable<Image> images, IEnumerable<string> tags, string userId, bool isDetailed)
        {
            if (!isDetailed)
            {
                return MapToScaffoldGroupSummaryDto(scaffoldGroup, images, tags, userId);
            }
            else
            {
                var globalDescriptors = scaffolds.SelectMany(s => s.GlobalDescriptors);
                var poreDescriptors = scaffolds.SelectMany(s => s.PoreDescriptors);
                var otherDescriptors = scaffolds.SelectMany(s => s.OtherDescriptors);
                return MapToScaffoldGroupDetailedDto(scaffoldGroup, scaffolds, images, userId);
            }
        }

        public ScaffoldGroupSummaryDto MapToScaffoldGroupSummaryDto(ScaffoldGroup scaffoldGroup, IEnumerable<Image> images, IEnumerable<string> tags, string userId)
        {
            // var tags = scaffoldGroup.Scaffolds?
            //         .SelectMany(s => s.ScaffoldTags)
            //         .Where(st => (st.IsAutoGenerated && !st.IsPrivate) || (scaffoldGroup.UploaderId == userId))
            //         .Select(st => st.Tag.Name)
            //         .Distinct()
            //         .ToList() ?? [];

            var particles = scaffoldGroup.InputGroup?.ParticlePropertyGroups
                    .Select(ppg => MapToScaffoldPropertyGroupBase(ppg))
                    .ToList();

            var imagesToReturn = images.Select(MapImageToDto).ToList();

            return new ScaffoldGroupSummaryDto 
            {
                Id = scaffoldGroup.Id,
                Name = scaffoldGroup.Name,
                CreatedAt = scaffoldGroup.CreatedAt,
                IsSimulated = scaffoldGroup.IsSimulated,
                Tags = tags,
                NumReplicates = scaffoldGroup.Scaffolds?.Count ?? 0,
                Images = imagesToReturn,
                Inputs = new InputGroupBaseDto 
                {
                    ContainerShape = scaffoldGroup.InputGroup?.ContainerShape,
                    PackingConfiguration = scaffoldGroup.InputGroup?.PackingConfiguration != null
                        ? scaffoldGroup.InputGroup.PackingConfiguration.ToString()
                        : "unknown",
                    Particles = particles ?? [],
                    SizeDistribution = scaffoldGroup.InputGroup?.SizeDistribution
                },
            };
        }

        public ScaffoldGroupDetailedDto MapToScaffoldGroupDetailedDto(ScaffoldGroup scaffoldGroup, IEnumerable<Scaffold> scaffolds, IEnumerable<Image> images, string userId)
        {
            var tags = scaffoldGroup.Scaffolds?
                    .SelectMany(s => s.ScaffoldTags)
                    .Where(st => (st.IsAutoGenerated && !st.IsPrivate) || (scaffoldGroup.UploaderId == userId))
                    .Select(st => st.Tag.Name)
                    .Distinct()
                    .ToList() ?? [];

            var particles = scaffoldGroup.InputGroup?.ParticlePropertyGroups
                    .Select(ppg => MapToScaffoldPropertyGroupBase(ppg))
                    .ToList();
            
            var imagesToReturn = images.Select(MapImageToDto).ToList();

        // Group descriptors by ScaffoldId
            // var globalDescriptorGroups = globalDescriptors.GroupBy(gd => gd.ScaffoldId);
            // var poreDescriptorGroups = poreDescriptors.GroupBy(pd => pd.ScaffoldId);
            // var otherDescriptorGroups = otherDescriptors.GroupBy(od => od.ScaffoldId);


            // var scaffoldDtos = scaffoldGroup.Scaffolds?.Select(scaffold => new ScaffoldBaseDto
            // {
            //     GlobalDescriptors = globalDescriptorGroups.FirstOrDefault(g => g.Key == scaffold.Id)?.Select(gd => MapGlobalDescriptorToDto(gd)).ToList() ?? [],
            //     PoreDescriptors = poreDescriptorGroups.FirstOrDefault(p => p.Key == scaffold.Id)?.Select(pd => MapPoreDescriptorToDto(pd)).ToList() ?? [],
            //     OtherDescriptors = otherDescriptorGroups.FirstOrDefault(o => o.Key == scaffold.Id)?.Select(od => MapOtherDescriptorToDto(od)).ToList() ?? [],
            // }).ToList();

            var scaffoldDtos = scaffolds.Select(scaffold => new ScaffoldBaseDto
            {
                Id = scaffold.Id,
                ReplicateNumber = scaffold.ReplicateNumber,
                GlobalDescriptors = scaffold.GlobalDescriptors.Select(MapGlobalDescriptorToDto).ToList(),
                PoreDescriptors = scaffold.PoreDescriptors.Select(MapPoreDescriptorToDto).ToList(),
                OtherDescriptors = scaffold.OtherDescriptors.Select(MapOtherDescriptorToDto).ToList(),
            }).ToList();


            // var globalDescriptorDtos = globalDescriptors.Select(gd => MapGlobalDescriptorToDto(gd)).ToList();
            // var poreDescriptorDtos = poreDescriptors.Select(pd => MapPoreDescriptorToDto(pd)).ToList();
            // var otherDescriptorDtos = otherDescriptors.Select(od => MapOtherDescriptorToDto(od)).ToList();

            return new ScaffoldGroupDetailedDto 
            {
                Id = scaffoldGroup.Id,
                Name = scaffoldGroup.Name,
                IsSimulated = scaffoldGroup.IsSimulated,
                Tags = tags,
                NumReplicates = scaffoldGroup.Scaffolds?.Count ?? 0,
                Comments = scaffoldGroup.Comments,
                Images = imagesToReturn,
                Inputs = new InputGroupBaseDto 
                {
                    ContainerShape = scaffoldGroup.InputGroup?.ContainerShape,
                    PackingConfiguration = scaffoldGroup.InputGroup?.PackingConfiguration != null
                        ? scaffoldGroup.InputGroup.PackingConfiguration.ToString()
                        : "unknown",
                    Particles = particles ?? [],
                    SizeDistribution = scaffoldGroup.InputGroup?.SizeDistribution
                },
                Scaffolds = scaffoldDtos,
            };
        }
        
        public ParticlePropertyBaseDto MapToScaffoldPropertyGroupBase(ParticlePropertyGroup particlePropertyGroup)
        {
            return new ParticlePropertyBaseDto 
            {
                Shape = particlePropertyGroup?.Shape,
                Stiffness = particlePropertyGroup?.Stiffness,
                Dispersity = particlePropertyGroup!.Dispersity,
                SizeDistributionType = particlePropertyGroup?.SizeDistributionType,
                MeanSize = particlePropertyGroup!.MeanSize,
                StandardDeviationSize = particlePropertyGroup?.StandardDeviationSize,
                Proportion = particlePropertyGroup?.Proportion
            };
        }

        public ImageToShowDto MapImageToDto(Image image)
        {
            return new ImageToShowDto
            {
                Id = image.Id,
                Url = image.Url,
                PublicId = image.PublicId,
                IsThumbnail = image.IsThumbnail,
                Category = image.Category.ToString()
            };
        }

        public DescriptorDto MapGlobalDescriptorToDto(GlobalDescriptor global)
        {
            return new DescriptorDto
            {
                DescriptorTypeId = global.DescriptorTypeId,
                Name = global.DescriptorType?.Name ?? "N/A",
                Label = global.DescriptorType?.Label ?? "N/A",
                TableLabel = global.DescriptorType?.TableLabel ?? "N/A",
                Unit = global.DescriptorType?.Unit ?? "N/A",
                Values = global.ValueString ?? global.ValueInt?.ToString() ?? global.ValueDouble?.ToString() ?? "N/A"
            };
        }

        public DescriptorDto MapPoreDescriptorToDto(PoreDescriptor pore)
        {
            return new DescriptorDto
            {
                DescriptorTypeId = pore.DescriptorTypeId,
                Name = pore.DescriptorType?.Name ?? "N/A",
                Label = pore.DescriptorType?.Label ?? "N/A",
                TableLabel = pore.DescriptorType?.TableLabel ?? "N/A",
                Unit = pore.DescriptorType?.Unit ?? "N/A",
                Values = ParsingMethods.JsonDocumentToString(pore.Values)
            };
        }

        public DescriptorDto MapOtherDescriptorToDto(OtherDescriptor other)
        {
            return new DescriptorDto
            {
                DescriptorTypeId = other.DescriptorTypeId,
                Name = other.DescriptorType?.Name ?? "N/A",
                Label = other.DescriptorType?.Label ?? "N/A",
                TableLabel = other.DescriptorType?.TableLabel ?? "N/A",
                Unit = other.DescriptorType?.Unit ?? "N/A",
                Values = ParsingMethods.JsonDocumentToString(other.Values)
            };
        }

        public TagForFilterDto MapTagToDto(Tag tag)
        {
            return new TagForFilterDto
            {
                Id = tag.Id,
                Name = tag.Name,
                ReferenceProperty = tag.ReferenceProperty
            };
        }

        public DescriptorTypeDto MapDescriptorTypeToDto(DescriptorType descriptorType)
        {
            return new DescriptorTypeDto
            {
                Id = descriptorType.Id,
                Name = descriptorType.Name,
                TableLabel = descriptorType.TableLabel,
                Label = descriptorType.Label,
                Category = descriptorType.Category,
                Unit = descriptorType.Unit,
                DataType = descriptorType.DataType,
                Publication = descriptorType.PublicationId != null ? (descriptorType.Publication?.Journal + ", doi: " + descriptorType.Publication?.Doi) : null,
                Description = descriptorType.Description,
                ImageUrl = descriptorType.ImageUrl,
            };
        } 

        public Image MapToImage(ImageForCreationDto imageToCreate, string uploaderId)
        {
            return new Image
            {
                Url = imageToCreate.Url,
                IsThumbnail = true,
                ScaffoldGroupId = imageToCreate.ScaffoldGroupId,
                ScaffoldId = imageToCreate.ScaffoldId,
                UploaderId = uploaderId,
                PublicId = imageToCreate.PublicId,
            };
        }

        // private string JsonDocumentToString(JsonDocument jsonDocument)
        // {
        //     if (jsonDocument == null)
        //         return "N/A";

        //     try
        //     {
        //         // Assuming the JsonDocument contains an array of doubles
        //         // Extract the array from the JsonDocument
        //         var doubles = jsonDocument.RootElement.EnumerateArray()
        //                             .Select(element => element.GetDouble())
        //                             .ToList();

        //         // Convert the list of doubles to a comma-separated string
        //         return string.Join(", ", doubles);
        //     }
        //     catch
        //     {
        //         return "N/A";
        //     }
        // }

        private ScaffoldGroup SetScaffoldGroupNameAndComments(ScaffoldGroup scaffoldGroup)
        {
            // Filter out particle groups where Proportion = 0
            var validParticleGroups = scaffoldGroup.InputGroup?.ParticlePropertyGroups
                ?.Where(p => p.Proportion > 0)
                .ToList() ?? new List<ParticlePropertyGroup>();

            if (!validParticleGroups.Any())
                return scaffoldGroup; // Return early if no valid data exists
                
            var packingConfigName = scaffoldGroup.InputGroup?.PackingConfiguration.ToString();
            var distributionType = GetDistributionType(scaffoldGroup);
            var includeProportion = validParticleGroups.Count > 1 && validParticleGroups.Any(p => p.Proportion > 0 && p.Proportion < 1);
            var isSimulatedText = scaffoldGroup.IsSimulated ? "Simulated" : "Real";
            
            var stiffnessDescriptions = validParticleGroups
                .Select(p => p.Stiffness)
                .Where(s => !string.IsNullOrEmpty(s)) // Ensure only non-null stiffness values are included
                .ToList();

            var particleDescriptions = validParticleGroups
                .Select(p => includeProportion
                    ? $"{Math.Round(p.Proportion * 100)}% {p.Shape}, size {Math.Round(p.MeanSize)} μm"
                    : $"{p.Shape}, size {Math.Round(p.MeanSize)} μm")
                .ToList();

            var name = CapitalizeFirstLetter($"{distributionType} distribution of {string.Join(" and ", particleDescriptions)}");

            scaffoldGroup.Name = name;

            if (stiffnessDescriptions.Any())
            {
                scaffoldGroup.Comments = CapitalizeFirstLetter($"{isSimulatedText} scaffolds containing {string.Join(" and ", stiffnessDescriptions)} particles, {packingConfigName} packing");
            }
            else
            {
                scaffoldGroup.Comments = CapitalizeFirstLetter($"{isSimulatedText} scaffolds, {packingConfigName} packing"); // Fallback if no valid stiffness data is available
            }

            return scaffoldGroup;
        }

        private string GetDistributionType(ScaffoldGroup scaffoldGroup)
        {
            var particleGroups = scaffoldGroup.InputGroup?.ParticlePropertyGroups
                ?.Where(p => p.Proportion > 0) // Exclude proportion = 0
                .ToList() ?? new List<ParticlePropertyGroup>();

            int groupCount = particleGroups.Count;

            if (groupCount == 0) return "unknown"; // No particles available

            if (groupCount == 1)
            {
                // Single group: use its Dispersity if available
                return !string.IsNullOrWhiteSpace(particleGroups.First().Dispersity) 
                    ? particleGroups.First().Dispersity 
                    : "unknown";
            }

            var dispersities = particleGroups
                .Select(p => p.Dispersity)
                .Where(d => !string.IsNullOrWhiteSpace(d))
                .ToList();

            if (dispersities.All(d => d == "monodisperse") && groupCount == 2)
            {
                return "bidisperse";
            }
            else if (dispersities.Any(d => d == "polydisperse"))
            {
                return "polydisperse";
            }
            else if (groupCount > 2)
            {
                return "polydisperse";
            }
            
            return "unknown";
        }

        private PackingConfiguration ParsePackingConfiguration(object? input)
        {
            if (input == null)
            {
                return PackingConfiguration.Unknown; // Default for missing input
            }

            if (input is int intValue && Enum.IsDefined(typeof(PackingConfiguration), intValue))
            {
                return (PackingConfiguration)intValue;
            }

            if (input is string stringValue && Enum.TryParse<PackingConfiguration>(stringValue, true, out var result))
            {
                return result;
            }

            return PackingConfiguration.Unknown; // Default for invalid input
        }

        private string CapitalizeFirstLetter(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return text;

            text = text.Trim().ToLower(); // Convert the entire string to lowercase first
            return char.ToUpper(text[0]) + text.Substring(1);
        }
    }
}
