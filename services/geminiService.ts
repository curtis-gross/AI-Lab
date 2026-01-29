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
export const generateImageWithAssets = async (
    prompt: string, 
    assets: { mimeType: string; data: string }[], 
    aspectRatio: string = "1:1", 
    model: string = "gemini-3-pro-image-preview"
): Promise<string | null> => {
    try {
        const client = await getClient();
        console.log(`Generating image with ${assets.length} assets, model ${model}, ratio ${aspectRatio}. Prompt: ${prompt}`);

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
                responseModalities: ["IMAGE", "TEXT"],
                // @ts-ignore
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: "1K"
                    // outputMimeType removed as it is not supported
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
                ],
            }
        });

        const imageBase64 = extractImageFromResponse(response);
        if (imageBase64) return imageBase64;

        console.warn("No image found in response parts.");
        return null;
    } catch (error) {
        console.error("Error generating image with assets:", error);
        return null;
    }
};

/**
 * @deprecated Use generateImageWithAssets
 */
export const generateImage = async (prompt: string, aspectRatio: string = "1:1"): Promise<string | null> => {
    return generateImageWithAssets(prompt, [], aspectRatio);
};

/**
 * @deprecated Use generateImageWithAssets
 */
export const generateImageWithReference = async (prompt: string, referenceImageBase64: string, aspectRatio: string = "1:1", mimeType: string = "image/png"): Promise<string | null> => {
    return generateImageWithAssets(prompt, [{ mimeType, data: referenceImageBase64 }], aspectRatio);
};