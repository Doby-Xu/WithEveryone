const galleryRoot = document.querySelector("#gallery-lanes");
const modal = document.querySelector("#case-modal");
const modalTitle = document.querySelector("#modal-title");
const modalOutput = document.querySelector("#modal-output");
const modalReferences = document.querySelector("#modal-references");
const modalMeta = document.querySelector("#modal-meta");
const referenceLoader = document.querySelector("#reference-loader");
const closeButton = document.querySelector("#modal-close");
const previousButton = document.querySelector("#modal-prev");
const nextButton = document.querySelector("#modal-next");

let galleryCases = [];
let activeCaseIndex = 0;
let lastFocusedCard = null;

function caseLabel(item) {
  return `${item.people} reference identities · ${item.aspect === "square" ? "square" : "landscape"} output`;
}

function createCard(item, index, isClone = false) {
  const card = document.createElement("button");
  card.className = `gallery-card${item.aspect === "square" ? " square" : ""}`;
  card.type = "button";
  card.dataset.index = String(index);
  card.dataset.clone = String(isClone);
  card.setAttribute("aria-label", `Open ${item.label}, ${caseLabel(item)}`);

  if (isClone) {
    card.tabIndex = -1;
    card.setAttribute("aria-hidden", "true");
  }

  const image = document.createElement("img");
  image.src = item.output;
  image.alt = isClone
    ? ""
    : `WithEveryone generated group image for ${item.people} reference identities`;
  image.loading = "lazy";
  image.decoding = "async";
  image.width = item.aspect === "square" ? 720 : 960;
  image.height = item.aspect === "square" ? 720 : 540;

  const meta = document.createElement("span");
  meta.className = "card-meta";
  meta.innerHTML = `<span>${item.label}</span><span>${item.people} IDs&nbsp; ↗</span>`;

  card.append(image, meta);
  card.addEventListener("click", () => openCase(index, card));
  return card;
}

function buildLane(items, laneIndex) {
  const lane = document.createElement("div");
  const isReverse = laneIndex % 2 === 1;
  lane.className = `gallery-lane${isReverse ? " reverse" : ""}`;
  lane.style.setProperty("--duration", `${84 + laneIndex * 9}s`);

  const originals = document.createDocumentFragment();
  const clones = document.createDocumentFragment();

  items.forEach(({ item, index }) => {
    originals.append(createCard(item, index));
    clones.append(createCard(item, index, true));
  });

  if (isReverse) {
    lane.append(clones, originals);
  } else {
    lane.append(originals, clones);
  }

  return lane;
}

function renderGallery(items) {
  galleryRoot.replaceChildren();
  const lanes = Array.from({ length: 4 }, () => []);

  items.forEach((item, index) => {
    lanes[index % lanes.length].push({ item, index });
  });

  lanes.forEach((laneItems, laneIndex) => {
    galleryRoot.append(buildLane(laneItems, laneIndex));
  });
}

function openCase(index, trigger) {
  activeCaseIndex = index;
  lastFocusedCard = trigger ?? lastFocusedCard;
  updateModal();

  if (!modal.open) {
    modal.showModal();
    document.body.classList.add("modal-open");
  }
}

function updateModal() {
  const item = galleryCases[activeCaseIndex];
  if (!item) return;

  modalTitle.textContent = item.label;
  modalMeta.textContent = caseLabel(item);
  modalOutput.src = item.output;
  modalOutput.alt = `Generated group in ${item.label}`;

  modalReferences.classList.remove("loaded");
  modalReferences.removeAttribute("src");
  modalReferences.alt = `Identity reference collage for ${item.label}`;
  referenceLoader.hidden = false;

  modalReferences.onload = () => {
    referenceLoader.hidden = true;
    modalReferences.classList.add("loaded");
  };
  modalReferences.onerror = () => {
    referenceLoader.textContent = "References could not be loaded.";
  };
  modalReferences.src = item.references;
}

function stepCase(direction) {
  activeCaseIndex =
    (activeCaseIndex + direction + galleryCases.length) % galleryCases.length;
  updateModal();
}

function closeModal() {
  modal.close();
}

closeButton.addEventListener("click", closeModal);
previousButton.addEventListener("click", () => stepCase(-1));
nextButton.addEventListener("click", () => stepCase(1));

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

modal.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  modalOutput.removeAttribute("src");
  modalReferences.removeAttribute("src");
  lastFocusedCard?.focus({ preventScroll: true });
});

document.addEventListener("keydown", (event) => {
  if (!modal.open) return;
  if (event.key === "ArrowLeft") stepCase(-1);
  if (event.key === "ArrowRight") stepCase(1);
});

async function loadGallery() {
  try {
    const response = await fetch("assets/gallery/manifest.json");
    if (!response.ok) throw new Error(`Gallery request failed: ${response.status}`);
    galleryCases = await response.json();
    renderGallery(galleryCases);
  } catch (error) {
    console.error(error);
    galleryRoot.innerHTML =
      '<p class="gallery-loading">The gallery could not be loaded. Please refresh the page.</p>';
  }
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll(".reveal").forEach((element) => {
  revealObserver.observe(element);
});

loadGallery();
