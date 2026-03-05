'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { PlusIcon, SpeakerWaveIcon, CalendarIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
};

export default function MarketingAdsPage() {
    const { data: campaigns, error, mutate } = useSWR('/api/marketing/ads', fetcher);
    const [isLoading, setIsLoading] = useState(false);

    // Create Campaign State
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [campaignForm, setCampaignForm] = useState({
        name: '',
        platform: 'FACEBOOK',
        dailyBudget: 0,
        startDate: new Date().toISOString().split('T')[0]
    });

    // Add Log State
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [logForm, setLogForm] = useState({
        date: new Date().toISOString().split('T')[0],
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0
    });

    const onCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch('/api/marketing/ads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'CREATE_CAMPAIGN', ...campaignForm })
            });
            if (res.ok) {
                setIsCampaignModalOpen(false);
                setCampaignForm({ name: '', platform: 'FACEBOOK', dailyBudget: 0, startDate: new Date().toISOString().split('T')[0] });
                mutate();
            } else alert('Failed to create campaign');
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const onAddLog = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch('/api/marketing/ads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ADD_LOG', campaignId: selectedCampaignId, ...logForm })
            });
            if (res.ok) {
                setIsLogModalOpen(false);
                setLogForm({ date: new Date().toISOString().split('T')[0], spend: 0, impressions: 0, clicks: 0, conversions: 0 });
                mutate();
                alert('Ad Spend Logged Successfully!');
            } else alert('Failed to log ad spend');
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (error) return <div className="p-8 text-red-500">Error loading campaigns</div>;
    if (!campaigns) return <div className="p-8 text-gray-500 animate-pulse">Loading Marketing Data...</div>;
    if (campaigns?.error) return <div className="p-8 text-red-500">{campaigns.error}</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <SpeakerWaveIcon className="w-8 h-8 text-pink-500" />
                        Ads & Marketing Center
                    </h1>
                    <p className="mt-1 text-gray-500 font-medium text-sm">Track your Return on Ad Spend (ROAS) directly into the Executive Dashboard.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCampaignModalOpen(true)}
                        className="bg-white border-2 border-pink-100 text-pink-600 hover:bg-pink-50 px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2"
                    >
                        <PlusIcon className="w-5 h-5" /> New Campaign
                    </button>
                    <button
                        onClick={() => {
                            if (campaigns && campaigns.length > 0) {
                                setSelectedCampaignId(campaigns[0].id);
                                setIsLogModalOpen(true);
                            } else {
                                alert("Please create a campaign first!");
                            }
                        }}
                        className="bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-90 shadow-lg shadow-pink-500/30 text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2"
                    >
                        <PresentationChartLineIcon className="w-5 h-5" /> Log Daily Spend
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {campaigns.map((camp: any) => (
                    <div key={camp.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-full -translate-y-12 translate-x-12"></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${camp.platform === 'FACEBOOK' ? 'bg-blue-100 text-blue-700' :
                                        camp.platform === 'GOOGLE' ? 'bg-orange-100 text-orange-700' :
                                            camp.platform === 'TIKTOK' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {camp.platform}
                                </span>
                                <h3 className="text-xl font-black text-gray-900 mt-2">{camp.name}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">{new Date(camp.startDate).toLocaleDateString()} - Active</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 font-bold uppercase">Total Spend</p>
                                <p className="text-2xl font-black text-pink-600">฿{camp.totalSpend.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4" /> Recent Daily Logs
                            </h4>
                            {camp.logs && camp.logs.length > 0 ? (
                                <div className="space-y-2">
                                    {camp.logs.slice(0, 5).map((log: any) => (
                                        <div key={log.id} className="flex justify-between items-center text-sm font-medium bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                                            <span className="text-gray-600">{new Date(log.date).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-gray-400 text-xs text-right pr-4 border-r border-gray-200">{log.impressions.toLocaleString()} Impr.</span>
                                                <span className="font-bold text-gray-900 w-16 text-right">฿{log.spend.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 font-medium italic">No tracking logs for this campaign yet.</p>
                            )}
                        </div>
                    </div>
                ))}

                {campaigns.length === 0 && (
                    <div className="lg:col-span-2 py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
                        <SpeakerWaveIcon className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-xl font-bold text-gray-700">No Active Campaigns</h3>
                        <p className="text-gray-500 font-medium mt-1">Start tracking your digital ad spend to calculate true Return on Ad Spend (ROAS).</p>
                    </div>
                )}
            </div>

            {/* Campaign Creation Modal */}
            {isCampaignModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-pink-600 p-6 flex justify-between items-center text-white">
                            <h2 className="text-xl font-black">Launch Campaign Tracker</h2>
                            <button onClick={() => setIsCampaignModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition">✕</button>
                        </div>
                        <form onSubmit={onCreateCampaign} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Campaign Name</label>
                                <input required type="text" value={campaignForm.name} onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:border-pink-500 outline-none" placeholder="e.g. Q1 App Install Meta Ads" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Platform</label>
                                    <select value={campaignForm.platform} onChange={e => setCampaignForm({ ...campaignForm, platform: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:border-pink-500 outline-none">
                                        <option value="FACEBOOK">Facebook / Meta</option>
                                        <option value="GOOGLE">Google Ads</option>
                                        <option value="TIKTOK">TikTok Ads</option>
                                        <option value="OTHER">Other Platform</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Launch Date</label>
                                    <input required type="date" value={campaignForm.startDate} onChange={e => setCampaignForm({ ...campaignForm, startDate: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:border-pink-500 outline-none" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancel</button>
                                <button disabled={isLoading} type="submit" className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-2.5 font-bold rounded-xl disabled:opacity-50">Create Campaign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Ad Spend Log Modal */}
            {isLogModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-6 flex justify-between items-center text-white">
                            <div>
                                <h2 className="text-xl font-black">Log Daily Ad Spend</h2>
                                <p className="text-pink-100 text-sm font-medium">Inject ad costs to hydrate the dashboard ROAS</p>
                            </div>
                            <button onClick={() => setIsLogModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition">✕</button>
                        </div>
                        <form onSubmit={onAddLog} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Target Campaign</label>
                                <select required value={selectedCampaignId} onChange={e => setSelectedCampaignId(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:border-pink-500 outline-none">
                                    {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.platform} - {c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Reporting Date</label>
                                    <input required type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:border-pink-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-rose-500 uppercase tracking-widest mb-1">Total Spend (฿) *</label>
                                    <input required type="number" min="0" step="0.01" value={logForm.spend || ''} onChange={e => setLogForm({ ...logForm, spend: Number(e.target.value) })} className="w-full border-2 border-rose-200 bg-rose-50 rounded-xl p-3 font-black text-rose-700 focus:border-rose-500 outline-none" placeholder="e.g. 1500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Impressions</label>
                                    <input type="number" min="0" value={logForm.impressions || ''} onChange={e => setLogForm({ ...logForm, impressions: Number(e.target.value) })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none" placeholder="Views" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Link Clicks</label>
                                    <input type="number" min="0" value={logForm.clicks || ''} onChange={e => setLogForm({ ...logForm, clicks: Number(e.target.value) })} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none" placeholder="Clicks" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setIsLogModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancel</button>
                                <button disabled={isLoading} type="submit" className="bg-gradient-to-r from-pink-500 to-rose-600 hover:scale-105 transition transform text-white px-8 py-2.5 font-black uppercase tracking-widest rounded-xl disabled:opacity-50">Sync Data</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
