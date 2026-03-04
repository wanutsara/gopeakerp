import { useState, useEffect } from "react";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function ExpenseModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
    const [formData, setFormData] = useState({
        title: "", description: "", category: "OFFICE_SUPPLIES", vendorName: "", expectedDate: ""
    });
    const [items, setItems] = useState([{ itemName: "", quantity: 1, price: 0 }]);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { itemName: "", quantity: 1, price: 0 }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.some(i => !i.itemName.trim() || i.price <= 0 || i.quantity <= 0)) {
            return alert("กรุณากรอกข้อมูลรายการสินค้าให้ครบถ้วนและถูกต้อง");
        }

        setLoading(true);
        try {
            const res = await fetch("/api/finance/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, items })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to submit request");
            }
            onSaved();
            onClose();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900">สร้างใบขออนุมัติเบิกจ่าย / สั่งซื้อ (New Purchase Order)</h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full transition">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    <form id="expenseForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">หัวข้อการขอเบิก <span className="text-red-500">*</span></label>
                                <input required type="text" name="title" value={formData.title} onChange={handleChange} placeholder="เช่น ขอซื้อคอมพิวเตอร์พนักงานใหม่, ค่าโฆษณา FB เดือนนี้" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">หมวดหมู่ค่าใช้จ่าย</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="OFFICE_SUPPLIES">อุปกรณ์สำนักงาน (Office Supplies)</option>
                                    <option value="INVENTORY">สต๊อกสินค้า (Inventory Procure)</option>
                                    <option value="MARKETING">การตลาด/โฆษณา (Marketing)</option>
                                    <option value="TRAVEL">ค่าเดินทาง (Travel/Fuel)</option>
                                    <option value="UTILITIES">ค่าน้ำ/ค่าไฟ/อินเทอร์เน็ต (Utilities)</option>
                                    <option value="OTHER">อื่นๆ (Other)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อร้านค้า / Supplier</label>
                                <input type="text" name="vendorName" value={formData.vendorName} onChange={handleChange} placeholder="เช่น IT City, Facebook Ireland" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">รายละเอียดเพิ่มเติม</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-gray-900 text-sm">รายการสินค้า (Line Items)</h4>
                                <button type="button" onClick={addItem} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center bg-blue-50 px-3 py-1.5 rounded-lg transition">
                                    <PlusIcon className="w-4 h-4 mr-1" /> เพิ่มรายการ
                                </button>
                            </div>

                            <div className="space-y-3">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 items-end">
                                        <div className="flex-[3]">
                                            <label className="block text-xs text-gray-500 mb-1">ชื่อรายการ</label>
                                            <input required type="text" value={item.itemName} onChange={e => handleItemChange(idx, "itemName", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-1">จำนวน</label>
                                            <input required type="number" min="1" value={item.quantity} onChange={e => handleItemChange(idx, "quantity", parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-1">ราคา/หน่วย</label>
                                            <input required type="number" min="0" step="0.01" value={item.price} onChange={e => handleItemChange(idx, "price", parseFloat(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right" />
                                        </div>
                                        <div className="w-24 text-right mb-2 text-sm font-bold text-gray-700">
                                            ฿{(item.quantity * item.price).toLocaleString()}
                                        </div>
                                        <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1} className="mb-1 p-2 text-gray-400 hover:text-red-500 disabled:opacity-30">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 bg-gray-50 rounded-xl p-4 flex justify-between items-center border border-gray-100">
                                <span className="font-medium text-gray-600">ยอดรวมทั้งสิ้น (Total Estimate)</span>
                                <span className="text-2xl font-black text-gray-900">฿{totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 mt-auto">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">ยกเลิก</button>
                    <button type="submit" form="expenseForm" disabled={loading} className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                        {loading ? "กำลังบันทึก..." : "ส่งคำขออนุมัติ (Submit)"}
                    </button>
                </div>
            </div>
        </div>
    );
}
