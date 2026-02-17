Feature Added: Image Regeneration in Resizer

The `ImageResizer` component now supports regenerating individual images with a new prompt.

**How to use:**
1.  Complete a resize task or open a past job from History.
2.  Click on any result image.
3.  A modal will appear showing the image and a text area.
4.  Enter instructions in "New Prompt Guidance" (e.g., "Make the background darker").
5.  Click "Regenerate".
6.  The image will update in place. If in History view, the change is saved.

**Technical Details:**
-   Uses `generateImageWithAssets` from `geminiService`.
-   Falls back to Image-to-Image generation if the original source upload is not available (e.g., old history items).
-   Updates `storage/history/{id}.json` when modifying history items.
