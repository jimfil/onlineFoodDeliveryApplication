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

### Registered Users (Customers)
- All guest features, plus:
- Register and log in with email and password
- Save and select delivery addresses at checkout
- Persistent data across browser sessions

### Restaurant Owners (Admin)
- Register a restaurant with business details (name, owner, ΑΦΜ, contact)
- Log in to an admin dashboard
- Add, edit, and delete menu items (name, category, price, description, image URL)
- Manage the restaurant's menu in real time

---

## Project Structure

```
onlineFoodDeliveryApplication/
├── index.html              # Homepage – restaurant listing & search
├── backend/                # Node.js/Express backend
│   ├── server.js          # Main server file
│   ├── database.js        # SQLite database setup
│   ├── middleware/
│   │   └── auth.js        # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js        # Authentication routes
│   │   └── users.js       # User management routes
│   └── README.md          # Backend documentation
├── database/
│   └── logofood.sql       # Database schema
├── pages/                  # HTML pages
├── js/                     # JavaScript files
├── css/                    # Stylesheets
└── assets/                 # Images and other assets
```
├── css/
│   └── style.css           # Custom styles
├── js/
│   └── script.js           # JavaScript logic
├── assets/                 # Static assets (images, etc.)
└── pages/
    ├── login.html          # Login page
    ├── register.html       # Customer registration
    ├── registeradmin.html  # Restaurant owner registration
    ├── restaurant.html     # Restaurant menu page
    ├── cart.html           # Cart & checkout (logged-in user)
    ├── cartguest.html      # Cart & checkout (guest)
    └── admin.html          # Restaurant admin dashboard
```

---

## Pages (in-progress)

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Lists popular restaurants with search bar |
| Login | `pages/login.html` | Email/password login form |
| Register (Customer) | `pages/register.html` | New customer account registration |
| Register (Restaurant) | `pages/registeradmin.html` | Restaurant owner registration with ΑΦΜ |
| Restaurant Menu | `pages/restaurant.html` | Menu items with prices and add-to-cart |
| Cart (User) | `pages/cart.html` | Checkout with saved addresses & payment |
| Cart (Guest) | `pages/cartguest.html` | Checkout with manual address entry |
| Admin Panel | `pages/admin.html` | Restaurant dashboard for menu management |

---


---

## How to Run

### Backend Setup

1. **Install Node.js** (if not already installed) from [nodejs.org](https://nodejs.org/)

2. **Start the backend server:**
   ```bash
   # Option 1: Use the batch file (Windows)
   start-backend.bat

   # Option 2: Manual setup
   cd backend
   npm install
   npm start
   ```

   The backend API will be available at `http://localhost:3001`

### Frontend

No build step is required for the frontend. Simply open `index.html` in any modern browser:

```bash
# Option 1: Open directly
start index.html

# Option 2: Use VS Code Live Server extension
# Ctrl+Shift+P on index.html → "Live Server: Open with Live Server"
```

> **Note:** All pages use relative paths, so they must be opened from the project root directory. The frontend will automatically connect to the backend API.

### Full Application

1. Start the backend server (as above)
2. Open `index.html` in your browser
3. The application will now persist user data and addresses in the database

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