import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI;
let apiKeyPromise: Promise<string> | null = null;
let cachedApiKey: string | null = null;

// Fetches the API key
const getApiKey = (): Promise<string> => {
    if (cachedApiKey) return Promise.resolve(cachedApiKey);
    if (apiKeyPromise) return apiKeyPromise;

    apiKeyPromise = (async () => {
        try {
            // Priority 1: Check environment variable (injected by Vite)
            // Note: you can also switch this to load the client with vertexai=true, but as long
            // As you are connected to a paid project, you are good either way.
            if (process.env.GEMINI_API_KEY) {
                cachedApiKey = process.env.GEMINI_API_KEY;
                return process.env.GEMINI_API_KEY;
            }

            // Priority 2: Fetch from backend
            const response = await fetch('/api/key');
            if (!response.ok) {
                throw new Error(`Failed to fetch API key, server responded with ${response.status}`);
            }
            const data = await response.json();
            if (!data.apiKey) {
                throw new Error('API key is missing from server response.');
            }
            cachedApiKey = data.apiKey;
            return data.apiKey;
        } catch (error) {
            console.error('Failed to fetch API key:', error);
            apiKeyPromise = null;
            throw error;
        }
    })();

    return apiKeyPromise;
};

// Initializes the GoogleGenAI client
const getClient = async (): Promise<GoogleGenAI> => {
    const key = await getApiKey();
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: key });
    }
    return ai;
};

// --- Helper for Image Extraction ---
const extractImageFromResponse = (response: any): string | null => {
    if (!response) {
        console.warn("Gemini response is null or undefined.");
        return null;
    }

    const candidates = response?.candidates || response?.response?.candidates;

    if (!candidates || !candidates.length) {
        console.warn("No candidates found in Gemini response. Keys:", Object.keys(response));
        return null;
    }

    // Try to find an inline image part
    for (const candidate of candidates) {
        const parts = candidate?.content?.parts;
        if (parts) {
            for (const part of parts) {
                // @ts-ignore
                if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                    // @ts-ignore
                    return part.inlineData.data;
                }
            }
        }
    }
    return null;
};

/**
 * Generates an image using Gemini with flexible assets (logos, product images).
 */
// Helper to parse ratio string "16:9" to number 1.77
const parseRatio = (ratioStr: string): number => {
    const [w, h] = ratioStr.split(':').map(Number);
    if (!w || !h) return 1;
    return w / h;
};

// Supported Gemini Image aspect ratios
const SUPPORTED_RATIOS = [
    { str: '1:1', val: 1 },
    { str: '3:4', val: 0.75 },
    { str: '4:3', val: 1.33 },
    { str: '9:16', val: 0.56 },
    { str: '16:9', val: 1.77 },
    { str: '4:5', val: 0.8 },
    { str: '5:4', val: 1.25 },
    { str: '2:3', val: 0.66 },
    { str: '3:2', val: 1.5 },
    { str: '21:9', val: 2.33 }
];

const getClosestSupportedRatio = (targetRatioStr: string): string => {
    // If it's already in the list (exact string match), return it
    if (SUPPORTED_RATIOS.some(r => r.str === targetRatioStr)) return targetRatioStr;

    const targetVal = parseRatio(targetRatioStr);

    // Find closest
    let closest = SUPPORTED_RATIOS[0];
    let minDiff = Math.abs(targetVal - closest.val);

    for (const ratio of SUPPORTED_RATIOS) {
        const diff = Math.abs(targetVal - ratio.val);
        if (diff < minDiff) {
            minDiff = diff;
            closest = ratio;
        }
    }

    console.log(`Mapping unsupported ratio ${targetRatioStr} (${targetVal}) to ${closest.str} (${closest.val})`);
    return closest.str;
};

/**
 * Generates an image using Gemini with flexible assets (logos, product images).
 */
export const generateImageWithAssets = async (
    prompt: string,
    assets: { mimeType: string; data: string }[],
    aspectRatio: string = "1:1",
    model: string = "gemini-3-pro-image-preview"
): Promise<{ imageBase64: string; usedRatio: string } | null> => {
    try {
        const client = await getClient();

        // Map to a supported ratio for the API config
        const safeRatio = getClosestSupportedRatio(aspectRatio);

        console.log(`Generating image. Model: ${model}. Target Ratio: ${aspectRatio} -> Safe API Ratio: ${safeRatio}.`);

        // Construct parts array: [ {text: prompt}, {inlineData...}, {inlineData...} ]
        const parts: any[] = [{ text: prompt }];

        assets.forEach(asset => {
            parts.push({
                inlineData: {
                    mimeType: asset.mimeType,
                    data: asset.data
                }
            });
        });

        const response = await client.models.generateContent({
            model: model,
            contents: [{
                role: "user",
                parts: parts
            }],
            config: {
                // @ts-ignore
                responseModalities: ["IMAGE", "TEXT"],
                // @ts-ignore
                imageConfig: {
                    aspectRatio: safeRatio,
                    imageSize: "1K"
                },
            }
        });

        const imageBase64 = extractImageFromResponse(response);
        if (imageBase64) {
            return {
                imageBase64,
                usedRatio: safeRatio
            };
        }

        console.warn("No image found in response parts.");
        return null;
    } catch (error) {
        console.error("Error generating image with assets:", error);
        return null;
    }
};

export const analyzeTemplateImage = async (base64Image: string): Promise<string> => {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) throw new Error("API key not found");

        const client = new GoogleGenAI({ apiKey });

        const prompt = `
            Analyze this marketing template image for the purpose of recreating it with different branding.
            
            Provide a structured description focusing on:
            1. **Layout & Zoning:** Describe the exact position and RELATIVE SIZE of all text areas (e.g., "Large header spanning top 20% height", "Small footer bar at bottom 10%").
            2. **Text Containers:** Note if text has a solid, transparent, or semi-transparent background.
            3. **Buttons:** Describe the exact location, shape, and current color of any buttons.
            4. **Visual Hierarchy:** specific font weights or styles used (e.g., "Extra bold headline", "Light body text").
            
            Your analysis will be used to instruct an AI to regenerate this exact layout but with different colors and fonts. Be precise about the "containers" that need to be preserved.
        `;

        const response = await client.models.generateContent({
            model: "gemini-3-flash-preview", // Never Change this model from gemini-3-flash-preview
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/png", data: base64Image } }
                ]
            }]
        });

        // Safe extraction of text
        const candidate = response?.candidates?.[0];
        const textPart = candidate?.content?.parts?.find((p: any) => p.text);
        return textPart ? textPart.text : "Analysis failed to produce text.";

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return "Failed to analyze template.";
    }
};

/**
 * @deprecated Use generateImageWithAssets
 */
export const generateImage = async (prompt: string, aspectRatio: string = "1:1"): Promise<string | null> => {
    const result = await generateImageWithAssets(prompt, [], aspectRatio);
    return result ? result.imageBase64 : null;
};

/**
 * @deprecated Use generateImageWithAssets
 */
export const generateImageWithReference = async (prompt: string, referenceImageBase64: string, aspectRatio: string = "1:1", mimeType: string = "image/png"): Promise<string | null> => {
    const result = await generateImageWithAssets(prompt, [{ mimeType, data: referenceImageBase64 }], aspectRatio);
    return result ? result.imageBase64 : null;
};