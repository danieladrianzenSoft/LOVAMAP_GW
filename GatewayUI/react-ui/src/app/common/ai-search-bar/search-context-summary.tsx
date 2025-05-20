import Tag from "../tag/tag";

interface SearchContextSummaryProps {
  aiSearchUsed: boolean;
  selectedTagNames: string[];
  selectedParticleSizeIds: number[];
}

export const SearchContextSummary: React.FC<SearchContextSummaryProps> = ({
  aiSearchUsed,
  selectedTagNames,
  selectedParticleSizeIds
}) => {
  if (!aiSearchUsed || (selectedTagNames.length === 0 && selectedParticleSizeIds.length === 0)) {
    return null;
  }

  return (
    <div className="mt-2 px-3 py-2 text-sm">
		<div className="flex flex-wrap gap-x-1 gap-y-1">
			<p>Based on your search prompt, the best-matching tags are:</p>
			{selectedTagNames.map((tag, index) => (
				<Tag key={`tag-${index}`} text={tag} />
			))}
			{selectedParticleSizeIds.map((tag, index) => (
				<Tag key={`size-${index}`} text={tag.toString() + "μm"} />
			))}
		</div>
    </div>
  );
};