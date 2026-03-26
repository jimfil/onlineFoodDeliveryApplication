# LogoFood — Online Food Delivery Application (in-progress)

> University project for the course **ΓΚ802 – Web Technologies** (2025–2026).  
> A front-end prototype of an online food delivery platform built with HTML, CSS, Bootstrap 5, and JavaScript.

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Project Structure](#project-structure)
- [Pages](#pages)
- [Technologies](#technologies)
- [How to Run](#how-to-run)

---

## About

**LogoFood** is a full-stack application for an online food delivery platform. Users can browse restaurants, view menus, and place orders. Restaurant owners can manage their own menus through a dedicated admin panel. Right now, we have just developed the front-end part of the application.

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

## Pages

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

## Technologies

| Technology | Purpose |
|------------|---------|
| HTML5 | Page structure and semantics |
| CSS3 | Custom styling (`css/style.css`) |
| [Bootstrap 5.3](https://getbootstrap.com/) | Responsive layout and UI components |
| [Bootstrap Icons 1.11](https://icons.getbootstrap.com/) | Icon set (admin panel) |
| [Google Fonts – Righteous](https://fonts.google.com/specimen/Righteous) | Brand typography |
| Vanilla JavaScript | Cart interactions, form validation, dynamic UI |

---

## How to Run

No build step or server is required. Simply open `index.html` in any modern browser:

```bash
# Option 1: Open directly
start index.html

# Option 2: Use VS Code Live Server extension
# Ctrl+Shift+P on index.html→ "Live Server: Open with Live Server"
```

> **Note:** All pages use relative paths, so they must be opened from the project root directory.