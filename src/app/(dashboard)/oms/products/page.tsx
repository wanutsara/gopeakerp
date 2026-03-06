"use client";
import React, { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PlusIcon, PencilSquareIcon, TrashIcon, TagIcon, CubeIcon, ChevronDownIcon, ChevronRightIcon, MapPinIcon } from "@heroicons/react/24/outline";
import ProductModal from "./ProductModal";
import InventoryModal from "./InventoryModal";

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

    const [isInvModalOpen, setIsInvModalOpen] = useState(false);
    const [selectedInvProduct, setSelectedInvProduct] = useState<any>(null);

    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleEdit = (product: any) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleInventory = (product: any) => {
        setSelectedInvProduct(product);
        setIsInvModalOpen(true);
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
                <Link
                    href="/oms/products/new"
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-2xl hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Launch Product Studio
                </Link>
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
                                products.map((product: any) => {
                                    const hasVariants = product.variants && product.variants.length > 0;
                                    const isExpanded = expandedRows[product.id];

                                    return (
                                        <React.Fragment key={product.id}>
                                            <tr className={`transition ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-gray-50/50'}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {hasVariants && (
                                                            <button onClick={() => toggleRow(product.id)} className="p-1 hover:bg-gray-200 rounded-md transition text-gray-400">
                                                                {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                        {product.images ? (
                                                            <img src={product.images} alt={product.name} className="w-12 h-12 rounded-lg object-cover border border-gray-100 shadow-sm" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100 shadow-sm">
                                                                <TagIcon className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                                        {product.name}
                                                        {hasVariants && (
                                                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] uppercase font-bold rounded-full">
                                                                Master Series ({product.variants.length})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-gray-500 text-xs mt-0.5 tracking-wider">{product.sku || (hasVariants ? 'MASTER-CONTAINER' : 'N/A')}</div>

                                                    {!hasVariants && (
                                                        <div className="mt-1.5 flex items-center gap-2">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${product.stock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                                                Total Stock: {product.stock || 0}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-600 font-medium tracking-tight">
                                                    {hasVariants ? '-' : `฿${product.costPrice.toLocaleString()}`}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-900 font-bold tracking-tight">
                                                    {hasVariants ? '-' : `฿${product.salePrice.toLocaleString()}`}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1 flex-wrap w-48">
                                                        {product.channelProducts?.length > 0 ? (
                                                            product.channelProducts.map((cp: any) => (
                                                                <span key={cp.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600" title={cp.platformSku}>
                                                                    {cp.channel}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-300">-</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    {!hasVariants && (
                                                        <button
                                                            onClick={() => handleInventory(product)}
                                                            className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 rounded-xl transition shadow-sm bg-indigo-50"
                                                            title="Receive Inventory"
                                                        >
                                                            <CubeIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleEdit(product)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition ml-1"
                                                        title="Edit Product Details"
                                                    >
                                                        <PencilSquareIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition ml-1"
                                                        title="Delete Matrix"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Child Variants Injection */}
                                            {hasVariants && isExpanded && product.variants.map((variant: any) => (
                                                <tr key={variant.id} className="bg-gray-50/30 hover:bg-gray-100/50 transition border-l-2 border-indigo-200">
                                                    <td className="px-6 py-3 pl-16">
                                                        <div className="flex gap-2 items-center">
                                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-300 border border-gray-100 shadow-sm shrink-0">
                                                                <TagIcon className="w-4 h-4" />
                                                            </div>
                                                            <div className="text-sm font-bold text-gray-700">{variant.variantName}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="text-xs font-mono text-gray-500">{variant.sku}</div>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {variant.inventoryLevels?.map((inv: any) => (
                                                                <div key={inv.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-gray-200 text-gray-600 shadow-sm">
                                                                    <MapPinIcon className="w-3 h-3 text-amber-500" />
                                                                    <span>{inv.location?.name || 'Unknown'}:</span>
                                                                    <span className={inv.available > 0 ? 'text-emerald-600' : 'text-red-500'}>{inv.available}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-gray-500 text-sm tracking-tight">฿{variant.costPrice.toLocaleString()}</td>
                                                    <td className="px-6 py-3 text-right text-emerald-600 font-bold text-sm tracking-tight">฿{variant.salePrice.toLocaleString()}</td>
                                                    <td className="px-6 py-3 text-center text-gray-400 text-xs">-</td>
                                                    <td className="px-6 py-3 text-right">
                                                        <button
                                                            onClick={() => handleInventory(variant)}
                                                            className="p-1.5 text-indigo-500 hover:text-white hover:bg-indigo-500 rounded-lg transition border border-indigo-200 bg-white shadow-sm text-xs font-bold inline-flex items-center gap-1"
                                                        >
                                                            <CubeIcon className="w-3 h-3" /> Adjust
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })
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

            {isInvModalOpen && (
                <InventoryModal
                    isOpen={isInvModalOpen}
                    onClose={() => setIsInvModalOpen(false)}
                    product={selectedInvProduct}
                    onSaved={() => mutate()}
                />
            )}
        </div>
    );
}
