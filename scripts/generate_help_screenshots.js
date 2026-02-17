import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const OUTPUT_DIR = path.join(__dirname, '../public/help_screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const tasks = [
    {
        filename: 'dashboard.png',
        prompt: "A high-fidelity screenshot of a modern marketing portal dashboard. Light theme, blue accents. Sidebar navigation on the left with icons. Main area shows widgets for 'Recent Campaigns', 'Asset Performance', and a 'Quick Actions' card. Clean, professional UI design."
    },
    {
        filename: 'image_generator.png',
        prompt: "A high-fidelity screenshot of an AI Image Generator tool interface. Left sidebar. Main content has a form with fields for 'Prompt', 'Audience', 'Campaign Type'. A large placeholder area on the right for the generated image. Professional SaaS UI style."
    },
    {
        filename: 'image_resizer.png',
        prompt: "A high-fidelity screenshot of an Image Resizer tool. Interface shows a drag-and-drop upload zone in the center. Sidebar options for selecting aspect ratios like '16:9', '1:1', '9:16'. A preview of a resized banner is visible. Clean white and blue UI."
    },
    {
        filename: 'template_builder.png',
        prompt: "A high-fidelity screenshot of a Template Builder interface. A canvas in the center showing a marketing banner design with editable text boxes. Toolbar on the top with formatting options. Sidebar on the right for layer management. Professional design tool look."
    },
    {
        filename: 'history.png',
        prompt: "A high-fidelity screenshot of a 'History' or 'Activity Log' page in a web app. A data table listing past generated images with columns for 'Date', 'Type', 'Status' (Completed/Processing), and an 'Actions' column. Thumbnails of images are visible in the rows."
    },
    {
        filename: 'admin_users.png',
        prompt: "A high-fidelity screenshot of an Admin User Management screen. A table listing users with avatars, names, roles (Admin/User), and status. A 'Add User' button in the top right. Clean data grid layout."
    }
];

async function generateScreenshot(task) {
    console.log(`Generating ${task.filename}...`);
    try {
        const response = await client.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: [{
                role: "user",
                parts: [{ text: task.prompt }]
            }],
            config: {
                responseModalities: ["IMAGE", "TEXT"],
                imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: "1K"
                }
            }
        });

        const candidates = response?.candidates;
        if (candidates && candidates.length > 0) {
            const part = candidates[0].content.parts.find(p => p.inlineData);
            if (part && part.inlineData && part.inlineData.data) {
                const buffer = Buffer.from(part.inlineData.data, 'base64');
                fs.writeFileSync(path.join(OUTPUT_DIR, task.filename), buffer);
                console.log(`Saved ${task.filename}`);
                return;
            }
        }
        console.error(`Failed to generate image for ${task.filename}: No image data found.`);
    } catch (error) {
        console.error(`Error generating ${task.filename}:`, error.message);
    }
}

async function run() {
    console.log(`Starting generation of ${tasks.length} screenshots...`);
    // Run sequentially to avoid rate limits if any
    for (const task of tasks) {
        await generateScreenshot(task);
    }
    console.log("All tasks completed.");
}

run();
