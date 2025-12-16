// ==================== CONFIG =====================
const YOUR_API_KEYS = ["ROLEX@""; // Tumhara Key
const TARGET_API = "https://darkie.x10.mx/numapi.php"; // Source API
const UPSTREAM_KEY = "DEVIL404"; // Source API ki Key
const CACHE_TIME = 3600 * 1000; // 1 Hour Cache
// =================================================

const cache = new Map();

// 🧹 Branding Cleaner
function cleanBranding(value) {
    if (typeof value === "string") {
        // Source ki branding hatane ke liye
        return value.replace(/darkie|devil404|@owner/gi, "").trim();
    }
    if (Array.isArray(value)) {
        return value.map(cleanBranding);
    }
    if (value && typeof value === "object") {
        const cleaned = {};
        for (const key of Object.keys(value)) {
            // Unwanted keys remove karo
            if (["developer", "credit", "owner", "powered_by"].includes(key.toLowerCase())) continue;
            cleaned[key] = cleanBranding(value[key]);
        }
        return cleaned;
    }
    return value;
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    if (req.method !== "GET") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { number, phone, key } = req.query || {};

    // 1. Parameter Check (Number ya Phone)
    const inputNumber = number || phone;

    if (!inputNumber || !key) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(400).json({ 
            error: "missing parameters", 
            details: "Use: ?number=9284420957&key=SPLEXXO" 
        });
    }

    const cleanKey = String(key).trim();
    // Number se non-digits hata rahe hain taaki clean jaye
    const cleanNumber = String(inputNumber).replace(/\D/g, '').trim();

    // 2. Security Check (Tumhara Key: SPLEXXO)
    if (!YOUR_API_KEYS.includes(cleanKey)) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(403).json({ error: "Invalid API key. Use key=SPLEXXO" });
    }

    // 3. Cache Check
    const cacheKey = cleanNumber;
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TIME) {
        res.setHeader("X-Proxy-Cache", "HIT");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(200).send(cached.response);
    }

    // 4. Target URL Construct
    // URL: https://darkie.x10.mx/numapi.php?action=api&key=DEVIL404&number=...
    const url = `${TARGET_API}?action=api&key=${UPSTREAM_KEY}&number=${cleanNumber}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
                'Accept': 'application/json'
            }
        });

        // Source API kabhi kabhi JSON nahi HTML error deti hai, uska dhyan rakhna
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
             throw new Error("Source returned non-JSON response");
        }

        const data = await response.json();

        // 5. Clean & Rebrand
        const cleanedData = cleanBranding(data);
        
        const finalResponse = {
            ...cleanedData,
            developer: "splexxo",
            credit_by: "splexx",
            powered_by: "splexxo-number-api",
            timestamp: new Date().toISOString()
        };

        const responseBody = JSON.stringify(finalResponse);

        // 6. Cache Save
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
            error: "Failed to fetch data",
            message: "Source API down or invalid number",
            developer: "splexxo"
        });
    }
}

