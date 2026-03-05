'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { PlusIcon, ShoppingBagIcon, CalendarIcon, BanknotesIcon } from '@heroicons/react/24/outline';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
};

export default function OMSOrdersPage() {
    const { data: orders, error, mutate } = useSWR('/api/oms/orders', fetcher);
    const [isLoading, setIsLoading] = useState(false);

    // Add Order Logic State
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [orderForm, setOrderForm] = useState({
        date: new Date().toISOString().split('T')[0],
        channel: 'SHOPEE',
        subtotal: 0,
        shippingFee: 0,
        platformFee: 0,
        discount: 0,
        total: 0,
        notes: ''
    });

    const calculateTotal = (form: any) => {
        const sub = Number(form.subtotal) || 0;
        const ship = Number(form.shippingFee) || 0;
        const plat = Number(form.platformFee) || 0;
        const disc = Number(form.discount) || 0;
        return sub + ship - plat - disc;
    };

    const handleFormChange = (key: string, value: any) => {
        const newForm = { ...orderForm, [key]: value };
        if (['subtotal', 'shippingFee', 'platformFee', 'discount'].includes(key)) {
            newForm.total = calculateTotal(newForm);
        }
        setOrderForm(newForm);
    };

    const onSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const finalTotal = calculateTotal(orderForm);
            const res = await fetch('/api/oms/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...orderForm, total: finalTotal })
            });

            if (res.ok) {
                setIsOrderModalOpen(false);
                setOrderForm({
                    date: new Date().toISOString().split('T')[0],
                    channel: 'SHOPEE',
                    subtotal: 0, shippingFee: 0, platformFee: 0, discount: 0, total: 0, notes: ''
                });
                mutate();
                alert('Revenue Logged Successfully!');
            } else {
                alert('Failed to log order');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (error) return <div className="p-8 text-red-500">Error loading orders</div>;
    if (!orders) return <div className="p-8 text-gray-500 animate-pulse">Loading Sales Data...</div>;
    if (orders?.error) return <div className="p-8 text-red-500">{orders.error}</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <ShoppingBagIcon className="w-8 h-8 text-indigo-600" />
                        OMS / Revenue Center
                    </h1>
                    <p className="mt-1 text-gray-500 font-medium text-sm">Inject daily Omni-channel Sales into the Executive Dashboard Net Profit Tracker.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsOrderModalOpen(true)}
                        className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:opacity-90 shadow-lg shadow-indigo-500/30 text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2"
                    >
                        <BanknotesIcon className="w-5 h-5" /> Log Daily Revenue
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    Recent Sales Logs
                </h3>

                {orders && orders.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Channel</th>
                                    <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Subtotal</th>
                                    <th className="px-6 py-3 text-left text-xs font-black text-rose-500 uppercase tracking-wider">Fees & Disc</th>
                                    <th className="px-6 py-3 text-right text-xs font-black text-green-600 uppercase tracking-wider">Net Received</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {orders.map((order: any) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${order.channel === 'SHOPEE' ? 'bg-orange-100 text-orange-700' :
                                                    order.channel === 'TIKTOK' ? 'bg-black text-white' :
                                                        order.channel === 'FACEBOOK' ? 'bg-blue-100 text-blue-700' :
                                                            order.channel === 'LINESHOPPING' ? 'bg-green-100 text-green-700' :
                                                                'bg-gray-100 text-gray-700'
                                                }`}>
                                                {order.channel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">฿{order.subtotal.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-rose-500">-฿{(order.platformFee + order.discount).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-right text-green-600">฿{order.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                        <ShoppingBagIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-bold">No Revenue Logs Found</p>
                        <p className="text-sm mt-1">Click "Log Daily Revenue" to start building your dashboard.</p>
                    </div>
                )}
            </div>

            {/* Log Order Modal */}
            {isOrderModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-6 flex justify-between items-center text-white">
                            <div>
                                <h2 className="text-xl font-black">Log Daily Revenue</h2>
                                <p className="text-indigo-100 text-sm font-medium">Record sales batch into the General Ledger</p>
                            </div>
                            <button onClick={() => setIsOrderModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition">✕</button>
                        </div>
                        <form onSubmit={onSubmitOrder} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Date</label>
                                    <input required type="date" value={orderForm.date} onChange={e => handleFormChange('date', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:border-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Sales Channel</label>
                                    <select value={orderForm.channel} onChange={e => handleFormChange('channel', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:border-indigo-500 outline-none">
                                        <option value="SHOPEE">Shopee</option>
                                        <option value="LAZADA">Lazada</option>
                                        <option value="TIKTOK">TikTok Shop</option>
                                        <option value="LINESHOPPING">LINE Shopping</option>
                                        <option value="FACEBOOK">Facebook Inbox</option>
                                        <option value="IG">Instagram</option>
                                        <option value="POS">Offline / POS</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Gross Sales (฿) *</label>
                                    <input required type="number" min="0" step="0.01" value={orderForm.subtotal || ''} onChange={e => handleFormChange('subtotal', Number(e.target.value))} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:border-indigo-500 outline-none" placeholder="Total Customer Paid" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-rose-400 uppercase tracking-widest mb-1">Platform Fees (฿)</label>
                                    <input type="number" min="0" step="0.01" value={orderForm.platformFee || ''} onChange={e => handleFormChange('platformFee', Number(e.target.value))} className="w-full border-2 border-rose-100 focus:border-rose-400 rounded-xl p-3 font-bold text-rose-600 outline-none" placeholder="GP / Comm. Fees" />
                                </div>
                            </div>

                            <div className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-between border border-indigo-100 mt-6">
                                <span className="text-sm font-black text-indigo-800 uppercase tracking-wider">Net Received Revenue</span>
                                <span className="text-3xl font-black text-indigo-600">฿{orderForm.total.toLocaleString()}</span>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsOrderModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancel</button>
                                <button disabled={isLoading} type="submit" className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:scale-105 transition transform text-white px-8 py-2.5 font-black uppercase tracking-widest rounded-xl disabled:opacity-50">Log Revenue</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
