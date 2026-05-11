import express from 'express';
import dotenv from 'dotenv';
import exphbs from 'express-handlebars';
import session from 'express-session';
import flash from 'connect-flash';
import * as orderModel from './model/order-model.mjs';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Static assets from /public ──────────────────────────────────────────────
app.use(express.static('public'));

// ─── Session (in-memory, dev) ─────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'logofood-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// ─── Flash messages ───────────────────────────────────────────────────────────
app.use(flash());

// ─── Make session user + flash available to every HBS template ───────────────
app.use(async (req, res, next) => {
  res.locals.user         = req.session.user || null;
  res.locals.cartCount    = (req.session.cart || []).reduce((s, i) => s + i.quantity, 0);
  res.locals.flashError   = req.flash('error')[0]   || null;
  res.locals.flashSuccess = req.flash('success')[0] || null;

  // Check for pending orders
  let hasPendingOrders = false;
  if (req.session.user) {
    if (req.session.user.accountType === 'CUSTOMER') {
      hasPendingOrders = await orderModel.hasPendingOrdersForCustomer(req.session.user.id);
    } else if (req.session.user.accountType === 'RESTAURANT') {
      hasPendingOrders = await orderModel.hasPendingOrdersForRestaurant(req.session.user.id);
    }
  }
  res.locals.hasPendingOrders = hasPendingOrders;

  next();
});

// ─── Handlebars engine ────────────────────────────────────────────────────────
const hbs = exphbs.create({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir:   'views/layouts',
  partialsDir:  'views/partials',
  helpers: {
    // {{#eq a b}}...{{else}}...{{/eq}} — block equality check OR (eq a b) — inline
    eq: function(a, b, options) {
      if (options && typeof options.fn === 'function') {
        // Block usage
        return a === b ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
      }
      // Inline usage
      return a === b;
    },
    // {{formatPrice price}} — e.g. 12.5 → "12,50€"
    formatPrice: (price) => {
      if (price == null) return '';
      return parseFloat(price).toFixed(2).replace('.', ',') + '€';
    },
    // {{formatTime date}} — e.g. "2024-01-15T21:55:30Z" → "05/11/2026 22:05"
    formatTime: (date) => {
      if (!date) return '';
      const d = new Date(date);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      //add +3 hours for Greece timezone (UTC+3)
      const hours = String(d.getHours() + 3).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${month}/${day}/${year} ${hours}:${minutes}`;
    },
    // {{getAt array index}} — return array element by numeric index
    getAt: (array, index) => {
      if (!Array.isArray(array)) return null;
      const idx = parseInt(index, 10);
      return Number.isNaN(idx) ? null : array[idx] || null;
    },
    // {{totalPrice price quantity}}
    totalPrice: (price, qty) => (parseFloat(price) * parseInt(qty)),
    // {{add a b}}
    add: (a, b) => (parseFloat(a) + parseFloat(b)),
    json: (ctx) => JSON.stringify(ctx),
    getItemQty: (cart, productId) => {
      if (!cart || !Array.isArray(cart)) return 0;
      const item = cart.find(i => i.productId == productId);
      return item ? item.quantity : 0;
    },
    join: (array, sep) => {
      if (!Array.isArray(array)) return '';
      return array.join(sep);
    }
  }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

// ─── Routes ───────────────────────────────────────────────────────────────────
import indexRoutes      from './routes/index-routes.mjs';
import authRoutes       from './routes/auth-routes.mjs';
import userRoutes       from './routes/user-routes.mjs';
import restaurantRoutes from './routes/restaurant-routes.mjs';
import cartRoutes       from './routes/cart-routes.mjs';

app.use('/',           indexRoutes);
app.use('/',           authRoutes);
app.use('/',           userRoutes);
app.use('/',           restaurantRoutes);
app.use('/',           cartRoutes);

// ─── 404 + Error handler ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', { message: 'Η σελίδα δεν βρέθηκε (404)' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).render('error', { message: 'Εσωτερικό σφάλμα διακομιστή' });
});

export { app };
