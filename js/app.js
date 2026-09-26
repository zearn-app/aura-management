import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ============================================================
// FIREBASE CONFIG
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBOU5TRy80JkKhWEwbNIe9Ei5-e_QztN3k",
  authDomain: "zearn-app.firebaseapp.com",
  projectId: "zearn-app",
  storageBucket: "zearn-app.firebasestorage.app",
  messagingSenderId: "212045636123",
  appId: "1:212045636123:web:495ba5939bdc5c89050ebe",
  measurementId: "G-GMLDVHFFLN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("✅ Firebase initialized");

// ============================================================
// WASTE TYPES BY CATEGORY
// ============================================================
const wasteTypesByCategory = {
  fertilizer: [
    "Vegetable peels",
    "Fruit waste",
    "Rice & grains",
    "Bread & bakery",
    "Tea leaves",
    "Coffee grounds",
    "Egg shells",
    "Leaves & grass"
  ],
  biogas: [
    "Vegetable peels",
    "Fruit waste",
    "Rice & grains",
    "Meat waste",
    "Dairy waste",
    "Oil & grease",
    "Paper & cardboard",
    "Plant waste"
  ]
};

// ============================================================
// SVG TEMPLATES
// ============================================================
const svgTemplates = {
  fertilizer: '<svg viewBox="0 0 200 160"><ellipse cx="100" cy="142" rx="85" ry="12" fill="var(--soil-dark)"/><path d="M55 140 L60 90 Q60 78 72 78 L128 78 Q140 78 140 90 L145 140Z" fill="var(--clay)"/><path d="M60 90 L140 90" stroke="var(--clay-dark)" stroke-width="3"/><path d="M78 60 Q100 40 122 60" stroke="var(--leaf-dark)" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="100" cy="50" r="10" fill="var(--leaf)"/><circle cx="85" cy="58" r="7" fill="var(--leaf)"/><circle cx="115" cy="58" r="7" fill="var(--leaf)"/></svg>',
  biogas: '<svg viewBox="0 0 200 160"><ellipse cx="100" cy="142" rx="85" ry="12" fill="var(--soil-dark)"/><rect x="65" y="70" width="70" height="65" rx="10" fill="var(--moss)"/><circle cx="100" cy="70" r="30" fill="var(--moss-light)"/><path d="M92 50 q10 -10 4 -22 q14 8 10 24 q-2 10 -14 8Z" fill="var(--leaf)"/><rect x="94" y="128" width="12" height="16" fill="var(--clay-dark)"/></svg>'
};

// ============================================================
// STATE
// ============================================================
let currentCategory = null;
let selectedWasteTypes = [];
let userLocation = null;
let userLocationShared = false;

// ============================================================
// SCREEN TRANSITIONS
// ============================================================
const screens = {
  opening: document.getElementById("screen-opening"),
  welcome: document.getElementById("screen-welcome"),
  credits: document.getElementById("screen-credits"),
  main: document.getElementById("site-main")
};

let screenIndex = 0;
const screenOrder = ["opening", "welcome", "credits", "main"];

function showScreen(name) {
  Object.values(screens).forEach(screen => screen?.classList.remove("is-active"));
  screens[name]?.classList.add("is-active");
}

function nextScreen() {
  screenIndex++;
  if (screenIndex < screenOrder.length) {
    showScreen(screenOrder[screenIndex]);
  }
}

document.getElementById("btn-click-here").addEventListener("click", () => {
  nextScreen();
});

// ============================================================
// SCROLL HINT
// ============================================================
const scrollHint = document.getElementById("scroll-hint");
window.addEventListener("scroll", () => {
  if (window.scrollY > 100) {
    scrollHint?.classList.add("hidden");
  } else {
    scrollHint?.classList.remove("hidden");
  }
});

// ============================================================
// FOOD WASTE FLOW
// ============================================================
const foodWasteCard = document.getElementById("card-foodwaste");
const choiceSection = document.getElementById("section-choice");
const foodWasteOverlay = document.getElementById("overlay-foodwaste");

document.querySelector(".btn-open-foodwaste").addEventListener("click", () => {
  foodWasteOverlay.classList.add("active");
});

document.getElementById("btn-foodwaste-continue").addEventListener("click", () => {
  foodWasteOverlay.classList.remove("active");
  // Hide food waste card, show choice cards
  foodWasteCard.style.display = "none";
  choiceSection.style.display = "block";
  // Scroll to choice section
  setTimeout(() => {
    choiceSection.scrollIntoView({ behavior: "smooth" });
  }, 300);
});

