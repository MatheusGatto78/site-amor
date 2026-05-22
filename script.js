const startDate = new Date(2025, 7, 28, 18, 41, 23);

const fallbackPlaylistData = [
  {
    title: "Musica 01",
    artist: "Artista",
    album: "Album 01",
    cover: "assets/covers/placeholder-cover.svg",
    accent: "#b07d4f",
    lyrics:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\nVivamus sed lorem ut nisi ultricies posuere.\nAenean nec leo eget est posuere dictum.",
  },
  {
    title: "Musica 02",
    artist: "Artista",
    album: "Album 02",
    cover: "assets/covers/placeholder-cover.svg",
    accent: "#8a6a91",
    lyrics:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\nCurabitur at elit sed elit tincidunt dictum.\nSuspendisse potenti.",
  },
  {
    title: "Musica 03",
    artist: "Artista",
    album: "Album 03",
    cover: "assets/covers/placeholder-cover.svg",
    accent: "#5f8b7a",
    lyrics:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\nInteger eu eros non nisi fermentum feugiat.\nDonec suscipit odio sed nibh varius ultrices.",
  },
  {
    title: "Musica 04",
    artist: "Artista",
    album: "Album 04",
    cover: "assets/covers/placeholder-cover.svg",
    accent: "#c07c6c",
    lyrics:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\nMaecenas vitae lorem nec arcu vehicula fringilla.\nPellentesque in nisl non elit posuere tincidunt.",
  },
  {
    title: "Musica 05",
    artist: "Artista",
    album: "Album 05",
    cover: "assets/covers/placeholder-cover.svg",
    accent: "#7a7e9d",
    lyrics:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\nAliquam eu dolor ac nulla luctus finibus.\nNam at urna elit, at posuere purus.",
  },
];

const playlistConfig = {
  jsonUrl: "assets/playlist.json",
  lyricsUrl: "assets/lyrics.json",
  defaultAccent: "#b07d4f",
  defaultCover: "assets/covers/placeholder-cover.svg",
};

let playlistData = [...fallbackPlaylistData];
const accentCache = new Map();

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
};

const normalizeArtists = (artists) => {
  if (Array.isArray(artists)) {
    return artists.filter(Boolean).join(", ");
  }
  return artists || "";
};

const getLyricsForTrack = (track, lyricsMap) => {
  if (track.lyrics) {
    return track.lyrics;
  }
  const byId = track.id && lyricsMap[track.id];
  if (byId) {
    return byId;
  }
  const byTitle = `${track.title} - ${track.artist}`;
  return lyricsMap[byTitle] || "";
};

const normalizePlaylistTracks = (tracks, lyricsMap) =>
  tracks
    .map((track) => {
      if (!track) {
        return null;
      }
      const title = track.title || track.name || "";
      const artist = normalizeArtists(track.artist || track.artists || "");
      const album = track.album || "";
      const cover = track.cover || track.image || "";
      const id = track.id || "";
      const lyrics = getLyricsForTrack({ id, title, artist, lyrics: track.lyrics }, lyricsMap);

      return {
        id,
        title,
        artist,
        album,
        cover: cover || playlistConfig.defaultCover,
        accent: track.accent || "",
        lyrics,
      };
    })
    .filter((track) => track && track.title);

const loadPlaylistData = async () => {
  try {
    const playlistJson = await fetchJson(playlistConfig.jsonUrl);
    const tracks = Array.isArray(playlistJson.tracks) ? playlistJson.tracks : [];
    if (!tracks.length) {
      return;
    }
    let lyricsMap = {};
    try {
      lyricsMap = await fetchJson(playlistConfig.lyricsUrl);
    } catch (error) {
      lyricsMap = {};
    }
    playlistData = normalizePlaylistTracks(tracks, lyricsMap);
  } catch (error) {
    playlistData = [...fallbackPlaylistData];
  }
};

