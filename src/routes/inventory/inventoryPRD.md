# Unified Inventory Management System – PRD (Complete v1.4)  
**Svelte 5 + shadcn-svelte (latest)**  
Date: 17 Jul 2025 – now with **all requested enhancements**

---

## 1. Vision  
A **warehouse-grade** single-page inventory system that matches the React UI **exactly**, then adds: barcode scanning, proactive reordering, negative-stock lock, fast multi-product entry, and flexible exports.

---

## 2. Functional Scope (Feature Inventory)

| # | Feature | Core Job | UI Pattern | Entry Point |
|---|---|---|---|---|
| 1 | **Stock Status** | KPIs, search, filters, **Card ↔ Table toggle**, **bulk edit** | KPI cards + grid/table + checkboxes | `/inventory/stock` |
| 2 | **Product Entry** | Create products **+ Save & Add Another** | 3-tab modal (Basic, Variants, Bundle, Inventory) | `/inventory/products` |
| 3 | **Returns Processing** | Approve / reject returns | List → detail modal → notes modal | `/inventory/returns` |
| 4 | **Receiving (PO)** | Guided check-in + **barcode scan** + photo upload | 3-step wizard | `/inventory/receiving` |
| 5 | **Inventory Adjustment** | Correct counts **+ negative-stock lock** | Search table → modal with live preview | `/inventory/adjustments` |
| 6 | **Reorder Report** | **Proactive reorder list** | Dedicated tab + smart chip | `/inventory/reorder` |
| 7 | **Data Export** | Custom CSV (current view / stock-take) | Export modal | Global on every table |

---

## 3. Navigation & Routing

| Path | Description |
|---|---|
| `/inventory/stock` | Stock dashboard |
| `/inventory/products` | Product management |
| `/inventory/returns` | Customer returns |
| `/inventory/receiving` | Purchase-order receiving |
| `/inventory/adjustments` | Stock adjustments |
| `/inventory/reorder` | Reorder report |

---

## 4. Detailed Specs per Feature (exact + new)

### 4.1 Stock Status (`/inventory/stock`)
- **KPI Cards** (Total SKUs, Total Units, Low-Stock, Out-of-Stock).  
- **Search bar** (auto-trigger on scanner `Enter`).  
- **Category chips** (multi-select).  
- **Sort dropdown** (name, stock, price).  
- **Card ↔ Table toggle** (persisted in local store).  
- **Empty state** with “Clear Filters” button.  
- **Smart Reorder Chip** (badge “Items to Reorder (n)”)—click routes to `/inventory/reorder`.

### 4.2 Product Entry (`/inventory/products`)
**“+ Add New Product” opens 3-tab modal:**

| Tab | Fields |
|---|---|
| **Basic** | Name*, SKU*, Description, Price*, Category*, Image URL (live preview), **real-time SKU uniqueness check**. |
| **Variants** | Master toggle; grid generator (color / size / weight) → auto-suffixed SKUs. |
| **Bundle** | Multi-select table of components + qty. |
| **Inventory** | Initial stock, reorder point, aisle location. |

- **Buttons in footer**:  
  - **Save** (closes modal).  
  - **Save & Add Another** (submits, clears form, keeps modal open).  
- Image preview updates on URL change with fallback.

### 4.3 Receiving (`/inventory/receiving`)
**PO List** → **Receive** button  
**Wizard Modal (3-step stepper)**

| Step | Elements |
|---|---|
| 1. Verification | Carrier, tracking, **photo upload (file drop-zone)**, package condition toggle. |
| 2. Items | Table with SKU, Name, Expected, **editable Received qty**, **“All items received”** shortcut, **barcode scanner input** auto-focuses first empty field. |
| 3. Confirmation | Summary table (ordered vs received vs variance), notes textarea, progress spinner on submit. |

### 4.4 ReturnsProcessing (`/inventory/returns`)
- Searchable list → **row click → detail modal**.  
- **Approve / Reject** buttons (pending only) → notes modal → toast.  
- Search inputs support **barcode scanner**.

### 4.5 InventoryAdjustment (`/inventory/adjustments`)
- Searchable table → **“Adjust”** per row.  
- Modal:  
  - Current stock label.  
  - Adjustment type toggle (Add / Remove / Set).  
  - Quantity input.  
  - **Negative Stock Lock**: switch “Allow negative stock” (default OFF).  
  - Reason dropdown (spoilage, damage, theft, recount, expiry).  
  - Notes textarea.  
  - **Live new-stock preview** (updates on every keystroke).  
- **Bulk adjust toggle** (multi-row selection → single modal with shared fields).  
- Search inputs support **barcode scanner**.

### 4.6 Reorder Report (`/inventory/reorder`)
- **Dedicated tab** + **smart chip** in StockStatus.  
- Table columns: SKU | Name | Current Stock | Reorder Point | Supplier | Aisle | **“Create PO”** button per row.  
- **Export** button (see 4.7).

### 4.7 Data Export
- **Export button** on every table header.  
- **ExportModal** options:  
  - **Current View CSV** (filters + visible columns).  
  - **Stock-take CSV** (SKU, Name, Location, empty CountedQty column).  
- Filename: `inventory-{YYYY-MM-DD}-{type}.csv`.

---

## 5. UI & UX Patterns

| Pattern | Component |
|---|---|
| Tabs | `Tabs` |
| Modals / Sheets | `Dialog` |
| Stepper | custom `StepIndicator` |
| Card ↔ Table Toggle | `LayoutGrid` / `List` icons + store |
| Live Preview | `$derived` |
| Negative Lock | `Switch` |
| Photo Upload | `<input type="file" multiple accept="image/*">` |
| Empty State | “Clear Filters” button |
| Toasts | `sonner-svelte` |
| Keyboard Shortcuts | `Escape` close modal, `Enter` scan trigger |

---

## 6. Data Contracts (unchanged)

Same as v1.2-exact (generic product, bundle, variant, PO, transaction, return).

---

## 10. Deliverables

- `/lib/components/inventory/*.svelte`  
  – `StockStatus.svelte` (toggle, bulk edit, reorder chip)  
  – `ProductEntry.svelte` (3-tab modal, SKU uniqueness, Save & Add Another)  
  – `InventoryReceiving.svelte` (wizard, photo upload, barcode input, all-items shortcut)  
  – `InventoryAdjustment.svelte` (live preview, negative lock, bulk toggle)  
  – `ReturnsProcessing.svelte` (detail + action modals, barcode input)  
  – `ReorderReport.svelte` (reorder table, export)  
  – `BulkEditModal.svelte`  
  – `ExportModal.svelte`  
  – `BarcodeInput.svelte` (reusable wrapper)

- shadcn-svelte components used:  
  `Tabs`, `Dialog`, `Table`, `Card`, `Badge`, `Button`, `Input`, `Select`, `Textarea`, `Toast`, `Switch`, `Checkbox`, `StepIndicator`