// ============================================================
// FERTILIZER / BIOGAS CHOICE
// ============================================================
document.querySelectorAll(".card--choice").forEach(card => {
  card.addEventListener("click", () => {
    const target = card.getAttribute("data-target");
    currentCategory = target;
    openChecklistOverlay(target);
  });
});

// ============================================================
// CHECKLIST OVERLAY
// ============================================================
const checklistOverlay = document.getElementById("overlay-checklist");
const checklistForm = document.getElementById("checklist-form");
const checklistTitle = document.getElementById("checklist-title");
const checklistArt = document.getElementById("checklist-art");
const checklistError = document.getElementById("checklist-error");

function openChecklistOverlay(category) {
  currentCategory = category;
  selectedWasteTypes = [];

  // Update title
  checklistTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);

  // Update art
  checklistArt.innerHTML = svgTemplates[category];

  // Build checklist
  checklistForm.innerHTML = "";
  wasteTypesByCategory[category].forEach((wasteType, index) => {
    const id = `waste-${index}`;
    checklistForm.innerHTML += `
      <label class="field">
        <input type="checkbox" id="${id}" value="${wasteType}">
        <span>${wasteType}</span>
      </label>
    `;
  });

  checklistError.classList.remove("show");
  checklistOverlay.classList.add("active");
}

document.getElementById("btn-checklist-buy").addEventListener("click", () => {
  selectedWasteTypes = [];
  checklistForm.querySelectorAll("input[type='checkbox']:checked").forEach(checkbox => {
    selectedWasteTypes.push(checkbox.value);
  });

  if (selectedWasteTypes.length === 0) {
    checklistError.classList.add("show");
    return;
  }

  checklistOverlay.classList.remove("active");
  openDetailsOverlay();
});

// ============================================================
// DETAILS OVERLAY
// ============================================================
const detailsOverlay = document.getElementById("overlay-details");
const detailsForm = document.getElementById("details-form");
const selectedSummary = document.getElementById("selected-summary");
const btnShareLocation = document.getElementById("btn-share-location");
const locationBtnLabel = document.getElementById("location-btn-label");
const locationStatus = document.getElementById("location-status");
const submitError = document.getElementById("submit-error");

function openDetailsOverlay() {
  // Show selected waste types
  selectedSummary.innerHTML = selectedWasteTypes
    .map(type => `<li>${type}</li>`)
    .join("");

  detailsForm.reset();
  userLocation = null;
  userLocationShared = false;
  locationBtnLabel.textContent = "Share Live Location";
  locationStatus.classList.remove("show");

  submitError.textContent = "";
  detailsOverlay.classList.add("active");
}

// Location sharing
btnShareLocation.addEventListener("click", async (e) => {
  e.preventDefault();

  if ("geolocation" in navigator) {
    locationBtnLabel.textContent = "Getting location...";
    locationStatus.classList.add("show");
    locationStatus.textContent = "Fetching...";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy
        };
        userLocationShared = true;
        locationBtnLabel.textContent = "✓ Location Shared";
        locationStatus.textContent = `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`;
        btnShareLocation.classList.add("success");
      },
      (error) => {
        locationStatus.textContent = `Error: ${error.message}`;
        locationBtnLabel.textContent = "Share Live Location";
      }
    );
  } else {
    locationStatus.textContent = "Geolocation not supported";
    locationStatus.classList.add("show");
  }
});

// Form validation
function validateDetailsForm() {
  const email = document.getElementById("input-email").value.trim();
  const phone = document.getElementById("input-phone").value.trim();
  const address = document.getElementById("input-address").value.trim();

  let isValid = true;

  // Email
  const emailError = document.querySelector('[data-for="email"]');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailError.classList.add("show");
    isValid = false;
  } else {
    emailError.classList.remove("show");
  }

  // Phone
  const phoneError = document.querySelector('[data-for="phone"]');
  if (!phone || phone.length < 10) {
    phoneError.classList.add("show");
    isValid = false;
  } else {
    phoneError.classList.remove("show");
  }

  // Address
  const addressError = document.querySelector('[data-for="address"]');
  if (!address) {
    addressError.classList.add("show");
    isValid = false;
  } else {
    addressError.classList.remove("show");
  }

  return isValid;
}

