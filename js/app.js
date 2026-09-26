import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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

let app, db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("✅ Firebase initialized");
} catch (error) {
  console.error("❌ Firebase error:", error);
}

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
let screens = {};
let screenIndex = 0;
const screenOrder = ["opening", "welcome", "credits", "main"];

function initializeScreens() {
  screens = {
    opening: document.getElementById("screen-opening"),
    welcome: document.getElementById("screen-welcome"),
    credits: document.getElementById("screen-credits"),
    main: document.getElementById("site-main")
  };
  console.log("✅ Screens initialized");
}

function showScreen(name) {
  Object.values(screens).forEach(screen => {
    if (screen) screen.classList.remove("is-active");
  });
  if (screens[name]) {
    screens[name].classList.add("is-active");
    console.log(`📺 Showing screen: ${name}`);
  }
}

function nextScreen() {
  screenIndex++;
  if (screenIndex < screenOrder.length) {
    showScreen(screenOrder[screenIndex]);
  }
}

// ============================================================
// INITIALIZE APP
// ============================================================
function initApp() {
  console.log("🚀 Initializing app...");

  // Initialize screens
  initializeScreens();

  // ========== SCREEN TRANSITIONS ==========
  const btnClickHere = document.getElementById("btn-click-here");
  if (btnClickHere) {
    btnClickHere.addEventListener("click", () => {
      console.log("🔘 Click Here button pressed");
      nextScreen();
    });
    console.log("✅ Click Here button listener attached");
  } else {
    console.error("❌ btn-click-here not found");
  }

  // ========== SCROLL HINT ==========
  const scrollHint = document.getElementById("scroll-hint");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 100) {
      scrollHint?.classList.add("hidden");
    } else {
      scrollHint?.classList.remove("hidden");
    }
  });

  // ========== FOOD WASTE FLOW ==========
  const foodWasteCard = document.getElementById("card-foodwaste");
  const choiceSection = document.getElementById("section-choice");
  const foodWasteOverlay = document.getElementById("overlay-foodwaste");

  const btnOpenFoodWaste = document.querySelector(".btn-open-foodwaste");
  if (btnOpenFoodWaste) {
    btnOpenFoodWaste.addEventListener("click", () => {
      console.log("🥬 Food waste card clicked");
      foodWasteOverlay.classList.add("active");
    });
  }

  const btnFoodWasteContinue = document.getElementById("btn-foodwaste-continue");
  if (btnFoodWasteContinue) {
    btnFoodWasteContinue.addEventListener("click", () => {
      console.log("✓ Food waste continue clicked");
      foodWasteOverlay.classList.remove("active");
      if (foodWasteCard) foodWasteCard.style.display = "none";
      if (choiceSection) choiceSection.style.display = "block";
      setTimeout(() => {
        choiceSection?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    });
  }

  // ========== FERTILIZER / BIOGAS CHOICE ==========
  document.querySelectorAll(".card--choice").forEach(card => {
    card.addEventListener("click", () => {
      const target = card.getAttribute("data-target");
      console.log(`🌱 Selected category: ${target}`);
      currentCategory = target;
      openChecklistOverlay(target);
    });
  });

  // ========== CHECKLIST OVERLAY ==========
  const checklistOverlay = document.getElementById("overlay-checklist");
  const checklistForm = document.getElementById("checklist-form");
  const checklistTitle = document.getElementById("checklist-title");
  const checklistArt = document.getElementById("checklist-art");
  const checklistError = document.getElementById("checklist-error");

  function openChecklistOverlay(category) {
    currentCategory = category;
    selectedWasteTypes = [];

    if (checklistTitle) {
      checklistTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    }

    if (checklistArt) {
      checklistArt.innerHTML = svgTemplates[category];
    }

    if (checklistForm) {
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
    }

    if (checklistError) {
      checklistError.classList.remove("show");
    }

    if (checklistOverlay) {
      checklistOverlay.classList.add("active");
    }
  }

  const btnChecklistBuy = document.getElementById("btn-checklist-buy");
  if (btnChecklistBuy) {
    btnChecklistBuy.addEventListener("click", () => {
      selectedWasteTypes = [];
      checklistForm.querySelectorAll("input[type='checkbox']:checked").forEach(checkbox => {
        selectedWasteTypes.push(checkbox.value);
      });

      if (selectedWasteTypes.length === 0) {
        if (checklistError) checklistError.classList.add("show");
        return;
      }

      if (checklistOverlay) checklistOverlay.classList.remove("active");
      openDetailsOverlay();
    });
  }

  // ========== DETAILS OVERLAY ==========
  const detailsOverlay = document.getElementById("overlay-details");
  const detailsForm = document.getElementById("details-form");
  const selectedSummary = document.getElementById("selected-summary");
  const btnShareLocation = document.getElementById("btn-share-location");
  const locationBtnLabel = document.getElementById("location-btn-label");
  const locationStatus = document.getElementById("location-status");
  const submitError = document.getElementById("submit-error");

  function openDetailsOverlay() {
    if (selectedSummary) {
      selectedSummary.innerHTML = selectedWasteTypes
        .map(type => `<li>${type}</li>`)
        .join("");
    }

    if (detailsForm) {
      detailsForm.reset();
    }

    userLocation = null;
    userLocationShared = false;

    if (locationBtnLabel) locationBtnLabel.textContent = "Share Live Location";
    if (locationStatus) locationStatus.classList.remove("show");
    if (submitError) submitError.textContent = "";

    if (detailsOverlay) {
      detailsOverlay.classList.add("active");
    }
  }

  // Location sharing
  if (btnShareLocation) {
    btnShareLocation.addEventListener("click", async (e) => {
      e.preventDefault();

      if ("geolocation" in navigator) {
        if (locationBtnLabel) locationBtnLabel.textContent = "Getting location...";
        if (locationStatus) {
          locationStatus.classList.add("show");
          locationStatus.textContent = "Fetching...";
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            userLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude,
              accuracy: position.coords.accuracy
            };
            userLocationShared = true;
            if (locationBtnLabel) locationBtnLabel.textContent = "✓ Location Shared";
            if (locationStatus) {
              locationStatus.textContent = `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`;
            }
            if (btnShareLocation) btnShareLocation.classList.add("success");
            console.log("📍 Location captured:", userLocation);
          },
          (error) => {
            if (locationStatus) {
              locationStatus.textContent = `Error: ${error.message}`;
            }
            if (locationBtnLabel) locationBtnLabel.textContent = "Share Live Location";
            console.error("❌ Location error:", error);
          }
        );
      } else {
        if (locationStatus) {
          locationStatus.textContent = "Geolocation not supported";
          locationStatus.classList.add("show");
        }
      }
    });
  }

  // Form validation
  function validateDetailsForm() {
    const email = document.getElementById("input-email").value.trim();
    const phone = document.getElementById("input-phone").value.trim();
    const address = document.getElementById("input-address").value.trim();

    let isValid = true;

    const emailError = document.querySelector('[data-for="email"]');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (emailError) emailError.classList.add("show");
      isValid = false;
    } else {
      if (emailError) emailError.classList.remove("show");
    }

    const phoneError = document.querySelector('[data-for="phone"]');
    if (!phone || phone.length < 10) {
      if (phoneError) phoneError.classList.add("show");
      isValid = false;
    } else {
      if (phoneError) phoneError.classList.remove("show");
    }

    const addressError = document.querySelector('[data-for="address"]');
    if (!address) {
      if (addressError) addressError.classList.add("show");
      isValid = false;
    } else {
      if (addressError) addressError.classList.remove("show");
    }

    return isValid;
  }

  // Submit form
  if (detailsForm) {
    detailsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submitError) submitError.textContent = "";

      if (!validateDetailsForm()) {
        return;
      }

      const email = document.getElementById("input-email").value.trim();
      const phone = document.getElementById("input-phone").value.trim();
      const address = document.getElementById("input-address").value.trim();

      const requestId = `REQ-${Date.now()}`;

      try {
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

        const docRef = await addDoc(collection(db, "foodWasteRequests"), requestData);
        console.log("✅ Request saved:", docRef.id);

        if (detailsOverlay) detailsOverlay.classList.remove("active");
        showSuccessOverlay(requestId);
      } catch (error) {
        console.error("❌ Submit error:", error);
        if (submitError) submitError.textContent = "Error submitting. Please try again.";
      }
    });
  }

  // ========== SUCCESS OVERLAY ==========
  const successOverlay = document.getElementById("overlay-success");
  const successRequestId = document.getElementById("success-request-id");
  const successSelected = document.getElementById("success-selected");
  const successLocation = document.getElementById("success-location");
  const successLocationDetail = document.getElementById("success-location-detail");

  function showSuccessOverlay(requestId) {
    if (successRequestId) successRequestId.textContent = requestId;

    if (successSelected) {
      successSelected.innerHTML = selectedWasteTypes
        .map(type => `<li>${type}</li>`)
        .join("");
    }

    if (userLocationShared && userLocation) {
      if (successLocation) successLocation.textContent = "✓ Location shared:";
      if (successLocationDetail) {
        successLocationDetail.innerHTML = `
          Latitude: ${userLocation.latitude.toFixed(6)}<br>
          Longitude: ${userLocation.longitude.toFixed(6)}<br>
          ${userLocation.altitude ? `Altitude: ${userLocation.altitude.toFixed(1)}m<br>` : ""}
          Accuracy: ±${userLocation.accuracy.toFixed(0)}m
        `;
      }
    } else {
      if (successLocation) successLocation.textContent = "Location: Not shared";
      if (successLocationDetail) successLocationDetail.innerHTML = "";
    }

    if (successOverlay) successOverlay.classList.add("active");
  }

  // ========== SUCCESS OVERLAY ACTIONS ==========
  const btnSuccessClose = document.getElementById("btn-success-close");
  if (btnSuccessClose) {
    btnSuccessClose.addEventListener("click", () => {
      if (successOverlay) successOverlay.classList.remove("active");
      resetFlow();
    });
  }

  // ========== RESET FLOW ==========
  function resetFlow() {
    currentCategory = null;
    selectedWasteTypes = [];
    userLocation = null;
    userLocationShared = false;

    if (foodWasteCard) foodWasteCard.style.display = "block";
    if (choiceSection) choiceSection.style.display = "none";

    document.getElementById("section-foodwaste")?.scrollIntoView({ behavior: "smooth" });
  }

  console.log("✅ App fully initialized");
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
