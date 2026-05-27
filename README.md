# FloraScape
## Phase 1 — MVP

**Goal:** Basic garden generation

### Landing Page

* Pleasant green color palette
* Cozy farming game aesthetic (Stardew Valley vibe)
* Cartoonish / handwritten font

### Prompt Questionnaire

Users select the types of plants they want in their garden. Include info icons for tooltips with examples

```
[ ] Flowers
[ ] Vegetables
[ ] Herbs
[ ] Medicinal Plants
[ ] Basic Plants
[ ] All of the above
```

### Location Input

* Zipcode input
* Used for weather and environmental data via API

### AI Prompt Generation

Example prompt structure sent to the AI system:

```
Generate a layout for a garden based on the following criteria:

Location: 07030
Garden Type: Raised beds
Sun Exposure: Partial Shade
Size: 10x12 feet

Plants:
- Herbs
- Flowers

Preferences:
Lavender, tomatoes, pollinator friendly
Budget conscious

Keep in mind what the preferences are and provide any tips about what plants require more shade or should not be planted next to each other.

If the user does not provide preferences based on the plants they selected, include your own suggestions based on the provided details.
```
Need to test which inputs can be optional vs required. 

### Image Generation

* Generate a **basic garden layout image**
* Visual representation of beds, plants, and spacing

---

## Phase 2 — Layout Editing

* Drag-and-drop garden editor
* Editable garden beds
* Plant icons for visual placement
* Save design functionality

---

## Phase 3 — Accounts

* User authentication
* Profile settings
* Saved gardens library

---

## Phase 4 — Community

* Upload real garden photos
* Share generated designs
* Inspiration feed for browsing other gardens
