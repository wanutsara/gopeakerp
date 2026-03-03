"use client";

import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

import { useEffect, useState } from "react";

export default function DashboardCharts({ data }: { data: any }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'right' as const,
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed !== null) {
                            label += new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(context.parsed);
                        }
                        return label;
                    }
                }
            }
        },
    };

    if (!mounted) {
        return <div className="w-full aspect-square bg-gray-100 rounded-full animate-pulse border-4 border-gray-50 flex items-center justify-center">
            <span className="text-sm text-gray-400">กำลังโหลดกราฟ...</span>
        </div>;
    }

    return (
        <div className="w-full max-w-sm aspect-square">
            <Pie data={data} options={options} />
        </div>
    );
}
