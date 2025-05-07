import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../../app/stores/store"; // or wherever your MobX store hook lives
import { Tag } from "../../models/tag"; // adjust this import path as needed

export const useScaffoldGroupFiltering = (isLoggedIn: boolean, setIsLoading: (loading: boolean) => void) => {
	const { scaffoldGroupStore } = useStore();

	const [selectedTags, setSelectedTags] = useState<{ [key: string]: Tag[] }>({});
	const [selectedParticleSizeIds, setSelectedParticleSizeIds] = useState<number[]>([]);
	const [aiSearchUsed, setAiSearchUsed] = useState(false);

	// Trigger filtering whenever tags or particle sizes change
	useEffect(() => {
		const fetchScaffoldGroups = async () => {
			setIsLoading(true);
			try {
				const allSelectedTags = Object.values(selectedTags).flat();
				if (isLoggedIn) {
					await scaffoldGroupStore.getSummarizedScaffoldGroups(allSelectedTags, selectedParticleSizeIds);
				} else {
					await scaffoldGroupStore.getPublicScaffoldGroups(allSelectedTags, selectedParticleSizeIds);
				}
			} catch (err) {
				console.error("Error fetching scaffold groups:", err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchScaffoldGroups();
	}, [selectedTags, selectedParticleSizeIds, isLoggedIn, setIsLoading, scaffoldGroupStore]);

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
		setAiSearchUsed
	};
}