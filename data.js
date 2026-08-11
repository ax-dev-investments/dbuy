// dBuy - Base de Datos Local y Estructuras de Datos

// Inicialización de Supabase
const supabaseUrl = 'https://wgybwzmfxxvuvcyfufdi.supabase.co';
const supabaseKey = 'sb_publishable_mk1PTejYPSP6LO3K_HwGRQ_JJelZugS';

if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
  window.supabaseClient = null;
}

const CATEGORIES = [
  "Vehículos",
  "Propiedades",
  "Electrónica",
  "Moda y Joyas",
  "Hogar",
  "Otros"
];

const PROVINCES = [
  "Distrito Nacional",
  "Santo Domingo",
  "Santiago",
  "La Altagracia (Punta Cana)",
  "La Romana",
  "San Cristóbal",
  "Samaná",
  "Puerto Plata",
  "La Vega",
  "San Pedro de Macorís"
];

const DEFAULT_ITEMS = [
  {
    id: "item_1",
    title: "Honda Civic Hatchback EX 2018",
    description: "Honda Civic Hatchback EX 2018, color gris metálico, motor 1.5L Turbo de excelente consumo, transmisión automática de 7 velocidades, solo 65,000 kilómetros recorridos. Equipado con aros deportivos de fábrica, interiores en tela negra impecable, pantalla táctil con Apple CarPlay y Android Auto, cámara de reversa y la cámara lateral LaneWatch. Mantenimientos preventivos al día en centro autorizado.",
    price: 875000,
    type: "sale",
    category: "Vehículos",
    province: "Santo Domingo",
    imageUrl: "images/car_civic.jpg",
    sellerName: "José Rodríguez",
    sellerPhone: "8095551234",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  },
  {
    id: "item_2",
    title: "iPhone 15 Pro Max 256GB - Titanio Natural",
    description: "iPhone 15 Pro Max de 256GB en color Titanio Natural. Batería al 94% de vida útil, libre de fábrica para todas las compañías de telecomunicación locales (Claro, Altice, Viva). Sin rayones ni abolladuras (Estética 9.9/10), siempre usado con protector de pantalla y cover. Se entrega en su caja original con su cable trenzado USB-C intacto.",
    price: 42000,
    startingBid: 35000,
    currentBid: 42000,
    bidsCount: 5,
    bidsHistory: [
      { bidder: "Alex", amount: 36000, time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
      { bidder: "Manuel", amount: 38000, time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { bidder: "Alex", amount: 39500, time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
      { bidder: "Laura", amount: 41000, time: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
      { bidder: "Juan", amount: 42000, time: new Date(Date.now() - 5 * 60 * 1000).toISOString() }
    ],
    type: "auction",
    category: "Electrónica",
    province: "Distrito Nacional",
    imageUrl: "images/phone_iphone.jpg",
    sellerName: "María Santana",
    sellerPhone: "8295556789",
    endTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(), // Expires in 2.5 hours
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "item_3",
    title: "Rolex Submariner Date 41mm (LN 126610)",
    description: "Reloj de lujo Rolex Submariner Date de 41mm en acero Oystersteel con esfera y bisel giratorio Cerachrom de cerámica negra (Referencia 126610LN). Año de adquisición 2022, se entrega en juego completo (Box & Papers): caja verde Rolex, folletos, eslabones completos y tarjeta de garantía internacional de distribuidor oficial dominicano. Condición excelente 9.7/10, sin pulir.",
    price: 680000,
    startingBid: 500000,
    currentBid: 680000,
    bidsCount: 4,
    bidsHistory: [
      { bidder: "Roberto", amount: 550000, time: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() },
      { bidder: "Fernando", amount: 600000, time: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
      { bidder: "Roberto", amount: 650000, time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
      { bidder: "Luis", amount: 680000, time: new Date(Date.now() - 25 * 60 * 1000).toISOString() }
    ],
    type: "auction",
    category: "Moda y Joyas",
    province: "La Romana",
    imageUrl: "images/watch_rolex.jpg",
    sellerName: "Elite Timepieces RD",
    sellerPhone: "8095559876",
    endTime: new Date(Date.now() + 18.5 * 60 * 60 * 1000).toISOString(), // Expires in 18.5 hours
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "item_4",
    title: "Apartamento de Lujo Frente al Mar - Cap Cana",
    description: "Exclusivo apartamento de playa amueblado en la prestigiosa zona de Cap Cana, Punta Cana. Cuenta con 2 amplias habitaciones con baño privado, medio baño de visitas, cocina italiana equipada, sala de estar de concepto abierto y una terraza de gran tamaño con jacuzzi privado y espectaculares vistas frontales al mar Caribe. Acceso inmediato a marina privada, piscina infinita, gimnasio y seguridad 24/7. Airbnb Friendly.",
    price: 14200000,
    type: "sale",
    category: "Propiedades",
    province: "La Altagracia (Punta Cana)",
    imageUrl: "images/condo_punta_cana.jpg",
    sellerName: "Alex Dev Investments",
    sellerPhone: "8295554321",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "item_5",
    title: "Penthouse Amueblado con Vista 360° - Piantini",
    description: "Espectacular apartamento tipo Penthouse totalmente amueblado y equipado en alquiler en el exclusivo sector de Piantini, Santo Domingo. Cuenta con 3 habitaciones con walk-in closet y baño, amplio salón familiar con ventanales de piso a techo, cocina fría y caliente, terraza privada techada/destechada con jacuzzi, área de barbacoa y 3 parqueos techados. Torre moderna con lobby climatizado, piscina, gimnasio y seguridad armada.",
    price: 52000,
    startingBid: 45000,
    currentBid: 52000,
    bidsCount: 3,
    bidsHistory: [
      { bidder: "Roberto", amount: 48000, time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
      { bidder: "Clara", amount: 50000, time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { bidder: "Marcos", amount: 52000, time: new Date(Date.now() - 15 * 60 * 1000).toISOString() }
    ],
    type: "auction",
    category: "Propiedades",
    province: "Distrito Nacional",
    imageUrl: "images/apt_piantini.jpg",
    isRent: true,
    sellerName: "Alex Dev Investments",
    sellerPhone: "8295554321",
    endTime: new Date(Date.now() + 4.5 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  }
];

// Helper database functions with LocalStorage
const dBuyDB = {
  init() {
    if (!localStorage.getItem("dbuy_initialized")) {
      localStorage.setItem("dbuy_categories", JSON.stringify(CATEGORIES));
      localStorage.setItem("dbuy_provinces", JSON.stringify(PROVINCES));
      localStorage.setItem("dbuy_items", JSON.stringify(DEFAULT_ITEMS));
      localStorage.setItem("dbuy_watchlist", JSON.stringify([]));
      localStorage.setItem("dbuy_user_bids", JSON.stringify([]));
      localStorage.setItem("dbuy_initialized", "true");
    } else {
      // Auto-inject item_5 if missing in active localStorage
      try {
        const items = JSON.parse(localStorage.getItem("dbuy_items")) || [];
        if (!items.some(i => i.id === "item_5")) {
          items.push(DEFAULT_ITEMS[4]); // Add item_5
          localStorage.setItem("dbuy_items", JSON.stringify(items));
        }
      } catch (e) {
        console.error("Error auto-injecting rental item", e);
      }
    }
  },

  getItems() {
    this.init();
    return JSON.parse(localStorage.getItem("dbuy_items"));
  },

  saveItems(items) {
    localStorage.setItem("dbuy_items", JSON.stringify(items));
  },

  getItemById(id) {
    const items = this.getItems();
    return items.find(item => item.id === id);
  },

  getCategories() {
    this.init();
    return JSON.parse(localStorage.getItem("dbuy_categories"));
  },

  getProvinces() {
    this.init();
    return JSON.parse(localStorage.getItem("dbuy_provinces"));
  },

  addItem(item) {
    const items = this.getItems();
    items.unshift(item); // Add to the top
    this.saveItems(items);
    return item;
  },

  updateItem(itemId, updatedFields) {
    const items = this.getItems();
    const index = items.findIndex(item => item.id === itemId);
    if (index === -1) return null;
    
    // Sobrescribir campos modificados
    items[index] = { ...items[index], ...updatedFields };
    this.saveItems(items);
    return items[index];
  },

  placeBid(itemId, bidderName, bidAmount) {
    const items = this.getItems();
    const index = items.findIndex(item => item.id === itemId);
    if (index === -1) return null;

    const item = items[index];
    if (item.type !== "auction") return null;

    if (bidAmount <= item.currentBid) {
      throw new Error(`La oferta debe ser mayor que la puja actual de RD$ ${item.currentBid.toLocaleString()}`);
    }

    const newBid = {
      bidder: bidderName,
      amount: bidAmount,
      time: new Date().toISOString()
    };

    item.currentBid = bidAmount;
    item.price = bidAmount; // update general price property
    item.bidsCount += 1;
    if (!item.bidsHistory) item.bidsHistory = [];
    item.bidsHistory.unshift(newBid); // newest bids at the top

    items[index] = item;
    this.saveItems(items);

    // Save bid in user's bid registry
    if (bidderName === "Yo") {
      const userBids = JSON.parse(localStorage.getItem("dbuy_user_bids")) || [];
      if (!userBids.includes(itemId)) {
        userBids.push(itemId);
        localStorage.setItem("dbuy_user_bids", JSON.stringify(userBids));
      }
    }

    return item;
  },

  getWatchlist() {
    this.init();
    return JSON.parse(localStorage.getItem("dbuy_watchlist")) || [];
  },

  toggleWatchlist(itemId) {
    let watchlist = this.getWatchlist();
    const index = watchlist.indexOf(itemId);
    if (index === -1) {
      watchlist.push(itemId);
    } else {
      watchlist.splice(index, 1);
    }
    localStorage.setItem("dbuy_watchlist", JSON.stringify(watchlist));
    return watchlist.includes(itemId);
  },

  getUserBids() {
    this.init();
    return JSON.parse(localStorage.getItem("dbuy_user_bids")) || [];
  }
};

// Export to window object for access by other scripts
window.dBuyDB = dBuyDB;
window.CATEGORIES = CATEGORIES;
window.PROVINCES = PROVINCES;
