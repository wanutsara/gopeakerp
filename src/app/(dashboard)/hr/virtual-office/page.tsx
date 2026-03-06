"use client";

import React, { useRef, useState, useMemo } from 'react';
import useSWR from 'swr';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Stage, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
};

// --- 3D VOXEL CHARACTER COMPONENT ---
function VoxelCharacter({ position, color, name, isWorking, onClick }: any) {
    const groupRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Mesh>(null);
    const armLRef = useRef<THREE.Mesh>(null);
    const armRRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    // Simple idle + typing animation loop
    useFrame((state) => {
        if (!groupRef.current || !isWorking) return;
        const t = state.clock.getElapsedTime();

        // Gentle breathing bob
        groupRef.current.position.y = position[1] + Math.sin(t * 2) * 0.05;

        // Head looking slightly at screen
        if (headRef.current) {
            headRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;
        }

        // Typing arms
        if (armLRef.current && armRRef.current) {
            armLRef.current.rotation.x = Math.sin(t * 15) * 0.2 - 0.5;
            armRRef.current.rotation.x = Math.cos(t * 15) * 0.2 - 0.5;
        }
    });

    if (!isWorking) {
        // Render Empty Chair Only
        return (
            <group position={position}>
                <mesh position={[0, -0.2, 0]} castShadow>
                    <boxGeometry args={[0.5, 0.4, 0.5]} />
                    <meshStandardMaterial color="#475569" />
                </mesh>
            </group>
        );
    }

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { setHovered(false); document.body.style.cursor = 'auto'; }}
        >
            {/* Minecraft Style Body */}
            <mesh position={[0, 0.3, 0]} castShadow>
                <boxGeometry args={[0.5, 0.6, 0.3]} />
                <meshStandardMaterial color={hovered ? '#fbbf24' : color} />
            </mesh>

            {/* Head */}
            <mesh ref={headRef} position={[0, 0.8, 0]} castShadow>
                <boxGeometry args={[0.4, 0.4, 0.4]} />
                <meshStandardMaterial color="#fcd34d" />
            </mesh>

            {/* Left Arm */}
            <mesh ref={armLRef} position={[-0.35, 0.3, 0.1]} castShadow>
                <boxGeometry args={[0.2, 0.4, 0.2]} />
                <meshStandardMaterial color={color} />
            </mesh>

            {/* Right Arm */}
            <mesh ref={armRRef} position={[0.35, 0.3, 0.1]} castShadow>
                <boxGeometry args={[0.2, 0.4, 0.2]} />
                <meshStandardMaterial color={color} />
            </mesh>

            {/* Floating HTML Name Tag overlay via Drei */}
            {hovered && (
                <Html position={[0, 1.2, 0]} center zIndexRange={[100, 0]}>
                    <div className="bg-gray-900/90 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold shadow-2xl ring-2 ring-white/10 flex items-center gap-2 transform -translate-y-4">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        {name}
                    </div>
                </Html>
            )}
        </group>
    );
}

// --- DEPARTMENT ISLAND COMPONENT ---
function DepartmentNode({ department, position, onEmployeeClick }: any) {
    // Generate a determinic isometric grid of desks based on employee count
    const desks = department.employees.map((emp: any, index: number) => {
        const row = Math.floor(index / 2); // 2 desks per row
        const col = index % 2;
        const xOffset = (col * 1.5) - 0.75;
        const zOffset = (row * 1.5) - (Math.floor(department.employees.length / 2) * 1.5) / 2;

        const isWorking = emp.actionState === 'WORKING';
        const color = isWorking ? '#3b82f6' : '#94a3b8'; // Blue for active

        return (
            <group key={emp.id} position={[xOffset, 0, zOffset]}>
                {/* Desk Base */}
                <mesh position={[0, 0, 0.5]} receiveShadow castShadow>
                    <boxGeometry args={[1.2, 0.6, 0.6]} />
                    <meshStandardMaterial color="#e2e8f0" />
                </mesh>
                {/* Computer Monitor */}
                <mesh position={[0, 0.45, 0.5]} castShadow rotation={[-0.1, 0, 0]}>
                    <boxGeometry args={[0.8, 0.5, 0.05]} />
                    <meshStandardMaterial color="#1e293b" />
                </mesh>
                {/* Screen Glow (if working) */}
                {isWorking && (
                    <mesh position={[0, 0.45, 0.47]}>
                        <planeGeometry args={[0.7, 0.4]} />
                        <meshBasicMaterial color="#60a5fa" />
                    </mesh>
                )}

                <VoxelCharacter
                    position={[0, 0.2, -0.2]}
                    color={color}
                    name={emp.name}
                    isWorking={isWorking}
                    onClick={() => onEmployeeClick(emp)}
                />
            </group>
        );
    });

    return (
        <group position={position}>
            {/* Ground Platform for Department */}
            <mesh position={[0, -0.3, 0]} receiveShadow>
                <boxGeometry args={[4, 0.2, Math.max(4, department.employees.length)]} />
                <meshStandardMaterial color="#f8fafc" />
            </mesh>

            {/* Department Label Plate */}
            <group position={[0, 0, - (Math.max(4, department.employees.length) / 2) - 0.5]}>
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[2, 0.5, 0.2]} />
                    <meshStandardMaterial color="#0f172a" />
                </mesh>
                <Html position={[0, 0, 0.1]} center transform>
                    <div className="text-white font-black text-xs px-2 pointer-events-none">
                        {department.name.toUpperCase()}
                    </div>
                </Html>
            </group>

            {desks}
        </group>
    );
}

