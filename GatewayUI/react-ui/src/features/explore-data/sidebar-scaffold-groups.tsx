import { ScaffoldGroupData } from "../../app/models/scaffoldGroupData";
import { SidebarScaffoldGroupPanel } from "./sidebar-scaffold-group-panel";

interface SidebarScaffoldGroupsProps {
  scaffoldGroups: ScaffoldGroupData[];
  onRemove: (groupId: number) => void;
}

export const SidebarScaffoldGroups: React.FC<SidebarScaffoldGroupsProps> = ({ scaffoldGroups, onRemove }) => {
  return (
    // <div className="w-1/4 shrink-0">
      <div className="w-full h-full p-4 bg-gray-100">
		    {/* Sidebar title */}
        {/* <h2 className="text-lg font-bold text-gray-700 mb-4">Scaffold Groups</h2> */}

        {scaffoldGroups.map((groupData, index) => (
          <SidebarScaffoldGroupPanel
            key={groupData.scaffoldGroup.id}
            index={index}
            numPlots={scaffoldGroups.length}
            groupData={groupData}
			      onRemove={onRemove}
          />
        ))}
      </div>
    // </div>
  );
};