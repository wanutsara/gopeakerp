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
    addEdge,
    Connection,
    Edge,
    Node,
    MarkerType,
    ReactFlowProvider,
    Panel,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import OrgNode from './OrgNode';
import { FireIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import EmployeeDrawer from './EmployeeDrawer';

const nodeTypes = {
    custom: OrgNode,
};

// Dagre Layout Engine setup
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 260;
const nodeHeight = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const newNode = { ...node };

        newNode.targetPosition = isHorizontal ? Position.Left : Position.Top;
        newNode.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        // We are shifting the dagre node position (anchor=center center) to the top left
        newNode.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
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

function OrgChartCanvas() {
    const { data: employees, error, mutate, isLoading } = useSWR('/api/hr/org-chart', fetcher);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedNode, setSelectedNode] = useState<any>(null);

    // Initial Layout Generation from API Data
    useEffect(() => {
        if (!employees || !Array.isArray(employees)) return;

        const initialNodes: Node[] = employees.map((emp) => ({
            id: emp.id,
            type: 'custom',
            data: {
                id: emp.id,
                name: emp.user?.name || emp.user?.email || 'Unknown',
                image: emp.user?.image,
                jobPosition: emp.jobPosition?.title || '',
                department: emp.department?.name || '',
                level: emp.level,
                exp: emp.exp,
            },
            position: { x: 0, y: 0 }, // Will be overwritten by Dagre
        }));

        const initialEdges: Edge[] = employees
            .filter((emp) => emp.managerId)
            .map((emp) => ({
                id: `e-${emp.managerId}-${emp.id}`,
                source: emp.managerId!,
                target: emp.id,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#94a3b8', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [employees, setNodes, setEdges]);

    // Handle Drag and Drop Connection (Rewiring Managers)
    const onConnect = useCallback(
        async (params: Connection) => {
            if (!params.source || !params.target) return;

            // Prevent same employee targeting themselves
            if (params.source === params.target) return;

            setIsSaving(true);
            try {
                const res = await fetch('/api/hr/org-chart', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employeeId: params.target,     // The subordinate
                        newManagerId: params.source,   // The new manager
                    }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    alert(err.error || 'Failed to update hierarchy');
                    return;
                }

                // If success, refresh the SWR dataset to automatically redraw the updated Dagre tree
                await mutate();
            } catch (err) {
                console.error(err);
                alert('An error occurred while saving the structure.');
            } finally {
                setIsSaving(false);
            }
        },
        [mutate]
    );

    // Handle Edge Deletion (Removing a manager)
    const onEdgeClick = useCallback(
        async (_: React.MouseEvent, edge: Edge) => {
            if (window.confirm('ยืนยันที่จะตัดสายบังคับบัญชานี้ใช่หรือไม่? (ลบหัวหน้างาน)')) {
                setIsSaving(true);
                try {
                    const res = await fetch('/api/hr/org-chart', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employeeId: edge.target,
                            newManagerId: null,
                        }),
                    });

                    if (!res.ok) {
                        const err = await res.json();
                        alert(err.error || 'Failed to update hierarchy');
                        return;
                    }
                    await mutate();
                } catch (err) {
                    console.error(err);
                    alert('An error occurred while removing the link.');
                } finally {
                    setIsSaving(false);
                }
            }
        },
        [mutate]
    );

    if (error) return <div className="p-6 text-red-500 font-bold bg-white rounded-xl shadow border-2 border-red-200">System Error: {error.message}</div>;
    if (isLoading) return <div className="p-6 text-slate-500 flex items-center gap-2"><ArrowPathIcon className="w-5 h-5 animate-spin" /> Fetching Strategic Assets...</div>;

    return (
        <div className="h-[calc(100vh-80px)] w-full border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onConnect={onConnect}
                onEdgeClick={onEdgeClick}
                onNodeClick={(_, node) => setSelectedNode(node)}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
            >
                <Background color="#cbd5e1" gap={24} size={2} />
                <Controls />
                <MiniMap
                    nodeColor={(n) => '#e2e8f0'}
                    nodeStrokeColor="#94a3b8"
                    nodeBorderRadius={4}
                    maskColor="rgba(248, 250, 252, 0.7)"
                    className="border border-slate-200 shadow-md rounded-xl overflow-hidden"
                />
                <Panel position="top-left" className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 m-4">
                    <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <FireIcon className="w-6 h-6 text-orange-500" /> Organization Canvas
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">Interactive Hierarchy Blueprint</p>
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
                            Drag lines between nodes to change managers
                        </div>
                        {isSaving && (
                            <div className="flex items-center gap-2 text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded w-fit">
                                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Synchronizing Matrix...
                            </div>
                        )}
                    </div>
                </Panel>
            </ReactFlow>

            {/* Slide-out Gamified Employee Details Box */}
            <div className={`fixed inset-y-0 right-0 z-50 transition-transform duration-300 ease-in-out ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
                <EmployeeDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />
            </div>
        </div>
    );
}

export default function OrgChartPage() {
    return (
        <div className="p-6">
            <ReactFlowProvider>
                <OrgChartCanvas />
            </ReactFlowProvider>
        </div>
    );
}
