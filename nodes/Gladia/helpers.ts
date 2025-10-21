export function pick<T extends Record<string, any>>(obj: T | undefined, keys: (keyof T)[]) {
    if (!obj) return undefined as any;
    const out: Partial<T> = {};
    for (const k of keys) if (obj[k] !== undefined) (out as any)[k] = obj[k];
    return out;
}

export function entriesToObject(entries?: Array<{ key?: string; value?: string }>) {
    return (entries || []).reduce((acc, e) => {
        const key = (e as any).key;
        const value = (e as any).value;
        if (key) acc[key] = value ?? '';
        return acc;
    }, {} as Record<string, string>);
}

export function dictArrayToObject(entries?: Array<{ key?: string; values?: string[] }>) {
    return (entries || []).reduce((acc, e) => {
        const key = (e as any).key;
        const values = (e as any).values || [];
        if (key) acc[key] = values;
        return acc;
    }, {} as Record<string, string[]>);
}

export function normalizeVocabulary(vocabulary: any): (string | Record<string, any>)[] {
    const out: (string | Record<string, any>)[] = [];

    if (!Object.keys(vocabulary).length) return out

    if (vocabulary.simple?.length) {
        vocabulary.simple.map((obj: Record<string, string>) => out.push(obj))
    }

    if (vocabulary.advanced?.length) {
        vocabulary.advanced.map((advancedObject: any) => {
            const obj: Record<string, any> = {};
            const { value, pronunciations, intensity, language } = advancedObject;
            if (value) obj.value = value;
            if (Array.isArray(pronunciations) && pronunciations.length) obj.pronunciations = pronunciations;
            if (intensity !== undefined) obj.intensity = intensity;
            if (language) obj.language = language;
            if (Object.keys(obj).length) out.push(obj);
        })
    }
    return out;
}

export function normalizeDiarization(cfg: any) {
    if (!cfg) return {};
    const base: any = {};
    if (cfg.enhanced !== undefined) base.enhanced = cfg.enhanced;
    if (cfg.mode === 'fixed' && cfg.number_of_speakers !== undefined) {
        base.number_of_speakers = cfg.number_of_speakers;
    }
    if (cfg.mode === 'range') {
        if (cfg.min_speakers !== undefined) base.min_speakers = cfg.min_speakers;
        if (cfg.max_speakers !== undefined) base.max_speakers = cfg.max_speakers;
    }
    return base;
}
