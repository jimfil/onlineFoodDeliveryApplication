# LogoFood — Online Food Delivery Application

> University project for the course **ΓΚ802 – Web Technologies** (2025–2026).  
> A full-stack application for an online food delivery platform built with HTML, CSS, Bootstrap 5, JavaScript, Node.js, and Express.js.

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Project Structure](#project-structure)
- [Pages](#pages)
- [How to Run](#how-to-run)
- [API Documentation](#api-documentation)

---

## About

**LogoFood** is a full-stack application for an online food delivery platform. Users can browse restaurants, view menus, and place orders. Restaurant owners can manage their own menus through a dedicated admin panel. The application now includes a complete backend API for user authentication, data persistence, and address management.

---

## Features

### Guest Users
- Browse available restaurants on the homepage
- Search for restaurants or food types
- View restaurant menus with item details and prices
- Add items to cart and proceed to checkout (manual address entry)
- Pay by credit/debit card or cash on delivery
- Track orders in real-time
- Rate orders after delivery with a star-based system

### Registered Users (Customers)
- All guest features, plus:
- Register and log in with email and password
- Manage saved delivery addresses via a dedicated account panel
- Persistent data across browser sessions

### Restaurant Owners (Admin)
- **Secure Multi-Step Registration**: Two-step registration wizard for business and account details.
- **Shop Status Management**: Toggle restaurant availability (Open/Closed) in real-time.
- **Performance Tracking**: View overall restaurant rating and total review counts on the dashboard.
- **Menu Management**: Add, edit, delete, and reorder menu items and categories.
- **Order Handling**: Manage incoming orders and update their status (Preparing, Out for Delivery, etc.).

---

## Project Structure

```
onlineFoodDeliveryApplication/
├── logofood-app/          # Main Node.js/Express application
│   ├── app.mjs           # Entry point
│   ├── model/            # Database models (MySQL)
│   ├── controller/       # Business logic handlers
│   ├── routes/           # Express routers
│   ├── views/            # Handlebars templates (.hbs)
│   ├── public/           # Static assets (CSS, JS, Images)
│   └── scripts/          # Utility scripts (e.g. data seeding)
├── database/             # SQL schema files
└── README.md             # Project documentation

```

---

## Pages

| Page | File | Description |
|------|------|-------------|
| Home / Browse | `browse.hbs` | Restaurant listing, search, and address selection |
| Restaurant Menu | `restaurant.hbs` | Menu items, categories, and shopping cart integration |
| Order Tracking | `track-orders.hbs` | Real-time order status and star-rating system |
| Admin Panel | `manage-restaurant.hbs` | Restaurant dashboard for menu, status, and stats |
| Admin Orders | `manage-orders.hbs` | Order management and status updates |
| Cart | `cart.hbs` | Checkout flow with address selection & payment |
| Login / Register | `login.hbs`, `register.hbs` | Authentication forms for all user types |
| Restaurant Reg | `register-restaurant-step1.hbs` | Multi-step wizard for new restaurant owners |

---


---
## Screenshots

Below are mockup screenshots of the key pages.

![Home page mockup]

---

## How to Run

### Backend Setup

1. **Install Node.js** (if not already installed) from [nodejs.org](https://nodejs.org/)
2. **Install MySQL** and import the schema from `database/logofood.sql`.

3. **Start the application:**
   ```bash
   # Option 1: Use the batch file (Windows)
   start-backend.bat

   # Option 2: Manual setup
   cd logofood-app
   npm install
   npm start
   ```

   The application will be available at `http://localhost:3000`

---

## Technical Stack

- **Frontend**: Handlebars (HBS), Bootstrap 5, Leaflet.js (Maps)
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Auth**: Express-session, connect-flash, express-validator

---

## API Documentation

### Internal Application Routes

All routes are served by the Express.js backend at `http://localhost:3000`.

---

#### General / Browsing

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | Landing page |
| `GET` | `/browse` | Browse restaurants by address/location |

---

#### Authentication

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/login` | Show login form |
| `POST` | `/login` | Process customer/restaurant login |
| `GET` | `/register` | Show customer registration form |
| `POST` | `/register` | Process customer registration |
| `GET` | `/register-restaurant` | Show restaurant registration (Step 1) |
| `POST` | `/register-restaurant/step1` | Process owner info (Step 1) |
| `GET` | `/register-restaurant/step2` | Show restaurant details form (Step 2) |
| `POST` | `/register-restaurant/step2` | Process restaurant details (Step 2) |
| `GET` | `/logout` | Log out and destroy session |

---

#### User Account

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| `GET` | `/account` | View account & saved addresses | ✅ Customer |
| `POST` | `/account/profile` | Update profile info | ✅ Customer |
| `POST` | `/account/addresses` | Add a new saved address | ✅ Customer |
| `POST` | `/account/addresses/:id/edit` | Edit a saved address | ✅ Customer |
| `POST` | `/account/addresses/:id/delete` | Delete a saved address | ✅ Customer |
| `GET` | `/track-orders` | View order history & statuses | ✅ Login |
| `POST` | `/orders/:id/rate` | Rate a completed order | ✅ Login |

---

#### Restaurant & Menu

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| `GET` | `/restaurant/:id` | Public restaurant menu page | ❌ |
| `GET` | `/manage` | Restaurant admin dashboard | ✅ Restaurant |
| `POST` | `/manage/products` | Add a new menu item | ✅ Restaurant |
| `POST` | `/manage/products/:id/delete` | Delete a menu item | ✅ Restaurant |
| `POST` | `/manage/settings` | Update restaurant settings | ✅ Restaurant |
| `POST` | `/manage/categories` | Update menu categories | ✅ Restaurant |
| `POST` | `/manage/reorder` | Reorder menu items | ✅ Restaurant |
| `GET` | `/manage/orders` | View incoming orders | ✅ Restaurant |
| `POST` | `/manage/orders/:id/status` | Update order status | ✅ Restaurant |
| `POST` | `/manage/status` | Toggle restaurant open/closed | ✅ Restaurant |
| `POST` | `/manage/icon` | Upload/update restaurant icon | ✅ Restaurant |

---

#### Cart & Checkout

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/cart` | View cart page |
| `GET` | `/cart/count` | Get current cart item count |
| `POST` | `/cart/add` | Add an item to the cart |
| `POST` | `/cart/remove` | Decrement item quantity |
| `POST` | `/cart/delete` | Remove item entirely from cart |
| `POST` | `/cart/checkout` | Place an order (checkout) |
| `POST` | `/cart/clear` | Clear all items from the cart |

---

### External APIs & Libraries

These third-party services and libraries are integrated into the application:

---

#### Nominatim (OpenStreetMap Geocoding API)

Used for address geocoding (address → coordinates) and reverse geocoding (coordinates → address). Calls are made client-side from `utils.js`.

| Endpoint | Description |
|----------|-------------|
| `GET https://nominatim.openstreetmap.org/search` | Forward geocoding — search an address string and return lat/lon |
| `GET https://nominatim.openstreetmap.org/reverse` | Reverse geocoding — convert lat/lon to a human-readable address |

**Example — Forward Geocode:**
```http
GET https://nominatim.openstreetmap.org/search?format=jsonv2&q=Main+Street+1,Patra,Greece&countrycodes=gr&addressdetails=1&limit=5
```

**Example — Reverse Geocode:**
```http
GET https://nominatim.openstreetmap.org/reverse?format=json&lat=38.2461&lon=21.7351&addressdetails=1
```

> No API key required. Subject to [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/).

---

#### Leaflet.js + OpenStreetMap Tiles

Used to render interactive maps for address selection on the browse, cart, and account pages.

| Resource | URL |
|----------|-----|
| Leaflet CSS | `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` |
| Leaflet JS | `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` |
| Map Tiles | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |

---

#### Bootstrap 5

Used for responsive layout, UI components, and icons throughout the application.

| Resource | URL |
|----------|-----|
| Bootstrap CSS | `https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css` |
| Bootstrap JS | `https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js` |
| Bootstrap Icons | `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css` |

---

#### Google Fonts

Used for the **Righteous** typeface in the LogoFood brand logo.

| Resource | URL |
|----------|-----|
| Google Fonts API | `https://fonts.googleapis.com/css2?family=Righteous&display=swap` |