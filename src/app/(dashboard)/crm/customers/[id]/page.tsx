'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    UserIcon,
    ArrowLeftIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    ShoppingBagIcon,
    ClockIcon,
    SparklesIcon,
    ShieldExclamationIcon,
    ChartBarIcon,
    IdentificationIcon,
    PencilSquareIcon,
    TrashIcon,
    PlusCircleIcon
} from '@heroicons/react/24/outline';
import CustomerDrawer from '../CustomerDrawer';
import ManualOrderModal from './ManualOrderModal';
import { StarIcon } from '@heroicons/react/24/solid';

export default function CustomerProfilePage() {
    const params = useParams();
    const router = useRouter();
    const customerId = params.id as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [activeTab, setActiveTab] = useState<'AI' | 'TRANSACTIONS' | 'ALIASES'>('AI');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleArchive = async () => {
        if (!confirm('Are you sure you want to archive this customer? Orders and Cash Flow remain intact, but the profile will be hidden from the directory.')) return;
        try {
            const res = await fetch(`/api/crm/customers/${customerId}`, { method: 'DELETE' });
            if (res.ok) {
                router.replace('/crm/customers');
            } else {
                const json = await res.json();
                alert('Archive Error: ' + json.error);
            }
        } catch (e: any) {
            console.error(e);
            alert('Archive Failed: ' + e.message);
        }
    };

    const handleGenerateAI = async () => {
        setGeneratingAI(true);
        try {
            const res = await fetch(`/api/crm/customers/${customerId}/ai`, { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                setData((prev: any) => ({ ...prev, aiInsights: json.insights }));
            } else {
                alert('AI Output Error: ' + json.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGeneratingAI(false);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/crm/customers/${customerId}`);
                const json = await res.json();
                if (json.success) {
                    setData(json);
                } else {
                    alert('Error: ' + json.error);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [customerId, refreshTrigger]);

    const formatPhone = (phone: string | null) => {
        if (!phone) return 'Unspecified';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10 && cleaned.startsWith('0')) return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        if (cleaned.startsWith('66') && cleaned.length === 11) return '+' + cleaned.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '$1 $2-$3-$4');
        return phone;
    };

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-[70vh]">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-bold animate-pulse">Loading Customer Data...</p>
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center text-red-500">Customer not found</div>;

    const { customer, rfm, orders, aiInsights } = data;

    // UI Helpers
    const getChurnColor = (risk: string) => {
        if (risk === 'HIGH') return 'bg-red-100 text-red-700 border-red-200';
        if (risk === 'MEDIUM') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        if (risk === 'LOW') return 'bg-green-100 text-green-700 border-green-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const isVIP = rfm.ltv > 5000;

    return (
        <div className="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            {/* Header / Back Button */}
            <button
                onClick={() => router.push('/crm/customers')}
                className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold mb-6 transition-colors"
            >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Directory</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* LEFT SIDEBAR: The Vitals Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                        {isVIP && (
                            <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-yellow-300 text-yellow-900 text-xs font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl shadow-sm flex items-center gap-1">
                                <StarIcon className="w-3 h-3" /> VIP
                            </div>
                        )}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-black text-4xl shadow-inner mb-4 border-4 border-white ring-4 ring-indigo-50">
                            {customer.name.charAt(0)}
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 align-middle">
                            {customer.name}
                        </h2>
                        {customer.profileName && (
                            <p className="text-gray-500 font-bold text-sm mt-1">@{customer.profileName}</p>
                        )}
                        <span className="mt-3 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                            Origin: {customer.source || 'UNKNOWN'}
                        </span>

                        <div className="w-full grid grid-cols-2 gap-2 mt-6">
                            <button
                                onClick={() => setIsDrawerOpen(true)}
                                className="flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
                            >
                                <PencilSquareIcon className="w-4 h-4" /> Edit Profile
                            </button>
                            <button
                                onClick={handleArchive}
                                className="flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" /> Archive
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-2">Contact Matrix</h3>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <span className="font-mono font-medium text-gray-700">{formatPhone(customer.phone)}</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-fuchsia-50 flex items-center justify-center text-fuchsia-500 shrink-0 mt-0.5">
                                <MapPinIcon className="w-4 h-4" />
                            </div>
                            <span className="text-gray-600 font-medium">
                                {customer.address ? customer.address : (
                                    <>
                                        {customer.province || 'Unknown Province'}<br />
                                        <span className="text-xs text-gray-400">{customer.district} {customer.subdistrict} {customer.postalCode}</span>
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 shadow-xl text-white space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -mr-10 -mt-10" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-700 pb-2 relative z-10">LTV Monetization</h3>

                        <div className="relative z-10">
                            <span className="text-gray-400 text-xs font-bold block mb-1">Lifetime Value (LTV)</span>
                            <span className="text-3xl font-black text-white">฿{rfm.ltv.toLocaleString()}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4 relative z-10">
                            <div>
                                <span className="text-gray-400 text-xs font-bold block mb-1">AOV</span>
                                <span className="text-xl font-bold">฿{Math.round(rfm.aov).toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 text-xs font-bold block mb-1">Frequency</span>
                                <span className="text-xl font-bold">{rfm.frequency} Orders</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT CANVAS: War Room */}
                <div className="lg:col-span-3">
                    {/* Tabs */}
                    <div className="flex gap-4 mb-6 overflow-x-auto hide-scrollbar border-b border-gray-200 pb-px">
                        <button
                            onClick={() => setActiveTab('AI')}
                            className={`pb-3 px-4 font-bold text-sm tracking-wide transition-colors whitespace-nowrap border-b-2 ${activeTab === 'AI' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            <SparklesIcon className="w-4 h-4 inline-block mr-2" />
                            AI Strategy Lab
                        </button>
                        <button
                            onClick={() => setActiveTab('TRANSACTIONS')}
                            className={`pb-3 px-4 font-bold text-sm tracking-wide transition-colors whitespace-nowrap border-b-2 ${activeTab === 'TRANSACTIONS' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            <ShoppingBagIcon className="w-4 h-4 inline-block mr-2" />
                            Transaction Feed ({rfm.frequency})
                        </button>
                        <button
                            onClick={() => setActiveTab('ALIASES')}
                            className={`pb-3 px-4 font-bold text-sm tracking-wide transition-colors whitespace-nowrap border-b-2 ${activeTab === 'ALIASES' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            <IdentificationIcon className="w-4 h-4 inline-block mr-2" />
                            Identity Graph ({customer.aliases?.length || 0})
                        </button>
                    </div>

                    {/* Tab Panels */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm min-h-[500px] overflow-hidden">

                        {/* TAB 1: AI STRATEGY */}
                        {activeTab === 'AI' && (
                            <div className="animate-in slide-in-from-bottom-2 duration-300">
                                {generatingAI ? (
                                    <div className="p-32 flex flex-col items-center justify-center animate-in fade-in duration-300">
                                        <div className="relative w-20 h-20 mb-6">
                                            <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                                            <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                                            <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-indigo-500 animate-pulse" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 mb-2">Engaging Neural Network...</h3>
                                        <p className="text-gray-500 font-medium text-center max-w-xs">Gemini 3.1 Pro is analyzing {rfm.frequency} lifetime transactions.</p>
                                    </div>
                                ) : !aiInsights ? (
                                    <div className="p-20 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                            <SparklesIcon className="w-10 h-10 text-indigo-400" />
                                        </div>
                                        <h3 className="text-3xl font-black text-gray-900 mb-4">Predictive Brain is Dormant</h3>
                                        <p className="text-gray-500 max-w-md mx-auto mb-10 leading-relaxed font-medium">
                                            Unlock Gemini 3.1 Pro to analyze this customer's lifetime textual patterns. The AI will generate a psychological profile and dictate the exact Next Best Action to take.
                                        </p>
                                        <button
                                            onClick={handleGenerateAI}
                                            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3 hover:-translate-y-1">
                                            <SparklesIcon className="w-6 h-6" />
                                            Generate AI Insights
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-8 space-y-8 animate-in fade-in duration-500">
                                        {/* Header */}
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-4 mb-2">
                                                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                                                        <SparklesIcon className="w-6 h-6 text-indigo-500" />
                                                        Predictive Brain
                                                    </h2>
                                                    <button
                                                        onClick={handleGenerateAI}
                                                        className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:shadow-sm px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                                                        title="Burn tokens to regenerate insights based on new orders">
                                                        <SparklesIcon className="w-3 h-3" /> Regenerate
                                                    </button>
                                                </div>
                                                <p className="text-gray-500 font-medium">Gemini 3.1 Pro has analyzed this customer's lifetime textual patterns.</p>
                                            </div>
                                            <div className={`px-4 py-2 border rounded-xl flex items-center gap-2 ${getChurnColor(aiInsights.churnRisk)}`}>
                                                <ShieldExclamationIcon className="w-5 h-5" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Churn Risk</span>
                                                    <span className="text-sm font-black">{aiInsights.churnRisk}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Generative Output */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                            {/* Psychology Box */}
                                            <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
                                                <div className="flex items-center gap-2 mb-4 text-indigo-800">
                                                    <ChartBarIcon className="w-5 h-5" />
                                                    <h3 className="font-bold uppercase tracking-wider text-xs">Psychological Profile</h3>
                                                </div>
                                                <p className="text-gray-700 leading-relaxed font-medium">
                                                    {aiInsights.psychologicalProfile}
                                                </p>
                                            </div>

                                            {/* Next Best Action Box */}
                                            <div className="bg-gradient-to-b from-fuchsia-50 to-purple-50 rounded-2xl p-6 border border-fuchsia-100">
                                                <div className="flex items-center gap-2 mb-4 text-fuchsia-800">
                                                    <SparklesIcon className="w-5 h-5" />
                                                    <h3 className="font-bold uppercase tracking-wider text-xs">Next Best Action</h3>
                                                </div>
                                                <p className="text-fuchsia-900 leading-relaxed font-bold text-lg">
                                                    "{aiInsights.nextBestAction}"
                                                </p>
                                            </div>
                                        </div>

                                        {/* Mini Timeline */}
                                        <div className="mt-8 pt-6 border-t border-gray-100">
                                            <div className="flex items-center justify-between text-gray-500 text-sm font-medium">
                                                <span className="flex items-center gap-2"><ClockIcon className="w-4 h-4" /> AI Cache Last Updated: {aiInsights.lastSync ? new Date(aiInsights.lastSync).toLocaleString() : 'Unknown'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: TRANSACTIONS */}
                        {activeTab === 'TRANSACTIONS' && (
                            <div className="animate-in slide-in-from-bottom-2 duration-300">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="text-sm font-bold text-gray-700">Financial Ledger</h3>
                                    <button
                                        onClick={() => setIsOrderModalOpen(true)}
                                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm active:scale-95"
                                    >
                                        <PlusCircleIcon className="w-4 h-4" /> Add Manual Order
                                    </button>
                                </div>
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-bold text-gray-400 shadow-smtext-xs uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Channel</th>
                                            <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Items Exported</th>
                                            <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {orders.length === 0 ? (
                                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">No transactions recorded.</td></tr>
                                        ) : orders.map((o: any) => (
                                            <tr key={o.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {new Date(o.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                                        {o.channel}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1 max-w-sm truncate whitespace-normal">
                                                        {o.items.map((i: any, idx: number) => (
                                                            <span key={idx} className="text-gray-600 text-xs">
                                                                <span className="font-bold">{i.qty}x</span> {i.productName || i.sku}
                                                            </span>
                                                        ))}
                                                        {o.items.length === 0 && <span className="text-gray-400 text-xs italic">SKUs missing</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-black text-gray-900 text-right">
                                                    ฿{Number(o.total).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* TAB 3: ALIASES (IDENTITY GRAPH) */}
                        {activeTab === 'ALIASES' && (
                            <div className="p-8 animate-in slide-in-from-bottom-2 duration-300">
                                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                                    <IdentificationIcon className="w-6 h-6 text-gray-400" />
                                    Identity Graph History
                                </h3>
                                {customer.aliases.length === 0 ? (
                                    <p className="text-gray-500 font-medium text-center py-12">No merged identities recorded. This node is a pure Golden Record.</p>
                                ) : (
                                    <div className="grid gap-4">
                                        {customer.aliases.map((alias: any) => (
                                            <div key={alias.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 font-bold">
                                                        {alias.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{alias.name}</h4>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 font-medium">
                                                            {alias.phone && <span>{formatPhone(alias.phone)}</span>}
                                                            {alias.profileName && <span>@{alias.profileName}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                                                    {alias.source}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CustomerDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                customerData={customer}
                onSaved={() => {
                    setIsDrawerOpen(false);
                    setRefreshTrigger(prev => prev + 1);
                }}
            />

            <ManualOrderModal
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
                customerId={customer.id}
                onSaved={() => {
                    setIsOrderModalOpen(false);
                    setRefreshTrigger(prev => prev + 1);
                }}
            />
        </div>
    );
}