const hexToRgb = (hex) => {
  if (!hex) {
    return null;
  }
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b };
  }
  if (cleaned.length !== 6) {
    return null;
  }
  const value = parseInt(cleaned, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const toRgba = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return `rgba(176, 125, 79, ${alpha})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const toHex = (value) => value.toString(16).padStart(2, "0");

const getAverageColor = (img) => {
  const canvas = document.createElement("canvas");
  const size = 40;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return playlistConfig.defaultAccent;
  }
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 200) {
      continue;
    }
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }

  if (!count) {
    return playlistConfig.defaultAccent;
  }

  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const getAccentForCover = (coverUrl, fallbackAccent = "") => {
  if (fallbackAccent) {
    return Promise.resolve(fallbackAccent);
  }
  if (!coverUrl) {
    return Promise.resolve(playlistConfig.defaultAccent);
  }
  if (accentCache.has(coverUrl)) {
    return accentCache.get(coverUrl);
  }

  const accentPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        resolve(getAverageColor(img));
      } catch (error) {
        resolve(playlistConfig.defaultAccent);
      }
    };
    img.onerror = () => resolve(playlistConfig.defaultAccent);
    img.src = coverUrl;
  });

  accentCache.set(coverUrl, accentPromise);
  return accentPromise;
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const syncBodyLock = () => {
  const hasOpenModal =
    document.querySelector(".letter-modal.is-open") ||
    document.querySelector(".photo-modal.is-open");
  document.body.classList.toggle("is-locked", Boolean(hasOpenModal));
};

const counterElements = {
  months: document.querySelector('[data-unit="months"]'),
  weeks: document.querySelector('[data-unit="weeks"]'),
  days: document.querySelector('[data-unit="days"]'),
  hours: document.querySelector('[data-unit="hours"]'),
  minutes: document.querySelector('[data-unit="minutes"]'),
  seconds: document.querySelector('[data-unit="seconds"]'),
};

const letterCounterElements = {
  months: document.querySelector('[data-letter-unit="months"]'),
  weeks: document.querySelector('[data-letter-unit="weeks"]'),
  days: document.querySelector('[data-letter-unit="days"]'),
  hours: document.querySelector('[data-letter-unit="hours"]'),
  minutes: document.querySelector('[data-letter-unit="minutes"]'),
  seconds: document.querySelector('[data-letter-unit="seconds"]'),
};

const counterLabels = {
  months: "meses",
  weeks: "semanas",
  days: "dias",
  hours: "horas",
  minutes: "minutos",
  seconds: "segundos",
};

const counterConfig = {
  interval: 1000,
};

const init = () => {
  setupCounter();
  setupPolaroids();
  setupEnvelope();
  setupReveal();
  setupStarfield();
  setupHearts();
  loadPlaylistData().finally(setupPlaylist);
};

const setupCounter = () => {
  if (!counterElements.months) {
    return;
  }

  const update = () => {
    const now = new Date();
    const diff = getElapsedParts(startDate, now);
    updateCounterValues(diff);
  };

  update();
  setInterval(update, counterConfig.interval);
};

const getElapsedParts = (start, now) => {
  if (now < start) {
    return { months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  let anchor = new Date(start);
  let months = 0;

  while (true) {
    const next = new Date(anchor);
    next.setMonth(next.getMonth() + 1);
    if (next <= now) {
      anchor = next;
      months += 1;
    } else {
      break;
    }
  }

  let remainingSeconds = Math.floor((now - anchor) / 1000);
  const weeks = Math.floor(remainingSeconds / (7 * 24 * 3600));
  remainingSeconds -= weeks * 7 * 24 * 3600;
  const days = Math.floor(remainingSeconds / (24 * 3600));
  remainingSeconds -= days * 24 * 3600;
  const hours = Math.floor(remainingSeconds / 3600);
  remainingSeconds -= hours * 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds - minutes * 60;

  return { months, weeks, days, hours, minutes, seconds };
};

const updateCounterGroup = (elements, diff) => {
  Object.keys(elements).forEach((key) => {
    const element = elements[key];
    if (!element) {
      return;
    }
    element.textContent = `${diff[key]} ${counterLabels[key]}`;
  });
};

const updateCounterValues = (diff) => {
  updateCounterGroup(counterElements, diff);
  updateCounterGroup(letterCounterElements, diff);
};

const setupPolaroids = () => {
  const polaroids = document.querySelectorAll(".polaroid");
  const modal = document.querySelector(".photo-modal");
  const modalImage = modal?.querySelector(".photo-polaroid img");
  const modalDate = modal?.querySelector(".back-date");
  const modalPolaroid = modal?.querySelector(".photo-polaroid");
  const closeButton = modal?.querySelector(".photo-close");

  if (
    !polaroids.length ||
    !modal ||
    !modalImage ||
    !modalDate ||
    !modalPolaroid ||
    !closeButton
  ) {
    return;
  }

  const openModal = (polaroid) => {
    const image = polaroid.querySelector(".polaroid-front img");
    const date = polaroid.querySelector(".back-date")?.textContent || "";
    modalImage.src = image?.src || "";
    modalImage.alt = image?.alt || "Foto";
    modalImage.style.objectPosition = image ? getComputedStyle(image).objectPosition : "";
    modalDate.textContent = date;
    modalPolaroid.classList.remove("is-flipped");
    modalPolaroid.setAttribute("aria-pressed", "false");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    syncBodyLock();
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    syncBodyLock();
  };

  polaroids.forEach((polaroid) => {
    polaroid.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(polaroid);
    });
  });

  modalPolaroid.addEventListener("click", (event) => {
    event.stopPropagation();
    const isFlipped = modalPolaroid.classList.toggle("is-flipped");
    modalPolaroid.setAttribute("aria-pressed", isFlipped ? "true" : "false");
  });

  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeModal();
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
};

const setupJukeboxFades = () => {
  const windowElement = document.querySelector(".jukebox-window");
  const scrollElement = windowElement?.querySelector(".jukebox-scroll");

  if (!windowElement || !scrollElement) {
    return;
  }

  const fadeDistance = 32;
  let rafId = 0;

  const updateFades = () => {
    const maxScroll = scrollElement.scrollWidth - scrollElement.clientWidth;
    if (maxScroll <= 1) {
      windowElement.style.setProperty("--fade-left", "0");
      windowElement.style.setProperty("--fade-right", "0");
      return;
    }

    const left = scrollElement.scrollLeft;
    const right = maxScroll - left;
    const leftOpacity = Math.min(1, left / fadeDistance);
    const rightOpacity = Math.min(1, right / fadeDistance);

    windowElement.style.setProperty("--fade-left", leftOpacity.toFixed(2));
    windowElement.style.setProperty("--fade-right", rightOpacity.toFixed(2));
  };

  const scheduleUpdate = () => {
    if (rafId) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      updateFades();
    });
  };

  scrollElement.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  updateFades();
};

const setupPlaylist = () => {
  const listElement = document.querySelector("[data-playlist]");
  const titleElement = document.querySelector("[data-track-title]");
  const artistElement = document.querySelector("[data-track-artist]");
  const lyricsElement = document.querySelector("[data-lyrics]");
  const playlistSection = document.querySelector(".playlist");

  if (!listElement || !titleElement || !artistElement || !lyricsElement || !playlistSection) {
    return;
  }

  listElement.innerHTML = "";

  if (!playlistData.length) {
    titleElement.textContent = "Playlist vazia";
    artistElement.textContent = "";
    lyricsElement.textContent = "Playlist ainda nao carregada.";
    return;
  }

  playlistData.forEach((track, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "track-card";
    const cover = track.cover || playlistConfig.defaultCover;
    card.innerHTML = `
      <img src="${cover}" alt="Capa de ${track.title}" crossorigin="anonymous" loading="lazy" />
      <h4>${track.title}</h4>
      <p>${track.artist}</p>
      <div class="card-bars" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    card.addEventListener("click", () => selectTrack(index));
    listElement.appendChild(card);
  });

  const selectTrack = async (index) => {
    const track = playlistData[index];
    if (!track) {
      return;
    }

    titleElement.textContent = track.title;
    artistElement.textContent = track.album ? `${track.artist} • ${track.album}` : track.artist;
    lyricsElement.textContent = track.lyrics || "Letra ainda nao adicionada.";

    const accent = await getAccentForCover(track.cover, track.accent);
    playlistSection.style.setProperty("--accent", accent);
    playlistSection.style.setProperty("--accent-soft", toRgba(accent, 0.22));
    playlistSection.style.setProperty("--accent-glow", toRgba(accent, 0.18));
    playlistSection.style.setProperty("--accent-strong", toRgba(accent, 0.45));

    const cards = listElement.querySelectorAll(".track-card");
    cards.forEach((card, cardIndex) => {
      const isActive = cardIndex === index;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  selectTrack(0);
  setupJukeboxFades();
};

const setupEnvelope = () => {
  const scene = document.querySelector(".envelope-scene");
  const envelope = document.querySelector(".envelope");
  const modal = document.querySelector(".letter-modal");
  const closeButton = document.querySelector(".letter-close");
  const letterCard = document.querySelector(".letter-card");

  if (!scene || !envelope || !modal || !closeButton || !letterCard) {
    return;
  }

  const openLetter = () => {
    scene.classList.add("is-open");
    modal.classList.add("is-open");
    envelope.setAttribute("aria-expanded", "true");
    modal.setAttribute("aria-hidden", "false");
    syncBodyLock();
    letterCard.scrollTop = 0;
  };

  const closeLetter = () => {
    scene.classList.remove("is-open");
    modal.classList.remove("is-open");
    envelope.setAttribute("aria-expanded", "false");
    modal.setAttribute("aria-hidden", "true");
    syncBodyLock();
  };

  envelope.addEventListener("click", (event) => {
    event.stopPropagation();
    openLetter();
  });

  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLetter();
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeLetter();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLetter();
    }
  });
};

