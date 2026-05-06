CREATE TABLE Account (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hashed TEXT NOT NULL,
  account_type ENUM('CUSTOMER', 'RESTAURANT') NOT NULL
);

CREATE TABLE Category (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE Address (
  id INT AUTO_INCREMENT PRIMARY KEY,
  street VARCHAR(255) NOT NULL,
  street_number VARCHAR(20) NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  latitude DOUBLE,
  longitude DOUBLE
);

CREATE TABLE Restaurant (
  id INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rating DOUBLE DEFAULT 0,
  contact_phone VARCHAR(20),
  operating_hours TEXT,
  estimated_preparation_time VARCHAR(50),
  owner_first_name VARCHAR(100),
  owner_last_name VARCHAR(100),
  vat_number VARCHAR(50),
  address_id INT,
  FOREIGN KEY (id) REFERENCES Account(id),
  FOREIGN KEY (address_id) REFERENCES Address(id)
);

CREATE TABLE Restaurant_Category (
  restaurant_id INT,
  category_id INT,
  PRIMARY KEY (restaurant_id, category_id),
  FOREIGN KEY (restaurant_id) REFERENCES Restaurant(id),
  FOREIGN KEY (category_id) REFERENCES Category(id)
);

CREATE TABLE Customer (
  id INT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20),
  FOREIGN KEY (id) REFERENCES Account(id)
);

CREATE TABLE Customer_Address (
  customer_id INT,
  address_id INT,
  PRIMARY KEY (customer_id, address_id),
  FOREIGN KEY (customer_id) REFERENCES Customer(id),
  FOREIGN KEY (address_id) REFERENCES Address(id)
);

CREATE TABLE Product (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DOUBLE NOT NULL,
  description TEXT,
  ingredients TEXT,
  restaurant_id INT NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES Restaurant(id)
);

CREATE TABLE Product_Category (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0
);

CREATE TABLE Product_Category_Mapping (
  product_id INT,
  category_id INT,
  PRIMARY KEY (product_id, category_id),
  FOREIGN KEY (product_id) REFERENCES Product(id),
  FOREIGN KEY (category_id) REFERENCES Product_Category(id)
);

CREATE TABLE Order_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  rating DOUBLE,
  delivery_address_id INT NOT NULL,
  customer_id INT NOT NULL,
  restaurant_id INT NOT NULL,
  status ENUM('PENDING', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
  FOREIGN KEY (delivery_address_id) REFERENCES Address(id),
  FOREIGN KEY (customer_id) REFERENCES Customer(id),
  FOREIGN KEY (restaurant_id) REFERENCES Restaurant(id)
);

CREATE TABLE Order_Item (
  order_id INT,
  product_id INT,
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES Order_table(id),
  FOREIGN KEY (product_id) REFERENCES Product(id)
);
