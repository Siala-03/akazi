'use client';

import { RWANDA_DISTRICTS, RWANDA_PROVINCES } from '@/lib/rwanda-locations';

export interface Address {
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
}

export const ADDRESS_KEYS = ['province', 'district', 'sector', 'cell', 'village'] as const;

export function addressFrom(worker: Partial<Record<keyof Address, string | null>>): Address {
    return {
        province: worker.province ?? '',
        district: worker.district ?? '',
        sector: worker.sector ?? '',
        cell: worker.cell ?? '',
        village: worker.village ?? '',
    };
}

// Older workers may have no address yet, so editing allows it to stay empty — but a
// partially filled address is rejected.
export function addressError(a: Address): string | null {
    const filled = ADDRESS_KEYS.filter(k => a[k].trim());
    if (filled.length === 0 || filled.length === ADDRESS_KEYS.length) return null;
    return 'Fill in all address fields (province, district, sector, cell, village) or leave them all empty';
}

export function AddressFields({ value, onChange, inputClassName, labelClassName }: {
    value: Address;
    onChange: (next: Address) => void;
    inputClassName: string;
    labelClassName: string;
}) {
    const set = (key: keyof Address, v: string) =>
        onChange(key === 'province' ? { ...value, province: v, district: '' } : { ...value, [key]: v });

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClassName}>Province</label>
                    <select value={value.province} onChange={e => set('province', e.target.value)} className={inputClassName}>
                        <option value="">Select province</option>
                        {RWANDA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelClassName}>District</label>
                    <select value={value.district} onChange={e => set('district', e.target.value)} disabled={!value.province} className={`${inputClassName} disabled:opacity-60`}>
                        <option value="">{value.province ? 'Select district' : 'Select province first'}</option>
                        {(RWANDA_DISTRICTS[value.province] || []).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {(['sector', 'cell', 'village'] as const).map(key => (
                    <div key={key}>
                        <label className={`${labelClassName} capitalize`}>{key}</label>
                        <input type="text" value={value[key]} onChange={e => set(key, e.target.value)} className={inputClassName} />
                    </div>
                ))}
            </div>
        </div>
    );
}
