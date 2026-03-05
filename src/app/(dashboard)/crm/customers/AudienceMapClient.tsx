'use client';

import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getGeoCoordinate } from '@/lib/geoData';

interface AudienceMapProps {
    customers: any[];
}

function MapUpdater({ onZoom }: { onZoom: (zoom: number) => void }) {
    useMapEvents({
        zoomend: (e) => {
            onZoom(e.target.getZoom());
        }
    });
    return null;
}

const createClusterIcon = (count: number, label: string, level: 'COUNTRY' | 'PROVINCE' | 'DISTRICT') => {
    const colors = {
        COUNTRY: 'bg-indigo-600',
        PROVINCE: 'bg-fuchsia-600',
        DISTRICT: 'bg-emerald-500'
    };
    const c = colors[level];

    return L.divIcon({
        className: 'custom-div-icon',
        html: `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -100%);" class="pointer-events-none hover:z-50 group transition-all">
                <div class="${c} text-white font-black text-sm px-3 py-1.5 rounded-full shadow-lg border-2 border-white ring-4 ring-black/5 z-20 group-hover:scale-110 transition-transform origin-bottom">
                    ${count.toLocaleString()}
                </div>
                <div class="bg-white/95 backdrop-blur-sm text-gray-900 text-[11px] font-black px-2.5 py-1 rounded shadow-sm border border-gray-200 mt-1 whitespace-nowrap z-10 text-center group-hover:border-${c.replace('bg-', '')} transition-colors">
                    ${label}
                </div>
                <div class="w-3 h-3 ${c} rotate-45 -mt-2 z-0 shadow-sm border-r-2 border-b-2 border-white"></div>
            </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });
};

export default function AudienceMapClient({ customers }: AudienceMapProps) {
    const [zoom, setZoom] = useState(5); // Default start zoom fits Thailand natively

    // Aggregation Engine
    const markers = useMemo(() => {
        if (!customers.length) return [];

        // Level 1: COUNTRY (Zoom < 6)
        if (zoom < 6) {
            // Assume all are in Thailand for now based on context, 
            // but we could group by actual country if data had it.
            return [{
                id: 'TH',
                label: 'Thailand',
                count: customers.length,
                lat: 13.75,
                lng: 100.50,
                level: 'COUNTRY' as const
            }];
        }

        // Level 2: PROVINCE (6 <= Zoom < 9)
        if (zoom >= 6 && zoom < 9) {
            const provGroups: Record<string, number> = {};
            customers.forEach(c => {
                const p = c.province || 'Unknown Province';
                provGroups[p] = (provGroups[p] || 0) + 1;
            });

            return Object.entries(provGroups).map(([prov, count]) => {
                const [lat, lng] = getGeoCoordinate(prov);
                return {
                    id: `PROV_${prov}`,
                    label: prov,
                    count,
                    lat,
                    lng,
                    level: 'PROVINCE' as const
                };
            });
        }

        // Level 3: DISTRICT (Zoom >= 9)
        const distGroups: Record<string, { count: number, prov: string }> = {};
        customers.forEach(c => {
            const p = c.province || 'Unknown Province';
            const d = c.district || 'Unknown District';
            const key = `${p}|${d}`;
            if (!distGroups[key]) distGroups[key] = { count: 0, prov: p };
            distGroups[key].count += 1;
        });

        return Object.entries(distGroups).map(([key, data]) => {
            const [, dist] = key.split('|');
            const [lat, lng] = getGeoCoordinate(data.prov, dist);
            return {
                id: `DIST_${key}`,
                label: dist,
                count: data.count,
                lat,
                lng,
                level: 'DISTRICT' as const
            };
        });

    }, [customers, zoom]);

    return (
        <div className="w-full h-[500px] rounded-3xl overflow-hidden shadow-inner border border-gray-200 relative z-0">
            <MapContainer
                center={[13.75, 100.50]}
                zoom={5}
                scrollWheelZoom={true}
                className="w-full h-full"
                zoomControl={false}
            >
                {/* Clean, minimalist map style suitable for AI ERP */}
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                <MapUpdater onZoom={setZoom} />

                {markers.map(m => (
                    <Marker
                        key={m.id}
                        position={[m.lat, m.lng]}
                        icon={createClusterIcon(m.count, m.label, m.level)}
                    >
                        <Popup className="rounded-2xl font-sans">
                            <div className="text-center p-1">
                                <h4 className="font-black text-gray-900 text-sm mb-1">{m.label}</h4>
                                <div className="text-2xl font-black text-indigo-600 mb-1">{m.count.toLocaleString()}</div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Customers</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Overlay Navigation Hint */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-md px-4 py-3 rounded-xl shadow-lg border border-gray-200">
                <div className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    Semantic Zoom
                </div>
                <div className="flex flex-col gap-1 text-[11px] font-bold text-gray-500">
                    <div className={zoom < 6 ? "text-indigo-600" : ""}>Level 1: Country Map</div>
                    <div className={zoom >= 6 && zoom < 9 ? "text-fuchsia-600" : ""}>Level 2: Provincial Map</div>
                    <div className={zoom >= 9 ? "text-emerald-500" : ""}>Level 3: District Density</div>
                </div>
            </div>
        </div>
    );
}
