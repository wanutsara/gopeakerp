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
    Cog6ToothIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    AdjustmentsHorizontalIcon,
    BoltIcon
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
    const [imageLoadError, setImageLoadError] = useState(false);
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

    // UI Progressive Disclosure Toggles (Clean UX)
    const [showCustomFreightRates, setShowCustomFreightRates] = useState(false);
    const [showLocalCostDetails, setShowLocalCostDetails] = useState(false);
    const [showBoxDimensionInputs, setShowBoxDimensionInputs] = useState(false);

    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExtractingUrl, setIsExtractingUrl] = useState(false);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [extractWarning, setExtractWarning] = useState<string | null>(null);
    const [showAiAssistBox, setShowAiAssistBox] = useState(false);
    const [rawPasteText, setRawPasteText] = useState('');

    // Helper to validate image URL (prevent HTML product links like detail.1688.com/*.html from being set as image src)
    const sanitizeImageUrl = (url: string) => {
        const trimmed = (url || '').trim();
        if (!trimmed) return '';
        if (/detail\.1688\.com\/offer\/|item\.taobao\.com\/item\.htm/i.test(trimmed)) {
            return '';
        }
        return trimmed;
    };

    // Initialize form on open
    useEffect(() => {
        if (!isOpen) return;
        setGalleryImages([]);
        setExtractWarning(null);
        setShowAiAssistBox(false);
        setRawPasteText('');
        setImageLoadError(false);
        setShowCustomFreightRates(false);
        setShowLocalCostDetails(false);

        if (initialData) {
            setTitle(initialData.title || '');
            setSourceUrl(initialData.sourceUrl || '');
            setSourcePlatform(initialData.sourcePlatform || '1688');
            setImageUrl(sanitizeImageUrl(initialData.imageUrl || ''));
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
            setAirRatePerKg(initialData.airRatePerKg > 0 ? initialData.airRatePerKg : activeConfig.airRatePerCbm);
            setAirRatePerCbm(initialData.airRatePerCbm > 0 ? initialData.airRatePerCbm : activeConfig.airRatePerCbm);

            setImportDutyRate(initialData.importDutyRate ?? activeConfig.defaultImportDutyRate);
            setPackagingCost(initialData.packagingCost ?? activeConfig.defaultPackagingCost);
            setLocalShippingCost(initialData.localShippingCost ?? activeConfig.defaultLocalShippingCost);
            setPlatformFeePercent(initialData.platformFeePercent ?? activeConfig.defaultPlatformFeePercent);
            setAdSpendPerUnit(initialData.adSpendPerUnit ?? activeConfig.defaultAdSpendPerUnit);
            setTargetSellingPrice(initialData.targetSellingPrice ?? 390);
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
            setWeightKg(0.3);
            setLengthCm(15);
            setWidthCm(10);
            setHeightCm(8);
            setCbm(0.0012);

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
                setImageLoadError(false);
            } else if (data.imageUrl) {
                setImageUrl(sanitizeImageUrl(data.imageUrl));
                setImageLoadError(false);
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
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
                .then((r) => r.json())
                .catch(() => ({}));

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
                setImageLoadError(false);
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

    // Real-time Multi-Channel Cost & ROAS Calculation
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

    // Interactive Reverse Profit Input -> Automatically updates Ad Spend & Required ROAS!
    const handleDesiredProfitChange = (desiredProfitStr: string) => {
        const desiredProfit = parseFloat(desiredProfitStr);
        if (isNaN(desiredProfit)) return;
        // Max ad spend that still leaves `desiredProfit` = profitBeforeAdsTHB - desiredProfit
        const allowedAdSpend = Math.max(0, Math.round((costResults.profitBeforeAdsTHB - desiredProfit) * 100) / 100);
        setAdSpendPerUnit(allowedAdSpend);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('กรุณาระบุชื่อสินค้า');
            return;
        }

        setIsSubmitting(true);
        try {
            const activeRatePerKg =
                selectedChannel === 'SEA'
                    ? Number(seaRatePerKg)
                    : selectedChannel === 'AIR'
                    ? Number(airRatePerKg)
                    : Number(truckRatePerKg);
            const activeRatePerCbm =
                selectedChannel === 'SEA'
                    ? Number(seaRatePerCbm)
                    : selectedChannel === 'AIR'
                    ? Number(airRatePerCbm)
                    : Number(truckRatePerCbm);

            const payload = {
                title: title.trim(),
                sourceUrl: sourceUrl.trim() || null,
                sourcePlatform,
                imageUrl: sanitizeImageUrl(imageUrl) || null,
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
                shippingRatePerKg: activeRatePerKg,
                shippingRatePerCbm: activeRatePerCbm,
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
    const sellPriceNum = Number(targetSellingPrice) || 0;

    // Percentage breakdown of selling price for the Visual Bar
    const landedPct = sellPriceNum > 0 ? Math.min(100, Math.max(0, (costResults.landedCostTHB / sellPriceNum) * 100)) : 0;
    const localAndFeePct =
        sellPriceNum > 0
            ? Math.min(
                  100 - landedPct,
                  Math.max(0, ((costResults.localFulfillmentTHB + costResults.platformFeeTHB) / sellPriceNum) * 100)
              )
            : 0;
    const adPct =
        sellPriceNum > 0
            ? Math.min(100 - landedPct - localAndFeePct, Math.max(0, (costResults.marketingTHB / sellPriceNum) * 100))
            : 0;
    const profitPct =
        sellPriceNum > 0 && costResults.estProfitPerUnit > 0
            ? Math.max(0, 100 - landedPct - localAndFeePct - adPct)
            : 0;

    // ROAS Difficulty Rating Badge
    const getRoasDifficultyBadge = (roas: number) => {
        if (roas <= 0) {
            return {
                text: '❌ ราคาขายต่ำกว่าต้นทุน (ยังไม่รวมแอด)',
                cls: 'bg-rose-500/20 text-rose-200 border-rose-400/40'
            };
        }
        if (roas <= 2.0) {
            return {
                text: '🟢 ยิงแอดง่ายมาก (มาร์จิ้นกว้าง)',
                cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
            };
        }
        if (roas <= 3.5) {
            return {
                text: '🟡 เกณฑ์มาตรฐาน (ยิงแอดปกติ)',
                cls: 'bg-amber-500/20 text-amber-200 border-amber-400/40'
            };
        }
        return {
            text: '🔴 มาร์จิ้นแคบ (ต้องคุมแอดให้คม)',
            cls: 'bg-rose-500/20 text-rose-200 border-rose-400/40'
        };
    };

    const breakEvenBadge = getRoasDifficultyBadge(costResults.breakEvenRoas);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
            <div className="w-full max-w-7xl my-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[94vh]">
                {/* Modal Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-gradient-to-r from-gray-900 to-slate-900 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 text-xl font-black">
                            🎯
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black tracking-tight">
                                    {isEdit
                                        ? 'วิเคราะห์ต้นทุน กำไร & จุดคุ้มทุนยิงแอด (ROAS)'
                                        : 'เพิ่มสินค้าพรีออเดอร์ & วิเคราะห์กำไร + ROAS ยิงแอด'}
                                </h2>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                                    {sourcePlatform}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">
                                วางลิงก์เพื่อดึงข้อมูลอัตโนมัติ เปรียบเทียบขนส่ง รถ/เรือ/แอร์ และคำนวณ ROAS ขั้นต่ำที่ต้องทำเพื่อไม่ให้ขาดทุน
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                            <span className="text-xs text-gray-300 font-semibold">สถานะ:</span>
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
                <form
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-gray-50/70"
                >
                    {/* LEFT COLUMN (Cols 1-4): Product Info */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3.5">
                            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <ShoppingBagIcon className="w-4 h-4 text-blue-600" />
                                    ข้อมูลสินค้า & ลิงก์ต้นทาง
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowAiAssistBox((v) => !v)}
                                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                                >
                                    {showAiAssistBox ? 'ซ่อนตัวช่วย AI' : '📸 เว็บติดล็อกอิน? วางแคปจอ'}
                                </button>
                            </div>

                            {/* Source URL & Auto-Fetch */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-700">
                                    ลิงก์สินค้า (1688 / Amazon / Taobao)
                                </label>
                                <div className="flex gap-1.5">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={sourceUrl}
                                            onChange={(e) => handleUrlChange(e.target.value)}
                                            onPaste={handleUrlPaste}
                                            placeholder="วางลิงก์ที่นี่เพื่อดึงราคา+รูปอัตโนมัติ..."
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
                                                🤖 วางภาพแคปหน้าจอ (`Ctrl+V`) หรือข้อความจาก 1688
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
                                            placeholder="คลิกช่องนี้แล้วกด Ctrl+V เพื่อวาง 'ภาพแคปหน้าจอ 1688' หรือวางข้อความที่ก๊อปมาจากหน้าสินค้า..."
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

                            {/* Product Image + Title Row */}
                            <div className="flex gap-3 items-start pt-1">
                                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center overflow-hidden shrink-0 relative group">
                                    {imageUrl && !imageLoadError ? (
                                        <img
                                            src={imageUrl}
                                            alt="สินค้า"
                                            referrerPolicy="no-referrer"
                                            onError={() => setImageLoadError(true)}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors p-1 text-center">
                                            <PhotoIcon className="w-6 h-6 text-gray-400" />
                                            <span className="text-[9px] text-gray-500 font-bold mt-0.5">อัปโหลดรูป</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                disabled={isUploadingImage}
                                            />
                                        </label>
                                    )}
                                </div>

                                <div className="flex-1 space-y-2">
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
                                            className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold">
                                            <span>📁 เปลี่ยนรูป</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                disabled={isUploadingImage}
                                            />
                                        </label>
                                        <input
                                            type="text"
                                            value={imageUrl}
                                            onChange={(e) => {
                                                setImageUrl(sanitizeImageUrl(e.target.value));
                                                setImageLoadError(false);
                                            }}
                                            placeholder="หรือวาง URL รูปภาพ (.jpg/.png)"
                                            className="flex-1 px-2 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg font-mono text-gray-700"
                                        />
                                        {imageUrl && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImageUrl('');
                                                    setImageLoadError(false);
                                                }}
                                                className="text-[11px] text-rose-500 font-bold px-1"
                                            >
                                                ลบ
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {galleryImages.length > 1 && (
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-500 mb-1">
                                        คลิกเลือกรูปสินค้าที่ดึงได้จากหน้าเว็บ:
                                    </span>
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                        {galleryImages.map((img, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setImageUrl(img);
                                                    setImageLoadError(false);
                                                }}
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

                            {/* Platform & Priority */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">แพลตฟอร์ม</label>
                                    <select
                                        value={sourcePlatform}
                                        onChange={(e) => setSourcePlatform(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
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
                                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                                    >
                                        <option value="LOW">🔵 ต่ำ (Low)</option>
                                        <option value="MEDIUM">🟢 ปานกลาง (Medium)</option>
                                        <option value="HIGH">🟡 สูง (High)</option>
                                        <option value="URGENT">🔥 ด่วนพิเศษ (Urgent)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Category & Supplier */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">หมวดหมู่</label>
                                    <input
                                        type="text"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        placeholder="เช่น ของแต่งบ้าน"
                                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อร้าน/โรงงาน</label>
                                    <input
                                        type="text"
                                        value={supplierName}
                                        onChange={(e) => setSupplierName(e.target.value)}
                                        placeholder="ชื่อซัพพลายเออร์"
                                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
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
                                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">บันทึกสเปก / หมายเหตุ</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="เช่น MOQ ขั้นต่ำ 10 ชิ้น, มี 3 สี, แพ็คเกจกล่องแข็ง..."
                                    rows={3}
                                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (Cols 5-12): Decision-First UX & ROAS Calculator */}
                    <div className="lg:col-span-8 space-y-4">
                        {/* =================================================================================
                            HERO SECTION: EXECUTIVE PRICING, PROFIT & ROAS INTELLIGENCE BANNER
                           ================================================================================= */}
                        <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-950 text-white p-5 rounded-2xl shadow-lg border border-white/10 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <BoltIcon className="w-5 h-5 text-amber-400" />
                                    <div>
                                        <h3 className="text-sm font-black tracking-tight text-white">
                                            สรุปราคาขาย กำไรสุทธิ & เป้าหมายยิงแอด (ROAS Calculator)
                                        </h3>
                                        <p className="text-[11px] text-gray-300">
                                            ลองปรับ <b>ราคาขาย</b> หรือ <b>กำไรที่อยากได้</b> ระบบจะคำนวณทันทีว่าต้องยิงแอด ROAS มากกว่าเท่าไหร่ถึงจะกำไร
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${breakEvenBadge.cls}`}>
                                    {breakEvenBadge.text}
                                </span>
                            </div>

                            {/* 3 Key Interactive Inputs (Selling Price <-> Desired Net Profit <-> Ad Budget) */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* 1. Target Selling Price */}
                                <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                                    <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                                        1. ตั้งราคาขายปลีก (฿)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-sm font-black text-emerald-400">฿</span>
                                        <input
                                            type="number"
                                            step="any"
                                            value={targetSellingPrice}
                                            onChange={(e) => setTargetSellingPrice(e.target.value)}
                                            className="w-full pl-7 pr-3 py-1.5 text-base font-black bg-gray-900/90 border border-emerald-400/50 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {[199, 290, 390, 590, 990].map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setTargetSellingPrice(p)}
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                                    Number(targetSellingPrice) === p
                                                        ? 'bg-emerald-500 text-gray-950'
                                                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                                }`}
                                            >
                                                ฿{p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. Desired Profit Per Unit (Two-Way Bound with Ad Spend) */}
                                <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[11px] font-bold text-amber-300">
                                            2. กำไรสุทธิ/ชิ้น (฿)
                                        </label>
                                        <span className="text-[10px] font-black text-amber-200">
                                            Margin {costResults.estMarginPercent.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-sm font-black text-amber-400">฿</span>
                                        <input
                                            type="number"
                                            step="any"
                                            value={costResults.estProfitPerUnit}
                                            onChange={(e) => handleDesiredProfitChange(e.target.value)}
                                            className={`w-full pl-7 pr-3 py-1.5 text-base font-black bg-gray-900/90 border rounded-lg focus:outline-none ${
                                                costResults.estProfitPerUnit >= 0
                                                    ? 'border-amber-400/50 text-amber-300 focus:border-amber-400'
                                                    : 'border-rose-500 text-rose-300'
                                            }`}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-300 mt-1.5">
                                        💡 พิมพ์กำไรที่อยากได้เพื่อคำนวณ ROAS ด้านล่าง
                                    </p>
                                </div>

                                {/* 3. Ad Spend Per Unit */}
                                <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[11px] font-bold text-sky-300">
                                            3. งบแอดต่อออเดอร์ (CPA ฿)
                                        </label>
                                        <span className="text-[10px] text-gray-300">
                                            สูงสุดไม่เกิน ฿{Math.max(0, costResults.profitBeforeAdsTHB).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-sm font-black text-sky-400">฿</span>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={adSpendPerUnit}
                                            onChange={(e) => setAdSpendPerUnit(e.target.value)}
                                            className="w-full pl-7 pr-3 py-1.5 text-base font-black bg-gray-900/90 border border-sky-400/50 rounded-lg text-white focus:outline-none focus:border-sky-400"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {[30, 50, 80, 120, 200].map((ad) => (
                                            <button
                                                key={ad}
                                                type="button"
                                                onClick={() => setAdSpendPerUnit(ad)}
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                                    Number(adSpendPerUnit) === ad
                                                        ? 'bg-sky-500 text-gray-950'
                                                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                                }`}
                                            >
                                                แอด ฿{ad}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ROAS Intelligence Cards: Break-Even ROAS vs Target Profit ROAS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Card A: Minimum Break-Even ROAS (จุดคุ้มทุนแอด ไม่ขาดทุน) */}
                                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wide block">
                                            🚨 จุดคุ้มทุนแอด (ต้องได้ ROAS มากกว่าเท่าไหร่ถึงจะเริ่มมีกำไร?)
                                        </span>
                                        <p className="text-xs text-gray-200 leading-snug">
                                            ต้นทุนสินค้า+ส่ง+แพ็ค+คอมฯ รวม <b>฿{costResults.costBeforeAdsTHB.toLocaleString()}</b>{' '}
                                            {costResults.profitBeforeAdsTHB > 0 ? (
                                                <>
                                                    (รับค่าแอดได้สูงสุดไม่เกิน{' '}
                                                    <b className="text-emerald-300">
                                                        ฿{costResults.profitBeforeAdsTHB.toLocaleString()}/ชิ้น
                                                    </b>
                                                    )
                                                </>
                                            ) : (
                                                <span className="text-rose-300 font-bold">
                                                    (ต้องตั้งราคาขายอย่างน้อย ฿{costResults.minSellingPriceBeforeAds})
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0 bg-gray-950/60 px-3.5 py-2 rounded-xl border border-emerald-400/30">
                                        <span className="block text-[10px] text-emerald-300 font-bold">ROAS ขั้นต่ำ</span>
                                        <span className="text-xl font-black text-emerald-400">
                                            {costResults.breakEvenRoas > 0 ? `> ${costResults.breakEvenRoas.toFixed(2)}x` : 'ขาดทุน'}
                                        </span>
                                    </div>
                                </div>

                                {/* Card B: Target ROAS to hit desired net profit */}
                                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <span className="text-[11px] font-black text-amber-300 uppercase tracking-wide block">
                                            🎯 ROAS เป้าหมาย (เพื่อให้เหลือกำไรสุทธิ +{costResults.estProfitPerUnit.toLocaleString()} ฿/ชิ้น)
                                        </span>
                                        <p className="text-xs text-gray-200 leading-snug">
                                            เมื่อคุมค่าแอดไม่เกิน <b className="text-amber-300">฿{costResults.marketingTHB.toLocaleString()}/ชิ้น</b>{' '}
                                            จะได้กำไรสุทธิ{' '}
                                            <b className={costResults.estProfitPerUnit >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                                                ฿{costResults.estProfitPerUnit.toLocaleString()} ({costResults.estMarginPercent.toFixed(1)}%)
                                            </b>
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0 bg-gray-950/60 px-3.5 py-2 rounded-xl border border-amber-400/30">
                                        <span className="block text-[10px] text-amber-300 font-bold">ต้องทำ ROAS</span>
                                        <span className="text-xl font-black text-amber-400">
                                            {costResults.targetRoas > 0 ? `≥ ${costResults.targetRoas.toFixed(2)}x` : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Visual 100% Selling Price Breakdown Bar */}
                            <div className="space-y-1.5 pt-1">
                                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-300 gap-2">
                                    <span className="font-bold">
                                        สัดส่วนจากราคาขาย ฿{sellPriceNum.toLocaleString()} (ขนส่งหลัก:{' '}
                                        {selectedChannel === 'SEA' ? '🚢 ทางเรือ' : selectedChannel === 'AIR' ? '✈️ ทางแอร์' : '🚛 ทางรถ'}):
                                    </span>
                                    <div className="flex flex-wrap items-center gap-3 text-[10px]">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                                            ค่าของ+นำเข้า ฿{costResults.landedCostTHB.toLocaleString()} ({landedPct.toFixed(0)}%)
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                                            แพ็ค+ส่งไทย+คอมฯ ฿{(costResults.localFulfillmentTHB + costResults.platformFeeTHB).toLocaleString()} ({localAndFeePct.toFixed(0)}%)
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                                            ค่าแอด ฿{costResults.marketingTHB.toLocaleString()} ({adPct.toFixed(0)}%)
                                        </span>
                                        <span className="flex items-center gap-1 font-black text-emerald-300">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                                            กำไรสุทธิ ฿{costResults.estProfitPerUnit.toLocaleString()} ({costResults.estMarginPercent.toFixed(0)}%)
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${landedPct}%` }} className="bg-blue-400 h-full transition-all" title="ค่าของ+ขนส่งนำเข้า" />
                                    <div style={{ width: `${localAndFeePct}%` }} className="bg-purple-400 h-full transition-all" title="ค่าแพ็ค+ส่งในไทย+คอมแพลตฟอร์ม" />
                                    <div style={{ width: `${adPct}%` }} className="bg-sky-400 h-full transition-all" title="งบยิงแอด" />
                                    <div style={{ width: `${profitPct}%` }} className="bg-emerald-400 h-full transition-all" title="กำไรสุทธิ" />
                                </div>
                            </div>
                        </div>

                        {/* =================================================================================
                            STEP 1 & 2: CLEAN INPUTS FOR FOREIGN PRICE + WEIGHT/CBM
                           ================================================================================= */}
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                                <h4 className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-2">
                                    <CalculatorIcon className="w-4 h-4 text-blue-600" />
                                    ตั้งค่าต้นทุนสินค้าต้นทาง & ช่องทางขนส่งนำเข้า
                                </h4>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSyncFromBackendConfig}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 cursor-pointer"
                                    >
                                        <ArrowPathIcon className="w-3 h-3" />
                                        <span>รีเซ็ตใช้เรทหลังบ้าน</span>
                                    </button>
                                    {onOpenSettings && (
                                        <button
                                            type="button"
                                            onClick={onOpenSettings}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-200 cursor-pointer"
                                        >
                                            <Cog6ToothIcon className="w-3 h-3" />
                                            <span>ตั้งค่าเรทมาตรฐานหลังบ้าน</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Box 1: Foreign Product Price */}
                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-slate-800">
                                            🌏 1. ราคาของต้นทาง
                                        </span>
                                        <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                                            คิดเป็นเงินไทย = ฿{costResults.foreignBaseTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                                ราคาต้นทาง ({currencySymbol})
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={foreignPrice}
                                                onChange={(e) => setForeignPrice(e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm font-black bg-white border-2 border-blue-400 rounded-xl text-gray-900 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                                ส่งในจีน ({currencySymbol})
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={foreignDomesticShipping}
                                                onChange={(e) => setForeignDomesticShipping(e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm font-bold bg-white border border-gray-200 rounded-xl text-gray-900"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                                สกุลเงิน / เรท (฿)
                                            </label>
                                            <div className="flex gap-1">
                                                <select
                                                    value={foreignCurrency}
                                                    onChange={(e) => {
                                                        const curr = e.target.value;
                                                        setForeignCurrency(curr);
                                                        if (curr === 'RMB') setExchangeRate(activeConfig.rmbExchangeRate);
                                                        if (curr === 'USD') setExchangeRate(activeConfig.usdExchangeRate);
                                                        if (curr === 'THB') setExchangeRate(1.0);
                                                    }}
                                                    className="px-1.5 py-1.5 text-xs font-black bg-white border border-gray-200 rounded-xl text-gray-900"
                                                >
                                                    <option value="RMB">¥</option>
                                                    <option value="USD">$</option>
                                                    <option value="THB">฿</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={exchangeRate}
                                                    onChange={(e) => setExchangeRate(e.target.value)}
                                                    className="w-full px-2 py-1.5 text-xs font-black bg-white border border-gray-200 rounded-xl text-blue-600"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Box 2: Weight & Quick Presets */}
                                <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-sky-950">
                                            ⚖️ 2. น้ำหนัก & ขนาด (ใช้คิดค่ารถ/เรือ/แอร์)
                                        </span>
                                        <select
                                            value={shippingMethod}
                                            onChange={(e) => setShippingMethod(e.target.value as ShippingCalcMethod)}
                                            className="px-2 py-0.5 text-[10px] font-bold bg-white border border-sky-300 rounded-lg text-sky-900"
                                        >
                                            <option value="WEIGHT">คิดตามน้ำหนัก (กก.)</option>
                                            <option value="CBM">คิดตามคิว (CBM)</option>
                                            <option value="ACTUAL_MAX">คิดตามจริง (อันไหนแพงกว่า)</option>
                                        </select>
                                    </div>

                                    <div className="flex items-end gap-2">
                                        <div className="w-28 shrink-0">
                                            <label className="block text-[10px] font-bold text-gray-700 mb-1">
                                                น้ำหนัก/ชิ้น (kg)
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={weightKg}
                                                onChange={(e) => setWeightKg(e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm font-black bg-white border-2 border-sky-400 rounded-xl text-gray-900"
                                            />
                                        </div>

                                        <div className="flex-1">
                                            <span className="block text-[10px] font-bold text-gray-500 mb-1">
                                                เลือกน้ำหนักด่วน:
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                                {[
                                                    { label: '50g', val: 0.05 },
                                                    { label: '200g', val: 0.2 },
                                                    { label: '500g', val: 0.5 },
                                                    { label: '1 kg', val: 1.0 },
                                                    { label: '2 kg', val: 2.0 }
                                                ].map((preset) => (
                                                    <button
                                                        key={preset.val}
                                                        type="button"
                                                        onClick={() => setWeightKg(preset.val)}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                                            Number(weightKg) === preset.val
                                                                ? 'bg-sky-600 text-white shadow-sm'
                                                                : 'bg-white border border-sky-200 text-sky-900 hover:bg-sky-100'
                                                        }`}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Collapsible Box Dimensions */}
                                    <div className="pt-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setShowBoxDimensionInputs((v) => !v)}
                                            className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer"
                                        >
                                            {showBoxDimensionInputs ? (
                                                <ChevronUpIcon className="w-3.5 h-3.5" />
                                            ) : (
                                                <ChevronDownIcon className="w-3.5 h-3.5" />
                                            )}
                                            <span>
                                                ขนาดกล่อง: {lengthCm}×{widthCm}×{heightCm} ซม. ({costResults.computedCbm} คิว CBM) — คลิกเพื่อแก้ขนาดกล่อง
                                            </span>
                                        </button>

                                        {showBoxDimensionInputs && (
                                            <div className="grid grid-cols-4 gap-2 mt-2 bg-white p-2 rounded-xl border border-sky-200">
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-500">ยาว (ซม.)</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={lengthCm}
                                                        onChange={(e) => {
                                                            setLengthCm(e.target.value);
                                                            handleDimensionChange(e.target.value, widthCm, heightCm);
                                                        }}
                                                        className="w-full px-2 py-1 text-xs font-bold bg-gray-50 border border-gray-200 rounded"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-500">กว้าง (ซม.)</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={widthCm}
                                                        onChange={(e) => {
                                                            setWidthCm(e.target.value);
                                                            handleDimensionChange(lengthCm, e.target.value, heightCm);
                                                        }}
                                                        className="w-full px-2 py-1 text-xs font-bold bg-gray-50 border border-gray-200 rounded"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-500">สูง (ซม.)</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={heightCm}
                                                        onChange={(e) => {
                                                            setHeightCm(e.target.value);
                                                            handleDimensionChange(lengthCm, widthCm, e.target.value);
                                                        }}
                                                        className="w-full px-2 py-1 text-xs font-bold bg-gray-50 border border-gray-200 rounded"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-500">คิว (CBM)</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={cbm}
                                                        onChange={(e) => setCbm(e.target.value)}
                                                        className="w-full px-2 py-1 text-xs font-bold bg-sky-50 border border-sky-200 rounded text-sky-900"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* =================================================================================
                                STEP 3: CLEAN SIDE-BY-SIDE SHIPPING COMPARISON (TRUCK vs SEA vs AIR)
                               ================================================================================= */}
                            <div className="space-y-2.5 pt-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                                        <TruckIcon className="w-4 h-4 text-blue-600" />
                                        3. คลิกเลือกช่องทางขนส่งนำเข้า (เปรียบเทียบกำไร & จุดคุ้มทุน ROAS)
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomFreightRates((v) => !v)}
                                        className="text-[11px] font-bold text-gray-600 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                                    >
                                        <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                                        <span>{showCustomFreightRates ? 'ซ่อนช่องแก้เรทขนส่ง' : '⚙️ ปรับเรทขนส่ง ฿/กก. เฉพาะชิ้นนี้'}</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {(
                                        [
                                            {
                                                key: 'TRUCK' as ShippingChannel,
                                                title: '🚛 ส่งทางรถ (Truck)',
                                                leadTime: activeConfig.truckLeadTime,
                                                data: costResults.channels.truck,
                                                rateKg: truckRatePerKg,
                                                setRateKg: setTruckRatePerKg,
                                                rateCbm: truckRatePerCbm,
                                                setRateCbm: setTruckRatePerCbm,
                                                activeCls: 'bg-sky-50/90 border-sky-600 ring-2 ring-sky-500/20',
                                                badgeCls: 'bg-sky-600 text-white'
                                            },
                                            {
                                                key: 'SEA' as ShippingChannel,
                                                title: '🚢 ส่งทางเรือ (Sea)',
                                                leadTime: activeConfig.seaLeadTime,
                                                data: costResults.channels.sea,
                                                rateKg: seaRatePerKg,
                                                setRateKg: setSeaRatePerKg,
                                                rateCbm: seaRatePerCbm,
                                                setRateCbm: setSeaRatePerCbm,
                                                activeCls: 'bg-teal-50/90 border-teal-600 ring-2 ring-teal-500/20',
                                                badgeCls: 'bg-teal-600 text-white'
                                            },
                                            {
                                                key: 'AIR' as ShippingChannel,
                                                title: '✈️ ส่งทางแอร์ (Air)',
                                                leadTime: activeConfig.airLeadTime,
                                                data: costResults.channels.air,
                                                rateKg: airRatePerKg,
                                                setRateKg: setAirRatePerKg,
                                                rateCbm: airRatePerCbm,
                                                setRateCbm: setAirRatePerCbm,
                                                activeCls: 'bg-violet-50/90 border-violet-600 ring-2 ring-violet-500/20',
                                                badgeCls: 'bg-violet-600 text-white'
                                            }
                                        ] as const
                                    ).map((card) => {
                                        const isSelected = selectedChannel === card.key;
                                        const ch = card.data;
                                        return (
                                            <div
                                                key={card.key}
                                                onClick={() => setSelectedChannel(card.key)}
                                                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                                                    isSelected
                                                        ? `${card.activeCls} shadow-md`
                                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-black text-gray-900">{card.title}</span>
                                                    <span
                                                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                            isSelected ? card.badgeCls : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {isSelected ? '✓ เลือกใช้งาน' : card.leadTime}
                                                    </span>
                                                </div>

                                                {showCustomFreightRates && (
                                                    <div
                                                        className="grid grid-cols-2 gap-1.5 mb-2.5 bg-white p-2 rounded-xl border border-gray-200"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div>
                                                            <label className="block text-[9px] font-bold text-gray-500">เรท ฿/กก.</label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={card.rateKg}
                                                                onChange={(e) => card.setRateKg(e.target.value)}
                                                                className="w-full px-1.5 py-0.5 text-xs font-black text-gray-900 bg-gray-50 border border-gray-200 rounded"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[9px] font-bold text-gray-500">เรท ฿/คิว</label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={card.rateCbm}
                                                                onChange={(e) => card.setRateCbm(e.target.value)}
                                                                className="w-full px-1.5 py-0.5 text-xs font-black text-gray-900 bg-gray-50 border border-gray-200 rounded"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-1.5 text-xs">
                                                    <div className="flex justify-between items-center bg-gray-100/80 px-2.5 py-1.5 rounded-lg">
                                                        <span className="text-gray-600 font-semibold">ค่าขนส่งนำเข้า:</span>
                                                        <span className="font-black text-gray-900">
                                                            ฿{ch.shippingTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between text-gray-600 px-1">
                                                        <span>ต้นทุนรวมทุกอย่าง:</span>
                                                        <span className="font-bold text-gray-900">
                                                            ฿{ch.totalCostTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>

                                                    <div className="pt-1.5 border-t border-gray-200/80 flex items-center justify-between px-1">
                                                        <div>
                                                            <span className="block text-[10px] font-bold text-gray-500">
                                                                ROAS คุ้มทุน
                                                            </span>
                                                            <span className="text-xs font-black text-indigo-700">
                                                                {ch.breakEvenRoas > 0 ? `> ${ch.breakEvenRoas.toFixed(2)}x` : 'ขาดทุน'}
                                                            </span>
                                                        </div>

                                                        <div className="text-right">
                                                            <span className="block text-[10px] font-bold text-gray-500">
                                                                กำไรสุทธิ ({ch.marginPercent.toFixed(0)}%)
                                                            </span>
                                                            <span
                                                                className={`text-sm font-black ${
                                                                    ch.profitTHB >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                                                }`}
                                                            >
                                                                {ch.profitTHB >= 0 ? '+' : ''}฿
                                                                {ch.profitTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* =================================================================================
                                STEP 4: COLLAPSIBLE LOCAL FULFILLMENT & PLATFORM FEES (CLEAN SUMMARY)
                               ================================================================================= */}
                            <div className="pt-1">
                                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80">
                                    <div
                                        onClick={() => setShowLocalCostDetails((v) => !v)}
                                        className="flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-gray-800">
                                                📦 4. ค่าใช้จ่ายในไทย & ค่าธรรมเนียมแพลตฟอร์ม
                                            </span>
                                            <span className="text-[11px] font-bold text-gray-600 bg-white px-2.5 py-0.5 rounded-lg border border-gray-200">
                                                กล่อง ฿{costResults.packagingCostTHB} + ส่งไทย ฿{costResults.localShippingCostTHB} + คอมฯ{' '}
                                                {platformFeePercent}% (฿{costResults.platformFeeTHB}) = รวม ฿
                                                {(
                                                    costResults.localFulfillmentTHB +
                                                    costResults.platformFeeTHB +
                                                    costResults.importDutyTHB
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                        <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                                            <span>{showLocalCostDetails ? 'ซ่อนรายละเอียด' : 'แก้ไขค่ากล่อง/ค่าส่งในไทย'}</span>
                                            {showLocalCostDetails ? (
                                                <ChevronUpIcon className="w-3.5 h-3.5" />
                                            ) : (
                                                <ChevronDownIcon className="w-3.5 h-3.5" />
                                            )}
                                        </span>
                                    </div>

                                    {showLocalCostDetails && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-200">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                                    ค่ากล่อง/แพ็ค (฿)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={packagingCost}
                                                    onChange={(e) => setPackagingCost(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                                    ค่าส่งในไทย (฿)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={localShippingCost}
                                                    onChange={(e) => setLocalShippingCost(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                                    คอมแพลตฟอร์ม (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={platformFeePercent}
                                                    onChange={(e) => setPlatformFeePercent(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                                    ภาษี/เคลียร์ริ่ง (฿)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={importDutyRate}
                                                    onChange={(e) => setImportDutyRate(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-900"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Modal Footer */}
                <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    >
                        ยกเลิก
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
