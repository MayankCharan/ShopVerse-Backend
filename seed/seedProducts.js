const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const mongoose = require("mongoose");
const Product = require("../src/models/Product");

const products = [
  {
    name: "Wireless Bluetooth Headphones",
    description:
      "Premium wireless headphones with active noise cancellation, 30-hour battery life, and crystal-clear sound quality. Perfect for music lovers and professionals.",
    price: 1999,
    cuttedPrice: 4999,
    images: [
      {
        public_id: "headphones_1",
        url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop",
      },
    ],
    category: "Electronics",
    stock: 50,
    ratings: 4.5,
    numOfReviews: 120,
    reviews: [],
  },
  {
    name: "Men's Cotton T-Shirt",
    description:
      "100% premium cotton t-shirt with a comfortable fit. Available in multiple colors. Machine washable and durable fabric.",
    price: 499,
    cuttedPrice: 1299,
    images: [
      {
        public_id: "tshirt_1",
        url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop",
      },
    ],
    category: "Clothing",
    stock: 200,
    ratings: 4.2,
    numOfReviews: 85,
    reviews: [],
  },
  {
    name: "Running Shoes - Sports",
    description:
      "Lightweight running shoes with cushioned sole and breathable mesh upper. Ideal for jogging, gym, and daily wear.",
    price: 1499,
    cuttedPrice: 3499,
    images: [
      {
        public_id: "shoes_1",
        url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop",
      },
    ],
    category: "Footwear",
    stock: 75,
    ratings: 4.3,
    numOfReviews: 95,
    reviews: [],
  },
  {
    name: "Smart Watch Pro",
    description:
      "Feature-rich smartwatch with heart rate monitor, GPS, sleep tracker, and 7-day battery life. Water resistant up to 50m.",
    price: 2999,
    cuttedPrice: 7999,
    images: [
      {
        public_id: "watch_1",
        url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop",
      },
    ],
    category: "Electronics",
    stock: 40,
    ratings: 4.6,
    numOfReviews: 200,
    reviews: [],
  },
  {
    name: "Women's Handbag - Leather",
    description:
      "Elegant leather handbag with multiple compartments. Premium quality with golden hardware. Perfect for office and parties.",
    price: 899,
    cuttedPrice: 2499,
    images: [
      {
        public_id: "bag_1",
        url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop",
      },
    ],
    category: "Accessories",
    stock: 60,
    ratings: 4.4,
    numOfReviews: 70,
    reviews: [],
  },
  {
    name: "Organic Face Moisturizer",
    description:
      "100% organic face moisturizer with aloe vera and vitamin E. Suitable for all skin types. No parabens or harmful chemicals.",
    price: 349,
    cuttedPrice: 899,
    images: [
      {
        public_id: "cream_1",
        url: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=500&fit=crop",
      },
    ],
    category: "Beauty",
    stock: 150,
    ratings: 4.1,
    numOfReviews: 110,
    reviews: [],
  },
  {
    name: "Stainless Steel Water Bottle",
    description:
      "Double-walled insulated water bottle. Keeps drinks cold for 24 hours and hot for 12 hours. BPA-free, 1 liter capacity.",
    price: 599,
    cuttedPrice: 1499,
    images: [
      {
        public_id: "bottle_1",
        url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&h=500&fit=crop",
      },
    ],
    category: "Home",
    stock: 100,
    ratings: 4.5,
    numOfReviews: 180,
    reviews: [],
  },
  {
    name: "Laptop Backpack - Anti Theft",
    description:
      "Anti-theft laptop backpack with USB charging port. Fits 15.6 inch laptop. Water-resistant fabric with multiple pockets.",
    price: 799,
    cuttedPrice: 1999,
    images: [
      {
        public_id: "backpack_1",
        url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop",
      },
    ],
    category: "Accessories",
    stock: 80,
    ratings: 4.3,
    numOfReviews: 130,
    reviews: [],
  },
  {
    name: "Wireless Earbuds Pro",
    description:
      "True wireless earbuds with deep bass, touch controls, and 24-hour total battery life with charging case. IPX5 water resistant.",
    price: 1299,
    cuttedPrice: 3999,
    images: [
      {
        public_id: "earbuds_1",
        url: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=500&h=500&fit=crop",
      },
    ],
    category: "Electronics",
    stock: 90,
    ratings: 4.4,
    numOfReviews: 250,
    reviews: [],
  },
  {
    name: "Yoga Mat - Premium Quality",
    description:
      "6mm thick premium yoga mat with anti-slip surface. Eco-friendly material. Comes with a carrying strap. 72x24 inches.",
    price: 699,
    cuttedPrice: 1599,
    images: [
      {
        public_id: "yoga_1",
        url: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&h=500&fit=crop",
      },
    ],
    category: "Sports",
    stock: 65,
    ratings: 4.2,
    numOfReviews: 60,
    reviews: [],
  },
  {
    name: "Men's Formal Shirt",
    description:
      "Slim fit formal shirt with premium cotton fabric. Perfect for office wear and formal events. Available in multiple sizes.",
    price: 799,
    cuttedPrice: 1899,
    images: [
      {
        public_id: "shirt_1",
        url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&h=500&fit=crop",
      },
    ],
    category: "Clothing",
    stock: 120,
    ratings: 4.0,
    numOfReviews: 55,
    reviews: [],
  },
  {
    name: "LED Desk Lamp - Adjustable",
    description:
      "Eye-care LED desk lamp with 5 brightness levels and 3 color modes. USB charging port. Flexible gooseneck design.",
    price: 449,
    cuttedPrice: 1199,
    images: [
      {
        public_id: "lamp_1",
        url: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=500&h=500&fit=crop",
      },
    ],
    category: "Home",
    stock: 70,
    ratings: 4.3,
    numOfReviews: 90,
    reviews: [],
  },
  {
    name: "Protein Powder - Chocolate",
    description:
      "Premium whey protein powder with 24g protein per serving. Chocolate flavor. No added sugar. Helps in muscle building.",
    price: 1899,
    cuttedPrice: 3499,
    images: [
      {
        public_id: "protein_1",
        url: "https://images.unsplash.com/photo-1593095948071-474c5cc2c191?w=500&h=500&fit=crop",
      },
    ],
    category: "Health",
    stock: 45,
    ratings: 4.5,
    numOfReviews: 300,
    reviews: [],
  },
  {
    name: "Sunglasses - Polarized",
    description:
      "Premium polarized sunglasses with UV400 protection. Lightweight frame. Reduces glare and eye strain. Unisex design.",
    price: 599,
    cuttedPrice: 1599,
    images: [
      {
        public_id: "sunglasses_1",
        url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&h=500&fit=crop",
      },
    ],
    category: "Accessories",
    stock: 85,
    ratings: 4.1,
    numOfReviews: 75,
    reviews: [],
  },
  {
    name: "Portable Bluetooth Speaker",
    description:
      "Compact Bluetooth speaker with 360-degree sound, 12-hour battery, and IPX7 waterproof rating. Perfect for outdoor use.",
    price: 999,
    cuttedPrice: 2499,
    images: [
      {
        public_id: "speaker_1",
        url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&h=500&fit=crop",
      },
    ],
    category: "Electronics",
    stock: 55,
    ratings: 4.4,
    numOfReviews: 160,
    reviews: [],
  },
  {
    name: "Women's Running Shoes",
    description:
      "Lightweight and breathable running shoes designed for women. Cushioned insole with good arch support. Stylish design.",
    price: 1299,
    cuttedPrice: 2999,
    images: [
      {
        public_id: "wshoes_1",
        url: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&h=500&fit=crop",
      },
    ],
    category: "Footwear",
    stock: 65,
    ratings: 4.3,
    numOfReviews: 80,
    reviews: [],
  },
  {
    name: "Mechanical Gaming Keyboard",
    description:
      "RGB mechanical keyboard with blue switches, anti-ghosting keys, and durable aluminum body. Ideal for gaming and typing.",
    price: 2499,
    cuttedPrice: 5999,
    images: [
      {
        public_id: "keyboard_1",
        url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&h=500&fit=crop",
      },
    ],
    category: "Electronics",
    stock: 35,
    ratings: 4.7,
    numOfReviews: 210,
    reviews: [],
  },
  {
    name: "Women's Denim Jeans",
    description:
      "High-waisted skinny fit denim jeans with stretchable fabric. Trendy ripped design. Comfortable for all-day wear.",
    price: 999,
    cuttedPrice: 2499,
    images: [
      {
        public_id: "jeans_1",
        url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&h=500&fit=crop",
      },
    ],
    category: "Clothing",
    stock: 110,
    ratings: 4.2,
    numOfReviews: 145,
    reviews: [],
  },
  {
    name: "Men's Casual Sneakers",
    description:
      "Classic white casual sneakers with breathable canvas upper and cushioned sole. Goes well with jeans and chinos.",
    price: 1199,
    cuttedPrice: 2799,
    images: [
      {
        public_id: "sneakers_1",
        url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop",
      },
    ],
    category: "Footwear",
    stock: 90,
    ratings: 4.4,
    numOfReviews: 175,
    reviews: [],
  },
  {
    name: "Men's Leather Wallet",
    description:
      "Genuine leather bi-fold wallet with RFID blocking technology. Multiple card slots and a coin pocket.",
    price: 699,
    cuttedPrice: 1599,
    images: [
      {
        public_id: "wallet_1",
        url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&h=500&fit=crop",
      },
    ],
    category: "Accessories",
    stock: 120,
    ratings: 4.5,
    numOfReviews: 220,
    reviews: [],
  },
  {
    name: "Sunscreen Lotion - SPF 50",
    description:
      "Broad-spectrum sunscreen with SPF 50. Non-greasy, water-resistant formula. Protects from UVA and UVB rays.",
    price: 449,
    cuttedPrice: 999,
    images: [
      {
        public_id: "sunscreen_1",
        url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&h=500&fit=crop",
      },
    ],
    category: "Beauty",
    stock: 200,
    ratings: 4.3,
    numOfReviews: 310,
    reviews: [],
  },
  {
    name: "Coffee Maker Machine",
    description:
      "12-cup programmable coffee maker with auto shut-off feature. Brews rich and flavorful coffee in minutes.",
    price: 3499,
    cuttedPrice: 6999,
    images: [
      {
        public_id: "coffee_1",
        url: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500&h=500&fit=crop",
      },
    ],
    category: "Home",
    stock: 25,
    ratings: 4.6,
    numOfReviews: 95,
    reviews: [],
  },
  {
    name: "Adjustable Dumbbells Set",
    description:
      "5kg to 25kg adjustable dumbbells pair. Perfect for home workouts. Comes with sturdy rack and anti-slip grips.",
    price: 4999,
    cuttedPrice: 9999,
    images: [
      {
        public_id: "dumbbells_1",
        url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&h=500&fit=crop",
      },
    ],
    category: "Sports",
    stock: 30,
    ratings: 4.8,
    numOfReviews: 140,
    reviews: [],
  },
  {
    name: "Daily Multivitamin Tablets",
    description:
      "Pack of 60 multivitamin tablets for daily energy and immunity boost. Contains essential vitamins and minerals.",
    price: 599,
    cuttedPrice: 1299,
    images: [
      {
        public_id: "multivit_1",
        url: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=500&h=500&fit=crop",
      },
    ],
    category: "Health",
    stock: 150,
    ratings: 4.2,
    numOfReviews: 260,
    reviews: [],
  },
  {
    name: "Ergonomic Wireless Mouse",
    description:
      "Vertical ergonomic wireless mouse with silent clicks and adjustable DPI. Reduces wrist strain for long computer use.",
    price: 799,
    cuttedPrice: 1999,
    images: [
      {
        public_id: "mouse_1",
        url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop",
      },
    ],
    category: "Electronics",
    stock: 70,
    ratings: 4.3,
    numOfReviews: 190,
    reviews: [],
  },
  {
    name: "Men's Winter Puffer Jacket",
    description:
      "Warm quilted puffer jacket with waterproof outer shell. Lightweight yet highly insulated. Zippered pockets.",
    price: 1899,
    cuttedPrice: 4499,
    images: [
      {
        public_id: "jacket_1",
        url: "https://images.unsplash.com/photo-1544923246-77307dd270cb?w=500&h=500&fit=crop",
      },
    ],
    category: "Clothing",
    stock: 60,
    ratings: 4.5,
    numOfReviews: 115,
    reviews: [],
  },
  {
    name: "Men's Trekking Boots",
    description:
      "Rugged ankle-length trekking boots with grippy rubber sole. Waterproof upper to keep feet dry on hikes.",
    price: 2499,
    cuttedPrice: 5499,
    images: [
      {
        public_id: "boots_1",
        url: "https://images.unsplash.com/photo-1520219306100-ec4afeeefe58?w=500&h=500&fit=crop",
      },
    ],
    category: "Footwear",
    stock: 40,
    ratings: 4.6,
    numOfReviews: 88,
    reviews: [],
  },
  {
    name: "Smart Fitness Band",
    description:
      "Slim fitness tracker with heart rate, SpO2 monitor, and step counter. 14-day battery life with water resistance.",
    price: 1499,
    cuttedPrice: 3999,
    images: [
      {
        public_id: "band_1",
        url: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500&h=500&fit=crop",
      },
    ],
    category: "Accessories",
    stock: 95,
    ratings: 4.1,
    numOfReviews: 320,
    reviews: [],
  },
  {
    name: "Professional Hair Dryer",
    description:
      "2000W professional hair dryer with ionic technology for frizz-free hair. Multiple heat and speed settings.",
    price: 1799,
    cuttedPrice: 3999,
    images: [
      {
        public_id: "dryer_1",
        url: "https://images.unsplash.com/photo-1585747860019-8e8ef5e27108?w=500&h=500&fit=crop",
      },
    ],
    category: "Beauty",
    stock: 55,
    ratings: 4.4,
    numOfReviews: 140,
    reviews: [],
  },
  {
    name: "Room Air Purifier",
    description:
      "HEPA air purifier covers up to 300 sq ft. Removes dust, pollen, and smoke. Quiet operation with night mode.",
    price: 5999,
    cuttedPrice: 12999,
    images: [
      {
        public_id: "purifier_1",
        url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&h=500&fit=crop",
      },
    ],
    category: "Home",
    stock: 20,
    ratings: 4.7,
    numOfReviews: 75,
    reviews: [],
  },
  {
    name: "Resistance Bands Set",
    description:
      "Set of 5 latex resistance bands with different tension levels. Comes with door anchor and carrying bag.",
    price: 399,
    cuttedPrice: 999,
    images: [
      {
        public_id: "bands_1",
        url: "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=500&h=500&fit=crop",
      },
    ],
    category: "Sports",
    stock: 150,
    ratings: 4.3,
    numOfReviews: 200,
    reviews: [],
  },
  {
    name: "Omega-3 Fish Oil Capsules",
    description:
      "High-quality fish oil capsules containing EPA and DHA. Supports heart and brain health. 120 softgels.",
    price: 899,
    cuttedPrice: 1999,
    images: [
      {
        public_id: "fishoil_1",
        url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&h=500&fit=crop",
      },
    ],
    category: "Health",
    stock: 80,
    ratings: 4.4,
    numOfReviews: 175,
    reviews: [],
  },
  {
    name: "USB-C Hub Adapter",
    description:
      "7-in-1 USB-C hub with HDMI 4K output, 3 USB 3.0 ports, SD/TF card reader, and 100W PD charging.",
    price: 1299,
    cuttedPrice: 2999,
    images: [
      {
        public_id: "usbhub_1",
        url: "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=500&h=500&fit=crop",
      },
    ],
    category: "Electronics",
    stock: 60,
    ratings: 4.5,
    numOfReviews: 135,
    reviews: [],
  },
  {
    name: "Women's Cotton Saree",
    description:
      "Elegant handloom cotton saree with traditional border. Lightweight and breathable, perfect for daily wear and festivals.",
    price: 1299,
    cuttedPrice: 2999,
    images: [
      {
        public_id: "saree_1",
        url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&h=500&fit=crop",
      },
    ],
    category: "Clothing",
    stock: 75,
    ratings: 4.6,
    numOfReviews: 250,
    reviews: [],
  },
  {
    name: "Men's Flip Flops",
    description:
      "Comfortable and durable flip flops with cushioned footbed. Quick-drying material, ideal for casual wear and beaches.",
    price: 299,
    cuttedPrice: 799,
    images: [
      {
        public_id: "flipflops_1",
        url: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&h=500&fit=crop",
      },
    ],
    category: "Footwear",
    stock: 200,
    ratings: 4.0,
    numOfReviews: 160,
    reviews: [],
  },
  {
    name: "Men's Reversible Leather Belt",
    description:
      "Premium reversible leather belt (Black/Brown). Automatic buckle with adjustable fit. Slim design.",
    price: 499,
    cuttedPrice: 1299,
    images: [
      {
        public_id: "belt_1",
        url: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=500&h=500&fit=crop",
      },
    ],
    category: "Accessories",
    stock: 110,
    ratings: 4.2,
    numOfReviews: 90,
    reviews: [],
  },
  {
    name: "Vitamin C Face Wash",
    description:
      "Refreshing face wash enriched with Vitamin C and turmeric. Brightens skin tone and removes deep-seated dirt.",
    price: 249,
    cuttedPrice: 599,
    images: [
      {
        public_id: "facewash_1",
        url: "https://images.unsplash.com/photo-1570194065650-d99fb4ee21ff?w=500&h=500&fit=crop",
      },
    ],
    category: "Beauty",
    stock: 250,
    ratings: 4.3,
    numOfReviews: 410,
    reviews: [],
  },
  // --- 3 New Products Added Below to reach exactly 40 ---
  {
    name: "Men's Pullover Hoodie",
    description:
      "Fleece-lined cotton hoodie with a kangaroo pocket and adjustable drawstring hood. Ideal for winter and layering.",
    price: 999,
    cuttedPrice: 2499,
    images: [
      {
        public_id: "hoodie_1",
        url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&h=500&fit=crop",
      },
    ],
    category: "Clothing",
    stock: 85,
    ratings: 4.5,
    numOfReviews: 190,
    reviews: [],
  },
  {
    name: "Smartphone - 5G",
    description:
      "Latest 5G smartphone with AMOLED display, 108MP triple camera setup, and 5000mAh fast-charging battery.",
    price: 15999,
    cuttedPrice: 22999,
    images: [
      {
        public_id: "smartphone_1",
        url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop",
      },
    ],
    category: "Electronics",
    stock: 50,
    ratings: 4.6,
    numOfReviews: 450,
    reviews: [],
  },
  {
    name: "Indoor Ceramic Plant Pot",
    description:
      "Minimalist white ceramic planter pot with drainage hole and bamboo tray. Perfect for succulents and small indoor plants.",
    price: 349,
    cuttedPrice: 799,
    images: [
      {
        public_id: "plantpot_1",
        url: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&h=500&fit=crop",
      },
    ],
    category: "Home",
    stock: 130,
    ratings: 4.4,
    numOfReviews: 95,
    reviews: [],
  },
];

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for seeding...");

    await Product.deleteMany({});
    console.log("Cleared existing products");

    await Product.insertMany(products);
    console.log(`Seeded ${products.length} products successfully!`);

    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedProducts();
