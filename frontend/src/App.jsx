import React, { useState, useEffect } from "react";
import api, { API_URL } from "./utils/api";
import MapView from "./components/MapView";
import ChatRoom from "./components/ChatRoom";
import "bootstrap/dist/css/bootstrap.min.css";

export default function App() {
  const [page, setPage] = useState("home");
  const [currentUser, setCurrentUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [myMeals, setMyMeals] = useState([]);
  
  // Auth Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("guest");
  const [diet, setDiet] = useState([]);
  const [allergies, setAllergies] = useState([]);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [maxDistance, setMaxDistance] = useState(10);
  const [excludeAllergens, setExcludeAllergens] = useState([]);
  const [filterDiet, setFilterDiet] = useState("");
  
  // User simulated location (Paris center by default)
  const [userLocation, setUserLocation] = useState({ lat: 48.8566, lng: 2.3522 });
  
  // Selected meal details for modal / highlighting
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [activeMeal, setActiveMeal] = useState(null);
  
  // Modals & Chat states
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showCreateMealModal, setShowCreateMealModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMealId, setChatMealId] = useState(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingTargetId, setRatingTargetId] = useState(null);
  const [ratingMealId, setRatingMealId] = useState(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingType, setRatingType] = useState("cook_rating"); // or "guest_rating"
  
  // Admin stats
  const [adminStats, setAdminStats] = useState(null);
  
  // New meal form state
  const [newMealTitle, setNewMealTitle] = useState("");
  const [newMealDesc, setNewMealDesc] = useState("");
  const [newMealMaxGuests, setNewMealMaxGuests] = useState(4);
  const [newMealTotalPrice, setNewMealTotalPrice] = useState(30);
  const [newMealDate, setNewMealDate] = useState("");
  const [newMealAddress, setNewMealAddress] = useState("");
  const [newMealLat, setNewMealLat] = useState(48.8566);
  const [newMealLng, setNewMealLng] = useState(2.3522);
  const [newMealAllergens, setNewMealAllergens] = useState([]);

  // Load user session on start
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      fetchCurrentUser();
    } else {
      setPage("home");
    }
  }, []);

  // Sync user location from browser if allowed
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => console.log("Utilisation des coordonnées de Paris par défaut.")
      );
    }
  }, []);

  // Fetch meals when filters or page changes
  useEffect(() => {
    if (page === "explorer") {
      fetchMeals();
      if (currentUser) {
        fetchMyReservations();
        fetchMyMeals();
      }
    } else if (page === "my-reservations") {
      fetchMyReservations();
    } else if (page === "my-meals") {
      fetchMyMeals();
    } else if (page === "dashboard" && currentUser?.role === "admin") {
      fetchAdminStats();
    }
  }, [page, maxDistance, excludeAllergens, filterDiet, currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get("/users/me");
      setCurrentUser(res.data);
      setPage("explorer");
    } catch {
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setCurrentUser(null);
    setPage("home");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      await fetchCurrentUser();
      // Reset forms
      setEmail("");
      setPassword("");
    } catch (err) {
      alert("Erreur de connexion : " + (err.response?.data?.detail || "Email ou mot de passe incorrect"));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", {
        email,
        password,
        name,
        role,
        diet,
        allergies
      });
      // Auto login
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      await fetchCurrentUser();
      // Reset forms
      setEmail("");
      setPassword("");
      setName("");
      setDiet([]);
      setAllergies([]);
    } catch (err) {
      alert("Erreur d'inscription : " + (err.response?.data?.detail || "Veuillez vérifier les champs"));
    }
  };

  const fetchMeals = async () => {
    try {
      const allergensQuery = excludeAllergens.length > 0 ? `&allergens_exclude=${excludeAllergens.join(",")}` : "";
      const dietQuery = filterDiet ? `&diet=${filterDiet}` : "";
      const res = await api.get(
        `/meals?lat=${userLocation.lat}&lng=${userLocation.lng}&max_dist_km=${maxDistance}${allergensQuery}${dietQuery}`
      );
      setMeals(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyReservations = async () => {
    try {
      const res = await api.get("/participations/me");
      setMyReservations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyMeals = async () => {
    try {
      // Cook meals are retrieved by getting all meals, then filtering local mock or adding an endpoint. 
      // For this demo backend, we can retrieve all meals and filter by cook_id = currentUser.id
      const res = await api.get("/meals");
      const filtered = res.data.filter(m => m.cook_id === currentUser.id);
      setMyMeals(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await api.get("/admin/metrics");
      setAdminStats(res.data);
      // Fetch all meals for moderation
      const resMeals = await api.get("/meals");
      setMeals(resMeals.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBook = async () => {
    try {
      await api.post("/participations", { meal_id: selectedMeal.id });
      setShowReserveModal(false);
      alert("Votre réservation a été enregistrée en un clic ! Bon appétit ! 🎉");
      setPage("my-reservations");
    } catch (err) {
      alert("Impossible de réserver : " + (err.response?.data?.detail || "Erreur inconnue"));
      setShowReserveModal(false);
    }
  };

  const handleCancelBooking = async (mealId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler votre réservation ?")) return;
    try {
      await api.delete(`/participations/meals/${mealId}`);
      fetchMyReservations();
      alert("Réservation annulée avec succès.");
    } catch (err) {
      alert("Erreur lors de l'annulation : " + (err.response?.data?.detail || "Erreur"));
    }
  };

  const handleCreateMeal = async (e) => {
    e.preventDefault();
    try {
      const mealData = {
        title: newMealTitle,
        description: newMealDesc,
        max_guests: parseInt(newMealMaxGuests),
        total_price_estimate: parseFloat(newMealTotalPrice),
        datetime: newMealDate,
        address: newMealAddress,
        lat: parseFloat(newMealLat),
        lng: parseFloat(newMealLng),
        allergens: newMealAllergens
      };
      await api.post("/meals", mealData);
      setShowCreateMealModal(false);
      alert("Votre repas a été publié ! Les voisins peuvent désormais s'inscrire.");
      fetchMyMeals();
      
      // Reset form
      setNewMealTitle("");
      setNewMealDesc("");
      setNewMealMaxGuests(4);
      setNewMealTotalPrice(30);
      setNewMealDate("");
      setNewMealAddress("");
      setNewMealAllergens([]);
    } catch (err) {
      alert("Erreur de création : " + (err.response?.data?.detail || "Veuillez vérifier les champs"));
    }
  };

  const handleCancelMeal = async (mealId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler ce repas ?")) return;
    try {
      await api.delete(`/meals/${mealId}`);
      if (page === "dashboard") {
        fetchAdminStats();
      } else {
        fetchMyMeals();
      }
      alert("Le repas a été annulé.");
    } catch (err) {
      alert("Erreur d'annulation : " + (err.response?.data?.detail || "Erreur"));
    }
  };

  const handlePostRating = async (e) => {
    e.preventDefault();
    try {
      await api.post("/ratings", {
        meal_id: ratingMealId,
        reviewee_id: ratingTargetId,
        rating: ratingVal,
        comment: ratingComment,
        rating_type: ratingType
      });
      setShowRateModal(false);
      alert("Merci pour votre avis !");
      setRatingComment("");
      setRatingVal(5);
    } catch (err) {
      alert("Erreur lors de l'évaluation : " + (err.response?.data?.detail || "Erreur"));
    }
  };

  // Helper to calculate distance
  const getDistanceStr = (meal) => {
    // Simple mock distance or Haversine approximation
    const R = 6371; // Earth km
    const dLat = (meal.lat - userLocation.lat) * Math.PI / 180;
    const dLng = (meal.lng - userLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(meal.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    if (d < 1) {
      return `${Math.round(d * 1000)}m`;
    }
    return `${d.toFixed(1)}km`;
  };

  const handleDietToggle = (d) => {
    setDiet(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleAllergyToggle = (a) => {
    setAllergies(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const handleAllergenExcludeToggle = (a) => {
    setExcludeAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const handleNewMealAllergenToggle = (a) => {
    setNewMealAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      {currentUser && (
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-logo">🍳</span>
            <span className="sidebar-title">CuisineEnsemble</span>
          </div>
          
          <nav className="sidebar-nav">
            <div className={`nav-item ${page === "explorer" ? "active" : ""}`} onClick={() => setPage("explorer")}>
              <i className="fas fa-search"></i>
              <span>Découvrir les repas</span>
            </div>
            
            <div className={`nav-item ${page === "my-reservations" ? "active" : ""}`} onClick={() => setPage("my-reservations")}>
              <i className="fas fa-utensils"></i>
              <span>Mes réservations</span>
            </div>
            
            {currentUser.role === "cook" && (
              <div className={`nav-item ${page === "my-meals" ? "active" : ""}`} onClick={() => setPage("my-meals")}>
                <i className="fas fa-store"></i>
                <span>Mes repas proposés</span>
              </div>
            )}

            {currentUser.role === "admin" && (
              <div className={`nav-item ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}>
                <i className="fas fa-chart-line"></i>
                <span>Dashboard Admin</span>
              </div>
            )}
          </nav>
          
          <div className="sidebar-footer">
            <button className="btn-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Container */}
      <main className={`main-content ${!currentUser ? "expanded" : ""}`}>
        
        {/* Top Header Bar */}
        {currentUser && (
          <header className="top-bar">
            <div className="top-bar-left">
              <h2 className="page-heading">
                {page === "explorer" && "Repas autour de vous"}
                {page === "my-reservations" && "Mes participations"}
                {page === "my-meals" && "Mes propositions de chef"}
                {page === "dashboard" && "Console d'administration"}
              </h2>
            </div>
            <div className="top-bar-right">
              <div className="user-badge">
                <div className="user-avatar d-flex align-items-center justify-content-center text-white fw-bold">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="d-flex flex-column text-start">
                  <span className="user-badge-name">{currentUser.name}</span>
                  <span className="user-badge-role">{currentUser.role === 'cook' ? 'Cuisinier' : currentUser.role === 'admin' ? 'Admin' : 'Convive'}</span>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Dynamic Pages */}
        
        {/* PAGE 1: LANDING PAGE */}
        {!currentUser && page === "home" && (
          <div className="container text-center py-5" style={{ maxWidth: "800px", fontFamily: "var(--font-title)" }}>
            <span style={{ fontSize: "5rem" }}>🥘</span>
            <h1 className="display-4 fw-bold mt-3 mb-2" style={{ color: "var(--primary)" }}>CuisineEnsemble</h1>
            <p className="lead text-muted mb-4">La plateforme conviviale pour organiser des repas partagés dans le quartier et diviser les coûts intelligemment !</p>
            
            <div className="row my-5">
              <div className="col-md-4 mb-4">
                <div className="card h-100 border-0 shadow-sm p-4 text-center" style={{ borderRadius: "var(--radius)" }}>
                  <div className="display-6 text-primary mb-3">📍</div>
                  <h3 className="h5 fw-bold">Découverte Locale</h3>
                  <p className="text-muted small">Trouvez des cuisiniers amateurs autour de vous sur notre carte géolocalisée.</p>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card h-100 border-0 shadow-sm p-4 text-center" style={{ borderRadius: "var(--radius)" }}>
                  <div className="display-6 text-primary mb-3">💶</div>
                  <h3 className="h5 fw-bold">Répartition Réelle</h3>
                  <p className="text-muted small">Le coût du repas s'ajuste en temps réel selon le nombre de participants inscrits.</p>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card h-100 border-0 shadow-sm p-4 text-center" style={{ borderRadius: "var(--radius)" }}>
                  <div className="display-6 text-primary mb-3">💬</div>
                  <h3 className="h5 fw-bold">Logistique Simple</h3>
                  <p className="text-muted small">Un chat de groupe dédié par repas permet de se coordonner avec les convives.</p>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-center gap-3">
              <button className="btn btn-app btn-app-primary px-4 py-3 fs-5" onClick={() => setPage("login")}>Connexion</button>
              <button className="btn btn-app btn-app-secondary px-4 py-3 fs-5" onClick={() => setPage("register")}>Créer un compte</button>
            </div>
          </div>
        )}

        {/* PAGE 2: LOGIN */}
        {!currentUser && page === "login" && (
          <div className="auth-page">
            <div className="auth-card">
              <div className="auth-header">
                <div className="auth-logo">🔑</div>
                <h3>Se connecter</h3>
                <p className="text-muted small">Organisez ou réservez votre repas de quartier</p>
              </div>
              
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Mot de passe</label>
                  <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>

                <button type="submit" className="btn btn-app btn-app-primary w-100 py-2 mt-3">Se connecter</button>
              </form>
              
              <div className="text-center mt-4">
                <span className="text-muted small">Pas encore inscrit ? </span>
                <span className="text-primary small fw-bold cursor-pointer" style={{ cursor: "pointer" }} onClick={() => setPage("register")}>Créer un compte</span>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 3: REGISTER */}
        {!currentUser && page === "register" && (
          <div className="auth-page">
            <div className="auth-card" style={{ maxWidth: "550px" }}>
              <div className="auth-header">
                <div className="auth-logo">✏️</div>
                <h3>Créer un compte</h3>
                <p className="text-muted small">Rejoignez CuisineEnsemble pour partager de bons repas</p>
              </div>
              
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Nom complet</label>
                  <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Mot de passe</label>
                  <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Rôle principal</label>
                  <select className="form-select form-control" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="guest">Convive (parcourir et manger)</option>
                    <option value="cook">Cuisinier (proposer des repas)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Préférences alimentaires</label>
                  <div className="checkbox-group">
                    {["Végétarien", "Végan", "Sans gluten", "Sans lactose", "Sans porc", "Halal"].map(dOption => (
                      <label key={dOption} className="checkbox-item">
                        <input type="checkbox" checked={diet.includes(dOption)} onChange={() => handleDietToggle(dOption)} />
                        {dOption}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Allergies déclarées</label>
                  <div className="checkbox-group">
                    {["Gluten", "Lactose", "Arachides", "Crustacés", "Fruits à coque"].map(aOption => (
                      <label key={aOption} className="checkbox-item">
                        <input type="checkbox" checked={allergies.includes(aOption)} onChange={() => handleAllergyToggle(aOption)} />
                        {aOption}
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-app btn-app-primary w-100 py-2 mt-3">S'inscrire</button>
              </form>
              
              <div className="text-center mt-4">
                <span className="text-muted small">Déjà un compte ? </span>
                <span className="text-primary small fw-bold cursor-pointer" style={{ cursor: "pointer" }} onClick={() => setPage("login")}>Connexion</span>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 4: EXPLORER (MAP + MEALS LIST) */}
        {currentUser && page === "explorer" && (
          <div className="d-flex flex-column flex-grow-1" style={{ height: "calc(100vh - 120px)" }}>
            {/* Filters Bar */}
            <div className="filters-bar">
              <div className="d-flex align-items-center gap-2 flex-grow-1">
                <i className="fas fa-search text-muted"></i>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Rechercher par plat (ex: Paella)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted fw-bold">Distance max :</span>
                <select className="filter-select" value={maxDistance} onChange={e => setMaxDistance(parseInt(e.target.value))}>
                  <option value="1">1 km</option>
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="25">25 km</option>
                </select>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted fw-bold">Régime :</span>
                <select className="filter-select" value={filterDiet} onChange={e => setFilterDiet(e.target.value)}>
                  <option value="">Tous les régimes</option>
                  <option value="végétarien">Végétarien</option>
                  <option value="végan">Végan</option>
                  <option value="gluten">Sans Gluten</option>
                </select>
              </div>

              <div className="d-flex flex-wrap gap-2 align-items-center">
                <span className="small text-muted fw-bold">Exclure allergènes :</span>
                {["Gluten", "Lactose", "Arachides"].map(a => (
                  <label key={a} className="small checkbox-item border px-2 py-1 rounded bg-light">
                    <input type="checkbox" checked={excludeAllergens.includes(a)} onChange={() => handleAllergenExcludeToggle(a)} />
                    {a}
                  </label>
                ))}
              </div>
            </div>

            {/* Split Screen Panel */}
            <div className="explorer-layout">
              {/* Left Pane - Meals cards */}
              <div className="meals-list-pane">
                {meals.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || (m.description || "").toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <div className="text-center p-5 bg-white rounded border shadow-sm">
                    <span style={{ fontSize: "3rem" }}>🍽️</span>
                    <h4 className="mt-3">Aucun repas trouvé</h4>
                    <p className="text-muted small">Aucun repas à proximité ne correspond à vos filtres. Modifiez vos filtres ou proposez un repas !</p>
                  </div>
                ) : (
                  meals.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || (m.description || "").toLowerCase().includes(searchQuery.toLowerCase())).map((meal) => {
                    const isFull = meal.current_guests >= meal.max_guests;
                    const emojiMatch = meal.title.match(/[\u{1F300}-\u{1F9FF}]/u);
                    const emoji = emojiMatch ? emojiMatch[0] : "🥘";
                    const isMyOwn = currentUser && meal.cook_id === currentUser.id;
                    const isBooked = currentUser && myReservations.some(p => p.meal_id === meal.id && p.status === 'booked');

                    return (
                      <div
                        key={meal.id}
                        className={`meal-card ${activeMeal?.id === meal.id ? "border-primary border-2 shadow-lg" : ""}`}
                        onClick={() => setActiveMeal(meal)}
                      >
                        <div className="meal-card-img-wrapper">
                          {emoji}
                        </div>
                        <div className="meal-card-content">
                          <div>
                            <div className="d-flex justify-content-between align-items-start">
                              <h4 className="meal-card-title">{meal.title}</h4>
                              <span className="small text-muted fw-bold">📍 {getDistanceStr(meal)}</span>
                            </div>
                            <div className="meal-card-host">
                              Par : {meal.cook.name} (★ {meal.cook.average_rating.toFixed(1)})
                            </div>
                            <div className="meal-card-details">
                              <span><i className="far fa-calendar-alt"></i> {new Date(meal.datetime).toLocaleDateString()} à {new Date(meal.datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              <span><i className="fas fa-map-marker-alt text-danger"></i> {meal.address}</span>
                            </div>
                          </div>

                          <div className="meal-card-price-info">
                            <div className="meal-card-price">
                              <span className="price-val">{meal.calculated_price_per_person.toFixed(2)}€</span>
                              <span className="price-label">Prix / Convive</span>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                              <span className={`meal-card-spots ${isFull ? "full" : ""}`}>
                                {isFull ? "Complet" : `${meal.current_guests}/${meal.max_guests} convives`}
                              </span>
                              {!isMyOwn && isBooked && (
                                <div className="d-flex align-items-center gap-1">
                                  <span className="small bg-success text-white px-2 py-1 rounded" style={{ fontSize: "0.75rem" }}>Inscrit</span>
                                  <button
                                    className="btn btn-app btn-app-primary py-1 px-2"
                                    style={{ fontSize: "0.75rem", minHeight: "auto", height: "auto" }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setChatMealId(meal.id);
                                      setShowChatModal(true);
                                    }}
                                  >
                                    <i className="fas fa-comments"></i> Chat
                                  </button>
                                </div>
                              )}
                              {!isMyOwn && !isBooked && !isFull && (
                                <button
                                  className="btn btn-app btn-app-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMeal(meal);
                                    setShowReserveModal(true);
                                  }}
                                >
                                  Réserver
                                </button>
                              )}
                              {isMyOwn && (
                                <div className="d-flex align-items-center gap-1">
                                  <span className="small bg-secondary text-white px-2 py-1 rounded" style={{ fontSize: "0.75rem" }}>Votre repas</span>
                                  <button
                                    className="btn btn-app btn-app-primary py-1 px-2"
                                    style={{ fontSize: "0.75rem", minHeight: "auto", height: "auto" }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setChatMealId(meal.id);
                                      setShowChatModal(true);
                                    }}
                                  >
                                    <i className="fas fa-comments"></i> Chat
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Pane - Leaflet Map */}
              <div className="map-pane">
                <MapView
                  meals={meals}
                  activeMeal={activeMeal}
                  onSelectMeal={(meal) => {
                    setActiveMeal(meal);
                    // scroll to meal card if possible
                  }}
                  userLocation={userLocation}
                />
              </div>
            </div>
          </div>
        )}

        {/* PAGE 5: MY RESERVATIONS */}
        {currentUser && page === "my-reservations" && (
          <div className="container py-3">
            {myReservations.length === 0 ? (
              <div className="text-center p-5 bg-white rounded border shadow-sm" style={{ borderRadius: "var(--radius)" }}>
                <span style={{ fontSize: "3rem" }}>🎫</span>
                <h4 className="mt-3">Aucune réservation</h4>
                <p className="text-muted small">Vous n'avez réservé aucun repas pour le moment. Explorez la carte pour trouver un bon dîner !</p>
                <button className="btn btn-app btn-app-primary mt-2" onClick={() => setPage("explorer")}>Explorer les repas</button>
              </div>
            ) : (
              <div className="row">
                {myReservations.map((part) => {
                  const meal = part.meal;
                  const isPast = new Date(meal.datetime) < new Date();
                  
                  return (
                    <div className="col-md-6 mb-4" key={part.id}>
                      <div className="card h-100 shadow-sm border-0" style={{ borderRadius: "var(--radius)", overflow: "hidden" }}>
                        <div style={{ background: "rgba(200, 90, 50, 0.08)", padding: "1.25rem", borderBottom: "1px solid rgba(200, 90, 50, 0.05)" }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <h4 className="m-0 h5 fw-bold">{meal.title}</h4>
                            <span className={`badge ${part.status === 'booked' ? 'bg-success' : 'bg-secondary'}`}>
                              {part.status === 'booked' ? 'Inscrit' : 'Annulé'}
                            </span>
                          </div>
                          <span className="small text-muted">Organisé par : {meal.cook.name}</span>
                        </div>
                        
                        <div className="card-body d-flex flex-column justify-content-between">
                          <div>
                            <p className="card-text text-muted small">{meal.description}</p>
                            <div className="mb-3 small text-muted">
                              <div><strong>📅 Date/Heure : </strong>{new Date(meal.datetime).toLocaleString()}</div>
                              <div><strong>📍 Adresse : </strong>{meal.address}</div>
                              <div><strong>🥗 Allergènes déclarés : </strong>{(meal.allergens || []).join(", ") || "Aucun"}</div>
                            </div>
                            
                            <div className="p-3 bg-light rounded text-center mb-3">
                              <div className="small text-muted uppercase font-weight-bold">RÉPARTITION DU COÛT EN TEMPS RÉEL</div>
                              <div className="d-flex justify-content-around mt-2">
                                <div>
                                  <div className="small text-muted">Prix Total Estimé</div>
                                  <h5 className="m-0 fw-bold">{meal.total_price_estimate.toFixed(2)}€</h5>
                                </div>
                                <div style={{ borderRight: "1px solid #ccc" }}></div>
                                <div>
                                  <div className="small text-muted">Nombre d'inscrits</div>
                                  <h5 className="m-0 fw-bold">{meal.current_guests}</h5>
                                </div>
                                <div style={{ borderRight: "1px solid #ccc" }}></div>
                                <div>
                                  <div className="small text-primary">Votre part due</div>
                                  <h5 className="m-0 fw-bold text-primary">{part.amount_due.toFixed(2)}€</h5>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="d-flex gap-2 justify-content-end">
                            {part.status === "booked" && (
                              <>
                                <button
                                  className="btn btn-app btn-app-primary"
                                  onClick={() => {
                                    setChatMealId(meal.id);
                                    setShowChatModal(true);
                                  }}
                                >
                                  <i className="fas fa-comments"></i> Chat
                                </button>
                                {isPast ? (
                                  <button
                                    className="btn btn-app btn-app-secondary"
                                    onClick={() => {
                                      setRatingTargetId(meal.cook_id);
                                      setRatingMealId(meal.id);
                                      setRatingType("cook_rating");
                                      setShowRateModal(true);
                                    }}
                                  >
                                    Noter le chef
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-app btn-app-outline btn-outline-danger"
                                    onClick={() => handleCancelBooking(meal.id)}
                                  >
                                    Annuler
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PAGE 6: COOK DASHBOARD (MY MEALS) */}
        {currentUser && page === "my-meals" && (
          <div className="container py-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="m-0 h4 fw-bold">Vos repas proposés aux voisins</h3>
              <button className="btn btn-app btn-app-primary" onClick={() => setShowCreateMealModal(true)}>
                <i className="fas fa-plus"></i> Proposer un nouveau repas
              </button>
            </div>

            {myMeals.length === 0 ? (
              <div className="text-center p-5 bg-white rounded border shadow-sm" style={{ borderRadius: "var(--radius)" }}>
                <span style={{ fontSize: "3rem" }}>🍳</span>
                <h4 className="mt-3">Aucun repas proposé</h4>
                <p className="text-muted small">Vous n'avez pas encore publié de repas de quartier. Lancez-vous et invitez vos voisins à votre table !</p>
                <button className="btn btn-app btn-app-primary mt-2" onClick={() => setShowCreateMealModal(true)}>Proposer un repas</button>
              </div>
            ) : (
              <div className="row">
                {myMeals.map((meal) => {
                  const isPast = new Date(meal.datetime) < new Date();
                  return (
                    <div className="col-md-6 mb-4" key={meal.id}>
                      <div className="card h-100 shadow-sm border-0" style={{ borderRadius: "var(--radius)", overflow: "hidden" }}>
                        <div style={{ background: "rgba(200, 90, 50, 0.08)", padding: "1.25rem", borderBottom: "1px solid rgba(200, 90, 50, 0.05)" }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <h4 className="m-0 h5 fw-bold">{meal.title}</h4>
                            <span className={`badge ${meal.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                              {meal.status === 'active' ? 'Actif' : 'Annulé'}
                            </span>
                          </div>
                          <span className="small text-muted">{meal.address}</span>
                        </div>
                        
                        <div className="card-body d-flex flex-column justify-content-between">
                          <div>
                            <p className="card-text text-muted small">{meal.description}</p>
                            <div className="mb-3 small text-muted">
                              <div><strong>📅 Date/Heure : </strong>{new Date(meal.datetime).toLocaleString()}</div>
                              <div><strong>👥 Convives inscrits : </strong>{meal.current_guests} / {meal.max_guests}</div>
                              <div><strong>💶 Coût Global Estimé : </strong>{meal.total_price_estimate.toFixed(2)}€</div>
                              <div><strong>💰 Part par personne actuelle : </strong>{meal.calculated_price_per_person.toFixed(2)}€</div>
                            </div>
                          </div>

                          <div className="d-flex gap-2 justify-content-end mt-3">
                            {meal.status === "active" && (
                              <>
                                <button
                                  className="btn btn-app btn-app-primary"
                                  onClick={() => {
                                    setChatMealId(meal.id);
                                    setShowChatModal(true);
                                  }}
                                >
                                  <i className="fas fa-comments"></i> Chat ({meal.current_guests})
                                </button>
                                {isPast ? (
                                  <button
                                    className="btn btn-app btn-app-secondary"
                                    onClick={async () => {
                                      // Get guests of this meal to rate
                                      try {
                                        const res = await api.get(`/participations/meals/${meal.id}`);
                                        if (res.data.length === 0) {
                                          alert("Aucun convive ne s'est inscrit à ce repas.");
                                          return;
                                        }
                                        // Rate first guest for simplicity or let user choose. 
                                        // For MVP let's open rate modal for the first guest.
                                        const firstGuest = res.data[0].guest;
                                        setRatingTargetId(firstGuest.id);
                                        setRatingMealId(meal.id);
                                        setRatingType("guest_rating");
                                        setShowRateModal(true);
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }}
                                  >
                                    Noter les convives
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-app btn-app-outline btn-outline-danger"
                                    onClick={() => handleCancelMeal(meal.id)}
                                  >
                                    Annuler le repas
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PAGE 7: ADMIN DASHBOARD */}
        {currentUser && page === "dashboard" && currentUser.role === "admin" && (
          <div className="container py-3">
            {/* Stat Cards */}
            {adminStats && (
              <div className="dashboard-grid">
                <div className="stat-card">
                  <div className="stat-icon"><i className="fas fa-users"></i></div>
                  <div>
                    <div className="stat-number">{adminStats.total_users}</div>
                    <div className="stat-label">Utilisateurs inscrits</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon"><i className="fas fa-utensils"></i></div>
                  <div>
                    <div className="stat-number">{adminStats.total_meals}</div>
                    <div className="stat-label">Repas proposés</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon"><i className="fas fa-clipboard-check"></i></div>
                  <div>
                    <div className="stat-number">{adminStats.total_reservations}</div>
                    <div className="stat-label">Réservations actives</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon"><i className="fas fa-comments"></i></div>
                  <div>
                    <div className="stat-number">{adminStats.active_websockets}</div>
                    <div className="stat-label">Chats WebSockets actifs</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon"><i className="fas fa-leaf text-success"></i></div>
                  <div>
                    <div className="stat-number">{adminStats.total_costs_shared.toFixed(2)}€</div>
                    <div className="stat-label">Budget total partagé</div>
                  </div>
                </div>
              </div>
            )}

            {/* Moderation List */}
            <div className="card shadow-sm border-0 p-4" style={{ borderRadius: "var(--radius)" }}>
              <h4 className="fw-bold mb-3">Modération des Repas Actifs</h4>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Repas</th>
                      <th>Cuisinier</th>
                      <th>Date</th>
                      <th>Adresse</th>
                      <th>Budget Estimé</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meals.map(meal => (
                      <tr key={meal.id}>
                        <td>{meal.id}</td>
                        <td><strong>{meal.title}</strong></td>
                        <td>{meal.cook.name}</td>
                        <td>{new Date(meal.datetime).toLocaleString()}</td>
                        <td>{meal.address}</td>
                        <td>{meal.total_price_estimate.toFixed(2)}€</td>
                        <td>
                          <button className="btn btn-sm btn-danger rounded" onClick={() => handleCancelMeal(meal.id)}>
                            Supprimer / Modérer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* -------------------- */}
      {/* MODALS SECTION       */}
      {/* -------------------- */}

      {/* 1. RESERVATION CONFIRMATION MODAL */}
      {showReserveModal && selectedMeal && (
        <div className="modal-overlay">
          <div className="app-modal">
            <div className="modal-header">
              <h3 className="m-0 h5 fw-bold">Confirmer votre réservation</h3>
              <button className="modal-close" onClick={() => setShowReserveModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <h4 className="h6 fw-bold mb-2">Détails du repas</h4>
              <p className="small text-muted">{selectedMeal.title} - par {selectedMeal.cook.name}</p>
              
              <div className="p-3 rounded mb-3" style={{ background: "rgba(200, 90, 50, 0.05)" }}>
                <h5 className="h6 fw-bold mb-3" style={{ color: "var(--primary)" }}>REPARTITION AUTOMATIQUE EN TEMPS RÉEL</h5>
                
                <div className="d-flex justify-content-between mb-2 small">
                  <span>Coût total estimé (ingrédients) :</span>
                  <span className="fw-bold">{selectedMeal.total_price_estimate.toFixed(2)}€</span>
                </div>
                
                <div className="d-flex justify-content-between mb-2 small">
                  <span>Convives actuels après inscription :</span>
                  <span className="fw-bold">{selectedMeal.current_guests + 1}</span>
                </div>

                <div className="border-top pt-2 d-flex justify-content-between fw-bold">
                  <span>Votre part estimée :</span>
                  <span className="text-primary">{(selectedMeal.total_price_estimate / (selectedMeal.current_guests + 1)).toFixed(2)}€</span>
                </div>
              </div>

              <div className="alert alert-warning small py-2 mb-0">
                ⚠️ <strong>Note :</strong> Ce prix est estimatif et diminuera automatiquement en temps réel au fur et à mesure que d'autres convives réservent. Confirmation instantanée !
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-app btn-app-secondary" onClick={() => setShowReserveModal(false)}>Annuler</button>
              <button className="btn btn-app btn-app-primary" onClick={handleBook}>Confirmer la place</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CREATE MEAL MODAL */}
      {showCreateMealModal && (
        <div className="modal-overlay">
          <div className="app-modal" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 className="m-0 h5 fw-bold">Proposer un repas partagé</h3>
              <button className="modal-close" onClick={() => setShowCreateMealModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateMeal}>
              <div className="modal-body" style={{ maxHeight: "65vh" }}>
                <div className="form-group">
                  <label className="form-label">Titre du Repas (avec émoji !)</label>
                  <input type="text" className="form-control" placeholder="ex: 🥘 Couscous Royal Convivial" value={newMealTitle} onChange={e => setNewMealTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Recette / Ambiance</label>
                  <textarea className="form-control" placeholder="Décrivez ce que vous allez cuisiner..." value={newMealDesc} onChange={e => setNewMealDesc(e.target.value)} required />
                </div>

                <div className="row">
                  <div className="col-md-6 form-group">
                    <label className="form-label">Nombre maximum de convives</label>
                    <input type="number" className="form-control" min="1" max="15" value={newMealMaxGuests} onChange={e => setNewMealMaxGuests(e.target.value)} required />
                  </div>
                  <div className="col-md-6 form-group">
                    <label className="form-label">Prix Total Estimé (Ingrédients) (€)</label>
                    <input type="number" className="form-control" min="1" step="0.5" value={newMealTotalPrice} onChange={e => setNewMealTotalPrice(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Date & Heure du repas</label>
                  <input type="datetime-local" className="form-control" value={newMealDate} onChange={e => setNewMealDate(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Adresse de rendez-vous</label>
                  <input type="text" className="form-control" placeholder="ex: 15 Rue des Écoles, Paris" value={newMealAddress} onChange={e => setNewMealAddress(e.target.value)} required />
                </div>

                <div className="row">
                  <div className="col-md-6 form-group">
                    <label className="form-label">Latitude géoloc</label>
                    <input type="number" step="0.0001" className="form-control" value={newMealLat} onChange={e => setNewMealLat(parseFloat(e.target.value))} required />
                  </div>
                  <div className="col-md-6 form-group">
                    <label className="form-label">Longitude géoloc</label>
                    <input type="number" step="0.0001" className="form-control" value={newMealLng} onChange={e => setNewMealLng(parseFloat(e.target.value))} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Allergènes présents dans le plat</label>
                  <div className="checkbox-group">
                    {["Gluten", "Lactose", "Arachides", "Crustacés", "Oeufs", "Poisson"].map(a => (
                      <label key={a} className="checkbox-item">
                        <input type="checkbox" checked={newMealAllergens.includes(a)} onChange={() => handleNewMealAllergenToggle(a)} />
                        {a}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-app btn-app-secondary" onClick={() => setShowCreateMealModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-app btn-app-primary">Publier le repas</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. CHAT MODAL */}
      {showChatModal && chatMealId && (
        <div className="modal-overlay">
          <div className="app-modal" style={{ maxWidth: "650px" }}>
            <div className="modal-header">
              <h3 className="m-0 h5 fw-bold">Coordination du repas</h3>
              <button className="modal-close" onClick={() => {
                setShowChatModal(false);
                setChatMealId(null);
              }}>×</button>
            </div>
            <div className="modal-body p-0">
              <ChatRoom mealId={chatMealId} currentUser={currentUser} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-app btn-app-secondary" onClick={() => {
                setShowChatModal(false);
                setChatMealId(null);
              }}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. RATING / AVIS MODAL */}
      {showRateModal && (
        <div className="modal-overlay">
          <div className="app-modal">
            <div className="modal-header">
              <h3 className="m-0 h5 fw-bold">Laisser une note</h3>
              <button className="modal-close" onClick={() => setShowRateModal(false)}>×</button>
            </div>
            <form onSubmit={handlePostRating}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Note (sur 5 étoiles)</label>
                  <select className="form-select form-control" value={ratingVal} onChange={e => setRatingVal(parseInt(e.target.value))}>
                    <option value="5">⭐⭐⭐⭐⭐ Excellent (5/5)</option>
                    <option value="4">⭐⭐⭐⭐ Très bon (4/5)</option>
                    <option value="3">⭐⭐⭐ Correct (3/5)</option>
                    <option value="2">⭐⭐ Moyen (2/5)</option>
                    <option value="1">⭐ Mauvais (1/5)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Commentaire</label>
                  <textarea className="form-control" rows="3" placeholder="Partagez votre avis sur l'expérience..." value={ratingComment} onChange={e => setRatingComment(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-app btn-app-secondary" onClick={() => setShowRateModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-app btn-app-primary">Envoyer l'évaluation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
