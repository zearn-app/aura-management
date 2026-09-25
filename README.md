# AURA MANAGEMENT — Food Waste Management
### Phase 2A — Firestore integration, Request IDs & product matching
_(Phase 1 flow preserved in full — see "What's implemented" below)_

A public-facing website where visitors submit information about food/organic
waste they have, so it can later be routed toward **fertilizer** or **biogas**
production. There is no seller/buyer selection and no login system for
public users — the seller/product side is handled separately by Hari in a
later pass.

## Project structure

```
aura-management/
├── index.html          All screens/sections of the site
├── css/
│   └── style.css       Design system + layout + animations
├── js/
│   ├── firebase-config.js   Firebase init (fill in your project keys)
│   └── app.js                Screen flow, checklist, geolocation, Firestore write
├── firestore.rules     Security rules — public create-only requests, read-only active products
├── storage.rules       Security rules — public read-only product images
├── assets/images/      Reserved for future raster assets (current art is inline SVG)
└── README.md
```

## Setup

1. **Create a Firebase project** at https://console.firebase.google.com if you
   don't have one yet.
2. **Enable Firestore** (Build → Firestore Database → Create database).
3. **Register a Web App** in Project settings → General → Your apps, and copy
   the `firebaseConfig` object.
4. Paste those values into `js/firebase-config.js`, replacing the
   `YOUR_...` placeholders.
5. **Deploy the Firestore rules** in `firestore.rules`, either by pasting
   them into the Firestore "Rules" tab in the console, or via the CLI:
   ```bash
   firebase deploy --only firestore:rules
   ```
6. **Enable Firebase Storage** (Build → Storage) and deploy `storage.rules`
   the same way (console "Rules" tab, or `firebase deploy --only storage`).
   Product images referenced by `imageUrl` should be uploaded under a
   `products/` path in the bucket.
7. Open `index.html` in a browser (or serve the folder with any static
   host / `firebase hosting`) — no build step is required, it's plain
   HTML/CSS/JS with ES modules loaded straight from the Firebase CDN.

No `npm install` and no bundler are needed. `firebase-config.js` and
`app.js` are loaded as native ES modules (`<script type="module">`), which
means the site must be served over `http(s)://`, not opened as a bare
`file://` path — use any static server, e.g. `npx serve .` or the Firebase
Hosting emulator, while developing locally.

## What's implemented (Phase 1 — preserved as-is)

- Opening screen → **AURA MANAGEMENT** → animated **Click Here**
- Welcome screen, auto-advancing after ~3 seconds
- Credit screen: *Designed by Hari* / *Work on Obra, Bharath and Pranesh*
- Animated **Scroll Down** hint that hides once the visitor scrolls
- **Food Waste** card → detail view → continue
- **Fertilizer** and **Bio Gas** cards (side-by-side on desktop, stacked on
  mobile)
- Waste-type checklists for each path, multi-select, validated before
  **Next**
- **No Seller/Buyer step** — straight from checklist to user details
- User details form: Gmail (validated), phone (validated), multiline
  address — **no password field anywhere**
- **Live Location** is fully optional: permission is only requested when
  the visitor taps **Share Live Location**; latitude/longitude/altitude are
  captured once (no continuous tracking), and a missing altitude is stored
  as `null` rather than faked
- Responsive, mobile-first layout; footer branding **By TMARK Zoros** /
  **© 2027 Zoros — All Rights Reserved.**

## What's new (Phase 2A)

- Every submission now gets a unique, user-friendly **Request ID**
  (`AW-2027-X7K92P` style — random, not sequential, so it never reveals
  submission volume), shown on the success screen.
- `category` is now stored as the public-facing label (`"Fertilizer"` or
  `"Bio Gas"`) so it can be matched directly against `products.category`.
- Submits to the `foodWasteRequests` Firestore collection with
  `serverTimestamp()`, `status: "NEW"`, and the full location object
  (or `locationShared: false` with `null` coordinates) — submission
  succeeds with or without location.
- **Duplicate-submission protection**: the Submit button disables itself
  and shows "Submitting…" the instant it's pressed, and only re-enables on
  failure.
- Success screen now shows the Request ID, the selected waste types, and —
  when location was shared — latitude/longitude/altitude (altitude shows
  "Not available" rather than a fabricated number when the device doesn't
  supply one).
- New **`products` Firestore collection** — the data foundation for Hari's
  fertilizer/biogas offerings (see shape below).
- **VIEW AVAILABLE SOLUTIONS** button on the success screen fetches
  `active` products matching the submitted category and waste types
  (fetched once, on demand — no background/continuous listeners) and
  displays them as cards, or "No matching solutions are currently
  available." if none match. The original request stays saved either way.
- Firebase write-failure handling ("Unable to submit your details right
  now. Please try again.") that keeps the entered data on screen for retry.
- Firestore security rules: `foodWasteRequests` is public **create-only**
  and schema/format-validated (including the new `requestId` pattern and
  `category` enum); `products` is public **read-only for `active: true`**
  documents. All writes to `products`, and all reads/updates/deletes of
  `foodWasteRequests`, are closed — reserved for Hari's authenticated
  management tooling in **Phase 2B**.
- New `storage.rules`: public read-only access to product images under a
  `products/` path in Storage; all uploads are closed until Phase 2B.

## Document shape — `foodWasteRequests`

```js
{
  requestId: "AW-2027-X7K92P",
  selectedWasteTypes: ["Vegetable Waste", "Rice Waste", "Tea Waste"],
  category: "Fertilizer" | "Bio Gas",
  email: "user@gmail.com",
  phone: "9876543210",
  address: "User entered address",
  locationShared: true,
  latitude: 11.123456,
  longitude: 76.123456,
  altitude: 421.5,       // or null if unavailable / not shared
  createdAt: <server timestamp>,
  status: "NEW"           // NEW | REVIEWED | CONTACTED | COLLECTED | COMPLETED | CANCELLED
}
```

## Document shape — `products`

```js
{
  productName: "Organic Fertilizer",
  category: "Fertilizer" | "Bio Gas",
  description: "Natural fertilizer produced from organic waste.",
  imageUrl: "https://firebasestorage.googleapis.com/.../products%2F...",
  availableWasteTypes: ["Vegetable Waste", "Rice Waste", "Tea Waste", "Leaf Waste"],
  active: true,
  createdAt: <server timestamp>
}
```

There's no admin UI yet (that's Phase 2B), so for now add test product
documents directly in the Firebase console: Firestore → `products` →
Add document, matching the shape above. Only documents with `active: true`
are ever readable by the public site.

## Notes for Phase 2B

- `assets/images/` is ready for real photography if you'd rather replace
  the current inline-SVG illustrations.
- Hari's authenticated management dashboard — login, creating/editing/
  deleting products, uploading product images to Storage, and managing
  request status (`REVIEWED` → `COMPLETED` etc.) — is intentionally out of
  scope for Phase 2A. The closed `write` rules on `products` and closed
  `read/update/delete` rules on `foodWasteRequests` are already waiting for
  an authenticated admin role to be layered on top in Phase 2B.
