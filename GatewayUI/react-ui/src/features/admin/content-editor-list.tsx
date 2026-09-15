import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import agent from "../../app/api/agent";
import { ContentPageSummary } from "../../app/models/contentPage";

const ContentEditorList: React.FC = () => {
	const [pages, setPages] = useState<ContentPageSummary[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchAll = async () => {
			setLoading(true);
			try {
				const [learnRes, docRes] = await Promise.all([
					agent.Content.getPages("learn"),
					agent.Content.getPages("documentation"),
				]);
				setPages([...learnRes.data, ...docRes.data]);
			} finally {
				setLoading(false);
			}
		};
		fetchAll();
	}, []);

	if (loading) return <div className="container mx-auto py-8 px-6 text-gray-400">Loading...</div>;

	const grouped = pages.reduce<Record<string, ContentPageSummary[]>>((acc, p) => {
		(acc[p.area] ??= []).push(p);
		return acc;
	}, {});

	return (
		<div className="container mx-auto py-8 px-6">
			<div className="text-3xl text-gray-700 font-bold mb-8">Content Pages</div>

			{Object.entries(grouped).map(([area, areaPages]) => (
				<div key={area} className="mb-8">
					<h2 className="text-xl font-semibold text-gray-700 mb-4 capitalize">{area}</h2>
					<div className="space-y-2">
						{areaPages.map((p) => (
							<Link
								key={p.id}
								to={`/admin/content/${p.slug}`}
								className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
							>
								<div className="flex items-center justify-between">
									<div>
										<span className="font-medium text-gray-800">{p.title}</span>
										<span className="ml-2 text-sm text-gray-400">/{p.slug}</span>
									</div>
									<div className="flex items-center gap-2">
										{p.comingSoon && (
											<span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
												Coming soon
											</span>
										)}
										<span className="text-gray-400 text-sm">&rarr;</span>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>
			))}
		</div>
	);
};

export default ContentEditorList;
