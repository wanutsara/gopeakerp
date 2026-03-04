"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { XMarkIcon, ArrowDownTrayIcon, AdjustmentsHorizontalIcon, QueueListIcon } from "@heroicons/react/24/outline";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function InventoryModal({ isOpen, onClose, product, onSaved }: any) {
    const [activeTab, setActiveTab] = useState("RECEIVE");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Form states
    const [amount, setAmount] = useState<number | "">("");
    const [countedQuantity, setCountedQuantity] = useState<number | "">("");
    const [notes, setNotes] = useState("");
    const [reference, setReference] = useState("");

    const { data: logs, mutate: mutateLogs } = useSWR(
        isOpen && product ? `/api/oms/inventory?productId=${product.id}` : null,
        fetcher
    );

    useEffect(() => {
        if (isOpen && product) {
            setCountedQuantity(product.stock || 0);
            setAmount("");
            setNotes("");
            setReference("");
            setError("");
            setActiveTab("RECEIVE");
        }
    }, [isOpen, product]);

    if (!isOpen || !product) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            let payload: any = {
                productId: product.id,
                notes,
                reference
            };

            if (activeTab === "RECEIVE") {
                if (!amount || amount <= 0) throw new Error("Please enter a valid amount to receive.");
                payload.action = "INBOUND_RECEIVE";
                payload.amount = Number(amount);
            } else if (activeTab === "COUNT") {
                if (countedQuantity === "" || countedQuantity < 0) throw new Error("Please enter the actual counted amount.");
                payload.action = "CYCLE_COUNT";
                payload.countedQuantity = Number(countedQuantity);
            }

            const res = await fetch("/api/oms/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update inventory.");
            }

            // Success
            mutateLogs();
            onSaved();
            if (activeTab === "RECEIVE") {
                setAmount("");
                setActiveTab("LEDGER");
            } else {
                setActiveTab("LEDGER");
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">จัดการสต๊อก: {product.name}</h2>
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            <span>SKU: {product.sku || 'N/A'}</span>
                            <span className="text-gray-300">•</span>
                            <span className="font-medium text-blue-600">สต๊อกปัจจุบัน: {product.stock || 0} ชิ้น</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50 transition">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex border-b border-gray-100 bg-gray-50/50 px-6">
                    <button
                        onClick={() => setActiveTab("RECEIVE")}
                        className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "RECEIVE" ? "border-green-500 text-green-700 bg-green-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                    >
                        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                        รับของเข้า (Receive)
                    </button>
                    <button
                        onClick={() => setActiveTab("COUNT")}
                        className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "COUNT" ? "border-amber-500 text-amber-700 bg-amber-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                    >
                        <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
                        นับสต๊อก (Cycle Count)
                    </button>
                    <button
                        onClick={() => setActiveTab("LEDGER")}
                        className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "LEDGER" ? "border-blue-500 text-blue-700 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                    >
                        <QueueListIcon className="w-4 h-4 mr-2" />
                        สมุดบัญชี (Ledger)
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {activeTab === "LEDGER" ? (
                        <div className="space-y-4">
                            {!logs ? (
                                <div className="text-center py-8 text-gray-400 text-sm animate-pulse">กำลังโหลดประวัติ...</div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">ยังไม่มีประวัติการเคลื่อนไหวสต๊อก</div>
                            ) : (
                                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-600 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">วัน/เวลา</th>
                                                <th className="px-4 py-3">ประเภท</th>
                                                <th className="px-4 py-3 text-right">จำนวน</th>
                                                <th className="px-4 py-3 text-right">คงเหลือ</th>
                                                <th className="px-4 py-3">หมายเหตุ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {logs.map((log: any) => (
                                                <tr key={log.id} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                                        {new Date(log.createdAt).toLocaleString('th-TH')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${log.type === 'INBOUND' ? 'bg-green-100 text-green-700' :
                                                                log.type === 'OUTBOUND' ? 'bg-red-100 text-red-700' :
                                                                    'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {log.type}
                                                        </span>
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-medium ${log.quantityChanged > 0 ? 'text-green-600' : log.quantityChanged < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                                        {log.quantityChanged > 0 ? '+' : ''}{log.quantityChanged}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                        {log.balanceAfter}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate" title={log.notes}>
                                                        {log.reference ? <span className="font-medium text-gray-700 mr-1">#{log.reference}</span> : null}
                                                        {log.notes}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {activeTab === "RECEIVE" && (
                                <div className="bg-green-50/50 p-5 rounded-xl border border-green-100">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        จำนวนที่รับเข้า (ชิ้น) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                            required
                                            min="1"
                                            className="w-full text-2xl font-bold py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            placeholder="Ex: 50"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-500 font-medium">
                                            + ชิ้น
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-green-600 flex items-center">
                                        สต๊อกจะกลายเป็น: <strong className="ml-1 text-lg">{Number(product.stock || 0) + Number(amount || 0)}</strong>
                                    </p>
                                </div>
                            )}

                            {activeTab === "COUNT" && (
                                <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-100">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        ยอดนับจริงบนชั้นวาง (ชิ้น) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={countedQuantity}
                                        onChange={e => setCountedQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                                        required
                                        min="0"
                                        className="w-full text-2xl font-bold py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                    <p className="mt-2 text-sm text-amber-600">
                                        ใส่ตัวเลขที่นับได้จริง ไม่ต้องบวกลบเอง ระบบจะคำนวณส่วนต่างให้ (ส่วนต่าง: <strong>{(Number(countedQuantity) || 0) - (product.stock || 0)}</strong>)
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        เลขอ้างอิง (PO / เอกสาร)
                                    </label>
                                    <input
                                        type="text"
                                        value={reference}
                                        onChange={e => setReference(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="Ex: PO-2024-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        หมายเหตุ
                                    </label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder={activeTab === "COUNT" ? "Ex: ของชำรุด 2 ชิ้น" : "Ex: ล็อตใหม่หน้าโรงงาน"}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl focus:ring-4 transition shadow-sm ${activeTab === "RECEIVE"
                                            ? "bg-green-600 hover:bg-green-700 focus:ring-green-100"
                                            : "bg-amber-500 hover:bg-amber-600 focus:ring-amber-100"
                                        } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? 'กำลังบันทึก...' : 'ยันยืนทำรายการ'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
