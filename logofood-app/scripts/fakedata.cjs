require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// --- FAKE DATA ARRAYS ---
const restaurantNames = ["The Salty Spitoon", "Krusty Krab", "Luigi's Pizza", "Burger Barn", "Sushi Central", "Taco Fiesta", "The Vegan Joint", "Steakhouse Supreme", "Noodle Ninja", "Breakfast Club"];
const streets = ["Main St", "Oak Ave", "Pine Ln", "Maple Dr", "Elm St", "Cedar Blvd", "Washington St", "Lakeview Dr"];
const categories = ["Burger", "Brunch", "Pizza", "Mexican", "Asian", "Σουβλάκια", "Ψητά Σχάρας"];
const menuSections = ["Starters", "Main Courses", "Desserts", "Drinks"];

// Map restaurant names to categories
const restaurantCategories = {
    "Burger Barn": "Burger",
    "Luigi's Pizza": "Pizza",
    "Taco Fiesta": "Mexican",
    "Sushi Central": "Asian",
    "Noodle Ninja": "Asian",
    "Breakfast Club": "Brunch",
    "The Salty Spitoon": "Ψητά Σχάρας",
    "Krusty Krab": "Ψητά Σχάρας",
    "Steakhouse Supreme": "Ψητά Σχάρας",
    "The Vegan Joint": "Brunch"
};

const foodItems = [
    { name: "Classic Cheeseburger", price: 8.99, desc: "Juicy beef patty with cheddar.", ing: "Beef, Cheese, Bun, Lettuce" },
    { name: "Margherita Pizza", price: 12.50, desc: "Traditional Neapolitan pizza.", ing: "Dough, Tomato Sauce, Mozzarella" },
    { name: "Spicy Tuna Roll", price: 9.00, desc: "Fresh tuna with spicy mayo.", ing: "Rice, Nori, Tuna, Spicy Mayo" },
    { name: "Vegan Buddha Bowl", price: 11.00, desc: "Healthy mix of grains and greens.", ing: "Quinoa, Kale, Chickpeas, Tahini" },
    { name: "Chicken Tacos", price: 7.50, desc: "Three authentic street tacos.", ing: "Corn Tortilla, Chicken, Onion, Cilantro" },
    { name: "Caesar Salad", price: 6.50, desc: "Crisp romaine with garlic croutons.", ing: "Romaine, Croutons, Parmesan, Dressing" },
    { name: "Chocolate Lava Cake", price: 5.50, desc: "Warm cake with a gooey center.", ing: "Chocolate, Flour, Eggs, Sugar" },
    { name: "Craft Cola", price: 2.50, desc: "Locally brewed cola.", ing: "Carbonated Water, Cane Sugar, Caramel" },
    { name: "Garlic Bread", price: 4.00, desc: "Toasted baguette with garlic butter.", ing: "Bread, Butter, Garlic, Parsley" },
    { name: "Grilled Salmon", price: 18.00, desc: "Wild-caught salmon with asparagus.", ing: "Salmon, Asparagus, Lemon, Olive Oil" }
];

// Helpers
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNum = (min, max) => Math.random() * (max - min) + min;

async function seedDatabase() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: true },
    });

    console.log("Starting database seeding (Restaurants + Menus)...");

    try {
        // 1. Seed Global Categories
        console.log("Creating restaurant categories...");
        const categoryMap = {};
        for (const category of categories) {
            // Check if it exists first
            const [existing] = await pool.query(`SELECT id FROM Category WHERE name = ?`, [category]);
            if (existing.length > 0) {
                categoryMap[category] = existing[0].id;
            } else {
                const [result] = await pool.execute(`INSERT INTO Category (name) VALUES (?)`, [category]);
                categoryMap[category] = result.insertId;
            }
        }

        // 2. Seed Restaurants
        const NUMBER_OF_RESTAURANTS = 10;
        const defaultPasswordHash = await bcrypt.hash('password123', 10);

        for (let i = 0; i < NUMBER_OF_RESTAURANTS; i++) {
            const baseName = randomItem(restaurantNames);
            const name = baseName + (i > 0 ? ` ${i}` : '');

            // --- A. Create Account & Address ---
            const email = `contact${i}@${name.replace(/\s+/g, '').toLowerCase()}.com`;
            const [accRes] = await pool.execute(
                `INSERT INTO Account (email, password_hashed, account_type) VALUES (?, ?, 'RESTAURANT')`,
                [email, defaultPasswordHash]
            );
            const accountId = accRes.insertId;

            const [addrRes] = await pool.execute(
                `INSERT INTO Address (street, street_number, zip_code, latitude, longitude) VALUES (?, ?, ?, ?, ?)`,
                [randomItem(streets), Math.floor(randomNum(1, 999)).toString(), "12345", randomNum(37.0, 39.0), randomNum(-122.0, -120.0)]
            );
            const addressId = addrRes.insertId;

            // --- B. Create Restaurant Profile ---
            await pool.execute(
                `INSERT INTO Restaurant (id, name, rating, rating_count, contact_phone, operating_hours, estimated_preparation_time, address_id, min_order_value) 
                 VALUES (?, ?, ?, 10, ?, ?, ?, ?, ?)`,
                [accountId, name, randomNum(3.5, 5.0).toFixed(1), `555-${Math.floor(randomNum(1000, 9999))}`, "09:00-22:00", "20", addressId, 5.00]
            );

            // --- C. Assign Categories based on restaurant name ---
            const category = restaurantCategories[baseName] || categories[0];
            const categoryId = categoryMap[category];
            await pool.execute(
                `INSERT INTO Restaurant_Category (restaurant_id, category_id) VALUES (?, ?)`,
                [accountId, categoryId]
            );

            // --- D. Create Menu Categories for this Restaurant ---
            const restaurantMenuCatIds = [];
            for (let j = 0; j < 3; j++) { // Give each restaurant 3 menu sections
                const sectionName = menuSections[j];
                const [catRes] = await pool.execute(
                    `INSERT INTO Product_Category (name, display_order, restaurant_id) VALUES (?, ?, ?)`,
                    [sectionName, j, accountId]
                );
                restaurantMenuCatIds.push(catRes.insertId);
            }

            // --- E. Add Products to the Menu ---
            // Give each restaurant 5-8 random products
            const numProducts = Math.floor(randomNum(5, 8));
            for (let k = 0; k < numProducts; k++) {
                const item = randomItem(foodItems);

                // 1. Create the Product
                const [prodRes] = await pool.execute(
                    `INSERT INTO Product (name, price, description, ingredients, restaurant_id) VALUES (?, ?, ?, ?, ?)`,
                    [item.name, item.price, item.desc, item.ing, accountId]
                );
                const productId = prodRes.insertId;

                // 2. Map the Product to a random Menu Category for this restaurant
                const randomMenuCatId = randomItem(restaurantMenuCatIds);
                await pool.execute(
                    `INSERT INTO Product_Category_Mapping (product_id, category_id) VALUES (?, ?)`,
                    [productId, randomMenuCatId]
                );
            }

            console.log(`Created: ${name} (with ${numProducts} menu items)`);
        }

        console.log("Seeding complete! Check your database to see the populated menus.");
    } catch (error) {
        console.error("Error seeding database:", error);
    } finally {
        await pool.end();
    }
}

seedDatabase();