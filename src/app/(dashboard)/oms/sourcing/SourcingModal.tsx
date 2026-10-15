'use client';
import { useState, useEffect, useMemo } from 'react';
import {
    XMarkIcon,
    ArrowTopRightOnSquareIcon,
    PhotoIcon,
    SparklesIcon,
    CheckCircleIcon,
    CalculatorIcon,
    TruckIcon,
    ShoppingBagIcon,
    TagIcon,
    Cog6ToothIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
    calculateLandedCost,
    CostCalculationResult,
    SourcingConfigData,
    DEFAULT_SOURCING_CONFIG,
    ShippingChannel,
    ShippingCalcMethod
} from '@/lib/sourcingCost';
import { toast } from 'react-hot-toast';

interface SourcingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    initialData?: any;
    brandId?: string | null;
    backendConfig?: SourcingConfigData | null;
    onOpenSettings?: () => void;
}

export default function SourcingModal({
    isOpen,
    onClose,
    onSaved,
    initialData,
    brandId,
    backendConfig,
    onOpenSettings
}: SourcingModalProps) {
    const isEdit = Boolean(initialData?.id);
    const activeConfig = backendConfig || DEFAULT_SOURCING_CONFIG;

    // Product Basic Info
    const [title, setTitle] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [sourcePlatform, setSourcePlatform] = useState('1688');
    const [imageUrl, setImageUrl] = useState('');
    const [category, setCategory] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [supplierContact, setSupplierContact] = useState('');
    const [notes, setNotes] = useState('');
    const [stage, setStage] = useState('IDEA');
    const [priority, setPriority] = useState('MEDIUM');

    // Cost Breakdown Inputs
    const [foreignCurrency, setForeignCurrency] = useState('RMB');
    const [foreignPrice, setForeignPrice] = useState<number | string>(0);
    const [foreignDomesticShipping, setForeignDomesticShipping] = useState<number | string>(0);
    const [exchangeRate, setExchangeRate] = useState<number | string>(activeConfig.rmbExchangeRate);

    // Weight & Dimensions
    const [shippingMethod, setShippingMethod] = useState<ShippingCalcMethod>('WEIGHT');
    const [selectedChannel, setSelectedChannel] = useState<ShippingChannel>('TRUCK');
    const [weightKg, setWeightKg] = useState<number | string>(0.4);
    const [lengthCm, setLengthCm] = useState<number | string>(0);
    const [widthCm, setWidthCm] = useState<number | string>(0);
    const [heightCm, setHeightCm] = useState<number | string>(0);
    const [cbm, setCbm] = useState<number | string>(0);

    // Multi-Channel Freight Rates (Truck / Sea / Air)
    const [truckRatePerKg, setTruckRatePerKg] = useState<number | string>(activeConfig.truckRatePerKg);
    const [truckRatePerCbm, setTruckRatePerCbm] = useState<number | string>(activeConfig.truckRatePerCbm);
    const [seaRatePerKg, setSeaRatePerKg] = useState<number | string>(activeConfig.seaRatePerKg);
    const [seaRatePerCbm, setSeaRatePerCbm] = useState<number | string>(activeConfig.seaRatePerCbm);
    const [airRatePerKg, setAirRatePerKg] = useState<number | string>(activeConfig.airRatePerKg);
    const [airRatePerCbm, setAirRatePerCbm] = useState<number | string>(activeConfig.airRatePerCbm);

    // Local & Platform Costs
    const [importDutyRate, setImportDutyRate] = useState<number | string>(activeConfig.defaultImportDutyRate);
    const [packagingCost, setPackagingCost] = useState<number | string>(activeConfig.defaultPackagingCost);
    const [localShippingCost, setLocalShippingCost] = useState<number | string>(activeConfig.defaultLocalShippingCost);
    const [platformFeePercent, setPlatformFeePercent] = useState<number | string>(activeConfig.defaultPlatformFeePercent);
    const [adSpendPerUnit, setAdSpendPerUnit] = useState<number | string>(activeConfig.defaultAdSpendPerUnit);
    const [targetSellingPrice, setTargetSellingPrice] = useState<number | string>(390);

    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExtractingUrl, setIsExtractingUrl] = useState(false);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [extractWarning, setExtractWarning] = useState<string | null>(null);
    const [showAiAssistBox, setShowAiAssistBox] = useState(false);
    const [rawPasteText, setRawPasteText] = useState('');

    // Initialize form on open
    useEffect(() => {
        if (!isOpen) return;
        setGalleryImages([]);
        setExtractWarning(null);
        setShowAiAssistBox(false);
        setRawPasteText('');

        if (initialData) {
            setTitle(initialData.title || '');
            setSourceUrl(initialData.sourceUrl || '');
            setSourcePlatform(initialData.sourcePlatform || '1688');
            setImageUrl(initialData.imageUrl || '');
            setCategory(initialData.category || '');
            setSupplierName(initialData.supplierName || '');
            setSupplierContact(initialData.supplierContact || '');
            setNotes(initialData.notes || '');
            setStage(initialData.stage || 'IDEA');
            setPriority(initialData.priority || 'MEDIUM');

            setForeignCurrency(initialData.foreignCurrency || 'RMB');
            setForeignPrice(initialData.foreignPrice ?? 0);
            setForeignDomesticShipping(initialData.foreignDomesticShipping ?? 0);
            setExchangeRate(initialData.exchangeRate ?? activeConfig.rmbExchangeRate);
            setShippingMethod((initialData.shippingMethod as ShippingCalcMethod) || 'WEIGHT');
            setSelectedChannel((initialData.selectedChannel as ShippingChannel) || 'TRUCK');
            setWeightKg(initialData.weightKg ?? 0);
            setLengthCm(initialData.lengthCm ?? 0);
            setWidthCm(initialData.widthCm ?? 0);
            setHeightCm(initialData.heightCm ?? 0);
            setCbm(initialData.cbm ?? 0);

            setTruckRatePerKg(
                initialData.truckRatePerKg > 0
                    ? initialData.truckRatePerKg
                    : initialData.shippingRatePerKg > 0
                    ? initialData.shippingRatePerKg
                    : activeConfig.truckRatePerKg
            );
            setTruckRatePerCbm(
                initialData.truckRatePerCbm > 0
                    ? initialData.truckRatePerCbm
                    : initialData.shippingRatePerCbm > 0
                    ? initialData.shippingRatePerCbm
                    : activeConfig.truckRatePerCbm
            );
            setSeaRatePerKg(initialData.seaRatePerKg > 0 ? initialData.seaRatePerKg : activeConfig.seaRatePerKg);
            setSeaRatePerCbm(initialData.seaRatePerCbm > 0 ? initialData.seaRatePerCbm : activeConfig.seaRatePerCbm);
            setAirRatePerKg(initialData.airRatePerKg > 0 ? initialData.airRatePerKg : activeConfig.airRatePerKg);
            setAirRatePerCbm(initialData.airRatePerCbm > 0 ? initialData.airRatePerCbm : activeConfig.airRatePerCbm);

            setImportDutyRate(initialData.importDutyRate ?? activeConfig.defaultImportDutyRate);
            setPackagingCost(initialData.packagingCost ?? activeConfig.defaultPackagingCost);
            setLocalShippingCost(initialData.localShippingCost ?? activeConfig.defaultLocalShippingCost);
            setPlatformFeePercent(initialData.platformFeePercent ?? activeConfig.defaultPlatformFeePercent);
            setAdSpendPerUnit(initialData.adSpendPerUnit ?? activeConfig.defaultAdSpendPerUnit);
            setTargetSellingPrice(initialData.targetSellingPrice ?? 0);
        } else {
            setTitle('');
            setSourceUrl('');
            setSourcePlatform('1688');
            setImageUrl('');
            setCategory('');
            setSupplierName('');
            setSupplierContact('');
            setNotes('');
            setStage('IDEA');
            setPriority('MEDIUM');

            setForeignCurrency('RMB');
            setForeignPrice(25);
            setForeignDomesticShipping(0);
            setExchangeRate(activeConfig.rmbExchangeRate);
            setShippingMethod('WEIGHT');
            setSelectedChannel('TRUCK');
            setWeightKg(0.4);
            setLengthCm(20);
            setWidthCm(15);
            setHeightCm(10);
            setCbm(0.003);

            setTruckRatePerKg(activeConfig.truckRatePerKg);
            setTruckRatePerCbm(activeConfig.truckRatePerCbm);
            setSeaRatePerKg(activeConfig.seaRatePerKg);
            setSeaRatePerCbm(activeConfig.seaRatePerCbm);
            setAirRatePerKg(activeConfig.airRatePerKg);
            setAirRatePerCbm(activeConfig.airRatePerCbm);

            setImportDutyRate(activeConfig.defaultImportDutyRate);
            setPackagingCost(activeConfig.defaultPackagingCost);
            setLocalShippingCost(activeConfig.defaultLocalShippingCost);
            setPlatformFeePercent(activeConfig.defaultPlatformFeePercent);
            setAdSpendPerUnit(activeConfig.defaultAdSpendPerUnit);
            setTargetSellingPrice(390);
        }
    }, [isOpen, initialData, activeConfig]);

    // Sync rates from backend config button
    const handleSyncFromBackendConfig = () => {
        setExchangeRate(foreignCurrency === 'USD' ? activeConfig.usdExchangeRate : activeConfig.rmbExchangeRate);
        setTruckRatePerKg(activeConfig.truckRatePerKg);
        setTruckRatePerCbm(activeConfig.truckRatePerCbm);
        setSeaRatePerKg(activeConfig.seaRatePerKg);
        setSeaRatePerCbm(activeConfig.seaRatePerCbm);
        setAirRatePerKg(activeConfig.airRatePerKg);
        setAirRatePerCbm(activeConfig.airRatePerCbm);
        setPackagingCost(activeConfig.defaultPackagingCost);
        setLocalShippingCost(activeConfig.defaultLocalShippingCost);
        setPlatformFeePercent(activeConfig.defaultPlatformFeePercent);
        setAdSpendPerUnit(activeConfig.defaultAdSpendPerUnit);
        setImportDutyRate(activeConfig.defaultImportDutyRate);
        toast.success('ดึงเรทต้นทุนมาตรฐานจากระบบหลังบ้านเรียบร้อย!');
    };

    // Auto calculate CBM when dimensions change
    const handleDimensionChange = (l: any, w: any, h: any) => {
        const len = parseFloat(l) || 0;
        const wid = parseFloat(w) || 0;
        const hei = parseFloat(h) || 0;
        if (len > 0 && wid > 0 && hei > 0) {
            const calc = Math.round(((len * wid * hei) / 1000000) * 10000) / 10000;
            setCbm(calc);
        }
    };

    // Auto-detect platform and currency from URL
    const handleUrlChange = (url: string) => {
        setSourceUrl(url);
        const lower = url.toLowerCase();
        if (lower.includes('1688.com')) {
            setSourcePlatform('1688');
            setForeignCurrency('RMB');
            setExchangeRate(activeConfig.rmbExchangeRate);
        } else if (lower.includes('amazon.com') || lower.includes('amazon.') || lower.includes('a.co/')) {
            setSourcePlatform('AMAZON');
            setForeignCurrency('USD');
            setExchangeRate(activeConfig.usdExchangeRate);
        } else if (lower.includes('taobao.com') || lower.includes('tmall.com') || lower.includes('tb.cn')) {
            setSourcePlatform('TAOBAO');
            setForeignCurrency('RMB');
            setExchangeRate(activeConfig.rmbExchangeRate);
        } else if (lower.includes('alibaba.com') || lower.includes('aliexpress.com')) {
            setSourcePlatform('ALIBABA');
            setForeignCurrency('USD');
            setExchangeRate(activeConfig.usdExchangeRate);
        }
    };

    // Fetch & Extract Product Info from URL, Share Text, or Screenshot
    const handleExtractProductInfo = async (opts?: {
        targetUrl?: string;
        rawText?: string;
        imageBase64?: string;
        imageMimeType?: string;
        uploadedImageUrl?: string;
    }) => {
        const urlToFetch = (opts?.targetUrl ?? sourceUrl).trim();
        const textToParse = (opts?.rawText ?? rawPasteText).trim();
        const imgBase64 = opts?.imageBase64 || '';

        if (!urlToFetch && !textToParse && !imgBase64) {
            toast.error('กรุณาวางลิงก์สินค้า หรือข้อความ/รูปแคปหน้าจอก่อนครับ');
            return;
        }

        setIsExtractingUrl(true);
        setExtractWarning(null);

        try {
            const res = await fetch('/api/oms/sourcing/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: urlToFetch,
                    rawText: textToParse,
                    imageBase64: imgBase64,
                    imageMimeType: opts?.imageMimeType || 'image/png'
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'ดึงข้อมูลจากลิงก์ไม่สำเร็จ');
            }

            if (data.sourceUrl && data.sourceUrl.startsWith('http')) {
                setSourceUrl(data.sourceUrl);
            }
            if (data.sourcePlatform) {
                setSourcePlatform(data.sourcePlatform);
            }
            if (data.foreignCurrency) {
                setForeignCurrency(data.foreignCurrency);
                setExchangeRate(
                    data.foreignCurrency === 'USD'
                        ? activeConfig.usdExchangeRate
                        : data.foreignCurrency === 'RMB'
                        ? activeConfig.rmbExchangeRate
                        : 1
                );
            }
            if (data.title) {
                setTitle(data.title);
            }
            if (Number(data.foreignPrice) > 0) {
                setForeignPrice(Number(data.foreignPrice));
            }
            if (opts?.uploadedImageUrl) {
                setImageUrl(opts.uploadedImageUrl);
            } else if (data.imageUrl) {
                setImageUrl(data.imageUrl);
            }
            if (Array.isArray(data.galleryImages) && data.galleryImages.length > 0) {
                setGalleryImages(data.galleryImages);
            }
            if (data.category) {
                setCategory(data.category);
            }
            if (data.supplierName) {
                setSupplierName(data.supplierName);
            }
            if (Number(data.weightKg) > 0) {
                setWeightKg(Number(data.weightKg));
            }
            if (Number(data.lengthCm) > 0 && Number(data.widthCm) > 0 && Number(data.heightCm) > 0) {
                setLengthCm(Number(data.lengthCm));
                setWidthCm(Number(data.widthCm));
                setHeightCm(Number(data.heightCm));
                handleDimensionChange(data.lengthCm, data.widthCm, data.heightCm);
            }
            if (data.notes) {
                setNotes(data.notes);
            }

            if (data.warningMessage) {
                setExtractWarning(data.warningMessage);
                setShowAiAssistBox(true);
                toast('เว็บต้นทางติดระบบป้องกันบอท (Captcha) — สามารถวางภาพแคปหน้าจอหรือข้อความให้ AI ดึงแทนได้ครับ', {
                    icon: '⚠️'
                });
            } else if (data.title || Number(data.foreignPrice) > 0 || data.imageUrl) {
                toast.success('ดึงข้อมูลสินค้า ราคา และรูปภาพสำเร็จ!');
            } else {
                setShowAiAssistBox(true);
                toast('ดึงข้อมูลบางส่วนแล้ว — หากเว็บติดล็อกอิน สามารถวางภาพแคปหน้าจอให้ AI อ่านได้ครับ', {
                    icon: '💡'
                });
            }
        } catch (err: any) {
            toast.error(err.message || 'ไม่สามารถดึงข้อมูลจากลิงก์ได้');
        } finally {
            setIsExtractingUrl(false);
        }
    };

    // Handle pasting a URL into the URL input box -> auto trigger extraction!
    const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (pastedText && (pastedText.includes('http://') || pastedText.includes('https://'))) {
            e.preventDefault();
            handleUrlChange(pastedText.trim());
            handleExtractProductInfo({ targetUrl: pastedText.trim() });
        }
    };

    // Handle pasting a screenshot image (Ctrl+V / Cmd+V) to extract product info via Gemini Vision
    const handleScreenshotPasteOrUpload = async (file: File) => {
        setIsExtractingUrl(true);
        setIsUploadingImage(true);
        try {
            // 1. Convert to base64 for Gemini Vision
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // 2. Upload image to Cloudinary in parallel so user gets a hosted image URL
            const formData = new FormData();
            formData.append('file', file);
            const uploadPromise = fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
                .then((r) => r.json())
                .catch(() => ({}));

            const uploadRes = await uploadPromise;
            const uploadedUrl = uploadRes?.url || '';

            await handleExtractProductInfo({
                targetUrl: sourceUrl,
                rawText: rawPasteText,
                imageBase64: base64,
                imageMimeType: file.type || 'image/png',
                uploadedImageUrl: !imageUrl ? uploadedUrl : undefined
            });
        } catch {
            toast.error('ไม่สามารถอ่านภาพแคปหน้าจอได้');
        } finally {
            setIsUploadingImage(false);
            setIsExtractingUrl(false);
        }
    };

    // Direct Image Upload via Cloudinary API
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.url) {
                setImageUrl(data.url);
                toast.success('อัปโหลดรูปภาพสำเร็จ!');
            } else {
                toast.error(data.error || 'อัปโหลดรูปภาพไม่สำเร็จ');
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        } finally {
            setIsUploadingImage(false);
        }
    };

    // Real-time Multi-Channel Cost Calculation
    const costResults: CostCalculationResult = useMemo(() => {
        return calculateLandedCost({
            foreignCurrency,
            foreignPrice: Number(foreignPrice),
            foreignDomesticShipping: Number(foreignDomesticShipping),
            exchangeRate: Number(exchangeRate),
            shippingMethod,
            selectedChannel,
            weightKg: Number(weightKg),
            lengthCm: Number(lengthCm),
            widthCm: Number(widthCm),
            heightCm: Number(heightCm),
            cbm: Number(cbm),
            truckRatePerKg: Number(truckRatePerKg),
            truckRatePerCbm: Number(truckRatePerCbm),
            seaRatePerKg: Number(seaRatePerKg),
            seaRatePerCbm: Number(seaRatePerCbm),
            airRatePerKg: Number(airRatePerKg),
            airRatePerCbm: Number(airRatePerCbm),
            importDutyRate: Number(importDutyRate),
            packagingCost: Number(packagingCost),
            localShippingCost: Number(localShippingCost),
            platformFeePercent: Number(platformFeePercent),
            adSpendPerUnit: Number(adSpendPerUnit),
            targetSellingPrice: Number(targetSellingPrice)
        });
    }, [
        foreignCurrency,
        foreignPrice,
        foreignDomesticShipping,
        exchangeRate,
        shippingMethod,
        selectedChannel,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        cbm,
        truckRatePerKg,
        truckRatePerCbm,
        seaRatePerKg,
        seaRatePerCbm,
        airRatePerKg,
        airRatePerCbm,
        importDutyRate,
        packagingCost,
        localShippingCost,
        platformFeePercent,
        adSpendPerUnit,
        targetSellingPrice
    ]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('กรุณาระบุชื่อสินค้า');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                title: title.trim(),
                sourceUrl: sourceUrl.trim() || null,
                sourcePlatform,
                imageUrl: imageUrl.trim() || null,
                category: category.trim() || null,
                supplierName: supplierName.trim() || null,
                supplierContact: supplierContact.trim() || null,
                notes: notes.trim() || null,
                stage,
                priority,
                foreignCurrency,
                foreignPrice: Number(foreignPrice) || 0,
                foreignDomesticShipping: Number(foreignDomesticShipping) || 0,
                exchangeRate: Number(exchangeRate) || 1,
                shippingMethod,
                selectedChannel,
                weightKg: Number(weightKg) || 0,
                lengthCm: Number(lengthCm) || 0,
                widthCm: Number(widthCm) || 0,
                heightCm: Number(heightCm) || 0,
                cbm: costResults.computedCbm,
                truckRatePerKg: Number(truckRatePerKg) || 0,
                truckRatePerCbm: Number(truckRatePerCbm) || 0,
                seaRatePerKg: Number(seaRatePerKg) || 0,
                seaRatePerCbm: Number(seaRatePerCbm) || 0,
                airRatePerKg: Number(airRatePerKg) || 0,
                airRatePerCbm: Number(airRatePerCbm) || 0,
                importDutyRate: Number(importDutyRate) || 0,
                packagingCost: Number(packagingCost) || 0,
                localShippingCost: Number(localShippingCost) || 0,
                platformFeePercent: Number(platformFeePercent) || 0,
                adSpendPerUnit: Number(adSpendPerUnit) || 0,
                targetSellingPrice: Number(targetSellingPrice) || 0,
                companyBrandId: brandId || null
            };

            const url = isEdit ? `/api/oms/sourcing/${initialData.id}` : '/api/oms/sourcing';
            const method = isEdit ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to save');
            }

            toast.success(isEdit ? 'อัปเดตข้อมูลและต้นทุนสินค้าเรียบร้อย!' : 'บันทึกสินค้าใหม่ลงไปป์ไลน์แล้ว!');
            onSaved();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'บันทึกข้อมูลไม่สำเร็จ');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const currencySymbol = foreignCurrency === 'USD' ? '$' : foreignCurrency === 'RMB' ? '¥' : '฿';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
            <div className="w-full max-w-7xl my-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[94vh]">
                {/* Modal Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-gradient-to-r from-gray-900 to-slate-900 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 text-xl font-black">
                            🎯
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black tracking-tight">
                                    {isEdit ? 'วิเคราะห์ต้นทุนทุกช่องทาง & แก้ไขสินค้า' : 'เพิ่มสินค้าพรีออเดอร์ & คำนวณต้นทุนขนส่ง (รถ/เรือ/แอร์)'}
                                </h2>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                                    {sourcePlatform}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">
                                แสดงเปรียบเทียบต้นทุนขนส่งทางรถ ทางเรือ ทางแอร์ และแจกแจงต้นทุนย่อยทุกตัวจากเรทหลังบ้าน
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                            <span className="text-xs text-gray-300 font-semibold">ขั้นตอน:</span>
                            <select
                                value={stage}
                                onChange={(e) => setStage(e.target.value)}
                                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                            >
                                <option value="IDEA" className="bg-gray-800 text-white">💡 1. ไอเดียใหม่</option>
                                <option value="COST_REVIEW" className="bg-gray-800 text-white">🧮 2. ตรวจสอบต้นทุน</option>
                                <option value="SAMPLE_TESTING" className="bg-gray-800 text-white">🔬 3. รอสั่งตัวอย่าง</option>
                                <option value="APPROVED" className="bg-gray-800 text-white">✅ 4. อนุมัติพร้อมเปิดพรี</option>
                                <option value="DROPPED" className="bg-gray-800 text-white">❌ 5. ปัดตก/ไม่เอา</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gray-50/60">
                    {/* LEFT COLUMN (Cols 1-4): Product Info */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <ShoppingBagIcon className="w-4 h-4 text-blue-600" />
                                    ข้อมูลสินค้า & ซัพพลายเออร์
                                </h3>
                            </div>

                            {/* Source URL & Auto-Fetch */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                                    <span>ลิงก์สินค้าต้นทาง (1688 / Amazon)</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowAiAssistBox((v) => !v)}
                                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                                    >
                                        {showAiAssistBox ? 'ซ่อนตัวช่วยแคปจอ AI' : '📸 เว็บติดล็อกอิน? วางแคปจอ/ข้อความ'}
                                    </button>
                                </label>
                                <div className="flex gap-1.5">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={sourceUrl}
                                            onChange={(e) => handleUrlChange(e.target.value)}
                                            onPaste={handleUrlPaste}
                                            placeholder="วางลิงก์ 1688, Amazon, Taobao เพื่อดึงราคา+รูปอัตโนมัติ..."
                                            className="w-full pl-3 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 font-mono text-gray-900"
                                        />
                                        {sourceUrl && (
                                            <a
                                                href={sourceUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-blue-600"
                                                title="เปิดลิงก์ต้นทาง"
                                            >
                                                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isExtractingUrl || (!sourceUrl && !rawPasteText)}
                                        onClick={() => handleExtractProductInfo()}
                                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer transition-all"
                                        title="ดึงชื่อสินค้า ราคา และรูปภาพจากลิงก์อัตโนมัติ"
                                    >
                                        {isExtractingUrl ? (
                                            <>
                                                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                                <span>กำลังดึง...</span>
                                            </>
                                        ) : (
                                            <>
                                                <SparklesIcon className="w-3.5 h-3.5" />
                                                <span>ดึงข้อมูลเว็บ</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-500">
                                    💡 วางลิงก์เพื่อดึง <b>ชื่อสินค้า (แปลไทย), ราคาต้นทาง, รูปภาพ และน้ำหนัก</b> อัตโนมัติ
                                </p>

                                {extractWarning && (
                                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                                        ⚠️ {extractWarning}
                                    </div>
                                )}

                                {showAiAssistBox && (
                                    <div
                                        onPaste={(e) => {
                                            const items = e.clipboardData?.items;
                                            if (items) {
                                                for (const item of Array.from(items)) {
                                                    if (item.type.startsWith('image/')) {
                                                        const file = item.getAsFile();
                                                        if (file) {
                                                            e.preventDefault();
                                                            handleScreenshotPasteOrUpload(file);
                                                            return;
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                        className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black text-indigo-950">
                                                🤖 AI ดึงข้อมูลจากภาพแคปหน้าจอ / ข้อความหน้าเว็บ (แก้ปัญหา 1688 ติดล็อกอิน)
                                            </span>
                                            <label className="cursor-pointer px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold">
                                                📸 เลือกรูปแคปจอ
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0];
                                                        if (f) handleScreenshotPasteOrUpload(f);
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        <textarea
                                            value={rawPasteText}
                                            onChange={(e) => setRawPasteText(e.target.value)}
                                            rows={2}
                                            placeholder="คลิกช่องนี้แล้วกด Ctrl+V (หรือ Cmd+V) เพื่อวาง 'ภาพแคปหน้าจอ 1688' หรือวางข้อความที่ก๊อปมาจากหน้าสินค้า..."
                                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg text-gray-800 focus:outline-none focus:border-indigo-500"
                                        />
                                        {rawPasteText && (
                                            <button
                                                type="button"
                                                disabled={isExtractingUrl}
                                                onClick={() => handleExtractProductInfo({ rawText: rawPasteText })}
                                                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                                            >
                                                ✨ ให้ AI สกัดราคา + แปลชื่อสินค้าจากข้อความนี้
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Platform & Priority */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">แพลตฟอร์ม</label>
                                    <select
                                        value={sourcePlatform}
                                        onChange={(e) => setSourcePlatform(e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                                    >
                                        <option value="1688">🟠 1688.com (จีน)</option>
                                        <option value="AMAZON">🟡 Amazon (US)</option>
                                        <option value="TAOBAO">🔴 Taobao / Tmall</option>
                                        <option value="ALIBABA">🟧 Alibaba Global</option>
                                        <option value="OTHER">⚪ อื่นๆ (Other)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">ความน่าสนใจ</label>
                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                                    >
                                        <option value="LOW">🔵 ต่ำ (Low)</option>
                                        <option value="MEDIUM">🟢 ปานกลาง (Medium)</option>
                                        <option value="HIGH">🟡 สูง (High)</option>
                                        <option value="URGENT">🔥 ด่วนพิเศษ (Urgent)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Product Title */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    ชื่อสินค้า <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="ระบุชื่อสินค้าพรีออเดอร์..."
                                    className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                />
                            </div>

                            {/* Category & Supplier */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">หมวดหมู่</label>
                                    <input
                                        type="text"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        placeholder="เช่น ของแต่งบ้าน"
                                        className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อร้าน/โรงงาน</label>
                                    <input
                                        type="text"
                                        value={supplierName}
                                        onChange={(e) => setSupplierName(e.target.value)}
                                        placeholder="ชื่อซัพพลายเออร์"
                                        className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                                    />
                                </div>
                            </div>

                            {/* Supplier Contact */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">ช่องทางติดต่อซัพพลายเออร์</label>
                                <input
                                    type="text"
                                    value={supplierContact}
                                    onChange={(e) => setSupplierContact(e.target.value)}
                                    placeholder="WeChat ID, WhatsApp, เบอร์โทร"
                                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                                />
                            </div>

                            {/* Product Image */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                                    <span>รูปภาพสินค้า</span>
                                    {isUploadingImage && <span className="text-[10px] text-blue-600 animate-pulse font-bold">กำลังอัปโหลด...</span>}
                                </label>
                                <div className="flex gap-3 items-start">
                                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt="preview"
                                                referrerPolicy="no-referrer"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <PhotoIcon className="w-6 h-6 text-gray-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <input
                                            type="url"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            placeholder="วางลิงก์รูปภาพ หรืออัปโหลด..."
                                            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800"
                                        />
                                        <div className="flex items-center gap-2">
                                            <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold">
                                                <span>📁 อัปโหลดรูป</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                    disabled={isUploadingImage}
                                                />
                                            </label>
                                            {imageUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setImageUrl('')}
                                                    className="text-[11px] text-rose-500 font-bold"
                                                >
                                                    ล้างรูป
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {galleryImages.length > 1 && (
                                    <div className="pt-1">
                                        <span className="block text-[10px] font-bold text-gray-500 mb-1">
                                            รูปที่ดึงได้จากหน้าเว็บ (คลิกเพื่อเลือกรูปหลัก):
                                        </span>
                                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                                            {galleryImages.map((img, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setImageUrl(img)}
                                                    className={`w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                                                        imageUrl === img
                                                            ? 'border-blue-600 ring-2 ring-blue-200'
                                                            : 'border-gray-200 opacity-75 hover:opacity-100'
                                                    }`}
                                                >
                                                    <img
                                                        src={img}
                                                        alt={`thumb-${idx}`}
                                                        referrerPolicy="no-referrer"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">บันทึกสเปก / หมายเหตุ</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="เช่น MOQ ขั้นต่ำ 10 ชิ้น, มี 3 สี, แพ็คเกจกล่องแข็ง..."
                                    rows={2}
                                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (Cols 5-12): Multi-Channel Freight & Full Cost Calculator */}
                    <div className="lg:col-span-8 space-y-4">
                        {/* Top Bar: Sync Backend Rates */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                        <CalculatorIcon className="w-5 h-5 text-emerald-600" />
                                        คำนวณต้นทุนสินค้า & เปรียบเทียบขนส่งทุกช่องทาง (ส่งรถ / ส่งเรือ / ส่งแอร์)
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        ดึงเรทต้นทุนจริงจากตั้งค่าหลังบ้านอัตโนมัติ (RMB @{activeConfig.rmbExchangeRate} | รถ ฿{activeConfig.truckRatePerKg}/kg | เรือ ฿{activeConfig.seaRatePerKg}/kg | แอร์ ฿{activeConfig.airRatePerKg}/kg)
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSyncFromBackendConfig}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition-colors"
                                    >
                                        <ArrowPathIcon className="w-3.5 h-3.5" />
                                        <span>ดึงเรทหลังบ้านล่าสุด</span>
                                    </button>
                                    {onOpenSettings && (
                                        <button
                                            type="button"
                                            onClick={onOpenSettings}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl border border-gray-200 transition-colors"
                                        >
                                            <Cog6ToothIcon className="w-3.5 h-3.5" />
                                            <span>ตั้งค่าเรทหลังบ้าน</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Part 1: Foreign Product Price + Weight & Dimensions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Foreign Cost Box */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-slate-800">
                                            🌏 1. ต้นทุนสินค้า & ค่าส่งในประเทศต้นทาง
                                        </span>
                                        <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                                            รวม ฿{costResults.foreignBaseTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 mb-1">สกุลเงินต้นทาง</label>
                                            <select
                                                value={foreignCurrency}
                                                onChange={(e) => {
                                                    const curr = e.target.value;
                                                    setForeignCurrency(curr);
                                                    if (curr === 'RMB') setExchangeRate(activeConfig.rmbExchangeRate);
                                                    if (curr === 'USD') setExchangeRate(activeConfig.usdExchangeRate);
                                                    if (curr === 'THB') setExchangeRate(1.0);
                                                }}
                                                className="w-full px-2.5 py-1.5 text-xs font-black bg-white border border-gray-200 rounded-xl text-gray-900"
                                            >
                                                <option value="RMB">🇨🇳 RMB (หยวน ¥)</option>
                                                <option value="USD">🇺🇸 USD (ดอลลาร์ $)</option>
                                                <option value="THB">🇹🇭 THB (บาท ฿)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 mb-1">เรทแลกเปลี่ยน (฿)</label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={exchangeRate}
                                                onChange={(e) => setExchangeRate(e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-xs font-black bg-white border border-gray-200 rounded-xl text-blue-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 mb-1">
                                                ราคาสินค้า ({currencySymbol})
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={foreignPrice}
                                                onChange={(e) => setForeignPrice(e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-xs font-black bg-white border border-gray-200 rounded-xl text-gray-900"
                                            />
                                            <span className="text-[10px] text-gray-500">
                                                = ฿{costResults.productCostTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 mb-1">
                                                ค่าส่งในจีน/ตปท. ({currencySymbol})
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={foreignDomesticShipping}
                                                onChange={(e) => setForeignDomesticShipping(e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-900"
                                            />
                                            <span className="text-[10px] text-gray-500">
                                                = ฿{costResults.domesticShippingTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Weight & CBM Box */}
                                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-sky-950">
                                            ⚖️ 2. น้ำหนัก & ขนาดกล่อง (ใช้คำนวณค่ารถ/เรือ/แอร์)
                                        </span>
                                        <select
                                            value={shippingMethod}
                                            onChange={(e) => setShippingMethod(e.target.value as ShippingCalcMethod)}
                                            className="px-2 py-1 text-[11px] font-bold bg-white border border-sky-300 rounded-lg text-sky-900"
                                        >
                                            <option value="WEIGHT">คิดตามน้ำหนัก (กก.)</option>
                                            <option value="CBM">คิดตามคิว (CBM)</option>
                                            <option value="ACTUAL_MAX">คิดตามจริง (กก. vs คิว อันไหนแพงกว่า)</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                                น้ำหนักต่อชิ้น (kg)
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={weightKg}
                                                onChange={(e) => setWeightKg(e.target.value)}
                                                placeholder="เช่น 0.45"
                                                className="w-full px-2.5 py-1.5 text-xs font-black bg-white border border-sky-200 rounded-xl text-gray-900"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                                ปริมาตรต่อชิ้น (CBM คิว)
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={cbm}
                                                onChange={(e) => setCbm(e.target.value)}
                                                placeholder="0.003"
                                                className="w-full px-2.5 py-1.5 text-xs font-black bg-white border border-sky-200 rounded-xl text-sky-900"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1">
                                            หรือใส่ขนาดกล่อง กว้าง × ยาว × สูง (ซม.) เพื่อคำนวณคิว CBM อัตโนมัติ:
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <input
                                                type="number"
                                                step="any"
                                                value={lengthCm}
                                                onChange={(e) => {
                                                    setLengthCm(e.target.value);
                                                    handleDimensionChange(e.target.value, widthCm, heightCm);
                                                }}
                                                placeholder="ยาว (cm)"
                                                className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg text-gray-900"
                                            />
                                            <input
                                                type="number"
                                                step="any"
                                                value={widthCm}
                                                onChange={(e) => {
                                                    setWidthCm(e.target.value);
                                                    handleDimensionChange(lengthCm, e.target.value, heightCm);
                                                }}
                                                placeholder="กว้าง (cm)"
                                                className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg text-gray-900"
                                            />
                                            <input
                                                type="number"
                                                step="any"
                                                value={heightCm}
                                                onChange={(e) => {
                                                    setHeightCm(e.target.value);
                                                    handleDimensionChange(lengthCm, widthCm, e.target.value);
                                                }}
                                                placeholder="สูง (cm)"
                                                className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg text-gray-900"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Part 2: Side-by-Side Comparison of ALL Shipping Channels (Truck vs Sea vs Air) */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                                        <TruckIcon className="w-4 h-4 text-blue-600" />
                                        3. ตารางเปรียบเทียบต้นทุนขนส่งทุกช่องทาง (ส่งทางรถ vs ส่งทางเรือ vs ส่งทางแอร์)
                                    </h4>
                                    <span className="text-[11px] text-gray-500 font-semibold">
                                        คลิกที่การ์ดเพื่อเลือกเป็นช่องทางขนส่งหลักของสินค้านี้
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                    {/* TRUCK CARD */}
                                    {(() => {
                                        const ch = costResults.channels.truck;
                                        const isSelected = selectedChannel === 'TRUCK';
                                        return (
                                            <div
                                                onClick={() => setSelectedChannel('TRUCK')}
                                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                                                    isSelected
                                                        ? 'bg-sky-50/90 border-sky-600 shadow-md ring-2 ring-sky-500/20'
                                                        : 'bg-white border-gray-200 hover:border-sky-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-black text-sky-950 flex items-center gap-1">
                                                        🚛 ส่งทางรถ (Truck)
                                                    </span>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                        isSelected ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {isSelected ? '✓ เลือกใช้เป็นหลัก' : activeConfig.truckLeadTime}
                                                    </span>
                                                </div>

                                                {/* Editable Rates for this item */}
                                                <div className="grid grid-cols-2 gap-1.5 mb-2.5 bg-white/80 p-2 rounded-xl border border-sky-100" onClick={(e) => e.stopPropagation()}>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-gray-500">เรท ฿/กก.</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={truckRatePerKg}
                                                            onChange={(e) => setTruckRatePerKg(e.target.value)}
                                                            className="w-full px-1.5 py-0.5 text-xs font-black text-gray-900 bg-gray-50 border border-gray-200 rounded"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-gray-500">เรท ฿/คิว</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={truckRatePerCbm}
                                                            onChange={(e) => setTruckRatePerCbm(e.target.value)}
                                                            className="w-full px-1.5 py-0.5 text-xs font-black text-gray-900 bg-gray-50 border border-gray-200 rounded"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between text-[11px] text-gray-500">
                                                        <span>คิดตาม กก. / คิว:</span>
                                                        <span>฿{ch.shippingByWeightTHB} / ฿{ch.shippingByCbmTHB}</span>
                                                    </div>
                                                    <div className="flex justify-between font-bold text-sky-900 bg-sky-100/70 px-2 py-1 rounded-lg">
                                                        <span>ค่าขนส่งทางรถ:</span>
                                                        <span>฿{ch.shippingTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-700 pt-1">
                                                        <span>ต้นทุนถึงไทย (Landed):</span>
                                                        <span className="font-bold">฿{ch.landedCostTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-700">
                                                        <span>ต้นทุนรวมสุทธิ (Total):</span>
                                                        <span className="font-black text-gray-900">฿{ch.totalCostTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="pt-1.5 mt-1.5 border-t border-sky-200/70 flex items-center justify-between">
                                                        <span className="font-bold text-gray-700">กำไรส่งรถ:</span>
                                                        <div className="text-right">
                                                            <span className={`font-black block ${ch.profitTHB >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {ch.profitTHB >= 0 ? '+' : ''}฿{ch.profitTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-gray-500">
                                                                ({ch.marginPercent.toFixed(1)}% Margin)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* SEA CARD */}
                                    {(() => {
                                        const ch = costResults.channels.sea;
                                        const isSelected = selectedChannel === 'SEA';
                                        return (
                                            <div
                                                onClick={() => setSelectedChannel('SEA')}
                                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                                                    isSelected
                                                        ? 'bg-teal-50/90 border-teal-600 shadow-md ring-2 ring-teal-500/20'
                                                        : 'bg-white border-gray-200 hover:border-teal-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-black text-teal-950 flex items-center gap-1">
                                                        🚢 ส่งทางเรือ (Sea)
                                                    </span>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                        isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {isSelected ? '✓ เลือกใช้เป็นหลัก' : activeConfig.seaLeadTime}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-1.5 mb-2.5 bg-white/80 p-2 rounded-xl border border-teal-100" onClick={(e) => e.stopPropagation()}>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-gray-500">เรท ฿/กก.</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={seaRatePerKg}
                                                            onChange={(e) => setSeaRatePerKg(e.target.value)}
                                                            className="w-full px-1.5 py-0.5 text-xs font-black text-gray-900 bg-gray-50 border border-gray-200 rounded"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-gray-500">เรท ฿/คิว</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={seaRatePerCbm}
                                                            onChange={(e) => setSeaRatePerCbm(e.target.value)}
                                                            className="w-full px-1.5 py-0.5 text-xs font-black text-gray-900 bg-gray-50 border border-gray-200 rounded"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between text-[11px] text-gray-500">
                                                        <span>คิดตาม กก. / คิว:</span>
                                                        <span>฿{ch.shippingByWeightTHB} / ฿{ch.shippingByCbmTHB}</span>
                                                    </div>
                                                    <div className="flex justify-between font-bold text-teal-900 bg-teal-100/70 px-2 py-1 rounded-lg">
                                                        <span>ค่าขนส่งทางเรือ:</span>
                                                        <span>฿{ch.shippingTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-700 pt-1">
                                                        <span>ต้นทุนถึงไทย (Landed):</span>
                                                        <span className="font-bold">฿{ch.landedCostTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-700">
                                                        <span>ต้นทุนรวมสุทธิ (Total):</span>
                                                        <span className="font-black text-gray-900">฿{ch.totalCostTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="pt-1.5 mt-1.5 border-t border-teal-200/70 flex items-center justify-between">
                                                        <span className="font-bold text-gray-700">กำไรส่งเรือ:</span>
                                                        <div className="text-right">
                                                            <span className={`font-black block ${ch.profitTHB >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {ch.profitTHB >= 0 ? '+' : ''}฿{ch.profitTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-gray-500">
                                                                ({ch.marginPercent.toFixed(1)}% Margin)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* AIR CARD */}
                                    {(() => {
                                        const ch = costResults.channels.air;
                                        const isSelected = selectedChannel === 'AIR';
                                        return (
                                            <div
                                                onClick={() => setSelectedChannel('AIR')}
                                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                                                    isSelected
                                                        ? 'bg-violet-50/90 border-violet-600 shadow-md ring-2 ring-violet-500/20'
                                                        : 'bg-white border-gray-200 hover:border-violet-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-black text-violet-950 flex items-center gap-1">
                                                        ✈️ ส่งทางแอร์ (Air)
                                                    </span>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                        isSelected ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {isSelected ? '✓ เลือกใช้เป็นหลัก' : activeConfig.airLeadTime}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-1.5 mb-2.5 bg-white/80 p-2 rounded-xl border border-violet-100" onClick={(e) => e.stopPropagation()}>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-gray-500">เรท ฿/กก.</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={airRatePerKg}
                                                            onChange={(e) => setAirRatePerKg(e.target.value)}
                                                            className="w-full px-1.5 py-0.5 text-xs font-black text-gray-900 bg-gray-50 border border-gray-200 rounded"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-gray-500">เรท ฿/คิว</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={airRatePerCbm}
                                                            onChange={(e) => setAirRatePerCbm(e.target.value)}
                                                            className="w-full px-1.5 py-0.5 text-xs font-black text-gray-900 bg-gray-50 border border-gray-200 rounded"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between text-[11px] text-gray-500">
                                                        <span>คิดตาม กก. / คิว:</span>
                                                        <span>฿{ch.shippingByWeightTHB} / ฿{ch.shippingByCbmTHB}</span>
                                                    </div>
                                                    <div className="flex justify-between font-bold text-violet-900 bg-violet-100/70 px-2 py-1 rounded-lg">
                                                        <span>ค่าขนส่งทางแอร์:</span>
                                                        <span>฿{ch.shippingTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-700 pt-1">
                                                        <span>ต้นทุนถึงไทย (Landed):</span>
                                                        <span className="font-bold">฿{ch.landedCostTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-700">
                                                        <span>ต้นทุนรวมสุทธิ (Total):</span>
                                                        <span className="font-black text-gray-900">฿{ch.totalCostTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="pt-1.5 mt-1.5 border-t border-violet-200/70 flex items-center justify-between">
                                                        <span className="font-bold text-gray-700">กำไรส่งแอร์:</span>
                                                        <div className="text-right">
                                                            <span className={`font-black block ${ch.profitTHB >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {ch.profitTHB >= 0 ? '+' : ''}฿{ch.profitTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-gray-500">
                                                                ({ch.marginPercent.toFixed(1)}% Margin)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Part 3: Other Operational & Marketing Costs + Target Selling Price */}
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/70">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ภาษี/เคลียร์ริ่ง (฿)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={importDutyRate}
                                        onChange={(e) => setImportDutyRate(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ค่ากล่อง/แพ็ค (฿)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={packagingCost}
                                        onChange={(e) => setPackagingCost(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ค่าส่งในไทย (฿)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={localShippingCost}
                                        onChange={(e) => setLocalShippingCost(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 mb-1">คอมแพลตฟอร์ม (%)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={platformFeePercent}
                                        onChange={(e) => setPlatformFeePercent(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 mb-1">งบแอด/ชิ้น (฿)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={adSpendPerUnit}
                                        onChange={(e) => setAdSpendPerUnit(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-800 mb-1">ราคาขายปลีก (฿)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={targetSellingPrice}
                                        onChange={(e) => setTargetSellingPrice(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs font-black bg-white border-2 border-emerald-500 rounded-xl text-emerald-900"
                                    />
                                </div>
                            </div>

                            {/* Part 4: Full Itemized All-Costs Table Breakdown */}
                            <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-xl space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                        <SparklesIcon className="w-4 h-4" />
                                        4. ตารางแจกแจงโครงสร้างต้นทุนทุกตัว (Full Itemized Cost Breakdown)
                                    </span>
                                    <span className="text-xs text-gray-300">
                                        ช่องทางหลักที่เลือก: <strong className="text-white">{selectedChannel === 'SEA' ? '🚢 ทางเรือ' : selectedChannel === 'AIR' ? '✈️ ทางแอร์' : '🚛 ทางรถ'}</strong> | จุดคุ้มทุนต่ำสุด: <strong className="text-emerald-400">฿{costResults.breakevenPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center">
                                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                                        <span className="block text-[10px] text-gray-400">1. ค่าของต้นทาง</span>
                                        <span className="block text-xs font-black text-white mt-0.5">฿{costResults.productCostTHB.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                                        <span className="block text-[10px] text-gray-400">2. ส่งในจีน/ตปท.</span>
                                        <span className="block text-xs font-black text-white mt-0.5">฿{costResults.domesticShippingTHB.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-sky-500/20 p-2.5 rounded-xl border border-sky-400/30">
                                        <span className="block text-[10px] text-sky-300">3. ชิปปิ้ง ({selectedChannel})</span>
                                        <span className="block text-xs font-black text-sky-200 mt-0.5">฿{costResults.internationalShippingTHB.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                                        <span className="block text-[10px] text-gray-400">4. ภาษี/เคลียร์ริ่ง</span>
                                        <span className="block text-xs font-black text-white mt-0.5">฿{costResults.importDutyTHB.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                                        <span className="block text-[10px] text-gray-400">5. ค่ากล่อง/แพ็ค</span>
                                        <span className="block text-xs font-black text-white mt-0.5">฿{costResults.packagingCostTHB.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                                        <span className="block text-[10px] text-gray-400">6. ค่าส่งในไทย</span>
                                        <span className="block text-xs font-black text-white mt-0.5">฿{costResults.localShippingCostTHB.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                                        <span className="block text-[10px] text-gray-400">7. คอมแพลตฟอร์ม</span>
                                        <span className="block text-xs font-black text-white mt-0.5">฿{costResults.platformFeeTHB.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                                        <span className="block text-[10px] text-gray-400">8. งบยิงแอด</span>
                                        <span className="block text-xs font-black text-white mt-0.5">฿{costResults.marketingTHB.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        ยกเลิก
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <span>กำลังบันทึก...</span>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-4 h-4" />
                                <span>{isEdit ? 'บันทึกการแก้ไขต้นทุน' : 'บันทึกสินค้าลงไปป์ไลน์'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
