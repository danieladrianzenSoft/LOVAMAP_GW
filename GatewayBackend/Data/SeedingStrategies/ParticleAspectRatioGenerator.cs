using System.Text.Json;
using Data;
using Data.Models;

namespace Data.SeedingStrategies
{
    public class ParticleAspectRatioGenerator : IDescriptorValueGenerator
    {
        public string DescriptorName => "ParticleAspectRatio";
        public string Category => "Other";

        public IEnumerable<object> PreloadSeedData(IEnumerable<int> scaffoldIds, DataContext context)
        {
            var query = from s in context.Scaffolds
                        where scaffoldIds.Contains(s.Id)
                        let ppg = context.ParticlePropertyGroups
                            .Where(ppg => ppg.InputGroup.ScaffoldGroupId == s.ScaffoldGroupId)
                            .FirstOrDefault()
                        let numParticles = (
                            from gd in context.GlobalDescriptors
                            join dt in context.DescriptorTypes on gd.DescriptorTypeId equals dt.Id
                            where gd.ScaffoldId == s.Id && dt.Name == "NumParticles"
                            select gd.ValueInt
                        ).FirstOrDefault()
                        where ppg != null && numParticles.HasValue
                        select new ParticleAspectRatioSeedData
                        {
                            ScaffoldId = s.Id,
                            Shape = ppg.Shape,
                            NumParticles = numParticles.Value
                        };


            return query.ToList<object>();
        }

        public object? GenerateDescriptor(object seedData, DescriptorType descriptorType)
        {
            var data = (ParticleAspectRatioSeedData)seedData;

            if (data.NumParticles <= 0 || string.IsNullOrEmpty(data.Shape))
                return null;

            var knownShapes = new[] { "spheres", "rods", "ellipsoids", "nuggets" };
            if (!knownShapes.Contains(data.Shape.ToLowerInvariant()))
            {
                throw new Exception($"Unknown shape '{data.Shape}' for scaffold {data.ScaffoldId}");
            }

            var aspectRatio = data.Shape.ToLower() switch
            {
                "spheres" => 1.0,
                "rods" => 2.5,
                "ellipsoids" => 2.0,
                "nuggets" => 3.33,
                _ => throw new Exception("Unknown shape")
            };

            var values = Enumerable.Repeat(aspectRatio, data.NumParticles).ToArray();
            var json = JsonSerializer.SerializeToDocument(values);

            return new OtherDescriptor
            {
                ScaffoldId = data.ScaffoldId,
                DescriptorTypeId = descriptorType.Id,
                Values = json
            };
        }
    }

    public class ParticleAspectRatioSeedData
    {
        public int ScaffoldId { get; set; }
        public string Shape { get; set; } = null!;
        public int NumParticles { get; set; }
    }
}

