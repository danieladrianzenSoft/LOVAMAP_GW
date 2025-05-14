export interface BatchOperationResult {
	allSucceeded: boolean;
	succeededIds: number[];
	failedIds: number[];
}