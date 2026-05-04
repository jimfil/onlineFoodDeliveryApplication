# LogoFood Backend

Node.js/Express.js backend για την αποθήκευση δεδομένων της εφαρμογής LogoFood.

## Εγκατάσταση & Εκτέλεση

```bash
# Εγκατάσταση dependencies
npm install

# Εκτέλεση σε development mode (με auto-reload)
npm run dev

# Εκτέλεση σε production mode
npm start
```

Το backend θα τρέχει στο `http://localhost:3001`.

## Environment Variables

Δημιουργήστε ένα `.env` αρχείο στο root του backend:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3001
```

## Database

Το backend χρησιμοποιεί SQLite database. Το schema βρίσκεται στο `../database/logofood.sql` και φορτώνεται αυτόματα κατά την εκκίνηση.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Εγγραφή χρήστη
- `POST /api/auth/login` - Σύνδεση χρήστη

### Users (απαιτούν Authorization header)
- `GET /api/users/profile` - Λήψη προφίλ
- `PUT /api/users/profile` - Ενημέρωση προφίλ
- `GET /api/users/addresses` - Λήψη διευθύνσεων
- `POST /api/users/addresses` - Προσθήκη διεύθυνσης
- `PUT /api/users/addresses/:id` - Ενημέρωση διεύθυνσης
- `DELETE /api/users/addresses/:id` - Διαγραφή διεύθυνσης

## Frontend Integration

Το frontend έχει ενημερωθεί για να χρησιμοποιεί τα API endpoints. Όλα τα δεδομένα χρηστών αποθηκεύονται πλέον στο database αντί για localStorage.