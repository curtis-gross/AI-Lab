import { GoogleGenAI } from "@google/genai";
import { execSync } from 'child_process';

let API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    try {
        console.log("Fetching API Key from Secret Manager...");
        API_KEY = execSync('gcloud secrets versions access latest --secret="GEMINI_API_KEY_hsant39"', { encoding: 'utf-8' }).trim();
    } catch (e) {
        console.error("Failed to fetch API key from gcloud:", e.message);
    }
}

if (!API_KEY) {
    console.error("Error: GEMINI_API_KEY environment variable is not set.");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey: API_KEY });

async function listModels() {
    try {
        console.log("Listing available models...");
        const response = await client.models.list();
        // The response format might vary based on SDK version. 
        // Usually it returns an object with a 'models' array or similar.
        // Let's log the raw response or iterate if possible.
        
        if (response && response.models) {
             response.models.forEach(model => {
                console.log(`- ${model.name} (${model.version}) [${model.supportedGenerationMethods.join(', ')}]`);
            });
        } else if (Array.isArray(response)) {
             response.forEach(model => {
                console.log(`- ${model.name} (${model.version}) [${model.supportedGenerationMethods.join(', ')}]`);
            });
        } else {
            console.log("Response structure:", JSON.stringify(response, null, 2));
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
