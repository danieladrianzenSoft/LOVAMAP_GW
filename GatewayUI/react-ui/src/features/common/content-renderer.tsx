import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { ContentPageDetail } from "../../app/models/contentPage";
import type { Components } from "react-markdown";

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg)(\?.*)?$/i;

const markdownComponents: Components = {
	img: ({ src, alt, ...props }) => {
		if (src && VIDEO_EXTENSIONS.test(src)) {
			return (
				<span className="aspect-[4/3] w-full sm:w-[48%] overflow-hidden rounded-xl shadow-lg block">
					<video controls className="w-full h-full object-cover">
						<source src={src} type={`video/${src.match(/\.(mp4|webm|ogg)/i)?.[1] || "mp4"}`} />
						Your browser does not support the video tag.
					</video>
				</span>
			);
		}
		return <img src={src} alt={alt || ""} className="max-w-full rounded-lg" {...props} />;
	},
	p: ({ children, node, ...props }) => {
		// Check the HAST node for img children with video URLs
		const hasVideo = node?.children?.some(
			(child: any) => child.tagName === "img" && VIDEO_EXTENSIONS.test(child.properties?.src || "")
		);
		if (hasVideo) {
			return <div className="flex flex-wrap justify-center gap-4 mb-4">{children}</div>;
		}
		return <p {...props}>{children}</p>;
	},
	blockquote: ({ children }) => (
		<div className="mt-4 inline-block bg-secondary-50 rounded-xl px-6 py-4">
			<div className="text-gray-400 font-medium">{children}</div>
		</div>
	),
	a: ({ href, children, ...props }) => (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="text-link-100 hover:underline"
			{...props}
		>
			{children}
		</a>
	),
};

interface ContentRendererProps {
	page: ContentPageDetail;
}

const ContentRenderer: React.FC<ContentRendererProps> = ({ page }) => {
	return (
		<div className="container mx-auto py-8 px-6">
			<div className="text-3xl text-gray-700 font-bold mb-12">{page.title}</div>

			{page.comingSoon && page.sections.length === 0 ? (
				<div className="text-center">
					<div className="inline-block bg-secondary-50 rounded-xl px-10 py-8">
						<p className="text-lg text-gray-400 font-medium">Coming soon</p>
					</div>
				</div>
			) : (
				<div className="space-y-8">
					{page.sections.map((section) => (
						<div key={section.id}>
							{section.title && (
								<h2 className="text-xl font-semibold text-gray-800 mb-2">
									{section.title}
								</h2>
							)}
							<div className="text-gray-600 leading-relaxed markdown-content">
								<ReactMarkdown
									rehypePlugins={[rehypeSanitize]}
									components={markdownComponents}
								>
									{section.body}
								</ReactMarkdown>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default ContentRenderer;