// Submit form
detailsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitError.textContent = "";

  if (!validateDetailsForm()) {
    return;
  }

  const email = document.getElementById("input-email").value.trim();
  const phone = document.getElementById("input-phone").value.trim();
  const address = document.getElementById("input-address").value.trim();

  // Generate request ID
  const requestId = `REQ-${Date.now()}`;

  try {
    // Prepare data for Firestore
    const requestData = {
      requestId,
      category: currentCategory,
      selectedWasteTypes,
      email,
      phone,
      address,
      locationShared: userLocationShared,
      latitude: userLocation?.latitude || null,
      longitude: userLocation?.longitude || null,
      altitude: userLocation?.altitude || null,
      accuracy: userLocation?.accuracy || null,
      status: "NEW",
      createdAt: new Date()
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, "foodWasteRequests"), requestData);
    console.log("✅ Request saved:", docRef.id);

    // Close details overlay, show success
    detailsOverlay.classList.remove("active");
    showSuccessOverlay(requestId);
  } catch (error) {
    console.error("❌ Submit error:", error);
    submitError.textContent = "Error submitting. Please try again.";
  }
});

// ============================================================
// SUCCESS OVERLAY
// ============================================================
const successOverlay = document.getElementById("overlay-success");
const successRequestId = document.getElementById("success-request-id");
const successSelected = document.getElementById("success-selected");
const successLocation = document.getElementById("success-location");
const successLocationDetail = document.getElementById("success-location-detail");

function showSuccessOverlay(requestId) {
  successRequestId.textContent = requestId;

  successSelected.innerHTML = selectedWasteTypes
    .map(type => `<li>${type}</li>`)
    .join("");

  if (userLocationShared && userLocation) {
    successLocation.textContent = "✓ Location shared:";
    successLocationDetail.innerHTML = `
      Latitude: ${userLocation.latitude.toFixed(6)}<br>
      Longitude: ${userLocation.longitude.toFixed(6)}<br>
      ${userLocation.altitude ? `Altitude: ${userLocation.altitude.toFixed(1)}m<br>` : ""}
      Accuracy: ±${userLocation.accuracy.toFixed(0)}m
    `;
  } else {
    successLocation.textContent = "Location: Not shared";
    successLocationDetail.innerHTML = "";
  }

  successOverlay.classList.add("active");
}

// ============================================================
// SUCCESS OVERLAY ACTIONS
// ============================================================
document.getElementById("btn-view-solutions").addEventListener("click", () => {
  successOverlay.classList.remove("active");
  loadAndShowSolutions();
});

document.getElementById("btn-success-close").addEventListener("click", () => {
  successOverlay.classList.remove("active");
  resetFlow();
});

// ============================================================
// SOLUTIONS OVERLAY
// ============================================================
const solutionsOverlay = document.getElementById("overlay-solutions");
const solutionsList = document.getElementById("solutions-list");
const solutionsStatus = document.getElementById("solutions-status");

async function loadAndShowSolutions() {
  solutionsList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-light);">Loading solutions...</div>';
  solutionsOverlay.classList.add("active");

  try {
    const productsRef = collection(db, "products");
    const q = query(productsRef);
    const snapshot = await getDocs(q);

    const products = [];
    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    if (products.length === 0) {
      solutionsStatus.textContent = "No solutions available right now.";
      solutionsList.innerHTML = "";
      return;
    }

    solutionsStatus.textContent = `Found ${products.length} solution(s) for your waste type:`;
    solutionsList.innerHTML = products
      .map(product => `
        <div class="product-card">
          ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.productName}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">` : ""}
          <h4>${product.productName || "Untitled"}</h4>
          <p>${product.description || "No description"}</p>
          <div class="product-price">₹${product.price || "N/A"}</div>
          <span class="status ${product.active ? "" : "off"}">${product.active ? "ACTIVE" : "INACTIVE"}</span>
        </div>
      `)
      .join("");
  } catch (error) {
    console.error("❌ Error loading solutions:", error);
    solutionsStatus.textContent = "Error loading solutions. Please try again.";
    solutionsList.innerHTML = "";
  }
}

document.getElementById("btn-solutions-close").addEventListener("click", () => {
  solutionsOverlay.classList.remove("active");
  resetFlow();
});

// ============================================================
// RESET FLOW
// ============================================================
function resetFlow() {
  // Reset state
  currentCategory = null;
  selectedWasteTypes = [];
  userLocation = null;
  userLocationShared = false;

  // Show food waste card again
  foodWasteCard.style.display = "block";
  choiceSection.style.display = "none";

  // Scroll to top
  document.getElementById("section-foodwaste").scrollIntoView({ behavior: "smooth" });
}

console.log("✅ App initialized and ready");
