using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using Infrastructure.DTOs;
using Services.IServices;

namespace Services.Services
{
	public class PublicationExportService : IPublicationExportService
	{
		private const int HeadingCharacterLength = 30;
		private readonly IPublicationService _publicationService;
		private readonly IScaffoldGroupService _scaffoldGroupService;

		public PublicationExportService(
			IPublicationService publicationService,
			IScaffoldGroupService scaffoldGroupService)
		{
			_publicationService = publicationService;
			_scaffoldGroupService = scaffoldGroupService;
		}

		public async Task<(bool Succeeded, string ErrorMessage, PublicationComprehensiveExport? Export)> PrepareComprehensiveExportAsync(int publicationId, string userId)
		{
			var (publicationSucceeded, publicationError, publication) = await _publicationService.GetPublicationSummaryByIdAsync(publicationId);
			if (!publicationSucceeded || publication == null)
				return (false, publicationError, null);

			var filter = new ScaffoldFilter
			{
				PublicationId = publicationId,
				RestrictToPublicationDataset = true
			};

			var (groupsSucceeded, groupsError, scaffoldGroups) =
				await _scaffoldGroupService.GetFilteredScaffoldGroups(filter, userId, isDetailed: true);

			if (!groupsSucceeded)
				return (false, groupsError, null);

			var detailedGroups = scaffoldGroups?
				.OfType<ScaffoldGroupDetailedDto>()
				.OrderBy(group => group.Id)
				.ToList() ?? [];

			if (detailedGroups.Count == 0)
				return (false, "No scaffold groups found for this publication.", null);

			return (true, "", new PublicationComprehensiveExport
			{
				Publication = publication,
				ScaffoldGroups = detailedGroups,
				ZipFileName = $"{SanitizeFileName(publication.Title, 80)}_data.zip"
			});
		}

		public async Task WriteComprehensiveExportZipAsync(PublicationComprehensiveExport export, Stream output, CancellationToken cancellationToken = default)
		{
			var tempZipPath = Path.Combine(Path.GetTempPath(), $"lovamap-publication-export-{Guid.NewGuid():N}.zip");

			try
			{
				await using (var zipFileStream = new FileStream(tempZipPath, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None))
				{
					using var archive = new ZipArchive(zipFileStream, ZipArchiveMode.Create, leaveOpen: true);
					var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

					foreach (var group in export.ScaffoldGroups)
					{
						cancellationToken.ThrowIfCancellationRequested();

						await using var workbookStream = new MemoryStream();
						using (var workbook = CreateScaffoldGroupWorkbook(group))
						{
							workbook.SaveAs(workbookStream);
						}

						workbookStream.Position = 0;
						var entryName = MakeUniqueWorkbookFileName(group, usedNames);
						var entry = archive.CreateEntry(entryName, CompressionLevel.Fastest);

						await using var entryStream = entry.Open();
						await workbookStream.CopyToAsync(entryStream, cancellationToken);
					}
				}

				await using var readStream = new FileStream(tempZipPath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 1024 * 1024, useAsync: true);
				await readStream.CopyToAsync(output, cancellationToken);
			}
			finally
			{
				if (File.Exists(tempZipPath))
					File.Delete(tempZipPath);
			}
		}

		private static XLWorkbook CreateScaffoldGroupWorkbook(ScaffoldGroupDetailedDto scaffoldGroup)
		{
			var workbook = new XLWorkbook();
			AddGeneralInfoWorksheet(workbook, scaffoldGroup);

			foreach (var scaffold in scaffoldGroup.Scaffolds.OrderBy(scaffold => scaffold.ReplicateNumber))
			{
				var worksheet = workbook.Worksheets.Add(GetSafeSheetName($"Replicate {scaffold.ReplicateNumber}"));

				AddRow(worksheet, 1, 1, ["Global Descriptors"]);
				AddRow(worksheet, 2, 1, scaffold.GlobalDescriptors.Select(GetDescriptorLabel).Cast<object?>().ToList());
				AddRow(worksheet, 3, 1, scaffold.GlobalDescriptors.Select(descriptor => descriptor.Values).Cast<object?>().ToList());

				const int descriptorsStartRow = 5;
				var nextColStart = 1;

				if (scaffold.OtherDescriptors.Count > 0)
				{
					var (data, maxCol) = LayoutDescriptors(scaffold.OtherDescriptors, includePoreId: false);
					AddRow(worksheet, descriptorsStartRow, 1, ["Other Descriptors"]);
					AddRows(worksheet, descriptorsStartRow + 1, 1, data);
					nextColStart = maxCol + 1;
				}

				if (scaffold.PoreDescriptors.Count > 0)
				{
					var (data, _) = LayoutDescriptors(scaffold.PoreDescriptors, includePoreId: true);
					AddRow(worksheet, descriptorsStartRow, nextColStart, ["Pore Descriptors"]);
					AddRows(worksheet, descriptorsStartRow + 1, nextColStart, data);
				}

				worksheet.Columns().AdjustToContents(1, 60);
			}

			return workbook;
		}

