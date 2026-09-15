import { useState, useEffect } from "react";
import { useStore } from "../../stores/store";
import { ContentPageDetail } from "../../models/contentPage";

export const useContentPage = (slug: string) => {
	const { contentStore } = useStore();
	const [page, setPage] = useState<ContentPageDetail | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			const cached = contentStore.pagesBySlug.get(slug);
			if (cached) {
				setPage(cached);
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const data = await contentStore.getPageBySlug(slug);
				setPage(data);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [contentStore, slug]);

	return { page, loading };
};
