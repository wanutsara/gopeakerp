import { useState, useRef, useEffect } from "react";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import useSWR from "swr";

const CHANNELS = ["SHOPEE", "LAZADA", "TIKTOK", "LINESHOPPING", "FACEBOOK", "IG", "POS", "OTHER"];

export default function ProductModal({ isOpen, onClose, product, onSaved }: { isOpen: boolean; onClose: () => void; product: any; onSaved: () => void }) {
    const [formData, setFormData] = useState({
        name: "", sku: "", costPrice: "", salePrice: "", stock: "", images: ""
    });
    const [loading, setLoading] = useState(false);

    // Mappings state (only for edit mode)
    const [mappings, setMappings] = useState<any[]>(product?.channelProducts || []);
    const [newMapping, setNewMapping] = useState({ channel: "SHOPEE", platformSku: "" });
    const [mappingLoading, setMappingLoading] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || "",
                sku: product.sku || "",
                costPrice: product.costPrice?.toString() || "",
                salePrice: product.salePrice?.toString() || "",
                stock: product.stock?.toString() || "",
                images: product.images || ""
            });
            setMappings(product.channelProducts || []);
        }
    }, [product]);

    if (!isOpen) return null;

    const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = product ? `/api/oms/products/${product.id}` : "/api/oms/products";
            const method = product ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Execution failed");
            }
            onSaved();
            if (!product) onClose(); // Close only if it was create format. If edit, let them stay to do mapping
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMapping = async () => {
        if (!newMapping.platformSku.trim()) return;
        setMappingLoading(true);
        try {
            const res = await fetch(`/api/oms/products/${product.id}/channels`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newMapping)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            const added = await res.json();
            setMappings([...mappings, added]);
            setNewMapping({ ...newMapping, platformSku: "" }); // Reset input
            onSaved(); // trigger SWR revalidate
        } catch (err: any) {
            alert(err.message);
        } finally {
            setMappingLoading(false);
        }
    };

    const handleDeleteMapping = async (mappingId: string) => {
        try {
            const res = await fetch(`/api/oms/products/${product.id}/channels/${mappingId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete mapping");
            setMappings(mappings.filter(m => m.id !== mappingId));
            onSaved();
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900">{product ? "แก้ไขข้อมูลสินค้า (Edit Product)" : "เพิ่มสินค้าใหม่ (New Product)"}</h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full transition hover:bg-gray-100">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-8">
                    {/* ข้อมูลพื้นฐาน */}
                    <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อสินค้า <span className="text-red-500">*</span></label>
                                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">รหัส SKU (ถาวร)</label>
                                <input type="text" name="sku" value={formData.sku} onChange={handleChange} placeholder="e.g. WH-001" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ต้นทุนสินค้า (บาท)</label>
                                <input type="number" step="0.01" name="costPrice" value={formData.costPrice} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ราคาขายมาตรฐาน</label>
                                <input type="number" step="0.01" name="salePrice" value={formData.salePrice} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">สต๊อกเริ่มต้น</label>
                                <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
                            </div>
                        </div>
                    </form>

                    {/* Mappings (Only show if product exists i.e Edit Mode) */}
                    {product && (
                        <div className="border-t border-gray-100 pt-8 mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">ผูกรหัส Platform SKU</h4>
                                    <p className="text-xs text-gray-500 mt-1">เพื่อให้ระบบคอยดึงยอดขายจากทุกช่องทางมากระจุกตัวที่สินค้าตัวนี้ชิ้นเดียว</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 mb-4 flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">ช่องทาง</label>
                                    <select
                                        value={newMapping.channel}
                                        onChange={(e) => setNewMapping({ ...newMapping, channel: e.target.value })}
                                        className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none"
                                    >
                                        {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="flex-[2]">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">รหัส Platform SKU</label>
                                    <input
                                        type="text"
                                        value={newMapping.platformSku}
                                        onChange={(e) => setNewMapping({ ...newMapping, platformSku: e.target.value })}
                                        placeholder="เช่น Shopee Variation ID"
                                        className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handleAddMapping}
                                    disabled={mappingLoading || !newMapping.platformSku}
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
                                >
                                    เพิ่ม
                                </button>
                            </div>

                            <ul className="space-y-2">
                                {mappings.length === 0 ? (
                                    <li className="text-xs text-center text-gray-400 py-2">ยังไม่มีการผูกรหัส</li>
                                ) : mappings.map(m => (
                                    <li key={m.id} className="flex flex-row items-center justify-between bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded">{m.channel}</span>
                                            <span className="text-sm text-gray-700 font-mono">{m.platformSku}</span>
                                        </div>
                                        <button onClick={() => handleDeleteMapping(m.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 mt-auto">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        form="productForm"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                        {loading ? "กำลังบันทึก..." : (product ? "บันทึกข้อมูลสินค้า" : "สร้างและไปผูกรหัสต่อ")}
                    </button>
                </div>
            </div>
        </div>
    );
}
