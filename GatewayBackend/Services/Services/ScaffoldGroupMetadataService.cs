using Data.Models;
using Services.IServices;

namespace Services.Services
{
    public class ScaffoldGroupMetadataService : IScaffoldGroupMetadataService
    {

        public ScaffoldGroupMetadataService()
        {
        }

		public ScaffoldGroup SetScaffoldGroupNameAndComments(ScaffoldGroup scaffoldGroup)
		{
			var validParticleGroups = scaffoldGroup.InputGroup?.ParticlePropertyGroups
				?.Where(p => p.Proportion > 0)
				.ToList() ?? new();

			if (!validParticleGroups.Any())
				return scaffoldGroup;

			var isSimulatedText = scaffoldGroup.IsSimulated ? "Simulated" : "Real";
			var packingConfig = scaffoldGroup.InputGroup?.PackingConfiguration ?? PackingConfiguration.Unknown;
			var packingDescriptor = FormatPackingDescriptor(packingConfig);
			var distributionType = GetDistributionType(scaffoldGroup);

			// Determine stiffness inclusion rule
			var distinctStiffnesses = validParticleGroups
				.Select(p => p.Stiffness?.Trim().ToLower() ?? "rigid")
				.Distinct()
				.ToList();

			var includeStiffness = !(distinctStiffnesses.Count == 1 && distinctStiffnesses[0] == "rigid");

			// ----- Name Generation -----
			string formattedName;

			if (validParticleGroups.Count == 1)
			{
				var p = validParticleGroups.First();

				var modifiers = new List<string>();

				if (includeStiffness && !string.IsNullOrEmpty(p.Stiffness))
					modifiers.Add(p.Stiffness.ToLower());

				if (packingDescriptor != null)
					modifiers.Add(packingDescriptor);

				modifiers.Add(p.Shape.ToLower());

				var stdText = distributionType == "polydisperse" && p.StandardDeviationSize.HasValue
					? $" (std. {Math.Round(p.StandardDeviationSize.Value)} μm)"
					: "";

				formattedName = CapitalizeFirstLetter($"{distributionType} {string.Join(" ", modifiers)}, size {Math.Round(p.MeanSize)} μm{stdText}");
			}
			else
			{
				var particleDescriptions = validParticleGroups.Select(p =>
				{
					var proportion = $"{Math.Round(p.Proportion * 100)}%";

					var stiffness = includeStiffness && !string.IsNullOrEmpty(p.Stiffness)
						? $"{p.Stiffness.ToLower()} "
						: "";

					var packing = packingDescriptor != null ? $"{packingDescriptor} " : "";
					var shape = p.Shape.ToLower();
					var size = $"{Math.Round(p.MeanSize)} μm";

					var stdText = distributionType == "polydisperse" && p.StandardDeviationSize.HasValue
						? $" (std. {Math.Round(p.StandardDeviationSize.Value)} μm)"
						: "";

					return $"{proportion} {stiffness}{packing}{shape}, size {size}{stdText}";
				});

				formattedName = CapitalizeFirstLetter($"{distributionType} - {string.Join(" and ", particleDescriptions)}");
			}

			scaffoldGroup.Name = formattedName;

			// ----- Comments Generation -----
			if (includeStiffness)
			{
				var readableStiffnesses = distinctStiffnesses.Select(CapitalizeFirstLetter);
				scaffoldGroup.Comments = CapitalizeFirstLetter(
					$"{isSimulatedText} scaffolds containing {string.Join(" and ", readableStiffnesses)} particles" +
					(packingDescriptor != null ? $", {packingDescriptor} packing" : "")
				);
			}
			else
			{
				scaffoldGroup.Comments = CapitalizeFirstLetter($"{isSimulatedText} scaffolds" +
					(packingDescriptor != null ? $", {packingDescriptor} packing" : ""));
			}

			return scaffoldGroup;
		}

        public string GetDistributionType(ScaffoldGroup scaffoldGroup)
		{
			var particleGroups = scaffoldGroup.InputGroup?.ParticlePropertyGroups
				?.Where(p => p.Proportion > 0)
				.ToList() ?? new();

			if (particleGroups.Count == 0)
				return "unknown";

			if (particleGroups.Count == 1)
			{
				var p = particleGroups[0];

				if (p.StandardDeviationSize.HasValue && Math.Round(p.StandardDeviationSize.Value) > 0)
					return "polydisperse";

				if (!string.IsNullOrWhiteSpace(p.Dispersity))
					return p.Dispersity.ToLower();

				return "monodisperse";
			}

			if (particleGroups.Count == 2 && particleGroups.All(p => p.Dispersity == "monodisperse"))
				return "bidisperse";

			if (particleGroups.Any(p =>
				p.Dispersity == "polydisperse" ||
				(p.StandardDeviationSize.HasValue && Math.Round(p.StandardDeviationSize.Value) > 0)))
			{
				return "polydisperse";
			}

			return "unknown";
		}

        public PackingConfiguration ParsePackingConfiguration(object? input)
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

        public string CapitalizeFirstLetter(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return text;

            text = text.Trim().ToLower(); // Convert the entire string to lowercase first
            return char.ToUpper(text[0]) + text.Substring(1);
        }

		string? FormatPackingDescriptor(PackingConfiguration packingConfig)
		{
			return packingConfig switch
			{
				PackingConfiguration.Anisotropic => "anisotropically-packed",
				PackingConfiguration.Square => "square-packed",
				PackingConfiguration.Hexagonal => "hexagonally-packed",
				_ => null
			};
		}
	}
}