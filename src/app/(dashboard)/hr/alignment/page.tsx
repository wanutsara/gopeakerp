'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Edge,
    Node,
    MarkerType,
    ReactFlowProvider,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import ObjectiveNode from './components/ObjectiveNode';
import KeyResultNode from './components/KeyResultNode';
import InitiativeNode from './components/InitiativeNode';

const nodeTypes = {
    objectiveNode: ObjectiveNode,
    krNode: KeyResultNode,
    initiativeNode: InitiativeNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Different node sizes for dagre calculation
const getNodeDimensions = (type: string) => {
    switch (type) {
        case 'objectiveNode': return { width: 300, height: 160 };
        case 'krNode': return { width: 270, height: 130 };
        case 'initiativeNode': return { width: 270, height: 160 };
        default: return { width: 250, height: 100 };
    }
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });

    nodes.forEach((node) => {
        const { width, height } = getNodeDimensions(node.type || 'default');
        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const { width, height } = getNodeDimensions(node.type || 'default');

        const newNode = { ...node };
        newNode.targetPosition = Position.Top;
        newNode.sourcePosition = Position.Bottom;

        // Shift dagre node position (anchor=center center) to the top left
        newNode.position = {
            x: nodeWithPosition.x - width / 2,
            y: nodeWithPosition.y - height / 2,
        };

        return newNode;
    });

    return { nodes: newNodes, edges };
};

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to fetch data');
    return data;
};

function AlignmentTreeCanvas() {
    const { data: objectives, error, isLoading } = useSWR('/api/hr/goals', fetcher);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    useEffect(() => {
        if (!objectives || !Array.isArray(objectives)) return;

        const initialNodes: Node[] = [];
        const initialEdges: Edge[] = [];

        objectives.forEach(obj => {
            // Level 1: Objective
            initialNodes.push({
                id: `obj-${obj.id}`,
                type: 'objectiveNode',
                data: {
                    id: obj.id,
                    title: obj.title,
                    description: obj.description,
                    year: obj.year,
                    quarter: obj.quarter,
                    progress: obj.progress || 0
                },
                position: { x: 0, y: 0 }
            });

            if (obj.keyResults && Array.isArray(obj.keyResults)) {
                obj.keyResults.forEach((kr: any) => {
                    // Level 2: Key Result
                    initialNodes.push({
                        id: `kr-${kr.id}`,
                        type: 'krNode',
                        data: {
                            id: kr.id,
                            title: kr.title,
                            targetValue: kr.targetValue,
                            currentValue: kr.currentValue || 0,
                            unit: kr.unit,
                            progress: kr.progress || 0,
                            ownerName: kr.employee?.user?.name || null,
                            ownerImage: kr.employee?.user?.image || null
                        },
                        position: { x: 0, y: 0 }
                    });

                    // Edge: Obj -> KR
                    initialEdges.push({
                        id: `edge-${obj.id}-${kr.id}`,
                        source: `obj-${obj.id}`,
                        target: `kr-${kr.id}`,
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: '#6366f1', strokeWidth: 2 } // Indigo
                    });

                    if (kr.initiatives && Array.isArray(kr.initiatives)) {
                        kr.initiatives.forEach((ini: any) => {
                            // Level 3: Initiative
                            initialNodes.push({
                                id: `ini-${ini.id}`,
                                type: 'initiativeNode',
                                data: {
                                    id: ini.id,
                                    title: ini.title,
                                    description: ini.description,
                                    status: ini.status,
                                    progress: ini.progress || 0,
                                    expReward: ini.expReward || 0,
                                    coinReward: ini.coinReward || 0,
                                    ownerName: ini.owner?.user?.name || null,
                                    ownerImage: ini.owner?.user?.image || null
                                },
                                position: { x: 0, y: 0 }
                            });

                            // Edge: KR -> Initiative
                            initialEdges.push({
                                id: `edge-${kr.id}-${ini.id}`,
                                source: `kr-${kr.id}`,
                                target: `ini-${ini.id}`,
                                type: 'smoothstep',
                                animated: false,
                                style: { stroke: '#38bdf8', strokeWidth: 2 } // Sky
                            });
                        });
                    }
                });
            }
        });

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [objectives, setNodes, setEdges]);

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">กำลังประมวลผลผังเป้าหมาย...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>;
    }

    return (
        <div className="w-full h-full absolute inset-0 bg-slate-50">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
            >
                <Background color="#ccc" gap={20} size={1} />
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        switch (node.type) {
                            case 'objectiveNode': return '#6366f1';
                            case 'krNode': return '#38bdf8';
                            case 'initiativeNode': return '#10b981';
                            default: return '#eee';
                        }
                    }}
                    maskColor="rgba(0, 0, 0, 0.1)"
                />
            </ReactFlow>

            {/* Legend Map (Moved to Bottom Left) */}
            <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200 z-10 pointer-events-auto">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Organization Alignment</h3>
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-sm"></div>
                        <span className="text-xs font-semibold text-slate-700">Company Objectives</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-sky-400 shadow-sm"></div>
                        <span className="text-xs font-semibold text-slate-700">Key Results</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm"></div>
                        <span className="text-xs font-semibold text-slate-700">Action Plans / Initiatives</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AlignmentPage() {
    return (
        <div className="w-full h-[calc(100vh-4rem)] relative overflow-hidden bg-slate-50">
            {/* Floating Header */}
            <div className="absolute top-6 left-6 z-20 pointer-events-none">
                <div className="bg-white/80 backdrop-blur-md px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 pointer-events-auto">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 drop-shadow-sm">
                        ผังเป้าหมายองค์กร (Alignment Tree)
                    </h1>
                    <p className="mt-1.5 text-sm text-slate-600 font-medium max-w-xl leading-relaxed">
                        แผนภาพความเชื่อมโยงอิสระ (Infinite Canvas) ดราก์เลื่อนดูความสำเร็จของบริษัทได้อย่างไร้ขีดจำกัด
                    </p>
                </div>
            </div>

            {/* Edge-to-Edge Workspace */}
            <div className="absolute inset-0 z-0">
                <ReactFlowProvider>
                    <AlignmentTreeCanvas />
                </ReactFlowProvider>
            </div>
        </div>
    );
}
