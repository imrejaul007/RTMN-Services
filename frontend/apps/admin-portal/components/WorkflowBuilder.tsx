'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Play, Pause, Trash2, Settings, Copy } from 'lucide-react'

interface WorkflowStep {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'notification' | 'api'
  name: string
  config: Record<string, unknown>
}

interface WorkflowBuilderProps {
  steps: WorkflowStep[]
  onChange: (steps: WorkflowStep[]) => void
}

function SortableStep({
  step,
  onDelete,
  onConfigure,
}: {
  step: WorkflowStep
  onDelete: () => void
  onConfigure: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getStepIcon = () => {
    switch (step.type) {
      case 'trigger': return '⚡'
      case 'action': return '⚙️'
      case 'condition': return '🔀'
      case 'delay': return '⏱️'
      case 'notification': return '📧'
      case 'api': return '🌐'
      default: return '📦'
    }
  }

  const getStepColor = () => {
    switch (step.type) {
      case 'trigger': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'action': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'condition': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'delay': return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'notification': return 'bg-green-100 text-green-700 border-green-200'
      case 'api': return 'bg-orange-100 text-orange-700 border-orange-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border rounded-lg hover:shadow-md transition-shadow">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className={`p-2 rounded-lg border ${getStepColor()}`}>
          <span className="text-lg">{getStepIcon()}</span>
        </div>
        <div className="flex-1">
          <p className="font-medium">{step.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{step.type}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onConfigure}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function WorkflowBuilder({ steps, onChange }: WorkflowBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id)
      const newIndex = steps.findIndex((s) => s.id === over.id)
      onChange(arrayMove(steps, oldIndex, newIndex))
    }

    setActiveId(null)
  }

  const handleDelete = (id: string) => {
    onChange(steps.filter((s) => s.id !== id))
  }

  const handleConfigure = (id: string) => {
    console.log('Configure step:', id)
  }

  const activeStep = activeId ? steps.find((s) => s.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        {/* Trigger */}
        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
          <div className="p-2 rounded-lg bg-yellow-100 text-yellow-700">
            <span className="text-lg">⚡</span>
          </div>
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Trigger</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-300">Starts the workflow</p>
          </div>
        </div>

        {/* Connection Line */}
        <div className="flex justify-center">
          <div className="h-8 w-0.5 bg-border" />
        </div>

        {/* Steps */}
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {steps.map((step) => (
            <div key={step.id} className="relative">
              <SortableStep
                step={step}
                onDelete={() => handleDelete(step.id)}
                onConfigure={() => handleConfigure(step.id)}
              />
              <div className="flex justify-center py-2">
                <div className="h-6 w-0.5 bg-border" />
              </div>
            </div>
          ))}
        </SortableContext>

        {/* Add Step */}
        <button className="w-full p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-primary transition-colors">
          + Add Step
        </button>
      </div>

      <DragOverlay>
        {activeStep && (
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border rounded-lg shadow-lg">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <div className={`p-2 rounded-lg border ${
              activeStep.type === 'action' ? 'bg-blue-100 text-blue-700 border-blue-200' :
              activeStep.type === 'condition' ? 'bg-purple-100 text-purple-700 border-purple-200' :
              'bg-gray-100 text-gray-700 border-gray-200'
            }`}>
              <span className="text-lg">
                {activeStep.type === 'action' ? '⚙️' : activeStep.type === 'condition' ? '🔀' : '⏱️'}
              </span>
            </div>
            <div>
              <p className="font-medium">{activeStep.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{activeStep.type}</p>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
