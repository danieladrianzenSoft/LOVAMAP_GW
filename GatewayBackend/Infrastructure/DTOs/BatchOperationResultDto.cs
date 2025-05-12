namespace Infrastructure.DTOs
{
	public class BatchOperationResult
	{
		public bool AllSucceeded => FailedIds.Count == 0;
		public List<int> SucceededIds { get; set; } = [];
		public List<int> FailedIds { get; set; } = [];
	}
}


