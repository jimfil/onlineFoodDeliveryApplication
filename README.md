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

## Pages (in-progress)

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

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "contactPhone": "+30 123 456 7890"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### User Management Endpoints

All user endpoints require `Authorization: Bearer <token>` header.

#### Get User Profile
```http
GET /api/users/profile
```

#### Update User Profile
```http
PUT /api/users/profile
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "contactPhone": "+30 987 654 3210"
}
```

#### Get User Addresses
```http
GET /api/users/addresses
```

#### Add Address
```http
POST /api/users/addresses
Content-Type: application/json

{
  "street": "Main Street",
  "streetNumber": "123",
  "latitude": 37.7749,
  "longitude": -122.4194
}
```

#### Update Address
```http
PUT /api/users/addresses/:id
Content-Type: application/json

{
  "street": "Updated Street",
  "streetNumber": "456"
}
```

#### Delete Address
```http
DELETE /api/users/addresses/:id
```