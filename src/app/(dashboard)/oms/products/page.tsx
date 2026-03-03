"use client";

import { useState } from "react";
import useSWR from "swr";
import { PlusIcon, PencilSquareIcon, TrashIcon, TagIcon } from "@heroicons/react/24/outline";
import ProductModal from "./ProductModal";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
};

export default function ProductsPage() {
    const { data: products, error, mutate } = useSWR("/api/oms/products?mappings=true", fetcher);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    const handleAdd = () => {
        setSelectedProduct(null);
        setIsModalOpen(true);
    };

    const handleEdit = (product: any) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this product?")) return;

        try {
            const res = await fetch(`/api/oms/products/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete");
            }
            mutate();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (error) return <div className="p-8 text-red-500">Failed to load products</div>;
    if (!products) return <div className="p-8 text-gray-500 animate-pulse">Loading catalog...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">คลังสินค้ากลาง (Product Catalog)</h1>
                    <p className="mt-1 text-sm text-gray-500">จัดการข้อมูลสินค้าหลัก และผูกรหัส SKU ของแต่ละช่องทางการขาย</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition shadow-sm"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    เพิ่มสินค้าใหม่
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">รูปสินค้า</th>
                                <th className="px-6 py-4">ชื่อสินค้า / SKU กลาง</th>
                                <th className="px-6 py-4 text-right">ต้นทุน (บาท)</th>
                                <th className="px-6 py-4 text-right">ราคาขาย (บาท)</th>
                                <th className="px-6 py-4 text-center">ช่องทางที่ผูกไว้</th>
                                <th className="px-6 py-4 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        ยังไม่มีข้อมูลสินค้าในระบบ กรุณาเพิ่มสินค้าใหม่
                                    </td>
                                </tr>
                            ) : (
                                products.map((product: any) => (
                                    <tr key={product.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4">
                                            {product.images ? (
                                                <img src={product.images} alt={product.name} className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-100">
                                                    <TagIcon className="w-6 h-6" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{product.name}</div>
                                            <div className="text-gray-500 text-xs mt-0.5">{product.sku || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600 font-medium">
                                            ฿{product.costPrice.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-green-600 font-medium">
                                            ฿{product.salePrice.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 flex-wrap w-48">
                                                {product.channelProducts?.length > 0 ? (
                                                    product.channelProducts.map((cp: any) => (
                                                        <span key={cp.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600" title={cp.platformSku}>
                                                            {cp.channel}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="แก้ไขและผูกช่องทาง"
                                            >
                                                <PencilSquareIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-1"
                                                title="ลบสินค้า"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <ProductModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    product={selectedProduct}
                    onSaved={() => mutate()}
                />
            )}
        </div>
    );
}
