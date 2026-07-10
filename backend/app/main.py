import time
import json
import datetime
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import Response
from sqlalchemy.orm import Session
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from jose import jwt, JWTError

from app.config import settings
from app.database import get_db, engine, Base
from app import models, schemas, crud, auth, websocket, metrics

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Latency Middleware
@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    if request.url.path != "/metrics":
        metrics.HTTP_REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(process_time)
    return response

# Prometheus scraping endpoint
@app.get("/metrics")
def get_metrics():
    metrics.ACTIVE_CHAT_CONNECTIONS.set(websocket.manager.get_active_connections_count())
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}

# -----------------
# AUTH ENDPOINTS
# -----------------

@app.post(f"{settings.API_V1_STR}/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Un compte avec cet email existe déjà."
        )
    return crud.create_user(db=db, user_in=user_in)

@app.post(f"{settings.API_V1_STR}/auth/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    # Standard email/password check
    db_user = crud.get_user_by_email(db, email=user_in.email)
    if not db_user or not auth.verify_password(user_in.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ou mot de passe incorrect"
        )
    
    access_token = auth.create_access_token(subject=db_user.id)
    refresh_token = auth.create_refresh_token(subject=db_user.id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

# Standard OAuth2 endpoint for Swagger UI
@app.post(f"{settings.API_V1_STR}/auth/login-oauth", response_model=schemas.Token)
def login_oauth(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=form_data.username)
    if not db_user or not auth.verify_password(form_data.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ou mot de passe incorrect"
        )
    access_token = auth.create_access_token(subject=db_user.id)
    refresh_token = auth.create_refresh_token(subject=db_user.id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.post(f"{settings.API_V1_STR}/auth/refresh", response_model=schemas.Token)
def refresh_token(refresh_token_str: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(refresh_token_str, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Token de rafraîchissement invalide")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token de rafraîchissement invalide")
        
    user = crud.get_user(db, user_id=int(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
    return {
        "access_token": auth.create_access_token(subject=user.id),
        "refresh_token": auth.create_refresh_token(subject=user.id),
        "token_type": "bearer"
    }

# -----------------
# USER ENDPOINTS
# -----------------

@app.get(f"{settings.API_V1_STR}/users/me", response_model=schemas.UserResponse)
def read_current_user(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.put(f"{settings.API_V1_STR}/users/me", response_model=schemas.UserResponse)
def update_current_user(user_in: schemas.UserUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return crud.update_user(db=db, db_user=current_user, user_in=user_in)

# -----------------
# MEAL ENDPOINTS
# -----------------

@app.post(f"{settings.API_V1_STR}/meals", response_model=schemas.MealResponse, status_code=status.HTTP_201_CREATED)
def create_meal(meal_in: schemas.MealCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["cook", "admin", "mixte"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les cuisiniers, les profils mixtes ou les administrateurs peuvent proposer des repas."
        )
    meal = crud.create_meal(db=db, meal_in=meal_in, cook_id=current_user.id)
    metrics.MEALS_CREATED.inc()
    return meal

@app.get(f"{settings.API_V1_STR}/meals", response_model=list[schemas.MealResponse])
def read_meals(
    skip: int = 0,
    limit: int = 100,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    max_dist_km: Optional[float] = None,
    allergens_exclude: Optional[str] = None, # Comma-separated list e.g. "Gluten,Lactose"
    diet: Optional[str] = None,
    db: Session = Depends(get_db)
):
    exclude_list = [a.strip() for a in allergens_exclude.split(",")] if allergens_exclude else None
    return crud.get_meals(
        db=db,
        skip=skip,
        limit=limit,
        lat=lat,
        lng=lng,
        max_dist_km=max_dist_km,
        allergens_exclude=exclude_list,
        diet=diet
    )

@app.get(f"{settings.API_V1_STR}/meals/{{meal_id}}", response_model=schemas.MealResponse)
def read_meal(meal_id: int, db: Session = Depends(get_db)):
    meal = crud.get_meal(db, meal_id=meal_id)
    if not meal:
        raise HTTPException(status_code=404, detail="Repas introuvable")
    return meal

@app.put(f"{settings.API_V1_STR}/meals/{{meal_id}}", response_model=schemas.MealResponse)
def update_meal(meal_id: int, meal_in: schemas.MealUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    meal = crud.get_meal(db, meal_id=meal_id)
    if not meal:
        raise HTTPException(status_code=404, detail="Repas introuvable")
    if meal.cook_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Non autorisé à modifier ce repas")
    return crud.update_meal(db=db, db_meal=meal, meal_in=meal_in)

@app.delete(f"{settings.API_V1_STR}/meals/{{meal_id}}", response_model=schemas.MealResponse)
def cancel_meal(meal_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    meal = crud.get_meal(db, meal_id=meal_id)
    if not meal:
        raise HTTPException(status_code=404, detail="Repas introuvable")
    if meal.cook_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Non autorisé à annuler ce repas")
    
    # Cancel meal
    meal_update = schemas.MealUpdate(status="cancelled")
    return crud.update_meal(db=db, db_meal=meal, meal_in=meal_update)

# -----------------
# PARTICIPATION ENDPOINTS
# -----------------

@app.post(f"{settings.API_V1_STR}/participations", response_model=schemas.ParticipationResponse, status_code=status.HTTP_201_CREATED)
def book_meal(part_in: schemas.ParticipationCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    meal = crud.get_meal(db, meal_id=part_in.meal_id)
    if not meal:
        raise HTTPException(status_code=404, detail="Repas introuvable")
    
    if meal.status != "active":
        raise HTTPException(status_code=400, detail="Ce repas n'est plus actif")
        
    if meal.cook_id == current_user.id:
        raise HTTPException(status_code=400, detail="Le cuisinier ne peut pas réserver son propre repas")
        
    if meal.current_guests >= meal.max_guests:
        raise HTTPException(status_code=400, detail="Ce repas est complet")
        
    part = crud.create_participation(db=db, meal_id=part_in.meal_id, guest_id=current_user.id)
    metrics.BOOKINGS_TOTAL.labels(status="booked").inc()
    return part

@app.delete(f"{settings.API_V1_STR}/participations/meals/{{meal_id}}")
def cancel_booking(meal_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    success = crud.cancel_participation(db=db, meal_id=meal_id, guest_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Réservation introuvable ou déjà annulée")
    metrics.BOOKINGS_TOTAL.labels(status="cancelled").inc()
    return {"status": "success", "message": "Réservation annulée avec succès"}

@app.get(f"{settings.API_V1_STR}/participations/me", response_model=list[schemas.ParticipationResponse])
def get_my_participations(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Participation).filter(models.Participation.guest_id == current_user.id).all()

@app.get(f"{settings.API_V1_STR}/participations/meals/{{meal_id}}", response_model=list[schemas.ParticipationResponse])
def get_meal_participations(meal_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    meal = crud.get_meal(db, meal_id=meal_id)
    if not meal:
        raise HTTPException(status_code=404, detail="Repas introuvable")
        
    # Security: check if current_user is cook, participant or admin
    is_cook = meal.cook_id == current_user.id
    is_guest = db.query(models.Participation).filter(
        models.Participation.meal_id == meal_id,
        models.Participation.guest_id == current_user.id,
        models.Participation.status == "booked"
    ).first() is not None
    
    if not (is_cook or is_guest or current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Non autorisé à consulter les participants de ce repas")
        
    return db.query(models.Participation).filter(
        models.Participation.meal_id == meal_id,
        models.Participation.status == "booked"
    ).all()

# -----------------
# CHAT LOG HISTORY
# -----------------
@app.get(f"{settings.API_V1_STR}/meals/{{meal_id}}/messages", response_model=list[schemas.MessageResponse])
def get_chat_history(meal_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    meal = crud.get_meal(db, meal_id=meal_id)
    if not meal:
        raise HTTPException(status_code=404, detail="Repas introuvable")
        
    is_cook = meal.cook_id == current_user.id
    is_guest = db.query(models.Participation).filter(
        models.Participation.meal_id == meal_id,
        models.Participation.guest_id == current_user.id,
        models.Participation.status == "booked"
    ).first() is not None
    
    if not (is_cook or is_guest or current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Non autorisé à accéder à la discussion de ce repas")
        
    return crud.get_messages(db, meal_id=meal_id)

# -----------------
# RATINGS ENDPOINTS
# -----------------

@app.post(f"{settings.API_V1_STR}/ratings", response_model=schemas.RatingResponse, status_code=status.HTTP_201_CREATED)
def post_rating(rating_in: schemas.RatingCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Verify relations: reviewer and reviewee must be linked via the meal
    meal = crud.get_meal(db, meal_id=rating_in.meal_id)
    if not meal:
        raise HTTPException(status_code=404, detail="Repas introuvable")
        
    # Check if meal is completed
    # Note: in MVP, we can allow rating active meals too, but let's make sure they are connected
    is_reviewer_cook = meal.cook_id == current_user.id
    is_reviewer_guest = db.query(models.Participation).filter(
        models.Participation.meal_id == rating_in.meal_id,
        models.Participation.guest_id == current_user.id,
        models.Participation.status == "booked"
    ).first() is not None
    
    if not (is_reviewer_cook or is_reviewer_guest):
        raise HTTPException(status_code=400, detail="Vous devez être participant du repas pour laisser une note")
        
    is_reviewee_cook = meal.cook_id == rating_in.reviewee_id
    is_reviewee_guest = db.query(models.Participation).filter(
        models.Participation.meal_id == rating_in.meal_id,
        models.Participation.guest_id == rating_in.reviewee_id,
        models.Participation.status == "booked"
    ).first() is not None
    
    if not (is_reviewee_cook or is_reviewee_guest):
        raise HTTPException(status_code=400, detail="La cible de l'avis n'est pas participante de ce repas")
        
    # Prevent self-rating
    if current_user.id == rating_in.reviewee_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous noter vous-même")
        
    return crud.create_rating(db, rating_in=rating_in, reviewer_id=current_user.id)

@app.get(f"{settings.API_V1_STR}/ratings/user/{{user_id}}", response_model=list[schemas.RatingResponse])
def get_user_ratings(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Rating).filter(models.Rating.reviewee_id == user_id).all()

# -----------------
# ADMIN ENDPOINTS
# -----------------

@app.get(f"{settings.API_V1_STR}/admin/metrics", response_model=schemas.AdminMetricsResponse)
def read_admin_metrics(current_user: models.User = Depends(auth.get_current_active_admin), db: Session = Depends(get_db)):
    return crud.get_admin_metrics(db, active_ws_count=websocket.manager.get_active_connections_count())

# -----------------
# WEBSOCKET CHAT ROUTER
# -----------------

@app.websocket("/ws/chat/{meal_id}")
async def websocket_endpoint(
    websocket_conn: WebSocket,
    meal_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    # Authenticate user from query parameter
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "access":
            await websocket_conn.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket_conn.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        await websocket_conn.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Check if user is participant (cook or guest) or admin
    meal = db.query(models.Meal).filter(models.Meal.id == meal_id).first()
    if not meal:
        await websocket_conn.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    is_cook = meal.cook_id == user.id
    is_guest = db.query(models.Participation).filter(
        models.Participation.meal_id == meal_id,
        models.Participation.guest_id == user.id,
        models.Participation.status == "booked"
    ).first() is not None

    if not (is_cook or is_guest or user.role == "admin"):
        await websocket_conn.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # User is authorized, connect websocket
    await websocket.manager.connect(websocket_conn, meal_id)
    try:
        while True:
            # Expecting json like {"content": "Hello!"}
            data = await websocket_conn.receive_text()
            message_data = json.loads(data)
            content = message_data.get("content")
            if content:
                # Save to database
                msg = crud.create_message(db, meal_id, user.id, content)
                # Broadcast message to room
                await websocket.manager.broadcast({
                    "id": msg.id,
                    "meal_id": msg.meal_id,
                    "sender_id": msg.sender_id,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                    "sender": {
                        "id": user.id,
                        "name": user.name,
                        "email": user.email,
                        "role": user.role
                    }
                }, meal_id)
    except WebSocketDisconnect:
        websocket.manager.disconnect(websocket_conn, meal_id)

# Serve frontend static files in production (React SPA build)
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    # Any route not matching API endpoints will fall back to static files or index.html (for React Router)
    @app.exception_handler(404)
    async def custom_404_handler(request, exc):
        # If it's an API route that genuinely failed, return 404
        if request.url.path.startswith("/api/v1"):
            return Response(content=json.dumps({"detail": "Not Found"}), media_type="application/json", status_code=404)
        return FileResponse(os.path.join(static_dir, "index.html"))

    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

