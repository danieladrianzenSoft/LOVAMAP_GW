using System.Text.Json;
using Data;
using Data.Models;

namespace Data.SeedingStrategies
{
    public interface IDescriptorValueGenerator
    {
        string DescriptorName { get; }
        string Category { get; }
        IEnumerable<object> PreloadSeedData(IEnumerable<int> scaffoldIds, DataContext context);
        object? GenerateDescriptor(object seedData, DescriptorType descriptorType);
    }
}

