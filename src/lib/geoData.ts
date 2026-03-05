export const PROVINCE_COORDS: Record<string, [number, number]> = {
    "กรุงเทพมหานคร": [13.7563, 100.5018],
    "กทม": [13.7563, 100.5018],
    "เชียงใหม่": [18.7883, 98.9853],
    "เชียงราย": [19.9105, 99.8271],
    "ภูเก็ต": [7.8804, 98.3923],
    "ชลบุรี": [13.3611, 100.9847],
    "นนทบุรี": [13.8591, 100.5217],
    "ปทุมธานี": [14.0208, 100.5250],
    "สมุทรปราการ": [13.5991, 100.5968],
    "สมุทรสาคร": [13.5475, 100.2744],
    "นครปฐม": [13.8199, 100.0601],
    "พระนครศรีอยุธยา": [14.3590, 100.5681],
    "ขอนแก่น": [16.4322, 102.8236],
    "นครราชสีมา": [14.9799, 102.0978],
    "อุดรธานี": [17.4138, 102.7872],
    "สงขลา": [7.1898, 100.5954],
    "สุราษฎร์ธานี": [9.1439, 99.3308],
    "ระยอง": [12.6814, 101.2816],
    "จันทบุรี": [12.6110, 102.1039],
    "ตราด": [12.2428, 102.5175],
    "พิษณุโลก": [16.8211, 100.2659],
    "นครสวรรค์": [15.6889, 100.1205],
    "อุบลราชธานี": [15.2285, 104.8564],
    "ประจวบคีรีขันธ์": [11.8122, 99.7963],
    "เพชรบุรี": [13.1118, 99.9405]
};

// Simple pseudo-random hash to generate pseudo-locations based on string
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit int
    }
    return hash;
}

export function getGeoCoordinate(province: string, district?: string): [number, number] {
    const defaultCoords: [number, number] = [13.75, 100.50]; // Default to BKK roughly
    const provKey = province?.trim() || "";
    const distKey = district?.trim() || "";

    let baseCoord = PROVINCE_COORDS[provKey];

    // If province not found, simulate a location in Thailand based on its name hash
    if (!baseCoord) {
        if (!provKey) return defaultCoords;
        const h = Math.abs(hashString(provKey));
        // Thailand bounding box roughly [5.6, 97.3] to [20.4, 105.6]
        const lat = 5.6 + (h % 14.8);
        const lng = 97.3 + ((h * 13) % 8.3);
        baseCoord = [lat, lng];
    }

    // If district is provided, apply a small deterministic offset around the province center
    // this creates a nice "cluster" effect of districts around the province marker when zoomed in
    if (distKey) {
        const distHash = Math.abs(hashString(distKey));
        // ±0.15 degrees offset max (~15km radius)
        const latOffset = ((distHash % 300) - 150) / 1000;
        const lngOffset = (((distHash * 7) % 300) - 150) / 1000;
        return [baseCoord[0] + latOffset, baseCoord[1] + lngOffset];
    }

    return baseCoord;
}
