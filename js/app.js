import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/* ============================================================
   1. OPENING → WELCOME → CREDITS → MAIN SITE sequence
   ============================================================ */
const screenOpening = document.getElementById("screen-opening");
const screenWelcome = document.getElementById("screen-welcome");
const screenCredits = document.getElementById("screen-credits");
const siteMain = document.getElementById("site-main");
const scrollHint = document.getElementById("scroll-hint");

function goTo(fromEl, toEl, { auto = false, delay = 450 } = {}) {
  fromEl.classList.add("is-leaving");
  setTimeout(() => {
    fromEl.classList.remove("is-active", "is-leaving");
    toEl.classList.add("is-active");
  }, delay);
}

document.getElementById("btn-click-here").addEventListener("click", () => {
  goTo(screenOpening, screenWelcome);
  // Welcome screen auto-advances after ~3 seconds
  setTimeout(() => {
    goTo(screenWelcome, screenCredits);
    setTimeout(() => {
      screenCredits.classList.add("is-leaving");
      setTimeout(() => {
        screenCredits.classList.remove("is-active", "is-leaving");
        siteMain.classList.add("is-active");
        document.body.style.overflow = "";
      }, 500);
    }, 2600); // credits screen dwell time
  }, 3000); // welcome screen dwell time
});

// Hide scroll hint once the visitor starts scrolling
window.addEventListener("scroll", () => {
  scrollHint.classList.toggle("is-hidden", window.scrollY > 80);
}, { passive: true });

/* ============================================================
   2. FOOD WASTE detail overlay
   ============================================================ */
const overlayFoodwaste = document.getElementById("overlay-foodwaste");

function openOverlay(el) {
  el.classList.add("is-active");
  document.body.style.overflow = "hidden";
}
function closeOverlay(el) {
  el.classList.remove("is-active");
  document.body.style.overflow = "";
}

