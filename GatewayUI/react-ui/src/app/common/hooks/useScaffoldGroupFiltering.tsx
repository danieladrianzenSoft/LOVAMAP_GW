import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../../app/stores/store"; // or wherever your MobX store hook lives
import { Tag } from "../../models/tag"; // adjust this import path as needed
import { ScaffoldGroupFilter } from "../../models/scaffoldGroupFilter";

type InitialScope = {
  publicationId?: number;
  publicationDatasetId?: number;
  restrictToPublicationDataset?: boolean;
  skipFirstUnscoped?: boolean;
};

export const useScaffoldGroupFiltering = (isLoggedIn: boolean, setIsLoading: (loading: boolean) => void, initialScope?: InitialScope) => {
	const { scaffoldGroupStore } = useStore();

	const [selectedTags, setSelectedTags] = useState<{ [key: string]: Tag[] }>({});
	const [selectedParticleSizeIds, setSelectedParticleSizeIds] = useState<number[]>([]);
	const [publicationId, setSelectedPublicationId] =
		useState<number | null>(initialScope?.publicationId ?? null);
	const [publicationDatasetId, setSelectedPublicationDatasetId] =
		useState<number | null>(initialScope?.publicationDatasetId ?? null);
	const [restrictToPublicationDataset, setRestrictToPublicationDataset] =
		useState<boolean>(!!initialScope?.restrictToPublicationDataset);

	const [aiSearchUsed, setAiSearchUsed] = useState(false);

	const isPublicationScoped =
    	restrictToPublicationDataset && (publicationId !== null || publicationDatasetId !== null);
	
	const blockUnscopedOnceRef = useRef<boolean>(!!initialScope?.skipFirstUnscoped);

	// Trigger filtering whenever tags or particle sizes change
	useEffect(() => {
		let cancelled = false;
		const fetchScaffoldGroups = async () => {
			setIsLoading(true);
			try {
				if (isPublicationScoped) {
					// Publication-scoped query
					const filter: ScaffoldGroupFilter = {
						publicationId: publicationId ?? undefined,
						publicationDatasetId: publicationDatasetId ?? undefined,
						restrictToPublicationDataset,
					}

					if (isLoggedIn) {
						await scaffoldGroupStore.getSummarizedScaffoldGroups(filter);
					} else {
						await scaffoldGroupStore.getPublicScaffoldGroups(filter);
					}
					return;
				}
				if (blockUnscopedOnceRef.current) {
					blockUnscopedOnceRef.current = false;
					return; // skip this unscoped cycle entirely
				}

				const allSelectedTags = Object.values(selectedTags).flat();

				const filter: ScaffoldGroupFilter = {
					selectedTags: allSelectedTags,
					sizeIds: selectedParticleSizeIds,
					restrictToPublicationDataset: false
				}

				if (isLoggedIn) {
					await scaffoldGroupStore.getSummarizedScaffoldGroups(filter);
				} else {
					await scaffoldGroupStore.getPublicScaffoldGroups(filter);
				}
			} catch (err) {
				console.error("Error fetching scaffold groups:", err);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		};

		fetchScaffoldGroups();
		return () => { cancelled = true; };
	}, [
		selectedTags, 
		selectedParticleSizeIds, 
		isLoggedIn, 
		setIsLoading, 
		scaffoldGroupStore, 
		isPublicationScoped, 
		publicationId, 
		publicationDatasetId, 
		restrictToPublicationDataset
	]);

	// Optional: Expose helper to remove a tag
	const removeFilterTag = (tagText: string) => {
		if (tagText.endsWith("um")) {
			const numberPart = parseInt(tagText.replace("um", ""), 10);
			if (!isNaN(numberPart) && selectedParticleSizeIds.includes(numberPart)) {
				setSelectedParticleSizeIds(prev => prev.filter(id => id !== numberPart));
				return;
			}
		}

		// Remove from selectedTags
		setSelectedTags(prev => {
			const updated = { ...prev };
			for (const group in updated) {
				updated[group] = updated[group].filter(t => t.name !== tagText);
			}
			return updated;
		});
	};

	const loadAIResults = async (prompt: string) => {
		setIsLoading(true);
		try {
			await scaffoldGroupStore.searchScaffoldGroups(prompt);
			setSelectedParticleSizeIds(scaffoldGroupStore.selectedParticleSizeIds);
			setSelectedTags(scaffoldGroupStore.groupedSelectedTags);
			setAiSearchUsed(true);
		} catch (error) {
			console.error("Failed to load AI scaffold group search:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const selectedTagNames = useMemo(
		() => Object.values(selectedTags).flat().map(tag => tag.name),
		[selectedTags]
	);

	return {
		selectedTags,
		setSelectedTags,
		selectedParticleSizeIds,
		setSelectedParticleSizeIds,
		removeFilterTag,
		selectedTagNames,
		loadAIResults,
		aiSearchUsed,
		setAiSearchUsed,
		publicationId,
		setSelectedPublicationId,
		publicationDatasetId,
		setSelectedPublicationDatasetId,
		restrictToPublicationDataset,
		setRestrictToPublicationDataset,
		isPublicationScoped,
	};
}