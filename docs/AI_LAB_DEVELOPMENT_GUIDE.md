# AI Lab Development Guide

This guide provides critical instructions for future agents and developers adding new features to the AI Lab. All new generative features MUST follow these patterns to ensure consistency, persistence, and brand fidelity.

## 1. Wiring Local Storage & History Persistence

All new generative features (e.g., Image Generators, Text Analyzers) MUST persist their results to the local filesystem via the History API.

### 1.1. Backend Requirement
Ensure the backend (`server.js`) implementation of `/api/history` supports reading/writing generic JSON blobs. The current implementation stores each history item as a separate JSON file in `storage/history/{id}.json`.

### 1.2. Frontend Integration Steps

**Step 1: Update `types.ts`**
Add your new feature type to the `AppMode` enum (if applicable) and the `HistoryItem` interface.
```typescript
// types.ts
export interface HistoryItem {
  id: string;
  timestamp: number;
  tagline: string;
  type?: 'deal_generator' | 'deal_resizer' | 'template_to_banner' | 'YOUR_NEW_FEATURE'; // Add new type here
  results: GeneratedResult[];
  // ...
}
```

**Step 2: Implement Save Logic**
In your feature component (e.g., `NewFeature.tsx`), call the history API after a successful generation.

```typescript
// NewFeature.tsx
const saveToHistory = async (results: GeneratedResult[]) => {
    if (results.length === 0) return;

    const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        tagline: 'Description of generation',
        type: 'YOUR_NEW_FEATURE',
        results: results,
        companyCount: 1 // or relevant metric
    };

    try {
        await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(historyItem)
        });
        console.log("Saved to history");
    } catch (e) {
        console.error("Failed to save history", e);
    }
};
```

**Step 3: Update `HistoryViewer.tsx`**
Ensure the History Details view can gracefully render your new content type.
- Update the **Label/Badge** rendering logic to show a friendly name for your feature type.
- Ensure the `results` array is mapped correctly to the grid view (most image-based results will work with the default renderer).

---

## 2. Company Branding & Prompt Engineering Standards

To prevent "hallucinations" and ensure strict adherence to company branding, you MUST follow these specific prompting patterns when generating images.

### 2.1. Strict Layout & Geometry Lock
When modifying or recreating existing templates, you must explicitly forbid the model from changing sizes or positions.

**Required Prompt Clauses:**
```markdown
**STRICT LAYOUT & BRANDING RULES:**
1. **GEOMETRY LOCK:** You MUST NOT change the size, shape, or position of ANY element (text boxes, buttons, image frames). The layout must match the template geometry EXACTLY.
2. **TEXT SIZING:** Text MUST be sized to fit strictly within the original text boxes. Do not expand the boxes to fit the text. Shrink the text if necessary.
3. **BASE IMAGE:** The underlying image structure/composition MUST NOT CHANGE. Textures and lighting can be refined, but objects must not move.
```

### 2.2. "No Flair" Constraints
Models often add unrequested "creative" elements. You must explicitly negative-prompt these.

**Required Prompt Clauses:**
```markdown
**RESTRICTIONS:**
- DO NOT output hex codes as text.
- DO NOT change aspect ratios.
- DO NOT add new elements, "flair", sparkles, swirls, or decorations.
- DO NOT embellish the design. Keep it clean and identical to the template structure.
```

### 2.3. Color & Font Injection
Do not rely on the model to "know" the brand. You must inject the specific colors and instructions to use them for specific elements (backgrounds, buttons).

**Pattern:**
```javascript
const prompt = `
    ...
    **TEXT BACKGROUNDS:** IF the template has a solid background behind text, you MUST RECOLOR it using the **Company Primary Color** (${company.colors.primaryDark}) or **Secondary Color** (${company.colors.secondaryLight}).
    **FONTS:** Use the **Company Font** (${company.font || 'Modern Sans'}) for ALL text.
    **BUTTONS:** ALL buttons MUST be recolored to the **Company Primary Color** (${company.colors.primaryDark}).
    ...
`;
```

### 2.4. Template Context Injection
If the system supports "Auto-Analysis" (like `TemplateToBanner`), ALWAYS inject the analyzed layout constraints into the generation prompt.

```javascript
// In generation prompt
**TEMPLATE ANALYSIS & LAYOUT RULES:**
"${template.analysis || "Follow the visual structure of the template exactly."}"
```
