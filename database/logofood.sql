CREATE TABLE Account (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hashed TEXT NOT NULL,
  account_type ENUM('CUSTOMER', 'RESTAURANT') NOT NULL
);

CREATE TABLE Category (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  image_url VARCHAR(255)
);

CREATE TABLE Address (
  id INT AUTO_INCREMENT PRIMARY KEY,
  street VARCHAR(255) NOT NULL,
  street_number VARCHAR(20) NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  latitude DOUBLE,
  longitude DOUBLE,
  floor VARCHAR(50),
  comments TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE Restaurant (
  id INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rating DOUBLE DEFAULT 0,
  rating_count INT DEFAULT 0,
  contact_phone VARCHAR(20),
  operating_hours TEXT,
  estimated_preparation_time VARCHAR(50),
  owner_first_name VARCHAR(100),
  owner_last_name VARCHAR(100),
  vat_number VARCHAR(50),
  address_id INT,
  image_url VARCHAR(255),
  status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
  min_order_value DECIMAL(10,2) DEFAULT 0.00,
  FOREIGN KEY (id) REFERENCES Account(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (address_id) REFERENCES Address(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Restaurant_Category (
  restaurant_id INT,
  category_id INT,
  PRIMARY KEY (restaurant_id, category_id),
  FOREIGN KEY (restaurant_id) REFERENCES Restaurant(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (category_id) REFERENCES Category(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Customer (
  id INT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20),
  FOREIGN KEY (id) REFERENCES Account(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Customer_Address (
  customer_id INT,
  address_id INT,
  PRIMARY KEY (customer_id, address_id),
  FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (address_id) REFERENCES Address(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Product (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  ingredients TEXT,
  image_url VARCHAR(255),
  display_order INT DEFAULT 0,
  restaurant_id INT NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES Restaurant(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Product_Category (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  restaurant_id INT NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES Restaurant(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Product_Category_Mapping (
  product_id INT,
  category_id INT,
  PRIMARY KEY (product_id, category_id),
  FOREIGN KEY (product_id) REFERENCES Product(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (category_id) REFERENCES Product_Category(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Order_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  rating DOUBLE,
  delivery_address_id INT,
  customer_id INT,
  restaurant_id INT,
  status ENUM('PENDING', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
  FOREIGN KEY (delivery_address_id) REFERENCES Address(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (restaurant_id) REFERENCES Restaurant(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE Order_Item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT NOT NULL DEFAULT 1,
  price_at_order_time DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES Order_table(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (product_id) REFERENCES Product(id) ON DELETE SET NULL ON UPDATE CASCADE
);
