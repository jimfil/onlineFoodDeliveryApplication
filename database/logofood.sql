CREATE TABLE Account (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hashed TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('CUSTOMER', 'RESTAURANT'))
);

CREATE TABLE Category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE Restaurant (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rating REAL DEFAULT 0,
  contact_phone TEXT,
  operating_hours TEXT,
  estimated_preparation_time TEXT,
  owner_first_name TEXT,
  owner_last_name TEXT,
  vat_number TEXT,
  address_id INTEGER,
  FOREIGN KEY (id) REFERENCES Account(id),
  FOREIGN KEY (address_id) REFERENCES Address(id)
);

CREATE TABLE Restaurant_Category (
  restaurant_id INTEGER,
  category_id INTEGER,
  PRIMARY KEY (restaurant_id, category_id),
  FOREIGN KEY (restaurant_id) REFERENCES Restaurant(id),
  FOREIGN KEY (category_id) REFERENCES Category(id)
);

CREATE TABLE Address (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  street TEXT NOT NULL,
  street_number TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude REAL,
  longitude REAL
);

CREATE TABLE Customer_Address (
  customer_id INTEGER,
  address_id INTEGER,
  PRIMARY KEY (customer_id, address_id),
  FOREIGN KEY (customer_id) REFERENCES Customer(id),
  FOREIGN KEY (address_id) REFERENCES Address(id)
);



CREATE TABLE Customer (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  contact_phone TEXT,
  FOREIGN KEY (id) REFERENCES Account(id)
);

CREATE TABLE Product (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  description TEXT,
  ingredients TEXT,
  restaurant_id INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES Restaurant(id)
);

CREATE TABLE Order_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  rating REAL,
  delivery_address_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  restaurant_id INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED')),
  FOREIGN KEY (delivery_address_id) REFERENCES Address(id),
  FOREIGN KEY (customer_id) REFERENCES Customer(id),
  FOREIGN KEY (restaurant_id) REFERENCES Restaurant(id)
);

CREATE TABLE Order_Item (
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES Order_table(id),
  FOREIGN KEY (product_id) REFERENCES Product(id)
);
