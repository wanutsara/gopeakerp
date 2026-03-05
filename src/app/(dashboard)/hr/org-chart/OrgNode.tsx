import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import Image from 'next/image';

const OrgNode = ({ data, isConnectable }: NodeProps) => {
    const { name, image, jobPosition, level, exp, department } = data as any;

    // Base RPG Level Threshold Calculation (100 EXP = 1 Level)
    const expThreshold = level * 100;
    const progressPerc = Math.min(100, Math.max(0, (exp / expThreshold) * 100));

    return (
        <div className="w-64 bg-white border-2 border-slate-200 rounded-xl shadow-md hover:shadow-xl hover:border-blue-400 transition cursor-pointer relative group">
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="w-6 h-6 bg-blue-500 rounded-full border-[3px] border-white shadow-md z-10"
            />

            <div className="flex items-center gap-3 p-4">
                <div className="relative">
                    {image ? (
                        <Image src={image} alt={name} width={48} height={48} className="rounded-full object-cover shadow-sm bg-white p-0.5 border border-slate-200" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                            {name?.charAt(0) || 'U'}
                        </div>
                    )}
                    {/* Level Badge Overlay */}
                    <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-white shadow-sm">
                        Lv.{level || 1}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{name}</h3>
                    <p className="text-xs text-slate-500 truncate font-medium">{jobPosition || 'Employee'}</p>
                    {department && (
                        <span className="inline-block mt-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {department}
                        </span>
                    )}
                </div>
            </div>

            {/* EXP Bar Footer */}
            <div className="px-4 pb-3">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-inner">
                    <div
                        className="bg-gradient-to-r from-blue-400 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${progressPerc}%` }}
                    />
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                isConnectable={isConnectable}
                className="w-6 h-6 bg-indigo-500 rounded-full border-[3px] border-white shadow-md z-10 hover:scale-125 transition-transform cursor-crosshair"
            />
        </div>
    );
};

export default React.memo(OrgNode);
