'use client';
import { useState, useEffect } from 'react';
import { TruckIcon, ClipboardDocumentListIcon, BuildingOffice2Icon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function OMSProcurementPage() {
    const [activeTab, setActiveTab] = useState<'POS' | 'SUPPLIERS'>('POS');
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [supRes, poRes, prodRes, locRes] = await Promise.all([
                fetch('/api/oms/procurement/suppliers'),
                fetch('/api/oms/procurement/orders'),
                fetch('/api/oms/products'),
                fetch('/api/inventory/locations')
            ]);
            setSuppliers(await supRes.json());
            setOrders(await poRes.json());
            setProducts(await prodRes.json());
            setLocations(await locRes.json());
        } catch (e: any) {
            toast.error("Failed to load procurement data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // -------- Supplier Management --------
    const [newSupplierName, setNewSupplierName] = useState('');
    const handleCreateSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/oms/procurement/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newSupplierName })
            });
            if (res.ok) {
                toast.success('Supplier Added');
                setNewSupplierName('');
                fetchData();
            } else {
                toast.error('Failed to add supplier');
            }
        } catch (e) {
            toast.error('Network error');
        }
    };

    // -------- PO Management --------
    const [poForm, setPoForm] = useState({ supplierId: '', notes: '' });
    const [poItems, setPoItems] = useState([{ productId: '', quantityOrdered: 1, unitCost: 0 }]);
    const [isCreatingPo, setIsCreatingPo] = useState(false);

    const handleCreatePO = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!poForm.supplierId || poItems.some(i => !i.productId)) {
            toast.error("Complete all fields."); return;
        }

        setIsCreatingPo(true);
        try {
            const res = await fetch('/api/oms/procurement/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId: poForm.supplierId,
                    notes: poForm.notes,
                    items: poItems
                })
            });
            if (res.ok) {
                toast.success('Purchase Order Generated');
                setPoItems([{ productId: '', quantityOrdered: 1, unitCost: 0 }]);
                fetchData();
            } else {
                toast.error('Failed to create PO');
            }
        } catch (e) {
            toast.error('Network error');
        } finally {
            setIsCreatingPo(false);
        }
    };

    // -------- Receiving Logic --------
    const handleReceiveFull = async (poId: string, items: any[]) => {
        const defaultLoc = locations.find(l => l.isDefault) || locations[0];
        if (!defaultLoc) { toast.error("No default location."); return; }

        const payloads = items.map(item => ({
            purchaseOrderItemId: item.id,
            quantityReceiving: item.quantityOrdered - item.quantityReceived,
            locationId: defaultLoc.id,
            expirationDate: null
        }));

        try {
            toast.loading("Receiving stock and generating Batches...", { id: 'recv' });
            const res = await fetch(`/api/oms/procurement/orders/${poId}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receives: payloads })
            });
            if (res.ok) {
                toast.success('Stock Received & Batch Costing locked!', { id: 'recv' });
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed', { id: 'recv' });
            }
        } catch (e) {
            toast.error('Network error', { id: 'recv' });
        }
    };


    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <TruckIcon className="w-8 h-8 text-indigo-600" /> Procurement & Suppliers
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage B2B incoming freight, strict FIFO batches, and vendor risk metrics.</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0 bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('POS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'POS' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500 hover:text-gray-900'}`}><ClipboardDocumentListIcon className="w-4 h-4" /> Purchase Orders</button>
                    <button onClick={() => setActiveTab('SUPPLIERS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'SUPPLIERS' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500 hover:text-gray-900'}`}><BuildingOffice2Icon className="w-4 h-4" /> Vendors Matrix</button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-20 animate-pulse text-indigo-400 font-bold">Synchronizing Logistics Control Tower...</div>
            ) : (
                <>
                    {activeTab === 'SUPPLIERS' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">Onboard New Vendor</h3>
                                <form onSubmit={handleCreateSupplier} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Company Name</label>
                                        <input type="text" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} required className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none" placeholder="e.g. Bangkok Textiles Ltd." />
                                    </div>
                                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm transition">Register Supplier</button>
                                </form>
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                {suppliers.map(s => (
                                    <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition">
                                        <div>
                                            <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                {s.name}
                                                {s.reliabilityScore >= 90 && <CheckCircleIcon className="w-5 h-5 text-emerald-500" title="Tier-1 Reliable" />}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">Average Lead Time: <span className="font-bold">{s.leadTimeDays} Days</span></div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">AI Vendor Score</div>
                                            <div className={`text-2xl font-black ${s.reliabilityScore >= 90 ? 'text-emerald-500' : s.reliabilityScore >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>{s.reliabilityScore}/100</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'POS' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Create PO Form */}
                            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit sticky top-6">
                                <h3 className="font-black text-gray-900 mb-4 text-lg">Generate Purchase Order</h3>
                                <form onSubmit={handleCreatePO} className="space-y-5">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Supplier Routing</label>
                                        <select required value={poForm.supplierId} onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none bg-gray-50">
                                            <option value="">Select Vendor...</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (Score: {s.reliabilityScore})</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-3 pt-3 border-t border-gray-100">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex justify-between items-center">
                                            Payload Items
                                            <button type="button" onClick={() => setPoItems([...poItems, { productId: '', quantityOrdered: 1, unitCost: 0 }])} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><PlusIcon className="w-3 h-3" /> Add Row</button>
                                        </label>
                                        {poItems.map((item, idx) => (
                                            <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 grid grid-cols-2 gap-2 relative group">
                                                <div className="col-span-2">
                                                    <select required value={item.productId} onChange={e => { const newItems = [...poItems]; newItems[idx].productId = e.target.value; setPoItems(newItems); }} className="w-full text-xs p-1 rounded border border-gray-200">
                                                        <option value="">Select SKU...</option>
                                                        {products.filter(p => !p.parentId).map(p => <option key={p.id} value={p.id}>{p.name} [{p.sku}]</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-400 font-bold">Qty Ordered</label>
                                                    <input type="number" required min="1" value={item.quantityOrdered} onChange={e => { const newItems = [...poItems]; newItems[idx].quantityOrdered = parseInt(e.target.value); setPoItems(newItems); }} className="w-full text-xs p-1 rounded border border-gray-200" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-400 font-bold">Unit Cost (FIFO)</label>
                                                    <input type="number" required min="0" step="0.01" value={item.unitCost} onChange={e => { const newItems = [...poItems]; newItems[idx].unitCost = parseFloat(e.target.value); setPoItems(newItems); }} className="w-full text-xs p-1 rounded border border-gray-200" />
                                                </div>
                                                {poItems.length > 1 && (
                                                    <button type="button" onClick={() => { const newItems = [...poItems]; newItems.splice(idx, 1); setPoItems(newItems); }} className="absolute -top-2 -right-2 bg-rose-100 text-rose-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition">✕</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <button type="submit" disabled={isCreatingPo} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-black py-3 rounded-xl shadow-lg transition flex justify-center items-center gap-2">
                                        <TruckIcon className="w-5 h-5" /> Issue Purchase Order
                                    </button>
                                </form>
                            </div>

                            {/* PO List */}
                            <div className="lg:col-span-2 space-y-4">
                                {orders.map(po => (
                                    <div key={po.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                            <div>
                                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">PO Ref: {po.id.slice(-6).toUpperCase()}</div>
                                                <div className="font-bold text-gray-900 mt-1">{po.supplier?.name}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${po.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : po.status === 'ISSUED' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {po.status}
                                                </span>
                                                <div className="font-black text-gray-900 mt-1">฿{po.totalValue.toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white space-y-2">
                                            {po.items.map((pi: any) => (
                                                <div key={pi.id} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                                                    <div>
                                                        <span className="font-bold text-gray-800">{pi.product?.name}</span>
                                                        <span className="text-gray-400 text-xs ml-2">@ ฿{pi.unitCost}/ea</span>
                                                    </div>
                                                    <div className="text-right flex items-center gap-3">
                                                        <div className="text-xs">
                                                            <span className={pi.quantityReceived === pi.quantityOrdered ? "text-emerald-500 font-bold" : "text-gray-500"}>{pi.quantityReceived}</span>
                                                            <span className="text-gray-300"> / </span>
                                                            <span className="font-bold">{pi.quantityOrdered}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {po.status !== 'COMPLETED' && (
                                                <div className="pt-3 mt-3 border-t border-gray-100 flex justify-end">
                                                    <button
                                                        onClick={() => handleReceiveFull(po.id, po.items)}
                                                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold px-4 py-2 rounded-lg text-xs transition"
                                                    >
                                                        Fast Receive All to Default Warehouse
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
