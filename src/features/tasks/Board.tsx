import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { reorderTasks } from "../../api/tasks";
import { TASK_STATUSES, type Task, type TaskStatus } from "../../api/types";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n/en";
import { columnId, findColumn, moveTask, toColumns, type Columns } from "../../lib/board";
import { errorMessage } from "../../lib/errors";
import { TaskMeta } from "./TaskMeta";

interface BoardProps {
  projectId: number;
  tasks: Task[];
  onOpen: (task: Task) => void;
  onAdd: (status: TaskStatus) => void;
}

/** Kanban board: To do → Doing → Done, with drag and drop (mouse or keyboard). */
export function Board({ projectId, tasks, onOpen, onAdd }: BoardProps) {
  const toast = useToast();
  const [columns, setColumns] = useState<Columns>(() => toColumns(tasks));
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [shownTasks, setShownTasks] = useState(tasks);

  // Fresh data from the database replaces the local copy (but not in the middle of a drag).
  if (tasks !== shownTasks && !activeTask) {
    setShownTasks(tasks);
    setColumns(toColumns(tasks));
  }

  const sensors = useSensors(
    // A small move is needed before a drag starts, so a click still opens the task.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks.find((task) => task.id === active.id) ?? null);
  };

  // Show the card in the new column while dragging.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = findColumn(columns, active.id);
    const to = findColumn(columns, over.id);
    if (from && to && from !== to) setColumns((c) => moveTask(c, Number(active.id), over.id));
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) {
      setColumns(toColumns(tasks));
      return;
    }
    const next = moveTask(columns, Number(active.id), over.id);
    setColumns(next);
    const status = findColumn(next, active.id);
    if (!status) return;
    try {
      await reorderTasks(
        projectId,
        status,
        next[status].map((task) => task.id),
      );
    } catch (e) {
      toast(errorMessage(e), "error");
      setColumns(toColumns(tasks));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveTask(null);
        setColumns(toColumns(tasks));
      }}
    >
      <div className="board">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={columns[status]}
            onOpen={onOpen}
            onAdd={onAdd}
          />
        ))}
      </div>
      <DragOverlay>{activeTask && <CardBody task={activeTask} className="overlay" />}</DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  onOpen,
  onAdd,
}: {
  status: TaskStatus;
  tasks: Task[];
  onOpen: (task: Task) => void;
  onAdd: (status: TaskStatus) => void;
}) {
  const { setNodeRef } = useDroppable({ id: columnId(status) });
  return (
    <section className="column" aria-label={t.tasks.statuses[status]}>
      <div className="column-header">
        <h3>{t.tasks.statuses[status]}</h3>
        <span className="badge">{tasks.length}</span>
        <span className="spacer" />
        <button
          className="icon-button"
          onClick={() => onAdd(status)}
          aria-label={`${t.tasks.newTask}: ${t.tasks.statuses[status]}`}
          title={t.tasks.newTask}
        >
          <Plus size={16} />
        </button>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="column-body">
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onOpen={onOpen} />
          ))}
          {tasks.length === 0 && <div className="column-empty">{t.tasks.emptyColumn}</div>}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableCard({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        // Enter opens the task. Space is used by the keyboard drag.
        if (e.key === "Enter") onOpen(task);
        else listeners?.onKeyDown?.(e);
      }}
    >
      <CardBody task={task} className={isDragging ? "dragging" : ""} />
    </div>
  );
}

function CardBody({ task, className = "" }: { task: Task; className?: string }) {
  return (
    <div
      className={`task-card ${task.status === "done" ? "done" : ""} ${className}`}
      style={{
        ["--card-accent" as string]: task.priority === "high" ? "var(--danger)" : undefined,
      }}
    >
      <span className="title">{task.title}</span>
      <TaskMeta task={task} />
    </div>
  );
}
