'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import useSWR from 'swr';
import { FireIcon, CheckCircleIcon, DocumentIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { AcademicCapIcon } from '@heroicons/react/24/solid';

interface Quest {
    id: string;
    title: string;
    description: string | null;
    status: string;
    orderIndex: number;
    expReward: number;
    coinReward: number;
    assignedTo: { user: { name: string; image: string | null } } | null;
}

const COLUMNS = [
    { id: 'OPEN', title: 'To Do', color: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-700' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-700' },
    { id: 'REVIEWING', title: 'Review', color: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-700' },
    { id: 'COMPLETED', title: 'Done', color: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-700' }
];

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Fetch failed');
    return data;
};

export default function KanbanBoard({ initiativeId }: { initiativeId: string }) {
    const { data: initialQuests, error, mutate } = useSWR<Quest[]>(`/api/hr/initiatives/${initiativeId}/quests`, fetcher);

    // Local state for optimistic UI dragging
    const [quests, setQuests] = useState<Quest[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newQuestTitle, setNewQuestTitle] = useState('');

    useEffect(() => {
        if (initialQuests && Array.isArray(initialQuests)) {
            setQuests(initialQuests);
        }
    }, [initialQuests]);

    const onDragEnd = useCallback(async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Optimistic UI update
        const draggedQuest = quests.find(q => q.id === draggableId);
        if (!draggedQuest) return;

        const updatedQuests = Array.from(quests);

        // Remove from old position
        const sourceColQuests = updatedQuests.filter(q => q.status === source.droppableId).sort((a, b) => a.orderIndex - b.orderIndex);
        sourceColQuests.splice(source.index, 1);

        // Add to new position
        const destColQuests = updatedQuests.filter(q => q.status === destination.droppableId && q.id !== draggableId).sort((a, b) => a.orderIndex - b.orderIndex);
        destColQuests.splice(destination.index, 0, draggedQuest);

        // Calculate new orderIndex (Mid-point algorithm)
        let newOrderIndex = 0;
        if (destColQuests.length === 1) {
            newOrderIndex = 1000; // First item in empty list
        } else if (destination.index === 0) {
            newOrderIndex = destColQuests[1].orderIndex / 2; // Placed at top
        } else if (destination.index === destColQuests.length - 1) {
            newOrderIndex = destColQuests[destColQuests.length - 2].orderIndex + 1000; // Placed at bottom
        } else {
            // Placed between two items
            const prev = destColQuests[destination.index - 1].orderIndex;
            const next = destColQuests[destination.index + 1].orderIndex;
            newOrderIndex = prev + (next - prev) / 2;
        }

        const newStatus = destination.droppableId;

        // Apply optimistic state
        setQuests(prev => prev.map(q => {
            if (q.id === draggableId) {
                return { ...q, status: newStatus, orderIndex: newOrderIndex };
            }
            return q;
        }));

        // Send to API
        try {
            const res = await fetch(`/api/ess/quests/drag-and-drop`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questId: draggableId,
                    newStatus,
                    newOrderIndex
                })
            });

            if (!res.ok) throw new Error('Failed to update quest pipeline.');

            // Re-fetch to ensure consistency and trigger parent OKR rerenders if needed
            mutate();

            // Dispatch custom event so the parent workspace can refresh Initiative progress
            window.dispatchEvent(new Event('kanban-updated'));

        } catch (error) {
            console.error(error);
            // Revert on failure
            setQuests(initialQuests || []);
        }

    }, [quests, initialQuests, mutate]);

    const handleAddQuest = async () => {
        if (!newQuestTitle.trim()) return;
        setIsAdding(true);
        try {
            const res = await fetch(`/api/hr/initiatives/${initiativeId}/quests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newQuestTitle })
            });
            if (res.ok) {
                setNewQuestTitle('');
                mutate();
                window.dispatchEvent(new Event('kanban-updated'));
            } else {
                alert('Failed to add quest');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsAdding(false);
        }
    };

    if (error) return <div className="p-4 text-red-500">Failed to load Board</div>;
    if (!initialQuests) return <div className="p-8 text-center text-slate-400 animate-pulse">Constructing Kanban...</div>;

    const getQuestsForColumn = (columnId: string) => {
        return quests
            .filter(q => q.status === columnId)
            .sort((a, b) => a.orderIndex - b.orderIndex);
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 min-h-[500px]">
            <DragDropContext onDragEnd={onDragEnd}>
                {COLUMNS.map(column => (
                    <div key={column.id} className={`flex flex-col flex-shrink-0 w-80 rounded-xl border ${column.color} ${column.bg}`}>
                        <div className="p-3 border-b border-black/5 flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-xl">
                            <h3 className={`font-bold text-sm tracking-wide ${column.text}`}>
                                {column.title}
                            </h3>
                            <span className="text-xs font-semibold bg-white px-2 py-0.5 rounded-full shadow-sm text-slate-500 border border-slate-200">
                                {getQuestsForColumn(column.id).length}
                            </span>
                        </div>

                        <Droppable droppableId={column.id}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 p-3 flex flex-col gap-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-black/5' : ''}`}
                                >
                                    {getQuestsForColumn(column.id).map((quest, index) => (
                                        <Draggable key={quest.id} draggableId={quest.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''}`}
                                                >
                                                    <div className="flex justify-between items-start gap-2 mb-2">
                                                        <h4 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
                                                            {quest.title}
                                                        </h4>
                                                    </div>

                                                    {quest.description && (
                                                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                                                            {quest.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                                                        <div className="flex items-center gap-1.5">
                                                            {quest.assignedTo?.user.image ? (
                                                                <img src={quest.assignedTo.user.image} alt="assignee" className="w-5 h-5 rounded-full ring-1 ring-slate-200" />
                                                            ) : (
                                                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                                    {quest.assignedTo?.user.name.charAt(0) || '?'}
                                                                </div>
                                                            )}
                                                            <span className="text-[10px] font-medium text-slate-500 truncate max-w-[80px]">
                                                                {quest.assignedTo?.user.name || 'Unassigned'}
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-1">
                                                            {quest.expReward > 0 && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                                                    <AcademicCapIcon className="w-2.5 h-2.5 mr-0.5" />
                                                                    {quest.expReward}
                                                                </span>
                                                            )}
                                                            {quest.coinReward > 0 && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                                                    <FireIcon className="w-2.5 h-2.5 mr-0.5" />
                                                                    {quest.coinReward}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}

                                    {column.id === 'OPEN' && (
                                        <div className="mt-2 space-y-2">
                                            <input
                                                type="text"
                                                placeholder="ชื่อภารกิจ (กด Enter เพื่อสร้าง)..."
                                                className="w-full p-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                value={newQuestTitle}
                                                onChange={e => setNewQuestTitle(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleAddQuest();
                                                }}
                                                disabled={isAdding}
                                            />
                                            <button
                                                onClick={handleAddQuest}
                                                disabled={isAdding || !newQuestTitle.trim()}
                                                className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm"
                                            >
                                                {isAdding ? '🚀 สร้างภารกิจ...' : '+ เพิ่มงานย่อยด่วน'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </DragDropContext>
        </div>
    );
}
