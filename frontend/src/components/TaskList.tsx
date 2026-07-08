import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TaskCard from './TaskCard'
import type { Task } from '../lib/api'

function SortableTask({
  task,
  onComplete,
  onDelegate,
}: {
  task: Task
  onComplete: (id: string) => void
  onDelegate: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard
        task={task}
        onComplete={onComplete}
        onDelegate={onDelegate}
        dragHandleListeners={listeners}
      />
    </div>
  )
}

interface TaskListProps {
  tasks: Task[]
  onReorder: (tasks: Task[]) => void
  onComplete: (id: string) => void
  onDelegate: (id: string) => void
}

export default function TaskList({ tasks, onReorder, onComplete, onDelegate }: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)
    onReorder(arrayMove(tasks, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDelegate={onDelegate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