document.querySelector(".btn-open-foodwaste").addEventListener("click", () => {
  const foodWasteSection = document.getElementById("section-foodwaste");
  const choiceSection = document.getElementById("section-choice");

  // Hide Food Waste card
  foodWasteSection.classList.add("is-hidden");

  // Show Fertilizer + Bio Gas cards
  choiceSection.classList.add("is-visible");

  // Scroll to the choices
  setTimeout(() => {
    choiceSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 150);
});

document.getElementById("btn-foodwaste-continue").addEventListener("click", () => {
  closeOverlay(overlayFoodwaste);
  document.getElementById("section-choice").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ============================================================
   3. FERTILIZER / BIO GAS checklist overlay
   ============================================================ */
const WASTE_OPTIONS = {
  fertilizer: [
    "Tea Waste", "Vegetable Waste", "Rice Waste", "Bread Waste",
    "Egg Shell Waste", "Leaf Waste", "Fruit Waste", "Food Leftovers",
    "Other Organic Waste"
  ],
  biogas: [
    "Vegetable Waste", "Fruit Waste", "Rice Waste", "Food Leftovers",
    "Bread Waste", "Tea Waste", "Egg Shell Waste", "Leaf Waste",
    "All Types of Organic Waste"
  ]
};

// Internal keys ("fertilizer"/"biogas") map to the public-facing category
// label stored in Firestore and used to match against product documents.
const CATEGORY_LABELS = {
  fertilizer: "Fertilizer",
  biogas: "Bio Gas"
};

const overlayChecklist = document.getElementById("overlay-checklist");
const checklistTitle = document.getElementById("checklist-title");
const checklistForm = document.getElementById("checklist-form");
const checklistError = document.getElementById("checklist-error");
const checklistArt = document.getElementById("checklist-art");

const ART = {
  fertilizer: `<svg viewBox="0 0 200 160"><ellipse cx="100" cy="142" rx="85" ry="12" fill="var(--soil-dark)"/><path d="M55 140 L60 90 Q60 78 72 78 L128 78 Q140 78 140 90 L145 140Z" fill="var(--clay)"/><path d="M60 90 L140 90" stroke="var(--clay-dark)" stroke-width="3"/><path d="M78 60 Q100 40 122 60" stroke="var(--leaf-dark)" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="100" cy="50" r="10" fill="var(--leaf)"/></svg>`,
  biogas: `<svg viewBox="0 0 200 160"><ellipse cx="100" cy="142" rx="85" ry="12" fill="var(--soil-dark)"/><rect x="65" y="70" width="70" height="65" rx="10" fill="var(--moss)"/><circle cx="100" cy="70" r="30" fill="var(--moss-light)"/><path d="M92 50 q10 -10 4 -22 q14 8 10 24 q-2 10 -14 8Z" fill="var(--leaf)"/></svg>`
};

let currentCategory = null; // "fertilizer" | "biogas"
let selectedTypes = [];

function openChecklist(category) {
  currentCategory = category;
  checklistTitle.textContent = category === "fertilizer" ? "Fertilizer" : "Bio Gas";
  checklistArt.innerHTML = ART[category];
  checklistForm.innerHTML = WASTE_OPTIONS[category].map((label, i) => `
    <label>
      <input type="checkbox" name="waste" value="${label}" id="waste-${category}-${i}">
      <span>${label}</span>
    </label>
  `).join("");
  checklistError.classList.remove("is-visible");
  openOverlay(overlayChecklist);
}

document.getElementById("card-fertilizer").addEventListener("click", () => openChecklist("fertilizer"));
document.getElementById("card-biogas").addEventListener("click", () => openChecklist("biogas"));

document.getElementById("btn-checklist-next").addEventListener("click", () => {
  const checked = Array.from(checklistForm.querySelectorAll("input[name='waste']:checked"))
    .map(i => i.value);

  if (checked.length === 0) {
    checklistError.classList.add("is-visible");
    return;
  }

  selectedTypes = checked;
  checklistError.classList.remove("is-visible");
  closeOverlay(overlayChecklist);
  openDetailsOverlay();
});

/* ============================================================
   4. USER DETAILS overlay + validation
   ============================================================ */
const overlayDetails = document.getElementById("overlay-details");
const selectedSummary = document.getElementById("selected-summary");
const detailsForm = document.getElementById("details-form");
const inputEmail = document.getElementById("input-email");
const inputPhone = document.getElementById("input-phone");
const inputAddress = document.getElementById("input-address");
const submitBtn = document.getElementById("btn-submit");
const submitError = document.getElementById("submit-error");

function openDetailsOverlay() {
  selectedSummary.innerHTML = selectedTypes.map(t => `<li>✓ ${t}</li>`).join("");
  openOverlay(overlayDetails);
}

function showFieldError(input, show) {
  input.classList.toggle("is-invalid", show);
  const msg = detailsForm.querySelector(`.field-error[data-for="${input.id.replace("input-", "")}"]`);
  if (msg) msg.classList.toggle("is-visible", show);
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function isValidPhone(v) {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/* ---- unique, user-friendly Request ID (e.g. AW-2027-X7K92P) ---- */
function generateRequestId() {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomValues = new Uint8Array(6);
  crypto.getRandomValues(randomValues);
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[randomValues[i] % chars.length];
  return `AW-${year}-${code}`;
}

/* ---- optional live location ---- */
const btnShareLocation = document.getElementById("btn-share-location");
const locationLabel = document.getElementById("location-btn-label");
const locationStatus = document.getElementById("location-status");

let locationData = {
  locationShared: false,
  latitude: null,
  longitude: null,
  altitude: null
};

btnShareLocation.addEventListener("click", () => {
  if (!("geolocation" in navigator)) {
    locationStatus.textContent = "Location is not supported on this device.";
    locationStatus.classList.add("is-error");
    return;
  }
  locationLabel.textContent = "Getting location…";
  locationStatus.textContent = "";
  locationStatus.classList.remove("is-error");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, altitude } = position.coords;
      locationData = {
        locationShared: true,
        latitude,
        longitude,
        altitude: (altitude === null || altitude === undefined) ? null : altitude
      };
      locationLabel.textContent = "Location Shared ✓";
      locationStatus.textContent = "Your current location has been captured.";
    },
    (err) => {
      locationLabel.textContent = "Share Live Location";
      locationStatus.textContent = "Location was not shared. You can still submit without it.";
      locationStatus.classList.add("is-error");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

/* ---- submit ---- */
detailsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitError.textContent = "";

  const emailOk = isValidEmail(inputEmail.value);
  const phoneOk = isValidPhone(inputPhone.value);
  const addressOk = inputAddress.value.trim().length > 0;

  showFieldError(inputEmail, !emailOk);
  showFieldError(inputPhone, !phoneOk);
  showFieldError(inputAddress, !addressOk);

  if (!emailOk || !phoneOk || !addressOk) return;

  submitBtn.disabled = true;
  submitBtn.querySelector("span").textContent = "Submitting…";

  const categoryLabel = CATEGORY_LABELS[currentCategory] || currentCategory;
  const requestId = generateRequestId();

  try {
    await addDoc(collection(db, "foodWasteRequests"), {
      requestId,
      selectedWasteTypes: selectedTypes,
      category: categoryLabel,
      email: inputEmail.value.trim(),
      phone: inputPhone.value.trim(),
      address: inputAddress.value.trim(),
      locationShared: locationData.locationShared,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      altitude: locationData.altitude,
      createdAt: serverTimestamp(),
      status: "NEW"
    });

    // Keep the just-submitted details around so "View Available Solutions"
    // can match products without re-reading form state that's about to reset.
    lastSubmission = {
      requestId,
      category: categoryLabel,
      selectedWasteTypes: [...selectedTypes],
      locationShared: locationData.locationShared,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      altitude: locationData.altitude
    };

    closeOverlay(overlayDetails);
    showSuccess(lastSubmission);
    detailsForm.reset();
    locationData = { locationShared: false, latitude: null, longitude: null, altitude: null };
    locationLabel.textContent = "Share Live Location";
    locationStatus.textContent = "";
  } catch (err) {
    console.error(err);
    submitError.textContent = "Unable to submit your details right now. Please try again.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector("span").textContent = "Submit";
  }
});

/* ============================================================
   5. SUCCESS overlay
   ============================================================ */
const overlaySuccess = document.getElementById("overlay-success");
const successRequestId = document.getElementById("success-request-id");
const successSelected = document.getElementById("success-selected");
const successLocation = document.getElementById("success-location");
const successLocationDetail = document.getElementById("success-location-detail");
const btnViewSolutions = document.getElementById("btn-view-solutions");

let lastSubmission = null;

function formatAltitude(altitude) {
  return (altitude === null || altitude === undefined)
    ? "Not available"
    : `${altitude.toFixed(1)} m`;
}

function showSuccess(submission) {
  successRequestId.textContent = submission.requestId;
  successSelected.innerHTML = submission.selectedWasteTypes.map(t => `<li>✓ ${t}</li>`).join("");

  if (submission.locationShared) {
    successLocation.textContent = "Location: Shared successfully";
    successLocationDetail.innerHTML = `
      <span>Latitude: ${submission.latitude}</span>
      <span>Longitude: ${submission.longitude}</span>
      <span>Altitude: ${formatAltitude(submission.altitude)}</span>
    `;
    successLocationDetail.classList.add("is-visible");
  } else {
    successLocation.textContent = "Location: Not provided";
    successLocationDetail.innerHTML = "";
    successLocationDetail.classList.remove("is-visible");
  }

  openOverlay(overlaySuccess);
}

document.getElementById("btn-success-close").addEventListener("click", () => {
  closeOverlay(overlaySuccess);

  lastSubmission = null;
  selectedTypes = [];
  currentCategory = null;

  const foodWasteSection = document.getElementById("section-foodwaste");
  const choiceSection = document.getElementById("section-choice");

  // Reset main selection screen
  foodWasteSection.classList.remove("is-hidden");
  choiceSection.classList.remove("is-visible");

  // Return to Food Waste section
  setTimeout(() => {
    foodWasteSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 100);
});

/* ============================================================
   6. PRODUCT MATCHING — "View Available Solutions"
   ============================================================ */
const overlaySolutions = document.getElementById("overlay-solutions");
const solutionsList = document.getElementById("solutions-list");
const solutionsStatus = document.getElementById("solutions-status");

btnViewSolutions.addEventListener("click", async () => {
  if (!lastSubmission) return;
  openOverlay(overlaySolutions);
  solutionsList.innerHTML = "";
  solutionsStatus.textContent = "Loading available solutions…";
  solutionsStatus.classList.remove("is-error");

  try {
    // Only fetched on demand — no background/continuous Firestore reads.
    const q = query(
      collection(db, "products"),
      where("active", "==", true),
      where("category", "==", lastSubmission.category)
    );
    const snapshot = await getDocs(q);

    const matches = [];
    snapshot.forEach((docSnap) => {
      const product = docSnap.data();
      const wasteTypes = Array.isArray(product.availableWasteTypes) ? product.availableWasteTypes : [];
      const overlaps = wasteTypes.some(t => lastSubmission.selectedWasteTypes.includes(t));
      if (overlaps) matches.push(product);
    });

    if (matches.length === 0) {
      solutionsStatus.textContent = "No matching solutions are currently available.";
      return;
    }

    solutionsStatus.textContent = "";
    solutionsList.innerHTML = matches.map(renderProductCard).join("");
  } catch (err) {
    console.error(err);
    solutionsStatus.textContent = "Unable to load solutions right now. Please try again.";
    solutionsStatus.classList.add("is-error");
  }
});

function renderProductCard(product) {
  const waste = Array.isArray(product.availableWasteTypes) ? product.availableWasteTypes : [];
  const img = product.imageUrl
    ? `<img src="${product.imageUrl}" alt="${product.productName || ""}" loading="lazy">`
    : `<div class="product-card-art-fallback" aria-hidden="true"></div>`;

  return `
    <article class="product-card">
      <div class="product-card-art">${img}</div>
      <div class="product-card-body">
        <span class="product-card-category">${product.category || ""}</span>
        <h4>${product.productName || "Untitled product"}</h4>
        <p>${product.description || ""}</p>
        <p class="product-card-suitable-label">Suitable for:</p>
        <ul class="product-card-waste">
          ${waste.map(w => `<li>${w}</li>`).join("")}
        </ul>
        <span class="product-card-available">Available</span>
      </div>
    </article>
  `;
}

document.getElementById("btn-solutions-close").addEventListener("click", () => {
  closeOverlay(overlaySolutions);
});
