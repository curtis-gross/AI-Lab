# AI Lab Testing & Verification Guide

This guide details the expected functionality and verification steps for each core feature of the AI Lab application. Use this to validate the system after any code changes.

## 1. Deal Generator (Legacy)
**Objective:** Generate a structured spreadsheet of product deals from a raw text input.

### Expected Functionality
- **Input:** Accepts raw text (e.g., "Buy 2 get 1 free on Coke").
- **Processing:** AI parses the text into a structured table (Product, Price, Promo, etc.).
- **Output:** A downloadable CSV/Excel file or a table view of the deals.
- **Persistence:** Saving `[activeTab: 'new']` history items.

### Manual Test Steps
1. Navigate to **Deal Generator**.
2. Enter text: `Coca-Cola 12pk $5.99 each when you buy 3`.
3. Click "Generate".
4. **Verify:** A table appears with "Coca-Cola" as the product and details extracted correctly.
5. **Verify:** Usage of `activeTab: 'new'` in history.

---

## 2. Deal Resizer
**Objective:** Upload a banner image and resize it into multiple social media aspect ratios (1:1, 9:16, 16:9, 4:5).

### Expected Functionality
- **Input:** User uploads a single image (JPG/PNG).
- **Processing:** System generates 4 variations (Square, Story, Landscape, Portrait).
- **Output:** A grid of 4 resized images.
- **Persistence:** Saves a history item with `type: 'deal_resizer'` and `companyId: 'manual_upload'`.

### Manual Test Steps
1. Navigate to **Deal Resizer**.
2. Upload any image.
3. Click "Generate Resizes".
4. **Verify:** 4 images appear (1:1, 9:16, 16:9, 4:5).
5. **Verify:** New entry in **History** labeled "Deal Resizer".
6. **Verify:** Clicking the history item shows the "Manual Upload" section with the 4 images.

---

## 3. Template to Banner (Creative Studio)
**Objective:** Select a pre-made template, analyze its layout, and re-create it for specific target companies using their branding.

### Expected Functionality
- **Input:** Select a Template + Select Target Companies (e.g., Kroger, Target).
- **Processing:** AI analyzes the template layout ("Geometry Lock") and re-renders it using the target company's colors/fonts/logo.
- **Output:** One banner per selected company.
- **Persistence:** Saves a history item with `type: 'template_to_banner'`.

### Manual Test Steps
1. Navigate to **Template to Banner**.
2. Select "Weekend Sale" template.
3. Select "Kroger" and "Target" as companies.
4. Click "Generate Banners".
5. **Verify:** Two results appear—one styled for Kroger (Blue), one for Target (Red).
6. **Verify:** Layout matches the original template (text positions, image placement).
7. **Verify:** New entry in **History** labeled "Template to Banner".

---

## 4. History Viewer
**Objective:** View past generations and re-download assets.

### Expected Functionality
- **Display:** Chronological list of all past runs.
- **Filtering:** Validates `type` fields ('deal_generator', 'deal_resizer', 'template_to_banner') to show correct labels.
- **Detail View:** Clicking an item opens the detail grid.
- **Persistence Check:** "Deal Resizer" items must show under "Manual Upload".

### Manual Test Steps
1. Navigate to **History**.
2. **Verify:** You see distinct badges for "Deal Resizer", "Template to Banner", etc.
3. Click the most recent "Deal Resizer" item.
4. **Verify:** It opens and displays the "Manual Upload" section with images.
5. Edit the title (pencil icon) -> rename to "Test Run" -> Click Check.
6. **Verify:** Title updates and persists on refresh.

---

## 5. Admin Panel
**Objective:** Manage Company configurations (Colors, Logos, Guidelines).

### Expected Functionality
- **CRUD:** Create, Read, Update, Delete companies.
- **Persistence:** Changes save to `storage/companies.json`.

### Manual Test Steps
1. Navigate to **Admin**.
2. Edit "Kroger" -> Change Primary Color to `#000000` (Temporarily).
3. Save.
4. Go to **Template to Banner**, generate a Kroger banner.
5. **Verify:** The new banner uses the Black color.
6. **Revert:** Change color back to original Blue in Admin.
