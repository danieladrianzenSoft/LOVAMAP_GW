import { ScaffoldGroupData } from "../../app/models/scaffoldGroupData";
import { SidebarScaffoldGroupPanel } from "./sidebar-scaffold-group-panel";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SidebarScaffoldGroupsProps {
  scaffoldGroups: ScaffoldGroupData[];
  onReorder: (scaffoldGroups: ScaffoldGroupData[]) => void;
  onRemove: (groupId: number) => void;
}

export const SidebarScaffoldGroups: React.FC<SidebarScaffoldGroupsProps> = ({ scaffoldGroups, onReorder, onRemove }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Require 5px movement before drag starts
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = scaffoldGroups.findIndex(g => g.scaffoldGroup.id.toString() === active.id);
      const newIndex = scaffoldGroups.findIndex(g => g.scaffoldGroup.id.toString() === over?.id);
      const newOrder = arrayMove(scaffoldGroups, oldIndex, newIndex);
      onReorder(newOrder); // This needs to be lifted to parent (ExploreData)
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={scaffoldGroups.map(g => g.scaffoldGroup.id.toString())}
        strategy={verticalListSortingStrategy}
      >
        <div className="w-full h-full p-4 bg-gray-100">
          {scaffoldGroups.map((groupData, index) => (
              <DraggableSidebarItem key={groupData.scaffoldGroup.id} id={groupData.scaffoldGroup.id.toString()}>
                <SidebarScaffoldGroupPanel
                  index={index}
                  numPlots={scaffoldGroups.length}
                  groupData={groupData}
                  onRemove={onRemove}
                />
              </DraggableSidebarItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

// Wrapper for each draggable item
function DraggableSidebarItem({ id, children }: { id: string, children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}