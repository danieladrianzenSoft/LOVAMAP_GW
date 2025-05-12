export interface BatchOperationResult {
	allSucceeded: number;
	succeededIds: number[];
	failedIds: number[];
}