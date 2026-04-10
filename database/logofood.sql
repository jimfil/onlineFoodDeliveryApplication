CREATE TABLE `Account` (
  `id` int PRIMARY KEY,
  `email` varchar(255),
  `password_hashed` varchar(255),
  `account_type` varchar(255) COMMENT '"CUSTOMER" or "RESTAURANT"'
);

CREATE TABLE `Category` (
  `id` int PRIMARY KEY,
  `name` varchar(255)
);

CREATE TABLE `Restaurant_Category` (
  `restaurant_id` int,
  `category_id` int,
  PRIMARY KEY (`restaurant_id`, `category_id`)
);

CREATE TABLE `Restaurant` (
  `id` int PRIMARY KEY COMMENT 'Inherited from Account',
  `name` varchar(255),
  `rating` float COMMENT 'Calculated from each order',
  `contact_phone` varchar(255),
  `operating_hours` varchar(255),
  `estimated_preparation_time` varchar(255),
  `owner_first_name` varchar(255),
  `owner_last_name` varchar(255),
  `vat_number` varchar(255),
  `address_id` int
);

CREATE TABLE `Customer` (
  `id` int PRIMARY KEY COMMENT 'Inherited from Account',
  `first_name` varchar(255),
  `last_name` varchar(255),
  `contact_phone` varchar(255)
);

CREATE TABLE `Address` (
  `id` int PRIMARY KEY,
  `street` varchar(255),
  `street_number` varchar(255),
  `latitude` float COMMENT 'Crucial for travel time routing API',
  `longitude` float COMMENT 'Crucial for travel time routing API',
  `customer_id` int COMMENT 'Null if this address belongs to a Restaurant'
);

CREATE TABLE `Order` (
  `id` int PRIMARY KEY,
  `created_at` datetime,
  `completed_at` datetime,
  `rating` float,
  `delivery_address_id` int,
  `customer_id` int,
  `restaurant_id` int,
  `status` varchar(50) DEFAULT 'PENDING'
);

CREATE TABLE `Product` (
  `id` int PRIMARY KEY,
  `name` varchar(255),
  `price` decimal(10,2),
  `description` varchar(255) COMMENT 'Optional (O)',
  `ingredients` varchar(255) COMMENT 'Multivalued attribute',
  `restaurant_id` int
);

CREATE TABLE `Order_Item` (
  `order_id` int,
  `product_id` int,
  `quantity` int COMMENT 'How many of this specific item were ordered?',
  PRIMARY KEY (`order_id`, `product_id`)
);

ALTER TABLE `Restaurant` ADD FOREIGN KEY (`id`) REFERENCES `Account` (`id`);

ALTER TABLE `Customer` ADD FOREIGN KEY (`id`) REFERENCES `Account` (`id`);

ALTER TABLE `Address` ADD FOREIGN KEY (`customer_id`) REFERENCES `Customer` (`id`);

ALTER TABLE `Restaurant` ADD FOREIGN KEY (`address_id`) REFERENCES `Address` (`id`);

ALTER TABLE `Order` ADD FOREIGN KEY (`delivery_address_id`) REFERENCES `Address` (`id`);

ALTER TABLE `Restaurant_Category` ADD FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurant` (`id`);

ALTER TABLE `Restaurant_Category` ADD FOREIGN KEY (`category_id`) REFERENCES `Category` (`id`);

ALTER TABLE `Product` ADD FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurant` (`id`);

ALTER TABLE `Order_Item` ADD FOREIGN KEY (`order_id`) REFERENCES `Order` (`id`);

ALTER TABLE `Order_Item` ADD FOREIGN KEY (`product_id`) REFERENCES `Product` (`id`);

ALTER TABLE `Order` ADD FOREIGN KEY (`customer_id`) REFERENCES `Customer` (`id`);

ALTER TABLE `Order` ADD FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurant` (`id`);
