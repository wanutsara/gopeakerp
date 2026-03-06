"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import useSWR from 'swr';

type Brand = {
    id: string;
    name: string;
    isHQ: boolean;
};

type BrandContextType = {
    activeBrandId: string | null;  // null means "Consolidated / All Brands"
    setActiveBrandId: (id: string | null) => void;
    brands: Brand[];
    isLoading: boolean;
};

const BrandContext = createContext<BrandContextType | undefined>(undefined);

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function BrandProvider({ children }: { children: ReactNode }) {
    const { data: brands, isValidating } = useSWR<Brand[]>('/api/settings/brands', fetcher, {
        revalidateOnFocus: false
    });

    // Default to 'Consolidated' state (null)
    const [activeBrandId, setActiveBrandId] = useState<string | null>(null);

    // Initial load from LocalStorage to persist Executive's choice
    useEffect(() => {
        const stored = localStorage.getItem('gopeak_active_brand');
        if (stored) setActiveBrandId(stored === 'ALL' ? null : stored);
    }, []);

    // Sync to LocalStorage when changed
    useEffect(() => {
        localStorage.setItem('gopeak_active_brand', activeBrandId || 'ALL');
    }, [activeBrandId]);

    return (
        <BrandContext.Provider value={{
            activeBrandId,
            setActiveBrandId,
            brands: brands || [],
            isLoading: isValidating
        }}>
            {children}
        </BrandContext.Provider>
    );
}

export function useBrand() {
    const context = useContext(BrandContext);
    if (context === undefined) {
        throw new Error('useBrand must be used within a BrandProvider');
    }
    return context;
}
