import { useState, useEffect } from "react";
import { useStore } from "../../stores/store";
import { ContentPageSummary } from "../../models/contentPage";

export const useContentPages = (area: string) => {
	const { contentStore } = useStore();
	const [pages, setPages] = useState<ContentPageSummary[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			const cached = contentStore.pagesByArea.get(area);
			if (cached) {
				setPages(cached);
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const data = await contentStore.getPagesByArea(area);
				setPages(data);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [contentStore, area]);

	return { pages, loading };
};
