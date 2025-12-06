// ==================== CONFIG =====================
const YOUR_API_KEYS = ["ROLEX@"];
const TARGET_API = "https://dark-trace-networks.vercel.app/api";
const TARGET_API_KEY = "DarkTrace_Network";
const CACHE_TIME = 3600 * 1000;
// =================================================

const cache = new Map();

// Special cleaning for DarkTrace references
function cleanDarkTraceData(value) {
    if (typeof value == "string") {
        // Remove all DarkTrace references
        let cleaned = value.replace(/@DarkTrace_Networks/gi, "");
        cleaned = cleaned.replace(/DarkTrace/gi, "");
        cleaned = cleaned.replace(/@DarkTrace_Networks/gi, "");
        return cleaned.trim();
    }
    if (Array.isArray(value)) {
        return value.map(cleanDarkTraceData);
    }
    if (value && typeof value === "object") {
        const cleaned = {};
        for (const key of Object.keys(value)) {
            const keyLower = key.toLowerCase();
            // Remove DarkTrace related keys
            if (keyLower.includes("@DarkTrace_Networks") || 
                keyLower.includes("darktrace") ||
                keyLower.includes("dark_trace")) {
                continue;
            }
            cleaned[key] = cleanDarkTraceData(value[key]);
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

    const { type, term, mobile, phone, number, key } = req.query || {};

    // Param check - multiple parameter options
    const searchType = type || "mobile";
    const searchTerm = term || mobile || phone || number;
    
    if (!searchTerm || !key) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(400).json({ 
            error: "missing parameters", 
            details: "Use: ?type=mobile&term=7676162658&key=SPLEXXO OR ?mobile=7676162658&key=SPLEXXO" 
        });
    }

    const cleanSearchTerm = String(searchTerm).replace(/\D/g, "");
    const cleanKey = String(key).trim();

    // API key check
    if (!YOUR_API_KEYS.includes(cleanKey)) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(403).json({ error: "invalid key" });
    }

    // Mobile number format check
    if (cleanSearchTerm.length < 10) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(400).json({ error: "invalid mobile number format" });
    }

    // Cache check
    const now = Date.now();
    const cacheKey = `${searchType}-${cleanSearchTerm}`;
    const cached = cache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TIME) {
        res.setHeader("X-Proxy-Cache", "HIT");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(200).send(cached.response);
    }

    // Mobile Trace API call
    const url = `${TARGET_API}?key=${TARGET_API_KEY}&type=${searchType}&term=${encodeURIComponent(cleanSearchTerm)}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Mobile Trace API failed: ${response.status}`);
        }

        const data = await response.json();

        // Deep clean DarkTrace references
        const cleanedData = cleanDarkTraceData(data);
        
        // Remove any remaining DarkTrace references
        const finalCleanedData = {};
        for (const [key, value] of Object.entries(cleanedData)) {
            const keyLower = key.toLowerCase();
            const valueStr = String(value).toLowerCase();
            
            if (!keyLower.includes('darktrace') && 
                !keyLower.includes('dark_trace') &&
                !valueStr.includes('@DarkTrace_Networks') &&
                !valueStr.includes('@DarkTrace_Networks')) {
                finalCleanedData[key] = value;
            }
        }

        // Add branding
        const finalResponse = {
            ...finalCleanedData,
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
            error: "Mobile Trace API request error",
            details: err.message || "unknown error",
            developer: "splexxo"
        });
    }
}
