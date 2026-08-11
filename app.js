// dBuy - Lógica de Negocio y Enrutamiento del Frontend

document.addEventListener("DOMContentLoaded", () => {
  // Inicializar Base de Datos Local
  dBuyDB.init();

  // Helper para obtener listado de imágenes (soporta URL única o JSON array)
  function getItemImages(item) {
    if (!item || !item.imageUrl) return ["images/car_civic.jpg"];
    if (Array.isArray(item.imageUrl)) return item.imageUrl;
    if (typeof item.imageUrl === "string" && item.imageUrl.startsWith("[")) {
      try {
        const parsed = JSON.parse(item.imageUrl);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [item.imageUrl];
  }

  // --- ELEMENTOS CACHÉ DEL DOM ---
  const views = {
    home: document.getElementById("home-view"),
    detail: document.getElementById("detail-view"),
    publish: document.getElementById("publish-view"),
    dashboard: document.getElementById("dashboard-view")
  };

  const navButtons = {
    logo: document.getElementById("nav-logo"),
    home: document.getElementById("nav-home-btn"),
    dashboard: document.getElementById("nav-dashboard-btn"),
    publish: document.getElementById("nav-publish-btn"),
    heroAction: document.getElementById("hero-action-btn")
  };

  const catalog = {
    grid: document.getElementById("items-grid"),
    categorySelect: document.getElementById("filter-category"),
    provinceSelect: document.getElementById("filter-province"),
    tabs: document.querySelectorAll(".filter-tab"),
    counter: document.getElementById("results-counter"),
    headerText: document.getElementById("catalog-header-text")
  };

  const globalSearchInput = document.getElementById("global-search-input");
  const detailContainer = document.getElementById("detail-item-content");
  const backToListBtn = document.getElementById("back-to-list-btn");

  // Formulario publicar
  const publishForm = document.getElementById("publish-item-form");
  const typeSaleRadio = document.getElementById("radio-card-sale");
  const typeAuctionRadio = document.getElementById("radio-card-auction");
  const radioInputSale = document.getElementById("type-sale");
  const radioInputAuction = document.getElementById("type-auction");
  const priceFieldLabel = document.getElementById("price-field-label");
  const priceInput = document.getElementById("pub-price");
  const durationFieldWrapper = document.getElementById("duration-field-wrapper");
  const reservePriceFieldWrapper = document.getElementById("reserve-price-field-wrapper");
  const buyNowFieldWrapper = document.getElementById("buy-now-field-wrapper");
  const presetImagesList = document.getElementById("preset-images-list");
  const pubImageInput = document.getElementById("pub-image-url");
  const pubCancelBtn = document.getElementById("pub-cancel-btn");

  // Dashboard
  const dashboardMenuItems = document.querySelectorAll(".db-menu-item");
  const dashboardItemsGrid = document.getElementById("dashboard-items-grid");
  const dashboardTabTitle = document.getElementById("dashboard-tab-title");

  // --- ESTADO GLOBAL DE LA APP ---
  let activeFilters = {
    search: "",
    category: "all",
    province: "all",
    type: "all" // 'all', 'sale', 'auction'
  };

  let activeItemDetailId = null;
  let editingItemId = null; // null if publishing new, item.id if editing
  let activeDashboardTab = "listings"; // 'listings', 'bids', 'watchlist'
  let autoBidTimers = {}; // Track dynamic simulated bids

  // --- IMÁGENES PREESTABLECIDAS PARA PUBLICACIÓN ---
  const PRESET_IMAGES = [
    { url: "images/car_civic.jpg", label: "Vehículos" },
    { url: "images/phone_iphone.jpg", label: "Electrónica" },
    { url: "images/watch_rolex.jpg", label: "Relojería/Moda" },
    { url: "images/condo_punta_cana.jpg", label: "Inmuebles (Venta)" },
    { url: "images/apt_piantini.jpg", label: "Inmuebles (Renta)" }
  ];

  // --- INICIALIZACIÓN DE SELECTS ---
  function populateSelects() {
    const categories = dBuyDB.getCategories();
    const provinces = dBuyDB.getProvinces();

    // Llenar filtros de Inicio
    categories.forEach(cat => {
      const opt1 = document.createElement("option");
      opt1.value = cat;
      opt1.textContent = cat;
      catalog.categorySelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = cat;
      opt2.textContent = cat;
      document.getElementById("pub-category").appendChild(opt2);
    });

    provinces.forEach(prov => {
      const opt1 = document.createElement("option");
      opt1.value = prov;
      opt1.textContent = prov;
      catalog.provinceSelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = prov;
      opt2.textContent = prov;
      document.getElementById("pub-province").appendChild(opt2);
    });

    // Cargar imágenes preestablecidas en formulario
    presetImagesList.innerHTML = "";
    PRESET_IMAGES.forEach((img, idx) => {
      const card = document.createElement("div");
      card.className = `image-preview-thumbnail ${idx === 0 ? 'active-thumbnail' : ''}`;
      card.style.cursor = "pointer";
      card.style.border = idx === 0 ? "2px solid var(--color-blue-glow)" : "2px solid transparent";
      card.style.transition = "var(--transition-smooth)";
      
      card.innerHTML = `
        <img src="${img.url}" alt="${img.label}">
        <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.7); font-size:0.65rem; text-align:center; padding:2px 0;">
          ${img.label}
        </div>
      `;

      card.addEventListener("click", () => {
        // Remover clase activa de las otras
        document.querySelectorAll(".image-preview-thumbnail").forEach(c => {
          c.style.borderColor = "transparent";
        });
        card.style.borderColor = "var(--color-blue-glow)";
        pubImageInput.value = img.url;
      });

      presetImagesList.appendChild(card);
    });
  }

  // --- SISTEMA DE TOASTS ---
  function showToast(title, message, type = "success") {
    const host = document.getElementById("notification-host");
    const toast = document.createElement("div");
    toast.className = `notification-toast ${type}`;
    
    let icon = "fa-circle-check";
    if (type === "warning") icon = "fa-triangle-exclamation";
    if (type === "auction") icon = "fa-gavel";

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <div class="notification-toast-content">
        <h5>${title}</h5>
        <p>${message}</p>
      </div>
    `;

    host.appendChild(toast);

    // Auto desvanecer
    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => {
        toast.remove();
      }, 350);
    }, 4000);
  }

  // --- ENRUTADOR INTERNO (ROUTING) ---
  function switchView(targetView) {
    // Apagar todas las vistas
    Object.keys(views).forEach(key => {
      views[key].classList.remove("active");
    });

    // Apagar estado activo en links de cabecera
    navButtons.home.classList.remove("active");
    navButtons.dashboard.classList.remove("active");

    // Encender vista requerida
    if (targetView === "home") {
      views.home.classList.add("active");
      navButtons.home.classList.add("active");
      renderCatalog();
    } else if (targetView === "detail") {
      views.detail.classList.add("active");
    } else if (targetView === "publish") {
      views.publish.classList.add("active");
    } else if (targetView === "dashboard") {
      views.dashboard.classList.add("active");
      navButtons.dashboard.classList.add("active");
      renderDashboard();
    }

    // Scroll al tope
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- LÓGICA DE DIBUJO DEL CATÁLOGO DE INICIO ---
  function renderCatalog() {
    const items = dBuyDB.getItems();
    const watchlist = dBuyDB.getWatchlist();
    
    // Filtrar elementos
    const filtered = items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(activeFilters.search.toLowerCase()) || 
                            item.description.toLowerCase().includes(activeFilters.search.toLowerCase());
      const matchesCat = activeFilters.category === "all" || item.category === activeFilters.category;
      const matchesProv = activeFilters.province === "all" || item.province === activeFilters.province;
      
      let matchesType = false;
      if (activeFilters.type === "all") {
        matchesType = true;
      } else if (activeFilters.type === "sale_fixed") {
        matchesType = item.type === "sale" && !item.isRent;
      } else if (activeFilters.type === "sale_auction") {
        matchesType = item.type === "auction" && !item.isRent;
      } else if (activeFilters.type === "rent_fixed") {
        matchesType = item.type === "sale" && !!item.isRent;
      } else if (activeFilters.type === "rent_auction") {
        matchesType = item.type === "auction" && !!item.isRent;
      }
      
      return matchesSearch && matchesCat && matchesProv && matchesType && !item.isCancelled;
    });

    // Actualizar contador
    catalog.counter.textContent = `Mostrando ${filtered.length} artículo${filtered.length === 1 ? '' : 's'}`;

    // Clear grid
    catalog.grid.innerHTML = "";

    if (filtered.length === 0) {
      catalog.grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-box-open"></i>
          <h3>No se encontraron artículos</h3>
          <p>Prueba a cambiar tus filtros de búsqueda o categoría en la parte superior.</p>
        </div>
      `;
      return;
    }

    // Dibujar elementos
    filtered.forEach(item => {
      const card = document.createElement("div");
      card.className = "item-card";
      card.dataset.id = item.id;
      
      const isSubasta = item.type === "auction";
      const isFav = watchlist.includes(item.id);
      const isRent = !!item.isRent;

      const images = getItemImages(item);
      const mainImage = images[0] || "images/car_civic.jpg";

      // Calcular tiempo restante si es subasta
      let timerHTML = "";
      if (isSubasta) {
        timerHTML = `<span class="auction-timer" data-endtime="${item.endTime}"><i class="fa-solid fa-clock"></i> Calculando...</span>`;
      }

      // Configurar etiqueta según tipo
      let badgeHTML = "";
      if (isSubasta) {
        badgeHTML = isRent ? '<span class="badge-tag badge-auction"><i class="fa-solid fa-gavel"></i> Subasta Renta</span>' : '<span class="badge-tag badge-auction"><i class="fa-solid fa-gavel"></i> Subasta</span>';
      } else {
        badgeHTML = isRent ? '<span class="badge-tag badge-sale" style="background:rgba(0,150,136,0.85); border-color:rgba(0,150,136,0.3);"><i class="fa-solid fa-key"></i> Alquiler</span>' : '<span class="badge-tag badge-sale"><i class="fa-solid fa-tags"></i> Venta</span>';
      }

      const priceSuffix = isRent ? " / mes" : "";
      const priceLabel = isSubasta ? (isRent ? "Renta Mayor" : "Puja Actual") : (isRent ? "Renta Mensual" : "Precio Fijo");

      card.innerHTML = `
        <div class="card-img-wrapper">
          ${badgeHTML}
          <button class="watchlist-btn ${isFav ? 'active' : ''}" data-id="${item.id}">
            <i class="fa-solid fa-heart"></i>
          </button>
          <img src="${mainImage}" class="card-img" alt="${item.title}">
        </div>
        <div class="card-info">
          <div class="card-meta">
            <span>${item.category}</span>
            <span class="card-location"><i class="fa-solid fa-location-dot"></i> ${item.province}</span>
          </div>
          <h3 class="card-title">${item.title}</h3>
          <div class="card-footer">
            <div>
              <span class="price-label">${priceLabel}</span>
              <span class="price-value ${isSubasta ? 'auction' : 'sale'}">RD$ ${item.price.toLocaleString()}${priceSuffix}</span>
            </div>
            ${timerHTML}
          </div>
        </div>
      `;

      // Clics a la tarjeta (evitando botón favoritos)
      card.addEventListener("click", (e) => {
        if (e.target.closest(".watchlist-btn")) return;
        loadItemDetails(item.id);
      });

      // Clic a favoritos
      const favBtn = card.querySelector(".watchlist-btn");
      favBtn.addEventListener("click", () => {
        const active = dBuyDB.toggleWatchlist(item.id);
        if (active) {
          favBtn.classList.add("active");
          showToast("Añadido a Favoritos", `"${item.title}" guardado en tu panel.`, "success");
        } else {
          favBtn.classList.remove("active");
          showToast("Eliminado de Favoritos", `"${item.title}" fue retirado.`, "warning");
        }
      });

      catalog.grid.appendChild(card);
    });

    updateAuctionTimers();
  }

  // --- ACTUALIZAR CONTADORES DE TIEMPO REGULARES ---
  function updateAuctionTimers() {
    const activeTimers = document.querySelectorAll("[data-endtime]");
    
    activeTimers.forEach(element => {
      const endTimeStr = element.getAttribute("data-endtime");
      const endTime = new Date(endTimeStr).getTime();
      const now = Date.now();
      
      const diff = endTime - now;
      
      if (diff <= 0) {
        element.innerHTML = `<i class="fa-solid fa-circle-stop"></i> Expirada`;
        element.classList.add("urgent");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        let timerStr = "";
        if (hours > 0) timerStr += `${hours}h `;
        timerStr += `${minutes}m ${seconds}s`;

        element.innerHTML = `<i class="fa-solid fa-clock"></i> ${timerStr}`;
        
        // Poner color de alerta si queda menos de 1 hora
        if (diff < 60 * 60 * 1000) {
          element.classList.add("urgent");
        } else {
          element.classList.remove("urgent");
        }
      }
    });
  }

  // Ejecutar actualización de temporizadores cada segundo
  setInterval(updateAuctionTimers, 1000);

  // --- VISTA DETALLADA DEL ARTÍCULO ---
  function loadItemDetails(itemId) {
    activeItemDetailId = itemId;
    const item = dBuyDB.getItemById(itemId);
    if (!item) return;

    renderItemDetails(item);
    switchView("detail");
  }

  function renderItemDetails(item) {
    const isSubasta = item.type === "auction";
    const watchlist = dBuyDB.getWatchlist();
    const isFav = watchlist.includes(item.id);
    const isRent = !!item.isRent;
    const priceSuffix = isRent ? " / mes" : "";
 
    // Mostrar/ocultar botón de edición en la vista de detalle
    const editDetailBtn = document.getElementById("detail-edit-item-btn");
    const myName = currentUser ? (currentUser.user_metadata?.full_name || currentUser.email.split("@")[0]) : "Yo";
    const isOwner = currentUser && (item.sellerName === myName || item.sellerName === "Yo");
    if (editDetailBtn) {
      if (isOwner) {
        editDetailBtn.style.display = "inline-flex";
      } else {
        editDetailBtn.style.display = "none";
      }
    }

    // Formatear historial de subastas
    let auctionSidePanel = "";
    if (isSubasta) {
      let bidsListHTML = "";
      if (item.bidsHistory && item.bidsHistory.length > 0) {
        item.bidsHistory.forEach(bid => {
          const isSelf = bid.bidder === "Yo";
          const formattedTime = formatTimeAgo(bid.time);
          bidsListHTML += `
            <div class="bid-history-item">
              <div class="bid-history-user ${isSelf ? 'self' : ''}">
                <i class="fa-solid fa-user-tag" style="font-size:0.75rem;"></i> ${bid.bidder}
              </div>
              <div style="text-align: right;">
                <div class="bid-history-val">RD$ ${bid.amount.toLocaleString()}${priceSuffix}</div>
                <div class="bid-history-time">${formattedTime}</div>
              </div>
            </div>
          `;
        });
      } else {
        bidsListHTML = `
          <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
            No hay ofertas todavía. ¡Sé el primero en ofrecer!
          </div>
        `;
      }

      // Propuesta de valor de puja mínima sugerida
      const minBid = item.currentBid + Math.ceil(item.currentBid * 0.05 / 100) * 100; // +5% redondeado a cientos

      const isEnded = new Date(item.endTime) < new Date();
      const myName = currentUser ? (currentUser.user_metadata?.full_name || currentUser.email.split("@")[0]) : null;
      const hasBids = item.bidsHistory && item.bidsHistory.length > 0;
      const winnerName = hasBids ? item.bidsHistory[0].bidder : null;
      const isWinner = myName && winnerName === myName;

      const meetsReserve = !item.reservePrice || item.currentBid >= item.reservePrice;

      if (isEnded) {
        if (item.isCancelled) {
          auctionSidePanel = `
            <div class="detail-action-card" style="border-color: rgba(255, 59, 48, 0.3); background: rgba(255, 59, 48, 0.03);">
              <div class="action-card-header">
                <span class="action-card-title" style="color: #ff453a;"><i class="fa-solid fa-ban"></i> Subasta Cancelada</span>
                <span style="font-size: 0.78rem; background: rgba(255, 59, 48, 0.15); color: #ff453a; padding:0.25rem 0.6rem; border-radius:12px; font-weight:600;">
                  Cancelada
                </span>
              </div>
              <div style="margin: 1.5rem 0; text-align: center; color: var(--text-secondary); font-size: 0.88rem; line-height: 1.4;">
                <i class="fa-solid fa-circle-xmark" style="font-size: 2.5rem; color: #ff453a; margin-bottom: 0.5rem;"></i>
                <p>Esta subasta ha sido cancelada por el vendedor y ya no está activa para ofertas o compras.</p>
              </div>
            </div>
          `;
        } else if (item.isSold) {
          auctionSidePanel = `
            <div class="detail-action-card" style="border-color: var(--color-green-glow); background: rgba(52, 199, 89, 0.03);">
              <div class="action-card-header">
                <span class="action-card-title" style="color: var(--color-green-glow);"><i class="fa-solid fa-lock"></i> Subasta Cerrada</span>
                <span style="font-size: 0.78rem; background: rgba(52, 199, 89, 0.15); color: var(--color-green-glow); padding:0.25rem 0.6rem; border-radius:12px; font-weight:600;">
                  Entregado
                </span>
              </div>
              <div style="margin-bottom: 1.5rem; text-align: center; padding: 1rem 0;">
                <i class="fa-solid fa-circle-check" style="font-size: 3rem; color: var(--color-green-glow); margin-bottom: 0.5rem;"></i>
                <p style="font-size: 0.9rem; font-weight: 700;">¡Trato Asegurado!</p>
                <p style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.3;">Comisión del 5% pagada. El artículo ha sido reservado.</p>
              </div>
              <a href="#" target="_blank" class="btn whatsapp-btn" id="whatsapp-contact-link">
                <i class="fa-brands fa-whatsapp"></i> Hablar con Vendedor
              </a>
            </div>
          `;
        } else if (!meetsReserve) {
          auctionSidePanel = `
            <div class="detail-action-card" style="border-color: rgba(255, 59, 48, 0.3); background: rgba(255, 59, 48, 0.03);">
              <div class="action-card-header">
                <span class="action-card-title" style="color: #ff453a;"><i class="fa-solid fa-triangle-exclamation"></i> Reserva no alcanzada</span>
                <span style="font-size: 0.78rem; background: rgba(255, 59, 48, 0.15); color: #ff453a; padding:0.25rem 0.6rem; border-radius:12px; font-weight:600;">
                  Finalizada
                </span>
              </div>
              <div style="margin: 1.5rem 0; text-align: center; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.45;">
                <i class="fa-solid fa-circle-xmark" style="font-size: 2.5rem; color: #ff453a; margin-bottom: 0.5rem;"></i>
                <p>La subasta finalizó en <strong>RD$ ${item.currentBid.toLocaleString()}</strong>, pero no alcanzó el precio mínimo de reserva establecido por el vendedor.</p>
                <p style="margin-top: 0.4rem; color: var(--text-muted); font-size: 0.75rem;">El artículo no ha sido adjudicado.</p>
              </div>
            </div>
          `;
        } else if (isWinner) {
          auctionSidePanel = `
            <div class="detail-action-card" style="border-color: var(--color-gold); background: rgba(255, 184, 0, 0.03);">
              <div class="action-card-header">
                <span class="action-card-title" style="color: var(--color-gold);"><i class="fa-solid fa-trophy"></i> ¡Ganaste la Subasta!</span>
                <span style="font-size: 0.78rem; background: rgba(255, 184, 0, 0.15); color: var(--color-gold); padding:0.25rem 0.6rem; border-radius:12px; font-weight:600;">
                  Pendiente
                </span>
              </div>
              <div style="margin-top: 1rem; margin-bottom: 1.5rem; text-align: center;">
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.4;">Para desbloquear los datos del vendedor y asegurar tu reserva, paga la comisión de servicio del 5% (RD$ ${(item.currentBid * 0.05).toLocaleString()}) a través de dBuy Pago Seguro.</p>
                <button type="button" class="btn btn-accent" id="detail-buy-now-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 700;">
                  <i class="fa-solid fa-shield-halved"></i> Pagar Comisión de Reserva (5%)
                </button>
              </div>
            </div>
          `;
        } else {
          const finishedText = winnerName 
            ? `Subasta finalizada. Ganador: <strong>${winnerName}</strong> por <strong>RD$ ${item.currentBid.toLocaleString()}</strong>.`
            : `Subasta finalizada sin ofertas.`;
          
          auctionSidePanel = `
            <div class="detail-action-card">
              <div class="action-card-header">
                <span class="action-card-title"><i class="fa-solid fa-lock"></i> Subasta Finalizada</span>
              </div>
              <div style="margin: 1.5rem 0; text-align: center; color: var(--text-secondary); font-size: 0.88rem; line-height: 1.4;">
                <i class="fa-solid fa-circle-info" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem;"></i>
                <p>${finishedText}</p>
              </div>
            </div>
          `;
        }
      } else {
        const panelTitleText = isRent ? '<i class="fa-solid fa-gavel"></i> Subasta de Renta' : '<i class="fa-solid fa-gavel"></i> Panel de Subasta';
        const priceLabelText = isRent ? 'Renta Mayor Ofrecida' : 'Oferta Mayor Actual';
        const bidBtnText = isRent ? 'Ofrecer Renta' : 'Pujar';

        let bidActionHTML = "";
        if (isOwner) {
          bidActionHTML = `
            <div style="margin: 1rem 0; padding: 1.2rem 1rem; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--card-border); border-radius: var(--radius-sm); text-align: center; color: var(--text-secondary); font-size: 0.82rem; line-height: 1.45;">
              <i class="fa-solid fa-circle-info" style="color: var(--color-blue-glow); font-size: 1.3rem; margin-bottom: 0.4rem; display: block;"></i>
              Este es tu anuncio. Como vendedor, no puedes realizar ofertas en tu propia subasta.
            </div>
            <button type="button" class="btn btn-secondary" id="detail-cancel-auction-btn" style="width: 100%; background: rgba(255, 59, 48, 0.1); color: #ff453a; border-color: rgba(255, 59, 48, 0.2); font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <i class="fa-solid fa-ban"></i> Cancelar Subasta
            </button>
          `;
        } else {
          bidActionHTML = `
            <!-- Formulario de Puja -->
            <div class="bid-input-group">
              <div class="bid-input-wrapper">
                <span>RD$</span>
                <input type="number" id="detail-bid-amount" value="${minBid}" min="${minBid}" step="100">
              </div>
              <button class="btn bid-btn" id="place-bid-btn">${bidBtnText}</button>
            </div>
            <div class="bid-error-msg" id="detail-bid-error">Monto inválido</div>
            
            ${item.buyNowPrice ? `
            <div style="margin: 0.8rem 0; text-align: center; display: flex; flex-direction: column; gap: 0.4rem; width: 100%;">
              <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 0.3rem; margin: 0.2rem 0;">
                <hr style="flex:1; border:0; border-top:1px solid rgba(255,255,255,0.08);">
                <span>O TAMBIÉN</span>
                <hr style="flex:1; border:0; border-top:1px solid rgba(255,255,255,0.08);">
              </div>
              <button type="button" class="btn btn-accent" id="detail-instant-buy-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 700; background: var(--color-blue-glow); color: #000;">
                <i class="fa-solid fa-bolt" style="color: #ff9f0a;"></i> Compra Inmediata por RD$ ${item.buyNowPrice.toLocaleString()}
              </button>
            </div>
            ` : ""}

            <!-- Indicador de que la IA/Competidor está "escribiendo" su puja -->
            <div class="competitor-typing-indicator" id="competitor-indicator" style="display:none;">
              <span class="competitor-typing-dot"></span>
              <span class="competitor-typing-dot"></span>
              <span class="competitor-typing-dot"></span>
              <span id="competitor-text" style="margin-left: 5px;">Alguien está analizando...</span>
            </div>
          `;
        }

        auctionSidePanel = `
          <div class="detail-action-card" id="detail-bidding-card">
            <div class="action-card-header">
              <span class="action-card-title">${panelTitleText}</span>
              <span class="auction-timer" data-endtime="${item.endTime}"><i class="fa-solid fa-clock"></i> Calculando...</span>
            </div>

            <div style="margin-bottom: 1.5rem;">
              <span class="price-label">${priceLabelText}</span>
              <div class="action-card-price auction" id="detail-current-price" style="display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.5rem;">
                RD$ ${item.currentBid.toLocaleString()}${priceSuffix}
                ${item.reservePrice ? (item.currentBid >= item.reservePrice 
                  ? `<span style="font-size: 0.72rem; color: var(--color-green-glow); background: rgba(52, 199, 89, 0.1); padding: 0.2rem 0.5rem; border-radius: 10px; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Reserva alcanzada</span>`
                  : `<span style="font-size: 0.72rem; color: var(--text-muted); background: rgba(255, 255, 255, 0.05); padding: 0.2rem 0.5rem; border-radius: 10px; font-weight: 600;"><i class="fa-solid fa-circle-minus"></i> Reserva no alcanzada</span>`
                ) : ""}
              </div>
              <span style="font-size: 0.8rem; color: var(--text-secondary);" id="detail-bids-count">
                Total de ofertas: ${item.bidsCount}
              </span>
              ${item.buyNowPrice ? `
              <div style="font-size: 0.85rem; color: var(--color-blue-glow); margin-top: 0.4rem; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;">
                <i class="fa-solid fa-bolt" style="color: #ff9f0a;"></i> Compra Inmediata: <span style="color: #fff;">RD$ ${item.buyNowPrice.toLocaleString()}</span>
              </div>
              ` : ""}
            </div>

            ${bidActionHTML}

            <!-- Historial de Pujas -->
            <div class="bid-history-container">
              <div class="bid-history-title">
                <span>Historial de Ofertas</span>
                <i class="fa-solid fa-clock-rotate-left"></i>
              </div>
              <div class="bid-history-list" id="detail-bids-list">
                ${bidsListHTML}
              </div>
            </div>
          </div>
        `;
      }
    } else {
      // Alquiler fijo o venta directa
      const contractText = isRent ? "Contrato de Alquiler" : "Compra Directa";
      const tagLabel = isRent ? "Alquiler Fijo" : "Venta Fija";
      const tagBg = isRent ? "rgba(0,150,136,0.1)" : "rgba(0,122,255,0.1)";
      const tagColor = isRent ? "var(--text-primary)" : "var(--color-blue-glow)";
      const priceLabelText = isRent ? "Renta Mensual" : "Precio de Venta";
      const waButtonText = isRent ? "Solicitar Alquiler por WhatsApp" : "Negociar por WhatsApp";

      if (item.isSold) {
        auctionSidePanel = `
          <div class="detail-action-card" style="border-color: var(--color-green-glow); background: rgba(52, 199, 89, 0.03);">
            <div class="action-card-header">
              <span class="action-card-title" style="color: var(--color-green-glow);"><i class="fa-solid fa-lock"></i> Reservado</span>
              <span style="font-size: 0.78rem; background: rgba(52, 199, 89, 0.15); color: var(--color-green-glow); padding:0.25rem 0.6rem; border-radius:12px; font-weight:600;">
                Vendido
              </span>
            </div>
            <div style="margin-bottom: 1.5rem; text-align: center; padding: 1rem 0;">
              <i class="fa-solid fa-circle-check" style="font-size: 3rem; color: var(--color-green-glow); margin-bottom: 0.5rem;"></i>
              <p style="font-size: 0.9rem; font-weight: 700;">¡Reserva Completada!</p>
              <p style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.3;">Comisión del 5% pagada a dBuy. El trato ha sido asegurado.</p>
            </div>
            <a href="#" target="_blank" class="btn whatsapp-btn" id="whatsapp-contact-link">
              <i class="fa-brands fa-whatsapp"></i> Hablar con Vendedor
            </a>
          </div>
        `;
      } else if (isOwner) {
        auctionSidePanel = `
          <div class="detail-action-card">
            <div class="action-card-header">
              <span class="action-card-title"><i class="fa-solid ${isRent ? 'fa-key' : 'fa-tags'}"></i> ${contractText}</span>
              <span style="font-size: 0.78rem; background:${tagBg}; color:${tagColor}; padding:0.25rem 0.6rem; border-radius:12px; font-weight:600;">
                ${tagLabel}
              </span>
            </div>

            <div style="margin-bottom: 1.5rem;">
              <span class="price-label">${priceLabelText}</span>
              <div class="action-card-price">RD$ ${item.price.toLocaleString()}${priceSuffix}</div>
            </div>

            <div style="padding: 1.2rem 1rem; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--card-border); border-radius: var(--radius-sm); text-align: center; color: var(--text-secondary); font-size: 0.82rem; line-height: 1.45;">
              <i class="fa-solid fa-circle-info" style="color: var(--color-blue-glow); font-size: 1.3rem; margin-bottom: 0.4rem; display: block;"></i>
              Este es tu anuncio. Puedes gestionarlo o editar sus datos desde los controles superiores.
            </div>
          </div>
        `;
      } else {
        auctionSidePanel = `
          <div class="detail-action-card">
            <div class="action-card-header">
              <span class="action-card-title"><i class="fa-solid ${isRent ? 'fa-key' : 'fa-tags'}"></i> ${contractText}</span>
              <span style="font-size: 0.78rem; background:${tagBg}; color:${tagColor}; padding:0.25rem 0.6rem; border-radius:12px; font-weight:600;">
                ${tagLabel}
              </span>
            </div>

            <div style="margin-bottom: 1.5rem;">
              <span class="price-label">${priceLabelText}</span>
              <div class="action-card-price">RD$ ${item.price.toLocaleString()}${priceSuffix}</div>
            </div>

            <!-- Botón Reservar con Pago Seguro (Dueño de la página gana 5%) -->
            <button type="button" class="btn btn-accent" id="detail-buy-now-btn" style="width: 100%; margin-bottom: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 700;">
              <i class="fa-solid fa-shield-halved"></i> Reservar (Comisión 5% dBuy)
            </button>

            <a href="#" target="_blank" class="btn whatsapp-btn" id="whatsapp-contact-link" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff;">
              <i class="fa-brands fa-whatsapp" style="font-size:1.2rem;"></i> Preguntar por WhatsApp
            </a>
          </div>
        `;
      }
    }

    // Configurar etiqueta de la galería
    let badgeHTML = "";
    if (isSubasta) {
      badgeHTML = isRent ? '<span class="badge-tag detail-badge badge-auction"><i class="fa-solid fa-gavel"></i> Subasta Renta</span>' : '<span class="badge-tag detail-badge badge-auction"><i class="fa-solid fa-gavel"></i> Subasta</span>';
    } else {
      badgeHTML = isRent ? '<span class="badge-tag detail-badge badge-sale" style="background:rgba(0,150,136,0.85); border-color:rgba(0,150,136,0.3);"><i class="fa-solid fa-key"></i> Alquiler</span>' : '<span class="badge-tag detail-badge badge-sale"><i class="fa-solid fa-tags"></i> Venta</span>';
    }

    const images = getItemImages(item);
    const mainImage = images[0] || "images/car_civic.jpg";

    let thumbnailsHTML = "";
    if (images.length > 1) {
      thumbnailsHTML = `<div class="detail-gallery-thumbnails" style="display: flex; gap: 0.5rem; margin-top: 0.8rem; overflow-x: auto; padding-bottom: 0.4rem; max-width: 100%;">`;
      images.forEach((imgSrc, idx) => {
        thumbnailsHTML += `
          <img class="detail-gallery-thumb ${idx === 0 ? 'active' : ''}" src="${imgSrc}" style="width: 70px; height: 50px; object-fit: cover; border-radius: var(--radius-sm); border: 2px solid ${idx === 0 ? 'var(--color-blue-glow)' : 'rgba(255,255,255,0.1)'}; cursor: pointer; opacity: ${idx === 0 ? '1' : '0.6'}; transition: var(--transition-smooth);" data-index="${idx}">
        `;
      });
      thumbnailsHTML += `</div>`;
    }

    // Flechas de navegación para galería multi-imagen
    let navArrowsHTML = "";
    if (images.length > 1) {
      navArrowsHTML = `
        <button type="button" class="gallery-nav-btn prev-btn" id="gallery-prev-btn"><i class="fa-solid fa-chevron-left"></i></button>
        <button type="button" class="gallery-nav-btn next-btn" id="gallery-next-btn"><i class="fa-solid fa-chevron-right"></i></button>
      `;
    }

    // Enlace de Asesoría de Mercado si existe
    let marketLinkHTML = "";
    if (item.marketLink) {
      let valueBoxHTML = "";
      if (item.marketValue) {
        valueBoxHTML = `
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--card-border); padding: 0.8rem; border-radius: var(--radius-sm); margin-bottom: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Valor en Enlace de Asesoría:</span>
            <span style="font-size: 1.1rem; font-weight: 700; color: var(--color-gold);">RD$ ${Number(item.marketValue).toLocaleString("en-US")}</span>
          </div>
        `;
      }

      marketLinkHTML = `
        <div class="detail-description-card" style="border: 1px solid var(--color-blue-glow); background: rgba(0, 122, 255, 0.03);">
          <h4 style="color: var(--color-blue-glow); display: flex; align-items: center; gap: 0.5rem;"><i class="fa-solid fa-chart-line"></i> Asesoría de Valor de Mercado</h4>
          <p style="font-size: 0.82rem; margin-bottom: 0.8rem; color: var(--text-secondary);">El vendedor ha proporcionado información comparativa del valor del artículo en el mercado:</p>
          
          ${valueBoxHTML}

          <div style="font-size: 0.78rem; margin-bottom: 0.8rem; color: var(--text-muted); word-break: break-all; line-height: 1.4; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: var(--radius-xs); border: 1px solid rgba(255,255,255,0.02);">
            <i class="fa-solid fa-link" style="color: var(--color-blue-glow); margin-right: 0.3rem;"></i> 
            <strong>Enlace:</strong> <a href="${item.marketLink}" target="_blank" style="color: var(--color-blue-glow); text-decoration: underline;">${item.marketLink}</a>
          </div>

          <a href="${item.marketLink}" target="_blank" class="btn btn-secondary" style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 700; border-color: var(--color-blue-glow); color: var(--color-blue-glow); background: rgba(0, 122, 255, 0.05); padding: 0.6rem; border-radius: var(--radius-sm); text-decoration: none; font-size: 0.85rem;">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Enlace de Mercado
          </a>
        </div>
      `;
    }

    detailContainer.innerHTML = `
      <!-- Columna Izquierda: Imagen y Ficha -->
      <div style="display: flex; flex-direction: column; gap: 1.2rem;">
        <div>
          <div class="detail-gallery" id="detail-gallery-container" style="position: relative; cursor: pointer;">
            ${badgeHTML}
            <img id="detail-main-img" src="${mainImage}" alt="${item.title}">
            ${navArrowsHTML}
          </div>
          ${thumbnailsHTML}
        </div>

        <div class="detail-description-card">
          <h4>Descripción del Artículo</h4>
          <p>${item.description}</p>
        </div>
        ${marketLinkHTML}
      </div>

      <!-- Columna Derecha: Precios, Puja, Datos del Vendedor -->
      <div class="detail-info">
        <div class="detail-header">
          <div class="detail-meta-top">
            <span>Categoría: <strong>${item.category}</strong></span>
            <span>•</span>
            <span>Ubicación: <strong>${item.province}</strong></span>
          </div>
          <h1 class="detail-title">${item.title}</h1>
        </div>

        <!-- Panel de Venta o Subasta -->
        ${auctionSidePanel}

        <!-- Tarjeta del Vendedor -->
        <div class="seller-card">
          <div class="seller-profile">
            <div class="seller-avatar">
              ${item.sellerName.substring(0, 2).toUpperCase()}
            </div>
            <div class="seller-details">
              <h5>${item.sellerName}</h5>
              <p>Vendedor verificado en dBuy</p>
            </div>
          </div>
          <button class="btn btn-secondary ${isFav ? 'active' : ''}" id="detail-watchlist-btn" style="padding: 0.6rem 0.8rem; border-radius: 50%;">
            <i class="fa-solid fa-heart" style="${isFav ? 'color: #ff3b30;' : ''}"></i>
          </button>
        </div>
      </div>
    `;

    // Configurar escuchas de miniaturas de la galería
    const thumbs = detailContainer.querySelectorAll(".detail-gallery-thumb");
    const mainImg = detailContainer.querySelector("#detail-main-img");
    let currentImgIndex = 0;

    function selectGalleryImage(index) {
      if (index < 0 || index >= images.length) return;
      currentImgIndex = index;
      const targetSrc = images[currentImgIndex];

      if (mainImg) mainImg.src = targetSrc;

      // Actualizar estado visual de miniaturas
      thumbs.forEach((t, i) => {
        if (i === currentImgIndex) {
          t.style.borderColor = "var(--color-blue-glow)";
          t.style.opacity = "1";
          t.classList.add("active");
          // Desplazar miniatura a la vista si es necesario
          t.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        } else {
          t.style.borderColor = "rgba(255,255,255,0.1)";
          t.style.opacity = "0.6";
          t.classList.remove("active");
        }
      });
    }

    thumbs.forEach(thumb => {
      thumb.addEventListener("click", () => {
        const idx = parseInt(thumb.dataset.index);
        selectGalleryImage(idx);
      });
    });

    // Control de flechas y clics sobre el contenedor
    const prevBtn = detailContainer.querySelector("#gallery-prev-btn");
    const nextBtn = detailContainer.querySelector("#gallery-next-btn");
    const galleryContainer = detailContainer.querySelector("#detail-gallery-container");

    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Evitar disparar el clic del contenedor
        let targetIdx = currentImgIndex - 1;
        if (targetIdx < 0) targetIdx = images.length - 1; // bucle al final
        selectGalleryImage(targetIdx);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Evitar disparar el clic del contenedor
        let targetIdx = currentImgIndex + 1;
        if (targetIdx >= images.length) targetIdx = 0; // bucle al inicio
        selectGalleryImage(targetIdx);
      });
    }

    // Permitir clic en el 50% izquierdo o derecho de la imagen grande para navegar
    if (galleryContainer && images.length > 1) {
      galleryContainer.addEventListener("click", (e) => {
        // Ignorar si el usuario hizo clic en la insignia superior (badge)
        if (e.target.closest(".detail-badge")) return;

        const rect = galleryContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left; // posición X relativa dentro del contenedor
        const halfWidth = rect.width / 2;

        if (clickX < halfWidth) {
          // Clic en el lado izquierdo -> Anterior
          let targetIdx = currentImgIndex - 1;
          if (targetIdx < 0) targetIdx = images.length - 1;
          selectGalleryImage(targetIdx);
        } else {
          // Clic en el lado derecho -> Siguiente
          let targetIdx = currentImgIndex + 1;
          if (targetIdx >= images.length) targetIdx = 0;
          selectGalleryImage(targetIdx);
        }
      });
    }

    // --- ACCIONES INTERACTIVAS DENTRO DE DETALLES ---
    
    // Favoritos detalles
    const detailFavBtn = document.getElementById("detail-watchlist-btn");
    detailFavBtn.addEventListener("click", () => {
      const active = dBuyDB.toggleWatchlist(item.id);
      const heartIcon = detailFavBtn.querySelector("i");
      if (active) {
        detailFavBtn.classList.add("active");
        heartIcon.style.color = "#ff3b30";
        showToast("Añadido a Favoritos", `"${item.title}" guardado en tu panel.`, "success");
      } else {
        detailFavBtn.classList.remove("active");
        heartIcon.style.color = "";
        showToast("Eliminado de Favoritos", `"${item.title}" fue retirado.`, "warning");
      }
    });

    // Enlace de WhatsApp para Compra Directa o Subasta Ganada y Pagada
    const waLink = document.getElementById("whatsapp-contact-link");
    if (waLink) {
      const cleanPhone = item.sellerPhone.replace(/\D/g, "");
      const isSubastaEnded = isSubasta && new Date(item.endTime) < new Date();
      let text = `Hola ${item.sellerName}, vi tu anuncio de "${item.title}" en dBuy y estoy interesado. ¿Sigue disponible?`;
      if (isSubasta && isSubastaEnded && item.isSold) {
        text = `¡Hola ${item.sellerName}! Gané tu subasta de "${item.title}" en dBuy y completé el pago de la comisión de reserva. Escribo para coordinar la entrega.`;
      }
      waLink.href = `https://wa.me/1${cleanPhone}?text=${encodeURIComponent(text)}`;
    }

    // Cancelar Subasta
    const cancelAuctionBtn = document.getElementById("detail-cancel-auction-btn");
    if (cancelAuctionBtn) {
      cancelAuctionBtn.addEventListener("click", () => {
        const confirmCancel = confirm("¿Estás seguro de que deseas cancelar esta subasta definitivamente? Esta acción retirará el artículo del catálogo activo.");
        if (confirmCancel) {
          const updatedItem = dBuyDB.updateItem(item.id, { isCancelled: true });
          showToast("Subasta Cancelada", "El anuncio ha sido cancelado con éxito.", "warning");
          if (updatedItem) {
            renderItemDetails(updatedItem);
          }
        }
      });
    }

    // Abrir Modal de Checkout Seguro (Reserva / Comisión)
    const buyNowBtn = document.getElementById("detail-buy-now-btn");
    if (buyNowBtn) {
      buyNowBtn.addEventListener("click", () => {
        if (!currentUser) {
          showToast("Conecta tu cuenta", "Inicia sesión con Google en 'Mi Cuenta' para reservar artículos.", "warning");
          switchView("account");
          return;
        }

        const checkoutModal = document.getElementById("checkout-modal");
        const checkoutTitle = document.getElementById("checkout-item-title");
        const checkoutPrice = document.getElementById("checkout-item-price");
        const checkoutSubtotal = document.getElementById("checkout-subtotal");
        const checkoutFee = document.getElementById("checkout-fee");
        const checkoutTotal = document.getElementById("checkout-total");
        const paySubmitBtn = document.getElementById("checkout-pay-submit-btn");

        const targetPrice = isSubasta ? item.currentBid : item.price;
        const serviceFee = Math.round(targetPrice * 0.05);

        checkoutTitle.textContent = item.title;
        checkoutPrice.textContent = `RD$ ${targetPrice.toLocaleString()}`;
        checkoutSubtotal.textContent = `RD$ ${targetPrice.toLocaleString()}`;
        checkoutFee.textContent = `RD$ ${serviceFee.toLocaleString()}`;
        checkoutTotal.textContent = `RD$ ${serviceFee.toLocaleString()}`;
        paySubmitBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Pagar Comisión RD$ ${serviceFee.toLocaleString()}`;

        // Guardar ID del artículo en el formulario
        document.getElementById("checkout-payment-form").dataset.itemId = item.id;
        document.getElementById("checkout-payment-form").dataset.feeAmount = serviceFee;
        document.getElementById("checkout-payment-form").dataset.isInstantBuy = "false";

        // Mostrar Modal
        checkoutModal.style.display = "flex";
      });
    }

    // Abrir Modal de Checkout para Compra Inmediata (Buy It Now) en subasta
    const instantBuyBtn = document.getElementById("detail-instant-buy-btn");
    if (instantBuyBtn) {
      instantBuyBtn.addEventListener("click", () => {
        if (!currentUser) {
          showToast("Conecta tu cuenta", "Inicia sesión con Google en 'Mi Cuenta' para comprar de inmediato.", "warning");
          switchView("account");
          return;
        }

        const checkoutModal = document.getElementById("checkout-modal");
        const checkoutTitle = document.getElementById("checkout-item-title");
        const checkoutPrice = document.getElementById("checkout-item-price");
        const checkoutSubtotal = document.getElementById("checkout-subtotal");
        const checkoutFee = document.getElementById("checkout-fee");
        const checkoutTotal = document.getElementById("checkout-total");
        const paySubmitBtn = document.getElementById("checkout-pay-submit-btn");

        const targetPrice = item.buyNowPrice;
        const serviceFee = Math.round(targetPrice * 0.05);

        checkoutTitle.textContent = `${item.title} (Compra Inmediata)`;
        checkoutPrice.textContent = `RD$ ${targetPrice.toLocaleString()}`;
        checkoutSubtotal.textContent = `RD$ ${targetPrice.toLocaleString()}`;
        checkoutFee.textContent = `RD$ ${serviceFee.toLocaleString()}`;
        checkoutTotal.textContent = `RD$ ${serviceFee.toLocaleString()}`;
        paySubmitBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Pagar Comisión RD$ ${serviceFee.toLocaleString()}`;

        // Guardar ID y variables en el formulario
        document.getElementById("checkout-payment-form").dataset.itemId = item.id;
        document.getElementById("checkout-payment-form").dataset.feeAmount = serviceFee;
        document.getElementById("checkout-payment-form").dataset.isInstantBuy = "true";
        document.getElementById("checkout-payment-form").dataset.instantBuyPrice = targetPrice;

        // Mostrar Modal
        checkoutModal.style.display = "flex";
      });
    }

    // Acción de Pujar
    const isSubastaActive = isSubasta && (new Date(item.endTime) >= new Date());
    if (isSubastaActive) {
      const bidBtn = document.getElementById("place-bid-btn");
      const bidAmtInput = document.getElementById("detail-bid-amount");
      const errorMsg = document.getElementById("detail-bid-error");

      bidBtn.addEventListener("click", () => {
        if (!currentUser) {
          errorMsg.textContent = "Debes conectar tu cuenta de Google en la pestaña 'Mi Cuenta' para poder ofertar.";
          errorMsg.style.display = "block";
          return;
        }

        const bidAmount = parseInt(bidAmtInput.value);
        
        try {
          errorMsg.style.display = "none";
          // Registrar puja del usuario
          const myName = currentUser.user_metadata?.full_name || currentUser.email.split("@")[0];
          const updatedItem = dBuyDB.placeBid(item.id, myName, bidAmount);
          
          // Efecto visual de éxito
          const biddingCard = document.getElementById("detail-bidding-card");
          biddingCard.classList.add("bid-success-animation");
          setTimeout(() => biddingCard.classList.remove("bid-success-animation"), 800);

          showToast("Puja Realizada", `Has ofrecido RD$ ${bidAmount.toLocaleString()} exitosamente.`, "success");
          
          // Re-render del detalle
          renderItemDetails(updatedItem);

          // SIMULACIÓN DE CONTRA-PUJA AUTOMÁTICA (Competidor)
          simulateCompetitorBid(item.id, bidAmount);
          
        } catch (err) {
          errorMsg.textContent = err.message;
          errorMsg.style.display = "block";
          showToast("Oferta Fallida", err.message, "warning");
        }
      });
    }
  }

  // --- MOTOR DE CONTRA-PUJA MOCK (SIMULA COMPETENCIA ACTIVA) ---
  function simulateCompetitorBid(itemId, userBidAmount) {
    // Si ya hay un temporizador activo para este artículo, cancelarlo para evitar doble puja
    if (autoBidTimers[itemId]) {
      clearTimeout(autoBidTimers[itemId]);
    }

    // Activar indicador visual "Pensando" en el panel
    const competitorIndicator = document.getElementById("competitor-indicator");
    const competitorText = document.getElementById("competitor-text");
    
    if (!competitorIndicator) return;

    // Nombres graciosos dominicanos de competidores
    const names = [
      "Plinio_Santiago", "Junior_LaVega", "Manuel_DN", "Yafreisy_Real", 
      "El_Alfa_Bids", "ElPapeleta_RD", "Carlos_BellaVista", "Lauri_PuntaCana"
    ];
    const compName = names[Math.floor(Math.random() * names.length)];

    setTimeout(() => {
      // Mostrar que el competidor está escribiendo/analizando
      if (activeItemDetailId === itemId && views.detail.classList.contains("active")) {
        competitorText.textContent = `${compName} está evaluando contraofertar...`;
        competitorIndicator.style.display = "inline-flex";
      }
    }, 1500);

    // Esperar de 4 a 6 segundos para pujar
    const delay = 4000 + Math.random() * 2500;

    autoBidTimers[itemId] = setTimeout(() => {
      // Comprobar si el usuario sigue en el detalle de este artículo
      const item = dBuyDB.getItemById(itemId);
      if (!item) return;

      // Calcular nueva puja del competidor (ejemplo: Puja usuario + 5% redondeado a cientos)
      const increment = Math.max(100, Math.ceil((userBidAmount * 0.05) / 100) * 100);
      const competitorBid = userBidAmount + increment;

      // Realizar puja en la base de datos
      try {
        const updatedItem = dBuyDB.placeBid(itemId, compName, competitorBid);
        const isRent = !!item.isRent;
        const rentSuffix = isRent ? " / mes" : "";
        const alertTitle = isRent ? "¡Renta Superada!" : "¡Oferta Superada!";
        const alertMsg = isRent ? `${compName} ofreció una renta de RD$ ${competitorBid.toLocaleString()}${rentSuffix}` : `${compName} ha pujado RD$ ${competitorBid.toLocaleString()}`;
        const quietMsg = isRent ? `Alguien ofreció RD$ ${competitorBid.toLocaleString()}${rentSuffix} en "${item.title}"` : `Alguien pujó RD$ ${competitorBid.toLocaleString()} en "${item.title}"`;

        // Si el usuario sigue viendo este artículo, actualizar UI e indicarlo
        if (activeItemDetailId === itemId && views.detail.classList.contains("active")) {
          competitorIndicator.style.display = "none";
          renderItemDetails(updatedItem);
          
          // Notificación y sacudida de pantalla
          showToast(alertTitle, alertMsg, "auction");
        } else {
          // Si está en otra pantalla, mandar toast global silencioso
          showToast("Subasta Actualizada", quietMsg, "auction");
        }
      } catch (err) {
        console.error("Fallo la simulación de puja", err);
      }
    }, delay);
  }

  // --- MÓDULO DE FORMULARIO DE PUBLICACIÓN ---
  
  // Cambiar modalidad de venta en el UI del formulario
  typeSaleRadio.addEventListener("click", () => {
    typeSaleRadio.classList.add("active");
    typeAuctionRadio.classList.remove("active");
    radioInputSale.checked = true;
    priceFieldLabel.textContent = "Precio Fijo (RD$) *";
    priceInput.placeholder = "Ej. 875,000";
    durationFieldWrapper.style.display = "none";
    if (reservePriceFieldWrapper) reservePriceFieldWrapper.style.display = "none";
    if (buyNowFieldWrapper) buyNowFieldWrapper.style.display = "none";
  });

  typeAuctionRadio.addEventListener("click", () => {
    typeAuctionRadio.classList.add("active");
    typeSaleRadio.classList.remove("active");
    radioInputAuction.checked = true;
    priceFieldLabel.textContent = "Puja Inicial (RD$) *";
    priceInput.placeholder = "Ej. 35,000";
    durationFieldWrapper.style.display = "block";
    if (reservePriceFieldWrapper) reservePriceFieldWrapper.style.display = "block";
    if (buyNowFieldWrapper) buyNowFieldWrapper.style.display = "block";
  });

  pubCancelBtn.addEventListener("click", () => {
    resetPublishFormState();
    switchView("home");
  });

  publishForm.addEventListener("submit", () => {
    const title = document.getElementById("pub-title").value;
    const category = document.getElementById("pub-category").value;
    const province = document.getElementById("pub-province").value;
    const description = document.getElementById("pub-description").value;
    const type = document.querySelector('input[name="pub-type"]:checked').value;
    const price = parseInt(priceInput.value.replace(/,/g, ""));
    const sellerName = document.getElementById("pub-seller-name").value;
    const sellerPhone = document.getElementById("pub-seller-phone").value;
    const imageUrl = pubImageInput.value;
    const contractType = document.getElementById("pub-contract-type").value; // 'sale' or 'rent'
    const marketLink = document.getElementById("pub-market-link").value.trim();
    const marketValueRaw = document.getElementById("pub-market-value").value.replace(/\D/g, "");
    const marketValue = marketValueRaw ? parseInt(marketValueRaw) : null;

    const isAuction = type === "auction";
    const isRent = contractType === "rent";

    const reservePriceRaw = document.getElementById("pub-reserve-price").value.replace(/\D/g, "");
    const reservePrice = isAuction && reservePriceRaw ? parseInt(reservePriceRaw) : null;

    const buyNowPriceRaw = document.getElementById("pub-buy-now-price").value.replace(/\D/g, "");
    const buyNowPrice = isAuction && buyNowPriceRaw ? parseInt(buyNowPriceRaw) : null;

    if (editingItemId) {
      // Editar artículo existente
      const updatedFields = {
        title,
        category,
        province,
        description,
        type,
        price,
        imageUrl,
        isRent,
        sellerName,
        sellerPhone,
        marketLink,
        marketValue,
        reservePrice: isAuction ? reservePrice : null,
        buyNowPrice: isAuction ? buyNowPrice : null,
        sellerId: currentUser ? currentUser.id : null
      };

      if (isAuction) {
        updatedFields.startingBid = price;
        const originalItem = dBuyDB.getItemById(editingItemId);
        if (originalItem && (!originalItem.bidsHistory || originalItem.bidsHistory.length === 0)) {
          updatedFields.currentBid = price;
        }
      }

      dBuyDB.updateItem(editingItemId, updatedFields);
      showToast("¡Anuncio Actualizado!", `"${title}" ha sido editado con éxito.`, "success");

      // Limpiar estado
      resetPublishFormState();

      // Refrescar y mostrar detalles actualizados
      loadItemDetails(editingItemId);
    } else {
      // Publicar nuevo artículo
      const newItem = {
        id: "item_" + Date.now(),
        title,
        category,
        province,
        description,
        type,
        price,
        imageUrl,
        isRent,
        sellerName,
        sellerPhone,
        marketLink,
        marketValue,
        reservePrice,
        buyNowPrice,
        sellerId: currentUser ? currentUser.id : null,
        createdAt: new Date().toISOString()
      };

      if (isAuction) {
        const durationHours = parseInt(document.getElementById("pub-duration").value);
        newItem.startingBid = price;
        newItem.currentBid = price;
        newItem.bidsCount = 0;
        newItem.bidsHistory = [];
        newItem.endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
      }

      // Agregar artículo a la base de datos
      dBuyDB.addItem(newItem);

      // Notificación exitosa
      showToast("¡Artículo Publicado!", `"${title}" ya está visible para todos.`, "success");

      // Limpiar formulario y redireccionar
      resetPublishFormState();
      
      // Redirigir a Home
      switchView("home");
    }
  });


  // --- MÓDULO DE PANEL DE USUARIO (DASHBOARD) ---
  dashboardMenuItems.forEach(item => {
    item.addEventListener("click", () => {
      dashboardMenuItems.forEach(x => x.classList.remove("active"));
      item.classList.add("active");
      activeDashboardTab = item.dataset.tab;
      renderDashboard();
    });
  });

  function renderDashboard() {
    const items = dBuyDB.getItems();
    const watchlist = dBuyDB.getWatchlist();
    const userBids = dBuyDB.getUserBids();

    let tabItems = [];

    if (activeDashboardTab === "listings") {
      dashboardTabTitle.textContent = "Mis Publicaciones";
      // Filtrar ítems creados por mí (excluyendo semillas y usando sellerId si está disponible)
      const defaultItemIds = ["item_1", "item_2", "item_3", "item_4", "item_5"];
      tabItems = items.filter(i => {
        if (currentUser && i.sellerId === currentUser.id) return true;
        if (!i.sellerId && !defaultItemIds.includes(i.id)) return true;
        return false;
      });
    } else if (activeDashboardTab === "bids") {
      dashboardTabTitle.textContent = "Mis Ofertas Activas";
      // Filtrar subastas donde he pujado
      tabItems = items.filter(i => userBids.includes(i.id));
    } else if (activeDashboardTab === "watchlist") {
      dashboardTabTitle.textContent = "Mi Lista de Favoritos";
      // Filtrar favoritos
      tabItems = items.filter(i => watchlist.includes(i.id));
    }

    dashboardItemsGrid.innerHTML = "";

    if (tabItems.length === 0) {
      let emptyText = "No tienes publicaciones activas.";
      if (activeDashboardTab === "bids") emptyText = "No has realizado ofertas en ninguna subasta.";
      if (activeDashboardTab === "watchlist") emptyText = "No tienes artículos en tu lista de deseos.";

      dashboardItemsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; margin: 1rem auto;">
          <i class="fa-solid fa-folder-open"></i>
          <h3>Vacío</h3>
          <p>${emptyText}</p>
        </div>
      `;
      return;
    }

    tabItems.forEach(item => {
      const card = document.createElement("div");
      card.className = "item-card";
      card.dataset.id = item.id;
      const isSubasta = item.type === "auction";
      const isFav = watchlist.includes(item.id);
      const isRent = !!item.isRent;
      
      let timerHTML = "";
      if (isSubasta && !item.isCancelled && !item.isSold) {
        timerHTML = `<span class="auction-timer" data-endtime="${item.endTime}"><i class="fa-solid fa-clock"></i> Calculando...</span>`;
      } else if (item.isCancelled) {
        timerHTML = `<span style="font-size: 0.75rem; color: #ff453a; font-weight: 700;"><i class="fa-solid fa-ban"></i> Cancelada</span>`;
      } else if (item.isSold) {
        timerHTML = `<span style="font-size: 0.75rem; color: var(--color-green-glow); font-weight: 700;"><i class="fa-solid fa-lock"></i> Reservado</span>`;
      }

      // Configurar etiqueta según tipo
      let badgeHTML = "";
      if (item.isCancelled) {
        badgeHTML = '<span class="badge-tag" style="background: rgba(255, 59, 48, 0.85); border-color: rgba(255, 59, 48, 0.3); color: #fff;"><i class="fa-solid fa-ban"></i> Cancelada</span>';
      } else if (item.isSold) {
        badgeHTML = '<span class="badge-tag" style="background: rgba(52, 199, 89, 0.85); border-color: rgba(52, 199, 89, 0.3); color: #fff;"><i class="fa-solid fa-lock"></i> Reservado</span>';
      } else if (isSubasta) {
        badgeHTML = isRent ? '<span class="badge-tag badge-auction"><i class="fa-solid fa-gavel"></i> Subasta Renta</span>' : '<span class="badge-tag badge-auction"><i class="fa-solid fa-gavel"></i> Subasta</span>';
      } else {
        badgeHTML = isRent ? '<span class="badge-tag badge-sale" style="background:rgba(0,150,136,0.85); border-color:rgba(0,150,136,0.3);"><i class="fa-solid fa-key"></i> Alquiler</span>' : '<span class="badge-tag badge-sale"><i class="fa-solid fa-tags"></i> Venta</span>';
      }

      const priceSuffix = isRent ? " / mes" : "";
      const priceLabel = isSubasta ? (isRent ? "Renta Mayor" : "Puja Actual") : (isRent ? "Renta Mensual" : "Precio Fijo");

      const images = getItemImages(item);
      const mainImage = images[0] || "images/car_civic.jpg";

      card.innerHTML = `
        <div class="card-img-wrapper">
          ${badgeHTML}
          <button class="watchlist-btn ${isFav ? 'active' : ''}" data-id="${item.id}">
            <i class="fa-solid fa-heart"></i>
          </button>
          <img src="${mainImage}" class="card-img" alt="${item.title}">
        </div>
        <div class="card-info">
          <div class="card-meta">
            <span>${item.category}</span>
            <span class="card-location"><i class="fa-solid fa-location-dot"></i> ${item.province}</span>
          </div>
          <h3 class="card-title">${item.title}</h3>
          
          ${activeDashboardTab === "listings" && !item.isCancelled && !item.isSold ? `
          <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary edit-listing-btn" data-id="${item.id}" style="width: 100%; padding: 0.4rem; font-size: 0.8rem; font-weight: 700; border-radius: var(--radius-sm); border: 1px solid var(--color-blue-glow); color: var(--color-blue-glow); background: rgba(0, 122, 255, 0.05); display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
              <i class="fa-solid fa-pen-to-square"></i> Editar Anuncio
            </button>
          </div>
          ` : ''}

          <div class="card-footer">
            <div>
              <span class="price-label">${priceLabel}</span>
              <span class="price-value ${isSubasta ? 'auction' : 'sale'}">RD$ ${item.price.toLocaleString()}${priceSuffix}</span>
            </div>
            ${timerHTML}
          </div>
        </div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".watchlist-btn") || e.target.closest(".edit-listing-btn")) return;
        loadItemDetails(item.id);
      });

      const editBtn = card.querySelector(".edit-listing-btn");
      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          startEditItem(item.id);
        });
      }

      const favBtn = card.querySelector(".watchlist-btn");
      favBtn.addEventListener("click", () => {
        const active = dBuyDB.toggleWatchlist(item.id);
        renderDashboard(); // Re-render tab immediately
        if (active) {
          showToast("Añadido a Favoritos", `"${item.title}" guardado en tu panel.`, "success");
        } else {
          showToast("Eliminado de Favoritos", `"${item.title}" fue retirado.`, "warning");
        }
      });

      dashboardItemsGrid.appendChild(card);
    });

    updateAuctionTimers();
  }


  // --- FILTROS Y EVENTOS DE BÚSQUEDA ---

  // Filtros selectores
  catalog.categorySelect.addEventListener("change", (e) => {
    activeFilters.category = e.target.value;
    renderCatalog();
  });

  catalog.provinceSelect.addEventListener("change", (e) => {
    activeFilters.province = e.target.value;
    renderCatalog();
  });

  // Buscador con delay (Debounce simple)
  let searchTimeout;
  globalSearchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      activeFilters.search = e.target.value;
      // Ir a la vista de inicio si no se está allí
      if (!views.home.classList.contains("active")) {
        switchView("home");
      } else {
        renderCatalog();
      }
    }, 300);
  });

  // Tabs de tipos de venta (Todos, Subastas Venta, Venta Fija, Alquiler Fijo, Subasta Renta)
  catalog.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      catalog.tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeFilters.type = tab.dataset.type;
      
      // Actualizar encabezado del catálogo
      if (activeFilters.type === "all") catalog.headerText.textContent = "Artículos Destacados";
      if (activeFilters.type === "sale_fixed") catalog.headerText.textContent = "Ventas a Precio Fijo";
      if (activeFilters.type === "sale_auction") catalog.headerText.textContent = "Subastas de Venta";
      if (activeFilters.type === "rent_fixed") catalog.headerText.textContent = "Alquileres a Renta Fija";
      if (activeFilters.type === "rent_auction") catalog.headerText.textContent = "Subastas de Renta Inmobiliaria";

      renderCatalog();
    });
  });


  // --- BOTONES DE NAVEGACIÓN GENERALES ---
  navButtons.logo.addEventListener("click", (e) => {
    e.preventDefault();
    globalSearchInput.value = "";
    activeFilters = { search: "", category: "all", province: "all", type: "all" };
    
    // Restaurar selects a default
    catalog.categorySelect.value = "all";
    catalog.provinceSelect.value = "all";
    catalog.tabs.forEach(t => t.classList.remove("active"));
    catalog.tabs[0].classList.add("active");
    catalog.headerText.textContent = "Artículos Destacados";

    switchView("home");
  });

  navButtons.home.addEventListener("click", () => switchView("home"));
  navButtons.dashboard.addEventListener("click", () => switchView("dashboard"));
  navButtons.publish.addEventListener("click", () => switchView("publish"));
  backToListBtn.addEventListener("click", () => switchView("home"));

  const detailEditItemBtn = document.getElementById("detail-edit-item-btn");
  if (detailEditItemBtn) {
    detailEditItemBtn.addEventListener("click", () => {
      if (activeItemDetailId) {
        startEditItem(activeItemDetailId);
      }
    });
  }

  navButtons.heroAction.addEventListener("click", () => {
    // Buscar el botón de tab de Subasta y simular clic
    const auctionTabBtn = document.querySelector('.filter-tab[data-type="auction"]');
    if (auctionTabBtn) {
      auctionTabBtn.click();
    }
  });


  // --- HELPERS AUXILIARES ---
  
  // Convertir marcas temporales ISO en expresiones comprensibles
  function formatTimeAgo(isoString) {
    const date = new Date(isoString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return "Ahora mismo";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min${minutes === 1 ? '' : 's'}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} hora${hours === 1 ? '' : 's'}`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} día${days === 1 ? '' : 's'}`;
  }

  // --- INICIALIZACIÓN DE SUPABASE Y CONTROL DE USUARIO ---
  let currentUser = null;

  async function checkUserSession() {
    if (!window.supabaseClient) return;

    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session && session.user) {
        currentUser = session.user;
        updateUIForUser(currentUser);
      } else {
        currentUser = null;
        updateUIForGuest();
      }
    } catch (error) {
      console.error("Error al obtener la sesión de usuario:", error);
    }
  }

  // Escuchar cambios de estado en tiempo real
  if (window.supabaseClient) {
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        currentUser = session.user;
        updateUIForUser(currentUser);
      } else {
        currentUser = null;
        updateUIForGuest();
      }
    });
  }

  function updateUIForUser(user) {
    const profile = user.user_metadata || {};
    const fullName = profile.full_name || user.email.split("@")[0];
    const avatarUrl = profile.avatar_url || "";
    const email = user.email;

    // Actualizar elementos en Dashboard
    const loggedOutHeader = document.getElementById("user-profile-logged-out");
    if (loggedOutHeader) loggedOutHeader.style.display = "none";
    
    const loggedInHeader = document.getElementById("user-profile-logged-in");
    if (loggedInHeader) loggedInHeader.style.display = "flex";

    const profileName = document.getElementById("user-profile-name");
    if (profileName) profileName.textContent = fullName;
    
    const profileEmail = document.getElementById("user-profile-email");
    if (profileEmail) profileEmail.textContent = `Cuenta Google • ${email}`;
    
    const avatarImg = document.getElementById("user-avatar-img");
    if (avatarImg) {
      if (avatarUrl) {
        avatarImg.innerHTML = `<img src="${avatarUrl}" alt="${fullName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      } else {
        avatarImg.textContent = fullName.substring(0, 2).toUpperCase();
      }
    }

    // Actualizar vista de publicación
    const loggedOutPrompt = document.getElementById("publish-logged-out-prompt");
    if (loggedOutPrompt) loggedOutPrompt.style.display = "none";
    
    const formCard = document.getElementById("publish-form-card");
    if (formCard) formCard.style.display = "block";

    // Auto-completar datos en el formulario de publicación
    const sellerNameInput = document.getElementById("pub-seller-name");
    if (sellerNameInput) {
      sellerNameInput.value = fullName;
      sellerNameInput.readOnly = true;
    }

    // Actualizar botón del header de Mi Cuenta
    const navDashboardBtn = document.getElementById("nav-dashboard-btn");
    if (navDashboardBtn) {
      if (avatarUrl) {
        navDashboardBtn.innerHTML = `<img src="${avatarUrl}" alt="${fullName}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; display: inline-block; vertical-align: middle; margin-right: 0.3rem; border: 1px solid var(--color-blue-glow);"> Cuenta`;
      } else {
        navDashboardBtn.innerHTML = `<i class="fa-solid fa-user"></i> Cuenta`;
      }
    }
    
    // Quitar modo invitado del dashboard
    const dashGridEl = document.querySelector(".dashboard-grid");
    if (dashGridEl) dashGridEl.classList.remove("guest-mode");
    
    // Cargar perfil y teléfono de Supabase
    loadUserProfile(user);

    if (views.dashboard.classList.contains("active")) {
      renderDashboard();
    }
  }

  function updateUIForGuest() {
    const loggedInHeader = document.getElementById("user-profile-logged-in");
    if (loggedInHeader) loggedInHeader.style.display = "none";
    
    const loggedOutHeader = document.getElementById("user-profile-logged-out");
    if (loggedOutHeader) loggedOutHeader.style.display = "flex";

    const loggedOutPrompt = document.getElementById("publish-logged-out-prompt");
    if (loggedOutPrompt) loggedOutPrompt.style.display = "block";
    
    const formCard = document.getElementById("publish-form-card");
    if (formCard) formCard.style.display = "none";

    const navDashboardBtn = document.getElementById("nav-dashboard-btn");
    if (navDashboardBtn) {
      navDashboardBtn.innerHTML = `<i class="fa-solid fa-user"></i> Mi Cuenta`;
    }

    // Poner modo invitado del dashboard
    const dashGridEl = document.querySelector(".dashboard-grid");
    if (dashGridEl) dashGridEl.classList.add("guest-mode");

    // Limpiar teléfono y nombre
    userPhone = "";
    renderProfileUI("", "");

    if (views.dashboard.classList.contains("active")) {
      renderDashboard();
    }
  }

  const signInBtn = document.getElementById("google-signin-btn");
  const signOutBtn = document.getElementById("google-signout-btn");
  const signInGlobalBtn = document.querySelector(".google-signin-btn-global");

  async function handleSignIn() {
    if (!window.supabaseClient) {
      showToast("Error de conexión", "No se pudo conectar con Supabase.", "error");
      return;
    }
    showToast("Conectando con Google", "Redirigiendo a Google Auth...", "info");
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) {
      showToast("Error de autenticación", error.message, "error");
    }
  }

  if (signInBtn) signInBtn.addEventListener("click", handleSignIn);
  if (signInGlobalBtn) signInGlobalBtn.addEventListener("click", handleSignIn);
  
  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      if (!window.supabaseClient) return;
      showToast("Cerrando Sesión", "Esperando respuesta...", "info");
      const { error } = await window.supabaseClient.auth.signOut();
      if (!error) {
        showToast("Sesión Cerrada", "Vuelve pronto.", "success");
      }
    });
  }

  // --- MANTENIMIENTO DEL PERFIL Y TELÉFONO DEL USUARIO ---
  let userPhone = "";

  async function loadUserProfile(user) {
    if (!window.supabaseClient) return;

    try {
      // 1. Intentar buscar el perfil en Supabase
      let { data: profile, error } = await window.supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error al leer perfil en Supabase:", error);
      }

      // 2. Si no existe en Supabase, crearlo en Supabase con datos de Google
      if (!profile) {
        const defaultProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email.split("@")[0],
          avatar_url: user.user_metadata?.avatar_url || "",
          phone: ""
        };

        const { data: newProfile, error: insertError } = await window.supabaseClient
          .from("profiles")
          .insert(defaultProfile)
          .select()
          .maybeSingle();

        if (insertError) {
          console.error("Error al crear perfil inicial en Supabase:", insertError);
        } else {
          profile = newProfile;
        }
      }

      // 3. Obtener el teléfono y nombre del perfil o usar fallbacks
      userPhone = (profile && profile.phone) || localStorage.getItem(`dbuy_user_phone_${user.id}`) || "";
      const userDisplayName = (profile && profile.full_name) || localStorage.getItem(`dbuy_user_name_${user.id}`) || user.user_metadata?.full_name || user.email.split("@")[0];

      // 4. Renderizar el estado del perfil en la interfaz
      renderProfileUI(userDisplayName, userPhone);

    } catch (e) {
      console.error("Fallo general cargando perfil:", e);
      // Fallback si la tabla profiles no responde o RLS bloquea
      userPhone = localStorage.getItem(`dbuy_user_phone_${user.id}`) || "";
      const userDisplayName = localStorage.getItem(`dbuy_user_name_${user.id}`) || user.user_metadata?.full_name || user.email.split("@")[0];
      renderProfileUI(userDisplayName, userPhone);
    }
  }

  function renderProfileUI(nameVal, phoneVal) {
    const setupWrapper = document.getElementById("user-phone-setup-wrapper");
    const displayWrapper = document.getElementById("user-phone-display-wrapper");
    const displayPhone = document.getElementById("user-phone-display-text");
    const setupPhoneInput = document.getElementById("user-setup-phone-input");
    const setupNameInput = document.getElementById("user-setup-name-input");
    const profileNameDisplay = document.getElementById("user-profile-name");

    // Rellenar en el formulario de configuración
    if (setupNameInput) setupNameInput.value = nameVal;
    if (setupPhoneInput) setupPhoneInput.value = formatPhoneNumber(phoneVal);

    // Actualizar nombre en el encabezado del perfil
    if (profileNameDisplay) profileNameDisplay.textContent = nameVal;

    // Rellenar en formulario de publicar si están definidos
    const pubPhoneInput = document.getElementById("pub-seller-phone");
    const pubNameInput = document.getElementById("pub-seller-name");

    if (pubNameInput) {
      pubNameInput.value = nameVal;
      pubNameInput.readOnly = true;
    }

    if (phoneVal) {
      if (setupWrapper) setupWrapper.style.display = "none";
      if (displayWrapper) {
        displayWrapper.style.display = "flex";
        displayPhone.textContent = formatPhoneNumber(phoneVal);
      }
      if (pubPhoneInput) {
        pubPhoneInput.value = formatPhoneNumber(phoneVal);
        pubPhoneInput.readOnly = true;
      }
    } else {
      if (setupWrapper) setupWrapper.style.display = "flex";
      if (displayWrapper) displayWrapper.style.display = "none";
      if (pubPhoneInput) {
        pubPhoneInput.value = "";
        pubPhoneInput.readOnly = false;
      }
    }
  }

  // Helper para dar formato visual al teléfono (ej. 809-642-5605)
  function formatPhoneNumber(num) {
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
    }
    return num;
  }

  // Formateador en tiempo real para la entrada del teléfono (máscara interactiva)
  const setupPhoneInput = document.getElementById("user-setup-phone-input");
  if (setupPhoneInput) {
    setupPhoneInput.addEventListener("input", (e) => {
      let cleaned = e.target.value.replace(/\D/g, "");
      
      if (cleaned.length > 10) {
        cleaned = cleaned.substring(0, 10);
      }
      
      let formatted = "";
      if (cleaned.length > 0) {
        formatted += cleaned.substring(0, 3);
      }
      if (cleaned.length > 3) {
        formatted += "-" + cleaned.substring(3, 6);
      }
      if (cleaned.length > 6) {
        formatted += "-" + cleaned.substring(6, 10);
      }
      
      e.target.value = formatted;
    });
  }

  // Formateador en tiempo real para la entrada del teléfono del vendedor en formulario publicar
  const pubPhoneInput = document.getElementById("pub-seller-phone");
  if (pubPhoneInput) {
    pubPhoneInput.addEventListener("input", (e) => {
      let cleaned = e.target.value.replace(/\D/g, "");
      
      if (cleaned.length > 10) {
        cleaned = cleaned.substring(0, 10);
      }
      
      let formatted = "";
      if (cleaned.length > 0) {
        formatted += cleaned.substring(0, 3);
      }
      if (cleaned.length > 3) {
        formatted += "-" + cleaned.substring(3, 6);
      }
      if (cleaned.length > 6) {
        formatted += "-" + cleaned.substring(6, 10);
      }
      
      e.target.value = formatted;
    });
  }

  // Formateador en tiempo real para el campo de precio con comas (separadores de miles)
  const pubPriceInput = document.getElementById("pub-price");
  if (pubPriceInput) {
    pubPriceInput.addEventListener("input", (e) => {
      let cleaned = e.target.value.replace(/\D/g, "");
      if (cleaned) {
        e.target.value = Number(cleaned).toLocaleString("en-US");
      } else {
        e.target.value = "";
      }
    });
  }

  // Formateador en tiempo real para el valor de referencia de mercado con comas
  const pubMarketValueInput = document.getElementById("pub-market-value");
  if (pubMarketValueInput) {
    pubMarketValueInput.addEventListener("input", (e) => {
      let cleaned = e.target.value.replace(/\D/g, "");
      if (cleaned) {
        e.target.value = Number(cleaned).toLocaleString("en-US");
      } else {
        e.target.value = "";
      }
    });
  }

  // Formateador en tiempo real para el precio de reserva con comas
  const pubReservePriceInput = document.getElementById("pub-reserve-price");
  if (pubReservePriceInput) {
    pubReservePriceInput.addEventListener("input", (e) => {
      let cleaned = e.target.value.replace(/\D/g, "");
      if (cleaned) {
        e.target.value = Number(cleaned).toLocaleString("en-US");
      } else {
        e.target.value = "";
      }
    });
  }

  // Formateador en tiempo real para el precio de compra inmediata con comas
  const pubBuyNowPriceInput = document.getElementById("pub-buy-now-price");
  if (pubBuyNowPriceInput) {
    pubBuyNowPriceInput.addEventListener("input", (e) => {
      let cleaned = e.target.value.replace(/\D/g, "");
      if (cleaned) {
        e.target.value = Number(cleaned).toLocaleString("en-US");
      } else {
        e.target.value = "";
      }
    });
  }

  // Listeners de Guardar y Editar Teléfono
  const savePhoneBtn = document.getElementById("user-save-phone-btn");
  if (savePhoneBtn) {
    savePhoneBtn.addEventListener("click", async () => {
      const phoneInputVal = document.getElementById("user-setup-phone-input").value.replace(/\D/g, "");
      const nameInputVal = document.getElementById("user-setup-name-input").value.trim();

      if (!nameInputVal) {
        showToast("Nombre Requerido", "Por favor ingresa tu nombre o el de tu negocio.", "warning");
        return;
      }

      if (phoneInputVal.length < 10) {
        showToast("Número Inválido", "Por favor ingresa un número de 10 dígitos (ej. 809-555-1234).", "warning");
        return;
      }

      if (!currentUser) return;

      showToast("Guardando Perfil", "Sincronizando...", "info");

      // 1. Guardar localmente
      localStorage.setItem(`dbuy_user_phone_${currentUser.id}`, phoneInputVal);
      localStorage.setItem(`dbuy_user_name_${currentUser.id}`, nameInputVal);
      userPhone = phoneInputVal;

      // 2. Intentar guardar en Supabase
      if (window.supabaseClient) {
        try {
          const { error } = await window.supabaseClient
            .from("profiles")
            .update({ 
              phone: phoneInputVal,
              full_name: nameInputVal 
            })
            .eq("id", currentUser.id);

          if (error) {
            console.error("Error guardando en Supabase profiles:", error);
            showToast("Guardado Local", "Guardado en el navegador (Supabase no respondió).", "warning");
          } else {
            showToast("Perfil Actualizado", "Tus datos han sido guardados con éxito.", "success");
          }
        } catch (e) {
          console.error("Fallo de conexión al guardar:", e);
          showToast("Guardado Local", "Guardado localmente en tu equipo.", "warning");
        }
      } else {
        showToast("Guardado Local", "Guardado localmente en tu equipo.", "success");
      }

      renderProfileUI(nameInputVal, userPhone);
    });
  }

  const editPhoneBtn = document.getElementById("edit-user-phone-btn");
  if (editPhoneBtn) {
    editPhoneBtn.addEventListener("click", () => {
      const setupWrapper = document.getElementById("user-phone-setup-wrapper");
      const displayWrapper = document.getElementById("user-phone-display-wrapper");
      const setupPhoneInput = document.getElementById("user-setup-phone-input");
      const setupNameInput = document.getElementById("user-setup-name-input");
      const profileNameDisplay = document.getElementById("user-profile-name");

      if (setupWrapper) setupWrapper.style.display = "flex";
      if (displayWrapper) displayWrapper.style.display = "none";
      if (setupPhoneInput) setupPhoneInput.value = formatPhoneNumber(userPhone);
      if (setupNameInput && profileNameDisplay) {
        setupNameInput.value = profileNameDisplay.textContent;
      }
    });
  }

  // --- SECTOR DE TABS DE MÉTODOS DE IMAGEN ---
  const imgTabs = document.querySelectorAll(".img-method-tab");
  const imgContainers = document.querySelectorAll(".img-method-container");

  imgTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      imgTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      imgContainers.forEach(c => c.style.display = "none");
      const targetContainer = document.getElementById(`img-container-${tab.dataset.method}`);
      if (targetContainer) targetContainer.style.display = "block";
    });
  });

  // Utilidad de compresión y redimensionado de imágenes usando HTML5 Canvas (Máx 800px)
  function compressImageAsync(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 600;
            
            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL("image/jpeg", 0.75); // jpeg comprimido 75%
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (err) => reject(err);
        img.src = e.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // --- GESTIÓN DE MÚLTIPLES IMÁGENES SELECCIONADAS ---
  let selectedImages = [];

  function addSelectedImage(url) {
    if (selectedImages.includes(url)) return;
    
    if (selectedImages.length >= 25) {
      showToast("Límite alcanzado", "Puedes subir un máximo de 25 imágenes por anuncio.", "warning");
      return;
    }

    selectedImages.push(url);
    renderSelectedImages();
  }

  function removeSelectedImage(index) {
    selectedImages.splice(index, 1);
    renderSelectedImages();
  }

  function renderSelectedImages() {
    const listWrapper = document.getElementById("selected-images-preview-list");
    if (!listWrapper) return;

    listWrapper.innerHTML = "";

    if (selectedImages.length === 0) {
      listWrapper.innerHTML = `<div id="empty-images-preview-placeholder" style="color: var(--text-muted); font-size: 0.8rem; text-align: center; width: 100%;">No hay imágenes seleccionadas todavía.</div>`;
      pubImageInput.value = "[]";
      return;
    }

    selectedImages.forEach((imgSrc, idx) => {
      const imgContainer = document.createElement("div");
      imgContainer.style.position = "relative";
      imgContainer.style.width = "90px";
      imgContainer.style.height = "85px"; // un poco más alto para dar espacio a los controles
      imgContainer.style.borderRadius = "var(--radius-sm)";
      imgContainer.style.border = "1px solid var(--card-border)";
      imgContainer.style.background = "rgba(0,0,0,0.4)";
      imgContainer.style.display = "flex";
      imgContainer.style.flexDirection = "column";
      imgContainer.style.overflow = "hidden";
      
      let controlsHTML = "";
      if (selectedImages.length > 1) {
        controlsHTML = `
          <div style="height: 22px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.85); border-top: 1px solid rgba(255,255,255,0.08); padding: 0 4px;">
            <button type="button" class="move-left-btn" style="background: none; border: none; color: var(--color-blue-glow); cursor: pointer; padding: 2px; font-size: 0.7rem; display: ${idx === 0 ? 'none' : 'block'};" title="Mover a la izquierda"><i class="fa-solid fa-chevron-left"></i></button>
            <span style="font-size: 0.65rem; color: #fff; font-weight: 700; flex: 1; text-align: center;">#${idx + 1}</span>
            <button type="button" class="move-right-btn" style="background: none; border: none; color: var(--color-blue-glow); cursor: pointer; padding: 2px; font-size: 0.7rem; display: ${idx === selectedImages.length - 1 ? 'none' : 'block'};" title="Mover a la derecha"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        `;
      } else {
        controlsHTML = `
          <div style="height: 22px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.85); border-top: 1px solid rgba(255,255,255,0.08);">
            <span style="font-size: 0.65rem; color: #aaa; font-weight: 700;">Principal</span>
          </div>
        `;
      }

      imgContainer.innerHTML = `
        <div style="flex: 1; position: relative; overflow: hidden; background: #000;">
          <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
          <button type="button" class="img-delete-btn" style="position: absolute; top: 2px; right: 2px; background: rgba(255, 59, 48, 0.85); color: white; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 0.6rem; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;" title="Eliminar imagen">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        ${controlsHTML}
      `;

      // Evento de eliminar
      imgContainer.querySelector(".img-delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        removeSelectedImage(idx);
      });

      // Evento mover izquierda
      const leftBtn = imgContainer.querySelector(".move-left-btn");
      if (leftBtn) {
        leftBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const temp = selectedImages[idx];
          selectedImages[idx] = selectedImages[idx - 1];
          selectedImages[idx - 1] = temp;
          renderSelectedImages();
        });
      }

      // Evento mover derecha
      const rightBtn = imgContainer.querySelector(".move-right-btn");
      if (rightBtn) {
        rightBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const temp = selectedImages[idx];
          selectedImages[idx] = selectedImages[idx + 1];
          selectedImages[idx + 1] = temp;
          renderSelectedImages();
        });
      }

      listWrapper.appendChild(imgContainer);
    });

    pubImageInput.value = JSON.stringify(selectedImages);
  }

  // Listener para subida de múltiples archivos locales (secuencial)
  const imageFileInput = document.getElementById("pub-image-file");
  if (imageFileInput) {
    imageFileInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      showToast("Procesando imágenes", `Optimizando ${files.length} archivos en secuencia...`, "info");

      let loadedCount = 0;
      for (const file of files) {
        // Detener si llegamos al límite de 25
        if (selectedImages.length >= 25) {
          showToast("Límite alcanzado", "Se detuvo la carga al alcanzar las 25 imágenes.", "warning");
          break;
        }

        if (file.size > 5 * 1024 * 1024) {
          showToast("Archivo omitido", `"${file.name}" supera los 5MB.`, "warning");
          continue;
        }

        try {
          const dataUrl = await compressImageAsync(file);
          addSelectedImage(dataUrl);
          loadedCount++;
        } catch (err) {
          console.error("Error al procesar archivo:", file.name, err);
          showToast("Error de carga", `No se pudo procesar "${file.name}".`, "warning");
        }
      }

      showToast("Proceso finalizado", `Cargadas ${loadedCount} imágenes con éxito.`, "success");
      imageFileInput.value = ""; // reset uploader
    });
  }

  // Listener para pegado y agregado de URL web
  const previewUrlBtn = document.getElementById("preview-url-btn");
  const urlInput = document.getElementById("pub-image-url-input");

  if (previewUrlBtn) {
    previewUrlBtn.addEventListener("click", () => {
      const urlVal = urlInput.value.trim();
      if (!urlVal) {
        showToast("Ingresa una URL", "Por favor ingresa un enlace de imagen válido.", "warning");
        return;
      }

      addSelectedImage(urlVal);
      urlInput.value = ""; // limpiar entrada
      showToast("URL añadida", "Enlace agregado a la lista del anuncio.", "success");
    });
  }

  function startEditItem(itemId) {
    const item = dBuyDB.getItemById(itemId);
    if (!item) return;

    editingItemId = itemId;

    // 1. Cambiar textos del formulario
    document.querySelector("#publish-view .form-title").innerHTML = `<i class="fa-solid fa-pen-to-square text-blue-glow"></i> Editar tu Artículo`;
    document.querySelector("#publish-view .form-subtitle").textContent = "Modifica los campos del formulario para actualizar tu artículo listado.";
    
    const submitBtn = document.getElementById("pub-submit-btn");
    if (submitBtn) {
      submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios`;
    }

    // 2. Rellenar formulario con datos del artículo
    document.getElementById("pub-title").value = item.title;
    document.getElementById("pub-category").value = item.category;
    document.getElementById("pub-province").value = item.province;
    document.getElementById("pub-description").value = item.description;
    
    // Rellenar tipo de oferta (alquiler/venta)
    const contractSelect = document.getElementById("pub-contract-type");
    if (contractSelect) {
      contractSelect.value = item.isRent ? "rent" : "sale";
    }

    // Rellenar tipo de modalidad (venta directa / subasta)
    if (item.type === "auction") {
      typeAuctionRadio.click();
      const durSelect = document.getElementById("pub-duration");
      if (durSelect) {
        durSelect.value = "24"; // valor aproximado de subasta
      }
      priceInput.value = item.currentBid.toLocaleString("en-US");
    } else {
      typeSaleRadio.click();
      priceInput.value = item.price.toLocaleString("en-US");
    }

    document.getElementById("pub-seller-name").value = item.sellerName;
    document.getElementById("pub-seller-phone").value = formatPhoneNumber(item.sellerPhone);
    document.getElementById("pub-market-link").value = item.marketLink || "";
    document.getElementById("pub-market-value").value = item.marketValue ? Number(item.marketValue).toLocaleString("en-US") : "";
    document.getElementById("pub-reserve-price").value = item.reservePrice ? Number(item.reservePrice).toLocaleString("en-US") : "";
    document.getElementById("pub-buy-now-price").value = item.buyNowPrice ? Number(item.buyNowPrice).toLocaleString("en-US") : "";
    
    // Cargar imágenes guardadas
    selectedImages = getItemImages(item);
    renderSelectedImages();

    // 3. Activar pestaña visual correcta basada en el tipo de la primera imagen
    if (selectedImages.length > 0) {
      const firstImg = selectedImages[0];
      const isPreset = PRESET_IMAGES.some(opt => opt.url === firstImg);
      
      if (firstImg.startsWith("data:image/")) {
        const uploadTab = document.querySelector('.img-method-tab[data-method="upload"]');
        if (uploadTab) uploadTab.click();
      } else if (!isPreset && firstImg.startsWith("http")) {
        const urlTab = document.querySelector('.img-method-tab[data-method="url"]');
        if (urlTab) urlTab.click();
      } else {
        const galleryTab = document.querySelector('.img-method-tab[data-method="gallery"]');
        if (galleryTab) galleryTab.click();
      }
    }

    // 4. Cambiar a la vista de publicación
    switchView("publish");
  }

  function resetPublishFormState() {
    editingItemId = null;
    publishForm.reset();
    
    // Restaurar títulos originales
    document.querySelector("#publish-view .form-title").innerHTML = `<i class="fa-solid fa-circle-plus text-blue-glow"></i> Publica tu Artículo`;
    document.querySelector("#publish-view .form-subtitle").textContent = "Completa el formulario para listar tu artículo en venta o abrir una subasta.";
    
    const submitBtn = document.getElementById("pub-submit-btn");
    if (submitBtn) {
      submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> Publicar Ahora`;
    }
    
    // Restaurar radio por defecto y autocompletar vendedor si está logueado
    typeSaleRadio.click();
    if (currentUser) {
      const fullName = currentUser.user_metadata?.full_name || currentUser.email.split("@")[0];
      document.getElementById("pub-seller-name").value = fullName;
      document.getElementById("pub-seller-name").readOnly = true;
      document.getElementById("pub-seller-phone").value = formatPhoneNumber(userPhone);
      document.getElementById("pub-seller-phone").readOnly = true;
    }

    // Restaurar imágenes seleccionadas a por defecto (la primera de la galería)
    selectedImages = ["images/car_civic.jpg"];
    renderSelectedImages();

    // Restaurar pestañas de imágenes
    const firstTab = document.querySelector('.img-method-tab[data-method="gallery"]');
    if (firstTab) firstTab.click();

    // Limpiar campos auxiliares
    const fileInput = document.getElementById("pub-image-file");
    if (fileInput) fileInput.value = "";
    
    const urlInput = document.getElementById("pub-image-url-input");
    if (urlInput) urlInput.value = "";

    const marketLinkInput = document.getElementById("pub-market-link");
    if (marketLinkInput) marketLinkInput.value = "";

    const marketValueInput = document.getElementById("pub-market-value");
    if (marketValueInput) marketValueInput.value = "";

    const reservePriceInput = document.getElementById("pub-reserve-price");
    if (reservePriceInput) reservePriceInput.value = "";

    const buyNowPriceInput = document.getElementById("pub-buy-now-price");
    if (buyNowPriceInput) buyNowPriceInput.value = "";

    if (reservePriceFieldWrapper) reservePriceFieldWrapper.style.display = "none";
    if (buyNowFieldWrapper) buyNowFieldWrapper.style.display = "none";
    if (durationFieldWrapper) durationFieldWrapper.style.display = "none";
  }

  // --- GESTIÓN DE PAGO SEGURO (CHECKOUT MODAL) ---
  const checkoutModal = document.getElementById("checkout-modal");
  const checkoutCloseBtn = document.getElementById("checkout-close-btn");
  const checkoutPaymentForm = document.getElementById("checkout-payment-form");
  const cardNumInput = document.getElementById("pay-card-number");
  const cardExpiryInput = document.getElementById("pay-card-expiry");
  const cardCvcInput = document.getElementById("pay-card-cvc");

  if (checkoutCloseBtn) {
    checkoutCloseBtn.addEventListener("click", () => {
      checkoutModal.style.display = "none";
      checkoutPaymentForm.reset();
    });
  }

  // Cerrar modal al hacer clic fuera del card
  if (checkoutModal) {
    checkoutModal.addEventListener("click", (e) => {
      if (e.target === checkoutModal) {
        checkoutModal.style.display = "none";
        checkoutPaymentForm.reset();
      }
    });
  }

  // Formateador en tiempo real para Número de Tarjeta (XXXX XXXX XXXX XXXX)
  if (cardNumInput) {
    cardNumInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      let formatted = "";
      for (let i = 0; i < value.length && i < 16; i++) {
        if (i > 0 && i % 4 === 0) formatted += " ";
        formatted += value[i];
      }
      e.target.value = formatted;
    });
  }

  // Formateador en tiempo real para Vencimiento (MM/AA)
  if (cardExpiryInput) {
    cardExpiryInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      let formatted = "";
      if (value.length > 0) {
        let month = value.substring(0, 2);
        // Validar mes
        if (month.length === 2) {
          let mNum = parseInt(month);
          if (mNum < 1) month = "01";
          if (mNum > 12) month = "12";
        }
        formatted = month;
        if (value.length > 2) {
          formatted += "/" + value.substring(2, 4);
        }
      }
      e.target.value = formatted;
    });
  }

  // Formateador en tiempo real para CVC (3 o 4 dígitos)
  if (cardCvcInput) {
    cardCvcInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").substring(0, 4);
    });
  }

  // Procesamiento del formulario de pago
  if (checkoutPaymentForm) {
    checkoutPaymentForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const itemId = checkoutPaymentForm.dataset.itemId;
      const feeAmount = parseInt(checkoutPaymentForm.dataset.feeAmount);
      const isInstantBuy = checkoutPaymentForm.dataset.isInstantBuy === "true";
      const instantBuyPrice = parseInt(checkoutPaymentForm.dataset.instantBuyPrice || "0");
      const paySubmitBtn = document.getElementById("checkout-pay-submit-btn");

      // Simulación de carga
      paySubmitBtn.disabled = true;
      paySubmitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Autorizando Pago Seguro...`;

      setTimeout(() => {
        // Guardar estado en Supabase/local
        let updatedItem;
        if (isInstantBuy) {
          const myName = currentUser ? (currentUser.user_metadata?.full_name || currentUser.email.split("@")[0]) : "Yo";
          updatedItem = dBuyDB.instantBuyAuction(itemId, myName, instantBuyPrice);
        } else {
          updatedItem = dBuyDB.updateItem(itemId, { isSold: true });
        }

        // Notificación de éxito
        showToast(
          "Pago Exitoso", 
          `Se procesó el pago de RD$ ${feeAmount.toLocaleString()} de comisión. ¡El artículo ha sido reservado!`, 
          "success"
        );

        // Resetear y ocultar modal
        checkoutModal.style.display = "none";
        checkoutPaymentForm.reset();
        paySubmitBtn.disabled = false;

        // Refrescar los detalles del artículo in-place
        if (updatedItem) {
          renderItemDetails(updatedItem);
        }
      }, 2500);
    });
  }

  // --- EJECUCIÓN INICIAL ---
  populateSelects();
  renderCatalog();
  checkUserSession();
});