		private static void AddGeneralInfoWorksheet(XLWorkbook workbook, ScaffoldGroupDetailedDto scaffoldGroup)
		{
			var worksheet = workbook.Worksheets.Add("General Info");
			var row = 1;

			AddRow(worksheet, row++, 1, ["Key", "Scaffold Group 1"]);
			AddRow(worksheet, row++, 1, ["ID", scaffoldGroup.Id]);
			AddRow(worksheet, row++, 1, ["Name", scaffoldGroup.Name]);
			AddRow(worksheet, row++, 1, ["Simulated", scaffoldGroup.IsSimulated.ToString().ToLowerInvariant()]);
			AddRow(worksheet, row++, 1, ["Number of Replicates", scaffoldGroup.NumReplicates]);
			row++;
			AddRow(worksheet, row++, 1, ["Scaffold Inputs"]);
			AddRow(worksheet, row++, 1, ["Container Shape", scaffoldGroup.Inputs?.ContainerShape ?? "n/a"]);
			AddRow(worksheet, row++, 1, ["Container Size", scaffoldGroup.Inputs?.ContainerSize?.ToString() ?? "n/a"]);
			AddRow(worksheet, row++, 1, ["Packing Configuration", scaffoldGroup.Inputs?.PackingConfiguration.ToLowerInvariant() ?? "n/a"]);
			row++;
			AddRow(worksheet, row++, 1, ["Particle Properties"]);
			AddRow(worksheet, row++, 1, ["Shape", "Stiffness", "Dispersity", "Size Distribution Type", "Mean Size", "Standard Deviation Size", "Proportion"]);

			foreach (var particle in scaffoldGroup.Inputs?.Particles ?? [])
			{
				AddRow(worksheet, row++, 1, [
					particle.Shape,
					particle.Stiffness,
					particle.Dispersity,
					particle.SizeDistributionType,
					particle.MeanSize,
					particle.StandardDeviationSize,
					particle.Proportion
				]);
			}

			worksheet.Columns().AdjustToContents(1, 60);
		}

		private static (List<List<object?>> Data, int MaxCol) LayoutDescriptors(IEnumerable<DescriptorDto> descriptors, bool includePoreId)
		{
			var orderedDescriptors = descriptors.OrderBy(descriptor => descriptor.Label).ToList();
			var headers = new List<object?>();
			var rows = new List<List<object?>>();
			var poreIds = new List<string?>();

			for (var descriptorIndex = 0; descriptorIndex < orderedDescriptors.Count; descriptorIndex++)
			{
				var descriptor = orderedDescriptors[descriptorIndex];
				var valueRows = ParseDescriptorValues(descriptor.Values, includePoreId, poreIds);

				for (var rowIndex = 0; rowIndex < valueRows.Count; rowIndex++)
				{
					while (rows.Count <= rowIndex)
						rows.Add([]);
					EnsureColumn(rows[rowIndex], descriptorIndex);
					rows[rowIndex][descriptorIndex] = valueRows[rowIndex];
				}

				headers.Add(GetDescriptorLabel(descriptor));
			}

			var maxCol = orderedDescriptors.Count;
			if (includePoreId && poreIds.Count > 0)
			{
				headers.Add("PoreId");
				for (var rowIndex = 0; rowIndex < poreIds.Count; rowIndex++)
				{
					while (rows.Count <= rowIndex)
						rows.Add([]);
					EnsureColumn(rows[rowIndex], headers.Count - 1);
					rows[rowIndex][headers.Count - 1] = poreIds[rowIndex];
				}
				maxCol++;
			}

			return ([headers, .. rows], maxCol);
		}