const setupReveal = () => {
  const elements = document.querySelectorAll("[data-reveal]");
  if (prefersReducedMotion) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  elements.forEach((element) => observer.observe(element));
};

const setupStarfield = () => {
  const canvas = document.getElementById("starfield");
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  let stars = [];
  let width = 0;
  let height = 0;

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(240, Math.floor((width * height) / 5000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.4 + 0.2,
      speed: Math.random() * 0.4 + 0.05,
      twinkle: Math.random() * Math.PI * 2,
    }));
    draw();
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    stars.forEach((star) => {
      star.y += star.speed;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
      star.twinkle += 0.03;
      const alpha = 0.5 + Math.sin(star.twinkle) * 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!prefersReducedMotion) {
      requestAnimationFrame(draw);
    }
  };

  window.addEventListener("resize", resize);
  resize();
};

const setupHearts = () => {
  const canvas = document.getElementById("hearts");
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  let hearts = [];
  let width = 0;
  let height = 0;

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(120, Math.floor((width * height) / 9000));
    hearts = Array.from({ length: count }, () => createHeart());
    draw();
  };

  const createHeart = () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 4 + 4,
    speed: Math.random() * 0.6 + 0.25,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.02 + 0.008,
    alpha: Math.random() * 0.45 + 0.45,
    hue: Math.random() * 18 + 330,
  });

  const drawHeart = (x, y, size, color, rotation) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    const top = -size * 0.4;
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.bezierCurveTo(size * 0.6, top - size * 0.6, size * 1.4, top + size * 0.2, 0, size);
    ctx.bezierCurveTo(-size * 1.4, top + size * 0.2, -size * 0.6, top - size * 0.6, 0, top);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    hearts.forEach((heart) => {
      heart.y -= heart.speed;
      heart.wobble += heart.wobbleSpeed;
      const drift = Math.sin(heart.wobble) * 0.6;
      heart.x += drift * 0.2;

      if (heart.y + 30 < 0) {
        heart.y = height + 20;
        heart.x = Math.random() * width;
      }

      const color = `hsla(${heart.hue}, 70%, 70%, ${heart.alpha})`;
      drawHeart(heart.x, heart.y, heart.size, color, drift * 0.08);
    });

    if (!prefersReducedMotion) {
      requestAnimationFrame(draw);
    }
  };

  window.addEventListener("resize", resize);
  resize();
};

document.addEventListener("DOMContentLoaded", init);
