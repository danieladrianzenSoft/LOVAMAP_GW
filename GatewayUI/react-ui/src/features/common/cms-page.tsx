import React from "react";
import { useParams } from "react-router-dom";
import { useContentPage } from "../../app/common/hooks/useContentPage";
import ContentRenderer from "./content-renderer";

const CmsPage: React.FC = () => {
	const { slug } = useParams<{ slug: string }>();
	const { page, loading } = useContentPage(slug || "");

	if (loading) return <div className="container mx-auto py-8 px-6 text-gray-400">Loading...</div>;
	if (!page) return <div className="container mx-auto py-8 px-6 text-gray-500">Page not found</div>;

	return <ContentRenderer page={page} />;
};

export default CmsPage;
