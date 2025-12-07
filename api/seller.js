// ==================== CONFIG =====================
const YOUR_API_KEYS = ["ROLEX@"];
const TARGET_API = "https://osintapi.anshapi.workers.dev/";
const CACHE_TIME = 3600 * 1000;
// =================================================

const cache = new Map();

function cleanOxmzoo(value) {
    if (typeof value == "string") {
        return value.replace(/@oxmzoo/gi, "").trim();
    }
    if (Array.isArray(value)) {
        return value.map(cleanOxmzoo);
    }
    if (value && typeof value === "object") {
        const cleaned = {};
        for (const key of Object.keys(value)) {
            if (key.toLowerCase().includes("oxmzoo")) continue;
            cleaned[key] = cleanOxmzoo(value[key]);
        }
        return cleaned;
    }
    return value;
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    // Sirf GET allow
    if (req.method !== "GET") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(405).json({ error: "method not allowed" });
    }

    const { phone, mobile, number, key } = req.query || {};

    // Param check - multiple parameter options
    const phoneNumber = phone || mobile || number;
    
    if (!phoneNumber || !key) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(400).json({ 
            error: "missing parameters", 
            details: "Use: ?phone=7310176012&key=SPLEXXO OR ?mobile=7310176012&key=SPLEXXO" 
        });
    }

    const cleanPhone = String(phoneNumber).replace(/\D/g, "");
    const cleanKey = String(key).trim();

    // API key check
    if (!YOUR_API_KEYS.includes(cleanKey)) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(403).json({ error: "invalid key" });
    }

    // Phone number format check
    if (cleanPhone.length < 10) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(400).json({ error: "invalid phone number format" });
    }

    // Cache check
    const now = Date.now();
    const cacheKey = cleanPhone;
    const cached = cache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TIME) {
        res.setHeader("X-Proxy-Cache", "HIT");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(200).send(cached.response);
    }

    // OSINT Phone API call
    const url = `${TARGET_API}?phone=${encodeURIComponent(cleanPhone)}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`OSINT Phone API failed: ${response.status}`);
        }

        const data = await response.json();

        // Clean response and add branding
        const cleanedData = cleanOxmzoo(data);
        const finalResponse = {
            ...cleanedData,
            developer: "splexxo",
            credit_by: "splexx",
            powered_by: "splexxo-info-api",
            timestamp: new Date().toISOString()
        };

        const responseBody = JSON.stringify(finalResponse);

        // Cache save
        cache.set(cacheKey, {
            timestamp: now,
            response: responseBody,
        });

        res.setHeader("X-Proxy-Cache", "MISS");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(200).send(responseBody);

    } catch (err) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(502).json({
            error: "OSINT Phone API request error",
            details: err.message || "unknown error",
            developer: "splexxo"
        });
    }
}
