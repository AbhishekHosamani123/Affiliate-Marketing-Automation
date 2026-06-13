import BACKEND_URL from "./apiConfig";

async function fetchWithTimeout(url, options = {}, timeout = 60000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
}

export async function warmupBackend() {
    try {
        // Lightweight call to wake up Render (fails silently, no UI impact)
        await fetchWithTimeout(`${BACKEND_URL}/health`, { method: "GET" }, 15000);
        console.log("Backend warmup call completed.");
    } catch (err) {
        // Fails silently, no console warnings to confuse users
    }
}

export async function postProduct(payload) {
    const url = `${BACKEND_URL}/api/telegram-post`;
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    };

    let attempt = 1;
    while (attempt <= 2) {
        try {
            const response = await fetchWithTimeout(url, options, 60000);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! Status: ${response.status}`);
            }
            return data;
        } catch (err) {
            console.warn(`API post attempt ${attempt} failed:`, err);
            if (attempt === 2) {
                throw err;
            }
            attempt++;
        }
    }
}
