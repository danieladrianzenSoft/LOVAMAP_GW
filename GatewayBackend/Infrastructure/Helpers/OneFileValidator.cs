using System.ComponentModel.DataAnnotations;
using Infrastructure.DTOs;

namespace Infrastructure.Helpers
{	
	public class ExactlyOneFileRequiredAttribute : ValidationAttribute
	{
		protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
		{
			if (validationContext.ObjectInstance is JobSubmissionDto request)
			{
				var hasCsv = request.CsvFile != null;
				var hasDat = request.DatFile != null;
				var hasJson = request.JsonFile != null;
 
				var total = new[] { hasCsv, hasDat, hasJson }.Count(x => x);

				if (total != 1) // Both true OR both false → invalid
				{
					return new ValidationResult("Exactly one file must be provided: either CsvFile, DatFile or JsonFile.");
				}
			}
			return ValidationResult.Success;
		}
	}
}