// --- MAIN DASHBOARD ENTRY ---
export default function VirtualOfficeDashboard() {
    const { data: departments, error } = useSWR('/api/hr/virtual-office', fetcher);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [simulateAll, setSimulateAll] = useState(false);

    if (error) return <div className="p-8 text-red-500 font-bold">Failed to load the Virtual Sandbox.</div>;
    if (!departments) return <div className="p-8 text-blue-500 font-bold animate-pulse">Initializing Virtual Voxel Engine...</div>;

    // Distribute departments in a grid across the WebGL space
    const departmentNodes = departments.map((dept: any, idx: number) => {
        const spacing = 6;
        const row = Math.floor(idx / 3);
        const col = idx % 3;
        const xNode = (col * spacing) - spacing;
        const zNode = (row * spacing) - spacing;

        const simulatedDept = {
            ...dept,
            employees: dept.employees.map((emp: any) => ({
                ...emp,
                actionState: simulateAll ? 'WORKING' : emp.actionState
            }))
        };

        return (
            <DepartmentNode
                key={dept.id}
                department={simulatedDept}
                position={[xNode, 0, zNode]}
                onEmployeeClick={(emp: any) => setSelectedEmployee(emp)}
            />
        );
    });

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] w-full bg-gray-50 flex flex-col relative">
            <div className="absolute top-8 left-8 z-10 pointer-events-none">
                <h1 className="text-3xl font-extrabold text-gray-900 drop-shadow-sm tracking-tight">Virtual Office (Voxel)</h1>
                <p className="mt-1 text-sm font-medium text-gray-600 drop-shadow-sm">สัมผัสโลกความจริง เชื่อมต่อข้อมูลลงเวลา Live Attendance สดๆ</p>

                <div className="mt-4 flex gap-3 items-center pointer-events-auto">
                    <span className="inline-flex items-center px-3 py-1 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-xs font-bold text-gray-700 border border-gray-200">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        Working ({departments.flatMap((d: any) => d.employees).filter((e: any) => simulateAll ? true : e.actionState === 'WORKING').length})
                    </span>
                    <span className="inline-flex items-center px-3 py-1 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-xs font-bold text-gray-700 border border-gray-200">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                        Away ({departments.flatMap((d: any) => d.employees).filter((e: any) => simulateAll ? false : e.actionState !== 'WORKING').length})
                    </span>

                    <div className="w-px h-6 bg-gray-300 mx-2"></div>

                    <label className="flex items-center cursor-pointer bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={simulateAll}
                                onChange={(e) => setSimulateAll(e.target.checked)}
                            />
                            <div className={`block w-8 h-5 rounded-full transition-colors ${simulateAll ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${simulateAll ? 'transform translate-x-3' : ''}`}></div>
                        </div>
                        <span className="ml-2 text-xs font-bold text-gray-700">จำลองออฟฟิศเต็ม (Simulate All)</span>
                    </label>
                </div>
            </div>

            {/* The 3D Canvas Engine Portal */}
            <div className="flex-1 w-full relative">
                <Canvas shadows camera={{ position: [10, 10, 10], fov: 40 }} gl={{ antialias: true }}>
                    <color attach="background" args={['#f1f5f9']} />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 20, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />

                    <Stage environment="city" intensity={0.2} adjustCamera={false}>
                        {departmentNodes}
                    </Stage>

                    <OrbitControls
                        makeDefault
                        minPolarAngle={0}
                        maxPolarAngle={Math.PI / 2.1}
                        maxDistance={30}
                        minDistance={5}
                        target={[0, 0, 0]}
                    />
                </Canvas>
            </div>

            {/* UI Overlay Card for Clicked Employee */}
            {selectedEmployee && (
                <div className="absolute bottom-8 right-8 z-20 w-80 bg-white/90 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-2xl animate-in slide-in-from-right-8 duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3 items-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                {selectedEmployee.image ? (
                                    <img src={selectedEmployee.image} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-black text-xl">
                                        {selectedEmployee.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-extrabold text-gray-900 border-b border-gray-100 pb-1">{selectedEmployee.name}</h4>
                                <p className="text-xs text-gray-500 font-medium mt-1">{selectedEmployee.position}</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedEmployee(null)} className="text-gray-400 hover:text-gray-900 bg-gray-100/50 rounded-full w-8 h-8 flex justify-center items-center">×</button>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500">Live Status</span>
                            {selectedEmployee.actionState === 'WORKING' ? (
                                <span className="text-xs font-black text-green-600 bg-green-100 px-2 py-1 rounded-md">🟢 ONLINE</span>
                            ) : (
                                <span className="text-xs font-black text-gray-500 bg-gray-200 px-2 py-1 rounded-md">⭕ AWAY</span>
                            )}
                        </div>
                        {selectedEmployee.checkInTime && (
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500">Check In Time</span>
                                <span className="text-xs font-black text-gray-800">
                                    {new Date(selectedEmployee.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
