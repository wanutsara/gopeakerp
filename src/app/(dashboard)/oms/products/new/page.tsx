'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    SquaresPlusIcon,
    TagIcon,
    SparklesIcon,
    TrashIcon,
    PhotoIcon,
    CloudArrowUpIcon,
    XMarkIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface Option {
    name: string; // e.g. "Size", "Color"
    values: string[]; // e.g. ["S", "M", "L"]
}

interface VariantPayload {
    variantName: string;
    sku: string;
    costPrice: string;
    salePrice: string;
    stock: string;
    images?: string;
    attributes: Record<string, string>;
}

export default function NewProductBuilder() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    // Master Details
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState('');
    const [isUploadingMaster, setIsUploadingMaster] = useState(false);
    const [uploadingVariantIdx, setUploadingVariantIdx] = useState<number | null>(null);

    const [baseSku, setBaseSku] = useState('');
    const [baseCost, setBaseCost] = useState('');
    const [basePrice, setBasePrice] = useState('');
    const [baseStock, setBaseStock] = useState('');

    // Variant Options (e.g. Size, Color)
    const [hasVariants, setHasVariants] = useState(false);
    const [options, setOptions] = useState<Option[]>([{ name: '', values: [] }]);

    // The Generated Matrix
    const [variants, setVariants] = useState<VariantPayload[]>([]);

    const handleAddOption = () => {
        setOptions([...options, { name: '', values: [] }]);
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = [...options];
        newOptions.splice(index, 1);
        setOptions(newOptions);
    };

    const handleOptionNameChange = (index: number, val: string) => {
        const newOptions = [...options];
        newOptions[index].name = val;
        setOptions(newOptions);
    };

    const handleOptionValuesChange = (index: number, rawVal: string) => {
        const newOptions = [...options];
        // Split by comma for quick entry
        newOptions[index].values = rawVal.split(',').map(v => v.trim()).filter(v => v !== '');
        setOptions(newOptions);
    };

    const generateCombinations = () => {
        // Filter out empty options
        const validOptions = options.filter(o => o.name && o.values.length > 0);
        if (validOptions.length === 0) {
            setVariants([]);
            return;
        }

        // Cartesian product generator
        const cartesian = (arrays: any[]): any[] => {
            return arrays.reduce((a, b) => a.flatMap((d: any) => b.map((e: any) => [d, e].flat())));
        };

        const valueLists = validOptions.map(o => o.values);
        let combos = cartesian(valueLists);

        // Handle single option edge case where cartesian returns flat array instead of array of arrays
        if (validOptions.length === 1) {
            combos = validOptions[0].values.map(v => [v]);
        }

        const newVariants: VariantPayload[] = combos.map(combo => {
            const attrObj: Record<string, string> = {};
            validOptions.forEach((opt, idx) => {
                attrObj[opt.name] = combo[idx];
            });
            const suffix = combo.join('-');
            return {
                variantName: combo.join(' / '),
                sku: baseSku ? `${baseSku}-${suffix}` : suffix,
                costPrice: baseCost || '0',
                salePrice: basePrice || '0',
                stock: baseStock || '0',
                images: '',
                attributes: attrObj
            };
        });

        setVariants(newVariants);
        toast.success(`Generated ${newVariants.length} combinations!`);
    };

    const updateVariant = (index: number, field: keyof VariantPayload, val: string) => {
        const newV = [...variants];
        newV[index] = { ...newV[index], [field]: val };
        setVariants(newV);
    };

    const handleFileUpload = async (file: File, isMaster: boolean, variantIndex?: number) => {
        if (!file) return;

        if (isMaster) setIsUploadingMaster(true);
        else if (variantIndex !== undefined) setUploadingVariantIdx(variantIndex);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok && data.url) {
                if (isMaster) {
                    setImages(data.url);
                } else if (variantIndex !== undefined) {
                    updateVariant(variantIndex, 'images', data.url);
                }
                toast.success('Image uploaded to Cloud Server');
            } else {
                toast.error(data.error || 'Upload failed');
            }
        } catch (error) {
            toast.error('Network error during upload');
        } finally {
            if (isMaster) setIsUploadingMaster(false);
            else setUploadingVariantIdx(null);
        }
    };

    const handleDeploy = async () => {
        if (!name) return toast.error("Master Product Name is required");
        setIsSaving(true);

        const payload = {
            name,
            description,
            sku: baseSku,
            costPrice: baseCost,
            salePrice: basePrice,
            stock: baseStock,
            images,
            variants: hasVariants ? variants : []
        };

        try {
            const res = await fetch('/api/oms/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Product deployed perfectly across all active warehouses!');
                router.push('/oms/products');
            } else {
                toast.error(data.error || 'Failed to deploy product');
            }
        } catch (error) {
            toast.error('Network error during deployment');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-32">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition">
                    <ArrowLeftIcon className="w-6 h-6 text-gray-500" />
                </button>
                <div>
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Product Studio
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Design Master Products and construct Variant Matrices</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                {/* Section 1: Base Details */}
                <div className="p-8 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><TagIcon className="w-6 h-6" /></div>
                        <h2 className="text-xl font-bold text-gray-800">1. Master Identity</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Master Name *</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Signature T-Shirt" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                        </div>
                        <div className="col-span-full">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                        </div>
                        <div className="col-span-full">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Master Product Image</label>

                            <div className="flex items-center gap-4">
                                {images ? (
                                    <div className="relative group">
                                        <img src={images} alt="Master" className="w-24 h-24 object-cover rounded-2xl border border-gray-200 shadow-sm" />
                                        <button onClick={() => setImages('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition scale-0 group-hover:scale-100">
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                        {isUploadingMaster ? <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <PhotoIcon className="w-8 h-8 text-gray-400" />}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <label className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-sm">
                                        <CloudArrowUpIcon className="w-5 h-5 text-blue-500" />
                                        {isUploadingMaster ? 'Uploading to Cloud...' : 'Upload Image (Cloudinary)'}
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0], true);
                                        }} disabled={isUploadingMaster} />
                                    </label>
                                    <p className="text-xs text-gray-400 mt-2 ml-1">Supports JPG, PNG, WEBP. Max 5MB automatically compressed by Cloudinary Engine.</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Base SKU / Prefix</label>
                            <input type="text" value={baseSku} onChange={e => setBaseSku(e.target.value)} placeholder="e.g. TS001" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition uppercase" />
                        </div>
                        {!hasVariants && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Initial Stock (Main Warehouse)</label>
                                    <input type="number" value={baseStock} onChange={e => setBaseStock(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Base Cost (฿)</label>
                                    <input type="number" value={baseCost} onChange={e => setBaseCost(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sale Price (฿)</label>
                                    <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Section 2: Variant Generator */}
                <div className="p-8 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><SquaresPlusIcon className="w-6 h-6" /></div>
                            <h2 className="text-xl font-bold text-gray-800">2. Variant Architecture</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">Enable Variations</span>
                            <button
                                onClick={() => {
                                    setHasVariants(!hasVariants);
                                    if (hasVariants) setVariants([]);
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasVariants ? 'bg-indigo-600' : 'bg-gray-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasVariants ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    {hasVariants && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                            {/* Options Setup */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                {options.map((opt, i) => (
                                    <div key={i} className="flex gap-4 items-start">
                                        <div className="w-1/3">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Option Name</label>
                                            <input type="text" value={opt.name} onChange={e => handleOptionNameChange(i, e.target.value)} placeholder="e.g. Size, Color" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Comma-separated Values</label>
                                            <div className="flex gap-2">
                                                <input type="text" defaultValue={opt.values.join(', ')} onBlur={e => handleOptionValuesChange(i, e.target.value)} placeholder="e.g. S, M, L, XL" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                <button onClick={() => handleRemoveOption(i)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition shrink-0"><TrashIcon className="w-5 h-5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-2">
                                    <button onClick={handleAddOption} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition">+ Add another option</button>
                                    <button onClick={generateCombinations} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition font-medium shadow-md">
                                        <SparklesIcon className="w-4 h-4 text-amber-300" /> Auto-Generate Engine
                                    </button>
                                </div>
                            </div>

                            {/* The Matrix */}
                            {variants.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-100">
                                                <tr>
                                                    <th className="px-5 py-4">Variant Permutation</th>
                                                    <th className="px-4 py-4 w-32">Image URL (Optional)</th>
                                                    <th className="px-4 py-4 w-40">Explicit SKU</th>
                                                    <th className="px-4 py-4 w-28">Cost (฿)</th>
                                                    <th className="px-4 py-4 w-28">Price (฿)</th>
                                                    <th className="px-4 py-4 w-28 text-center">Initial Stock</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {variants.map((v, i) => (
                                                    <tr key={i} className="hover:bg-gray-50/50">
                                                        <td className="px-5 py-3 font-medium text-gray-900">{v.variantName}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                {v.images ? (
                                                                    <div className="relative group shrink-0">
                                                                        <img src={v.images} alt="Variant" className="w-8 h-8 object-cover rounded-lg border border-gray-200" />
                                                                        <button onClick={() => updateVariant(i, 'images', '')} className="absolute -top-1 -right-1 bg-white border border-gray-200 text-red-500 rounded-full shadow hover:text-red-700 scale-0 group-hover:scale-100 transition">
                                                                            <XMarkIcon className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <label className="flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 transition cursor-pointer text-gray-400 hover:text-blue-500">
                                                                        {uploadingVariantIdx === i ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <PlusIcon className="w-4 h-4" />}
                                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                                            if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0], false, i);
                                                                        }} />
                                                                    </label>
                                                                )}
                                                                {!v.images && <span className="text-[10px] text-gray-400 italic">Inherit</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3"><input type="text" value={v.sku} onChange={e => updateVariant(i, 'sku', e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500" /></td>
                                                        <td className="px-4 py-3"><input type="number" value={v.costPrice} onChange={e => updateVariant(i, 'costPrice', e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500" /></td>
                                                        <td className="px-4 py-3"><input type="number" value={v.salePrice} onChange={e => updateVariant(i, 'salePrice', e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500" /></td>
                                                        <td className="px-4 py-3"><input type="number" value={v.stock} onChange={e => updateVariant(i, 'stock', e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center font-bold bg-amber-50" /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Deployment Console */}
            <div className="fixed bottom-0 left-64 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 flex justify-end gap-4 z-40">
                <button onClick={() => router.back()} className="px-6 py-3 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition">Cancel Revision</button>
                <button
                    disabled={isSaving}
                    onClick={handleDeploy}
                    className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-70"
                >
                    {isSaving ? 'Packaging Logistics...' : 'Deploy to Master Catalog'}
                </button>
            </div>
        </div>
    );
}