		private static List<string> ParseDescriptorValues(string? rawValues, bool includePoreId, List<string?> poreIds)
		{
			if (string.IsNullOrWhiteSpace(rawValues))
				return [];

			var firstPair = rawValues.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault();
			var isIdValuePair = firstPair != null && firstPair.Contains(',') && Regex.IsMatch(firstPair.Trim(), "^[^,]+,[^,]+$");

			if (includePoreId && isIdValuePair)
			{
				var values = new List<string>();
				var pairs = rawValues.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
				for (var index = 0; index < pairs.Length; index++)
				{
					var parts = pairs[index].Split(',', 2, StringSplitOptions.TrimEntries);
					if (parts.Length < 2) continue;

					values.Add(parts[1]);
					while (poreIds.Count <= index)
						poreIds.Add(null);
					poreIds[index] ??= parts[0];
				}
				return values;
			}

			return rawValues.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
		}

		private static void AddRows(IXLWorksheet worksheet, int startRow, int startColumn, IReadOnlyList<IReadOnlyList<object?>> rows)
		{
			var textColumns = rows.Count > 0
				? rows[0]
					.Select((value, index) => string.Equals(value?.ToString(), "PoreId", StringComparison.OrdinalIgnoreCase) ? index : -1)
					.Where(index => index >= 0)
					.ToHashSet()
				: [];

			for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
				AddRow(worksheet, startRow + rowIndex, startColumn, rows[rowIndex], textColumns);
		}

		private static void AddRow(IXLWorksheet worksheet, int row, int startColumn, IReadOnlyList<object?> values, ISet<int>? textColumns = null)
		{
			for (var index = 0; index < values.Count; index++)
				SetCellValue(worksheet.Cell(row, startColumn + index), values[index], textColumns?.Contains(index) == true);
		}

		private static void SetCellValue(IXLCell cell, object? value, bool forceText = false)
		{
			if (value == null)
			{
				cell.Clear();
				return;
			}

			if (value is string stringValue)
			{
				if (forceText)
				{
					cell.Value = stringValue;
					cell.Style.NumberFormat.Format = "@";
					return;
				}

				if (double.TryParse(stringValue, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var numericValue))
				{
					cell.Value = numericValue;
					return;
				}

				cell.Value = stringValue;
				return;
			}

			cell.Value = XLCellValue.FromObject(value);
		}

		private static void EnsureColumn(List<object?> row, int index)
		{
			while (row.Count <= index)
				row.Add(null);
		}

		private static string GetDescriptorLabel(DescriptorDto descriptor)
		{
			return string.IsNullOrWhiteSpace(descriptor.Unit)
				? descriptor.Label
				: $"{descriptor.Label} ({descriptor.Unit})";
		}

		private static string MakeUniqueWorkbookFileName(ScaffoldGroupDetailedDto group, HashSet<string> usedNames)
		{
			var rawBase = !string.IsNullOrWhiteSpace(group.Name)
				? group.Name
				: $"scaffold_group_{group.Id}";
			var safeBase = SanitizeFileName(rawBase, 60);
			var fileName = $"{safeBase}_group_{group.Id}.xlsx";
			var counter = 2;

			while (!usedNames.Add(fileName))
				fileName = $"{safeBase}_group_{group.Id}_{counter++}.xlsx";

			return fileName;
		}

		private static string SanitizeFileName(string? value, int maxLength)
		{
			var ascii = Encoding.ASCII.GetString(
				Encoding.ASCII.GetBytes((value ?? "publication_data").Normalize(NormalizationForm.FormKD)));
			var safe = Regex.Replace(ascii, "[^a-zA-Z0-9]+", "_").Trim('_');
			if (string.IsNullOrWhiteSpace(safe))
				safe = "publication_data";
			return safe[..Math.Min(safe.Length, maxLength)];
		}

		private static string GetSafeSheetName(string value)
		{
			var safe = Regex.Replace(value, @"[\[\]\*:/\\?]", " ").Trim();
			if (string.IsNullOrWhiteSpace(safe))
				safe = "Sheet";
			return safe[..Math.Min(safe.Length, 31)];
		}
	}
}
