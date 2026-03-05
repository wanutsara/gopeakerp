'use client';

import { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, ShoppingCartIcon, PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ManualOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    onSaved: () => void;
}

export default function ManualOrderModal({ isOpen, onClose, customerId, onSaved }: ManualOrderModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Inventory
    const [products, setProducts] = useState<any[]>([]);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
    const [channel, setChannel] = useState('OTHER');
    const [notes, setNotes] = useState('');
    const [discount, setDiscount] = useState<number>(0);
    const [shippingFee, setShippingFee] = useState<number>(0);
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/oms/products')
                .then(res => res.json())
                .then(data => Array.isArray(data) && setProducts(data))
                .catch(err => console.error(err));

            // Reset state
            setItems([]);
            setDiscount(0);
            setShippingFee(0);
            setNotes('');
            setError('');
            setDate(new Date().toISOString().slice(0, 16));
            setChannel('OTHER');
        }
    }, [isOpen]);

    const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.price * item.quantity), 0), [items]);
    const total = subtotal - Number(discount) + Number(shippingFee);

    const handleAddItem = () => {
        setItems([...items, { productId: '', productName: '', price: 0, quantity: 1, sku: '' }]);
    };

    const handleProductSelect = (index: number, productId: string) => {
        const newItems = [...items];
        if (!productId) {
            newItems[index] = { ...newItems[index], productId: '', productName: '', price: 0, sku: '' };
        } else {
            const prod = products.find(p => p.id === productId);
            if (prod) {
                newItems[index] = {
                    ...newItems[index],
                    productId: prod.id,
                    productName: prod.name,
                    price: prod.salePrice || 0,
                    sku: prod.sku || ''
                };
            }
        }
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (items.length === 0) return setError('Please add at least one item to the order.');
        if (total <= 0) return setError('Total must be greater than zero.');

        setLoading(true);

        try {
            const payload = {
                channel,
                date: new Date(date).toISOString(),
                subtotal, discount: Number(discount), shippingFee: Number(shippingFee), total,
                notes, items
            };

            const res = await fetch(`/api/crm/customers/${customerId}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to generate manual invoice.');

            onSaved();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <ShoppingCartIcon className="w-6 h-6 text-fuchsia-600" />
                            Inject Manual Sales Invoice
                        </h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            Bypasses the AI Importer to directly augment Cash Flow and decrement Physical Inventory.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 bg-white rounded-full border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl border border-red-200">
                            {error}
                        </div>
                    )}

                    <form id="order-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Meta Data */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-fuchsia-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Sales Channel</label>
                                <select
                                    value={channel}
                                    onChange={e => setChannel(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-black text-gray-900 focus:ring-2 focus:ring-fuchsia-500 outline-none"
                                >
                                    <option value="SHOPEE">SHOPEE</option>
                                    <option value="LAZADA">LAZADA</option>
                                    <option value="TIKTOK">TIKTOK</option>
                                    <option value="LINESHOPPING">LINE SHOPPING</option>
                                    <option value="FACEBOOK">FACEBOOK</option>
                                    <option value="IG">INSTAGRAM</option>
                                    <option value="POS">WALK-IN POS</option>
                                    <option value="OTHER">OTHER / DIRECT</option>
                                </select>
                            </div>
                        </div>

                        {/* Items Vector */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Inventory Vector Matrix</h3>
                                <button type="button" onClick={handleAddItem} className="text-xs font-bold text-fuchsia-600 flex items-center gap-1 hover:text-fuchsia-700 bg-fuchsia-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                                    <PlusCircleIcon className="w-4 h-4" /> Add Item Line
                                </button>
                            </div>

                            {items.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm font-medium border-2 border-dashed border-gray-100 rounded-xl">
                                    No items in this order. Add an item below.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end p-3 bg-gray-50 rounded-xl border border-gray-100 relative group">
                                            <div className="w-full md:w-5/12">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">SKU Lookup</label>
                                                <select
                                                    value={item.productId || ''}
                                                    onChange={e => handleProductSelect(idx, e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm font-bold text-gray-700 bg-white"
                                                >
                                                    <option value="">[Custom Text Item]</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.sku ? `[${p.sku}]` : ''} {p.name}</option>
                                                    ))}
                                                </select>
                                                {!item.productId && (
                                                    <input
                                                        type="text"
                                                        placeholder="Custom Item Name..."
                                                        value={item.productName}
                                                        onChange={e => handleItemChange(idx, 'productName', e.target.value)}
                                                        className="w-full border mt-2 border-gray-200 rounded-lg px-2 py-2 text-sm font-medium text-gray-900 bg-white outline-none"
                                                    />
                                                )}
                                            </div>
                                            <div className="w-full md:w-2/12">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Unit Price (฿)</label>
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm font-bold text-gray-900 outline-none text-right"
                                                />
                                            </div>
                                            <div className="w-full md:w-2/12">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Qty</label>
                                                <input
                                                    type="number" min="1"
                                                    value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm font-bold text-gray-900 outline-none text-right"
                                                />
                                            </div>
                                            <div className="w-full md:w-2/12">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Total</label>
                                                <div className="w-full bg-white border border-transparent rounded-lg px-2 py-2 text-sm font-black text-indigo-900 text-right">
                                                    {(item.price * item.quantity).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="w-full md:w-1/12 flex justify-end md:justify-center">
                                                <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600 bg-white hover:bg-red-50 p-2 rounded-lg transition-colors border border-gray-200">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Finans */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Notes / Ledger Comments</label>
                                    <textarea
                                        rows={3}
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-fuchsia-500 outline-none resize-none"
                                        placeholder="Order references, tracking codes..."
                                    />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-lg space-y-3 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />

                                <div className="flex justify-between items-center text-sm font-bold text-gray-400">
                                    <span>Subtotal Vector</span>
                                    <span>฿{subtotal.toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between items-center text-sm font-bold text-gray-400">
                                    <span className="flex items-center gap-2">
                                        Shipping <input type="number" value={shippingFee} onChange={e => setShippingFee(Number(e.target.value))} className="w-16 bg-gray-800 border-b border-gray-600 outline-none text-white text-right px-1" />
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-sm font-bold text-red-300">
                                    <span className="flex items-center gap-2">
                                        Discount <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-16 bg-red-900/50 border-b border-red-800 outline-none text-red-200 text-right px-1" />
                                    </span>
                                </div>

                                <div className="border-t border-gray-700 pt-3 flex justify-between items-center mt-2 relative z-10">
                                    <span className="text-xs uppercase tracking-widest font-bold text-fuchsia-400">Net Final</span>
                                    <span className="text-3xl font-black">฿{total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3 rounded-b-3xl">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                    <button
                        type="submit"
                        form="order-form"
                        disabled={loading}
                        className="px-8 py-2.5 bg-fuchsia-600 text-white font-black rounded-xl shadow-lg hover:bg-fuchsia-700 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Inject Order Sync
                    </button>
                </div>
            </div>
        </div>
    );
}
