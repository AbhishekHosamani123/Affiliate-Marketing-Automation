const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseAdmin = null;
if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
}

let supabaseAnon = null;
if (supabaseUrl && supabaseAnonKey) {
    supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS dynamically based on environment configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001"
].filter(Boolean).map(o => o.trim().replace(/\/$/, ""));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.trim().replace(/\/$/, "");
    
    // Check if the origin matches our allowed origins list
    const isAllowed = 
      allowedOrigins.includes(cleanOrigin) || 
      allowedOrigins.includes("*") || 
      process.env.FRONTEND_URL === "*" || 
      !process.env.FRONTEND_URL;
      
    if (isAllowed) {
      return callback(null, true);
    }
    
    return callback(new Error("Not allowed by CORS"));
  }
}));

app.use(express.json());

// Lightweight Health Check endpoint to wake up the service
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Image URL normalizers for Supabase
function normalizeSupabaseImageUrl(imageUrl) {
    if (!imageUrl) return imageUrl;
    if (imageUrl.includes("/storage/v1/object/public/")) {
        return imageUrl;
    }
    if (imageUrl.includes("/storage/v1/object/")) {
        return imageUrl.replace("/storage/v1/object/", "/storage/v1/object/public/");
    }
    return imageUrl;
}

function parseSupabaseObjectUrl(imageUrl) {
    try {
        const parsed = new URL(imageUrl);
        const parts = parsed.pathname.split("/").filter(Boolean);

        if (parts.length < 6) return null;
        if (parts[0] !== "storage" || parts[1] !== "v1" || parts[2] !== "object") return null;

        let bucketIndex = 3;
        if (parts[3] === "public") {
            bucketIndex = 4;
        }

        const bucket = parts[bucketIndex];
        const objectPath = parts.slice(bucketIndex + 1).join("/");

        if (!bucket || !objectPath) return null;

        return { bucket, objectPath };
    } catch {
        return null;
    }
}

async function buildTelegramPhotoUrl(imageUrl) {
    const normalized = normalizeSupabaseImageUrl(imageUrl);
    const objectRef = parseSupabaseObjectUrl(normalized);

    if (!objectRef) {
        return normalized;
    }

    const client = supabaseAdmin || supabaseAnon;
    if (!client) {
        return normalized;
    }

    const { data, error } = await client.storage
        .from(objectRef.bucket)
        .createSignedUrl(objectRef.objectPath, 60 * 30);

    if (error || !data?.signedUrl) {
        return normalized;
    }

    return data.signedUrl;
}

// Spawns the python script and pipes environment variables
function runPythonScript(scriptPathParts, args) {
    return new Promise((resolve, reject) => {
        // Render Linux uses python3 by default, Windows usually uses python
        const pythonPath = process.env.PYTHON_PATH || (process.platform === "win32" ? "python" : "python3");
        const scriptPath = path.join(__dirname, ...scriptPathParts);
        const processArgs = [scriptPath, ...args];

        const pyProcess = spawn(pythonPath, processArgs, {
            env: { ...process.env }
        });

        let stdout = "";
        let stderr = "";

        pyProcess.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        pyProcess.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        pyProcess.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Python script exited with code ${code}. Error: ${stderr || stdout}`));
                return;
            }
            resolve(stdout);
        });

        pyProcess.on("error", (err) => {
            reject(err);
        });
    });
}

// Unified post automation endpoint
app.post("/api/telegram-post", async (req, res) => {
    try {
        const { 
            id,
            product_title, 
            product_name, 
            price, 
            discount, 
            benefit, 
            affiliate_link, 
            hashtags, 
            image_url 
        } = req.body || {};

        if (!product_title || !product_name || !price || !discount || !benefit || !affiliate_link || !hashtags || !image_url) {
            return res.status(400).json({ 
                error: "All fields are required: product_title, product_name, price, discount, benefit, affiliate_link, hashtags, image_url" 
            });
        }

        const telegramPhotoUrl = await buildTelegramPhotoUrl(image_url);

        const pythonArgs = [
            "--title", product_title,
            "--name", product_name,
            "--price", price.toString(),
            "--discount", discount,
            "--benefit", benefit,
            "--link", affiliate_link,
            "--hashtags", hashtags,
            "--image", telegramPhotoUrl
        ];

        // Trigger both Telegram and Instagram posts concurrently
        const telegramPromise = runPythonScript(["telegram", "post_products.py"], pythonArgs)
            .then((stdout) => {
                try {
                    const result = JSON.parse(stdout.trim());
                    return { platform: "telegram", ok: result.ok, caption: result.caption, error: result.error };
                } catch {
                    return { platform: "telegram", ok: false, error: "Failed to parse script output: " + stdout };
                }
            })
            .catch((err) => {
                return { platform: "telegram", ok: false, error: err.message };
            });

        const instagramPromise = runPythonScript(["instagram", "post_instagram.py"], pythonArgs)
            .then((stdout) => {
                try {
                    const result = JSON.parse(stdout.trim())
                    return { platform: "instagram", ok: result.ok, caption: result.caption, error: result.error };
                } catch {
                    return { platform: "instagram", ok: false, error: "Failed to parse script output: " + stdout };
                }
            })
            .catch((err) => {
                return { platform: "instagram", ok: false, error: err.message };
            });

        const [telegramResult, instagramResult] = await Promise.all([telegramPromise, instagramPromise]);

        let statusMessage = "";
        const generatedCaption = telegramResult.caption || instagramResult.caption || null;

        if (telegramResult.ok && instagramResult.ok) {
            statusMessage = "Saved to Supabase and posted to Telegram and Instagram.";
        } else if (telegramResult.ok) {
            statusMessage = `Saved to Supabase and posted to Telegram, but Instagram post failed: ${instagramResult.error || "Unknown error"}`;
        } else if (instagramResult.ok) {
            statusMessage = `Saved to Supabase and posted to Instagram, but Telegram post failed: ${telegramResult.error || "Unknown error"}`;
        } else {
            statusMessage = `Telegram failed: ${telegramResult.error || "Unknown error"}. Instagram failed: ${instagramResult.error || "Unknown error"}`;
        }

        if (id && supabaseAdmin) {
            try {
                const updateData = {
                    telegram_posted: !!telegramResult.ok,
                    instagram_posted: !!instagramResult.ok
                };
                if (generatedCaption) {
                    updateData.caption = generatedCaption;
                }
                const { error: dbError } = await supabaseAdmin
                    .from("products")
                    .update(updateData)
                    .eq("id", id);
                if (dbError) {
                    console.error(`Database update failed for ID ${id}:`, dbError);
                } else {
                    console.log(`Database status updated successfully for product ID ${id}`);
                }
            } catch (dbErr) {
                console.error(`Exception updating product in DB for ID ${id}:`, dbErr);
            }
        }

        if (!telegramResult.ok && !instagramResult.ok) {
            return res.status(500).json({ 
                error: statusMessage 
            });
        }

        return res.json({
            ok: true,
            caption: generatedCaption,
            message: statusMessage,
            telegram: telegramResult,
            instagram: instagramResult
        });

    } catch (error) {
        console.error("Post automation failed:", error);
        return res.status(500).json({ 
            error: error.message || "Failed to post product" 
        });
    }
});

app.listen(PORT, () => {
  console.log(`Render Node backend server running on port ${PORT}`);
});
