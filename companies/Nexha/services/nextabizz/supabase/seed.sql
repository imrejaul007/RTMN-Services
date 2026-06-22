-- ============================================
-- NextaBizz Phase 1: Seed Data
-- ============================================
-- Purpose: Development and staging seed data
-- ============================================

-- ============================================
-- SUPPLIER CATEGORIES (Tier 1 - Root Categories)
-- ============================================

INSERT INTO supplier_categories (id, name, slug, icon, display_order, created_at) VALUES
-- Food & Beverages
(uuid_generate_v4(), 'Food & Grains', 'food-grains', 'wheat', 10, NOW()),
(uuid_generate_v4(), 'Fresh Produce', 'fresh-produce', 'carrot', 20, NOW()),
(uuid_generate_v4(), 'Dairy & Eggs', 'dairy-eggs', 'milk', 30, NOW()),
(uuid_generate_v4(), 'Meat & Poultry', 'meat-poultry', 'beef', 40, NOW()),
(uuid_generate_v4(), 'Seafood', 'seafood', 'fish', 50, NOW()),
(uuid_generate_v4(), 'Beverages', 'beverages', 'coffee', 60, NOW()),
(uuid_generate_v4(), 'Bakery', 'bakery', 'bread', 70, NOW()),
(uuid_generate_v4(), 'Spices & Condiments', 'spices-condiments', 'flame', 80, NOW()),
(uuid_generate_v4(), 'Frozen Foods', 'frozen-foods', 'snowflake', 90, NOW()),

-- Hospitality & Kitchen
(uuid_generate_v4(), 'Kitchen Equipment', 'kitchen-equipment', 'chef-hat', 100, NOW()),
(uuid_generate_v4(), 'Packaging & Supplies', 'packaging-supplies', 'package', 110, NOW()),
(uuid_generate_v4(), 'Cleaning & Hygiene', 'cleaning-hygiene', 'spray', 120, NOW()),
(uuid_generate_v4(), 'Linens & Textiles', 'linens-textiles', 'bed', 130, NOW()),

-- Business Supplies
(uuid_generate_v4(), 'Office Supplies', 'office-supplies', 'paperclip', 140, NOW()),
(uuid_generate_v4(), 'Personal Care', 'personal-care', 'user', 150, NOW());

-- ============================================
-- SUPPLIER CATEGORIES (Tier 2 - Subcategories)
-- ============================================

-- Food & Grains subcategories
WITH food_grains AS (
    SELECT id FROM supplier_categories WHERE slug = 'food-grains'
)
INSERT INTO supplier_categories (id, name, slug, parent_id, icon, display_order, created_at)
SELECT * FROM (
    VALUES
    (uuid_generate_v4(), 'Rice & Pulses', 'rice-pulses', (SELECT id FROM food_grains), 'grain', 11, NOW()),
    (uuid_generate_v4(), 'Flour & Baking', 'flour-baking', (SELECT id FROM food_grains), 'cake', 12, NOW()),
    (uuid_generate_v4(), 'Cooking Oils', 'cooking-oils', (SELECT id FROM food_grains), 'droplet', 13, NOW()),
    (uuid_generate_v4(), 'Sugar & Salt', 'sugar-salt', (SELECT id FROM food_grains), 'cube', 14, NOW())
) AS t(id, name, slug, parent_id, icon, display_order, created_at)
WHERE EXISTS (SELECT 1 FROM food_grains);

-- Fresh Produce subcategories
WITH fresh_produce AS (
    SELECT id FROM supplier_categories WHERE slug = 'fresh-produce'
)
INSERT INTO supplier_categories (id, name, slug, parent_id, icon, display_order, created_at)
SELECT * FROM (
    VALUES
    (uuid_generate_v4(), 'Vegetables', 'vegetables', (SELECT id FROM fresh_produce), 'leaf', 21, NOW()),
    (uuid_generate_v4(), 'Fruits', 'fruits', (SELECT id FROM fresh_produce), 'apple', 22, NOW()),
    (uuid_generate_v4(), 'Herbs & Garnish', 'herbs-garnish', (SELECT id FROM fresh_produce), 'sprout', 23, NOW())
) AS t(id, name, slug, parent_id, icon, display_order, created_at)
WHERE EXISTS (SELECT 1 FROM fresh_produce);

-- Dairy & Eggs subcategories
WITH dairy_eggs AS (
    SELECT id FROM supplier_categories WHERE slug = 'dairy-eggs'
)
INSERT INTO supplier_categories (id, name, slug, parent_id, icon, display_order, created_at)
SELECT * FROM (
    VALUES
    (uuid_generate_v4(), 'Milk & Cream', 'milk-cream', (SELECT id FROM dairy_eggs), 'droplet', 31, NOW()),
    (uuid_generate_v4(), 'Cheese', 'cheese', (SELECT id FROM dairy_eggs), 'circle', 32, NOW()),
    (uuid_generate_v4(), 'Butter & Ghee', 'butter-ghee', (SELECT id FROM dairy_eggs), 'circle', 33, NOW()),
    (uuid_generate_v4(), 'Eggs', 'eggs', (SELECT id FROM dairy_eggs), 'egg', 34, NOW()),
    (uuid_generate_v4(), 'Yogurt & Fermented', 'yogurt-fermented', (SELECT id FROM dairy_eggs), 'container', 35, NOW())
) AS t(id, name, slug, parent_id, icon, display_order, created_at)
WHERE EXISTS (SELECT 1 FROM dairy_eggs);

-- Meat & Poultry subcategories
WITH meat_poultry AS (
    SELECT id FROM supplier_categories WHERE slug = 'meat-poultry'
)
INSERT INTO supplier_categories (id, name, slug, parent_id, icon, display_order, created_at)
SELECT * FROM (
    VALUES
    (uuid_generate_v4(), 'Chicken', 'chicken', (SELECT id FROM meat_poultry), 'bird', 41, NOW()),
    (uuid_generate_v4(), 'Mutton & Lamb', 'mutton-lamb', (SELECT id FROM meat_poultry), 'sheep', 42, NOW()),
    (uuid_generate_v4(), 'Pork', 'pork', (SELECT id FROM meat_poultry), 'pig', 43, NOW()),
    (uuid_generate_v4(), 'Processed Meats', 'processed-meats', (SELECT id FROM meat_poultry), 'meat', 44, NOW())
) AS t(id, name, slug, parent_id, icon, display_order, created_at)
WHERE EXISTS (SELECT 1 FROM meat_poultry);

-- Seafood subcategories
WITH seafood AS (
    SELECT id FROM supplier_categories WHERE slug = 'seafood'
)
INSERT INTO supplier_categories (id, name, slug, parent_id, icon, display_order, created_at)
SELECT * FROM (
    VALUES
    (uuid_generate_v4(), 'Fish', 'fish', (SELECT id FROM seafood), 'fish', 51, NOW()),
    (uuid_generate_v4(), 'Prawns & Shrimp', 'prawns-shrimp', (SELECT id FROM seafood), 'shrimp', 52, NOW()),
    (uuid_generate_v4(), 'Crab & Lobster', 'crab-lobster', (SELECT id FROM seafood), 'crab', 53, NOW()),
    (uuid_generate_v4(), 'Canned Seafood', 'canned-seafood', (SELECT id FROM seafood), 'can', 54, NOW())
) AS t(id, name, slug, parent_id, icon, display_order, created_at)
WHERE EXISTS (SELECT 1 FROM seafood);

-- Beverages subcategories
WITH beverages AS (
    SELECT id FROM supplier_categories WHERE slug = 'beverages'
)
INSERT INTO supplier_categories (id, name, slug, parent_id, icon, display_order, created_at)
SELECT * FROM (
    VALUES
    (uuid_generate_v4(), 'Soft Drinks', 'soft-drinks', (SELECT id FROM beverages), 'cup', 61, NOW()),
    (uuid_generate_v4(), 'Juices', 'juices', (SELECT id FROM beverages), 'glass-water', 62, NOW()),
    (uuid_generate_v4(), 'Tea & Coffee', 'tea-coffee', (SELECT id FROM beverages), 'coffee', 63, NOW()),
    (uuid_generate_v4(), 'Mineral Water', 'mineral-water', (SELECT id FROM beverages), 'droplet', 64, NOW())
) AS t(id, name, slug, parent_id, icon, display_order, created_at)
WHERE EXISTS (SELECT 1 FROM beverages);

-- Bakery subcategories
WITH bakery AS (
    SELECT id FROM supplier_categories WHERE slug = 'bakery'
)
INSERT INTO supplier_categories (id, name, slug, parent_id, icon, display_order, created_at)
SELECT * FROM (
    VALUES
    (uuid_generate_v4(), 'Breads', 'breads', (SELECT id FROM bakery), 'bread', 71, NOW()),
    (uuid_generate_v4(), 'Cakes & Pastries', 'cakes-pastries', (SELECT id FROM bakery), 'cake', 72, NOW()),
    (uuid_generate_v4(), 'Biscuits & Cookies', 'biscuits-cookies', (SELECT id FROM bakery), 'cookie', 73, NOW())
) AS t(id, name, slug, parent_id, icon, display_order, created_at)
WHERE EXISTS (SELECT 1 FROM bakery);

-- ============================================
-- SAMPLE SUPPLIERS
-- ============================================

-- Supplier 1: Premium Rice & Grains
INSERT INTO suppliers (id, business_name, gst_number, contact_name, contact_email, contact_phone, categories, rating, is_verified, is_active, created_at, updated_at)
VALUES (
    'a1111111-1111-1111-1111-111111111111'::UUID,
    'Shree Ganesh Rice Mills',
    '27AABCR1234C1Z5',
    'Rajesh Kumar',
    'rajesh@shreeganesh.com',
    '+91 9876543210',
    ARRAY['food-grains', 'rice-pulses'],
    4.75,
    true,
    true,
    NOW(),
    NOW()
);

-- Supplier 2: Fresh Dairy Products
INSERT INTO suppliers (id, business_name, gst_number, contact_name, contact_email, contact_phone, categories, rating, is_verified, is_active, created_at, updated_at)
VALUES (
    'a2222222-2222-2222-2222-222222222222'::UUID,
    'Amul Fresh Dairy',
    '27AABCA9876B2Z3',
    'Priya Sharma',
    'priya@amulfresh.co.in',
    '+91 9876543211',
    ARRAY['dairy-eggs', 'milk-cream', 'cheese', 'butter-ghee', 'yogurt-fermented'],
    4.85,
    true,
    true,
    NOW(),
    NOW()
);

-- Supplier 3: Premium Seafood
INSERT INTO suppliers (id, business_name, gst_number, contact_name, contact_email, contact_phone, categories, rating, is_verified, is_active, created_at, updated_at)
VALUES (
    'a3333333-3333-3333-3333-333333333333'::UUID,
    'Coastal Catch Seafood',
    '27AABCC5678D4Z7',
    'Mohammed Faizal',
    'faizal@coastalcatch.in',
    '+91 9876543212',
    ARRAY['seafood', 'fish', 'prawns-shrimp'],
    4.50,
    true,
    true,
    NOW(),
    NOW()
);

-- Supplier 4: Fresh Vegetables
INSERT INTO suppliers (id, business_name, gst_number, contact_name, contact_email, contact_phone, categories, rating, is_verified, is_active, created_at, updated_at)
VALUES (
    'a4444444-4444-4444-4444-444444444444'::UUID,
    'Green Valley Farms',
    '27AABCG8901E5Z9',
    'Anita Desai',
    'anita@greenvalleyfarms.com',
    '+91 9876543213',
    ARRAY['fresh-produce', 'vegetables', 'herbs-garnish'],
    4.60,
    true,
    true,
    NOW(),
    NOW()
);

-- Supplier 5: Cleaning & Hygiene
INSERT INTO suppliers (id, business_name, gst_number, contact_name, contact_email, contact_phone, categories, rating, is_verified, is_active, created_at, updated_at)
VALUES (
    'a5555555-5555-5555-5555-555555555555'::UUID,
    'HygieCare Solutions',
    '27AABCH2345F6Z1',
    'Vikram Singh',
    'vikram@hygiecare.in',
    '+91 9876543214',
    ARRAY['cleaning-hygiene', 'personal-care'],
    4.40,
    true,
    true,
    NOW(),
    NOW()
);

-- Supplier 6: Meat & Poultry
INSERT INTO suppliers (id, business_name, gst_number, contact_name, contact_email, contact_phone, categories, rating, is_verified, is_active, created_at, updated_at)
VALUES (
    'a6666666-6666-6666-6666-666666666666'::UUID,
    'Fresh Cuts Meat House',
    '27AABCF7890G7Z2',
    'Gurpreet Singh',
    'gurpreet@freshcuts.in',
    '+91 9876543215',
    ARRAY['meat-poultry', 'chicken', 'mutton-lamb', 'processed-meats'],
    4.55,
    true,
    true,
    NOW(),
    NOW()
);

-- Supplier 7: Bakery Products
INSERT INTO suppliers (id, business_name, gst_number, contact_name, contact_email, contact_phone, categories, rating, is_verified, is_active, created_at, updated_at)
VALUES (
    'a7777777-7777-7777-7777-777777777777'::UUID,
    'The Baker''s Kitchen',
    '27AABCK5678H8Z4',
    'Meera Patel',
    'meera@thebakerskitchen.in',
    '+91 9876543216',
    ARRAY['bakery', 'breads', 'cakes-pastries'],
    4.70,
    true,
    true,
    NOW(),
    NOW()
);

-- Supplier 8: Beverages
INSERT INTO suppliers (id, business_name, gst_number, contact_name, contact_email, contact_phone, categories, rating, is_verified, is_active, created_at, updated_at)
VALUES (
    'a8888888-8888-8888-8888-888888888888'::UUID,
    'Beverage Hub India',
    '27AABCB9012I9Z6',
    'Suresh Nair',
    'suresh@beveragehub.in',
    '+91 9876543217',
    ARRAY['beverages', 'soft-drinks', 'juices', 'mineral-water'],
    4.35,
    false,
    true,
    NOW(),
    NOW()
);

-- ============================================
-- SAMPLE PRODUCTS for Supplier 1 (Rice & Grains)
-- ============================================

-- Get category IDs for products
WITH rice_cat AS (SELECT id FROM supplier_categories WHERE slug = 'rice-pulses'),
     flour_cat AS (SELECT id FROM supplier_categories WHERE slug = 'flour-baking'),
     oil_cat AS (SELECT id FROM supplier_categories WHERE slug = 'cooking-oils')
INSERT INTO supplier_products (id, supplier_id, category_id, name, sku, description, unit, moq, price, bulk_pricing, images, is_active, delivery_days, created_at, updated_at)
VALUES
    ('b1111111-1111-1111-1111-111111111111'::UUID,
     'a1111111-1111-1111-1111-111111111111'::UUID,
     (SELECT id FROM rice_cat),
     'Premium Basmati Rice 5kg',
     'SG-BAS-5KG',
     'Premium quality aged basmati rice, long grain, aromatic',
     'Pack',
     5,
     450.00,
     '[{"min_qty": 50, "price": 420.00}, {"min_qty": 100, "price": 400.00}]'::JSONB,
     ARRAY['https://storage.example.com/rice-basmati-5kg.jpg'],
     true,
     3,
     NOW(),
     NOW()),

    ('b1111111-1111-1111-1111-111111111112'::UUID,
     'a1111111-1111-1111-1111-111111111111'::UUID,
     (SELECT id FROM rice_cat),
     'Sona Masoori Rice 25kg',
     'SG-SMS-25KG',
     'Everyday quality sona masoori rice, white, medium grain',
     'Bag',
     2,
     950.00,
     '[{"min_qty": 20, "price": 920.00}, {"min_qty": 50, "price": 890.00}]'::JSONB,
     ARRAY['https://storage.example.com/rice-sonams-25kg.jpg'],
     true,
     2,
     NOW(),
     NOW()),

    ('b1111111-1111-1111-1111-111111111113'::UUID,
     'a1111111-1111-1111-1111-111111111111'::UUID,
     (SELECT id FROM rice_cat),
     'Toor Dal (Arhar) 5kg',
     'SG-DAL-TOOR5',
     'Premium quality toor dal, cleaned and sorted',
     'Pack',
     10,
     520.00,
     '[{"min_qty": 30, "price": 500.00}]'::JSONB,
     ARRAY['https://storage.example.com/dal-toor-5kg.jpg'],
     true,
     3,
     NOW(),
     NOW()),

    ('b1111111-1111-1111-1111-111111111114'::UUID,
     'a1111111-1111-1111-1111-111111111111'::UUID,
     (SELECT id FROM flour_cat),
     'Multigrain Atta 10kg',
     'SG-ATT-MUL10',
     'Healthy multigrain atta with wheat, oats, soy, and channa',
     'Bag',
     5,
     380.00,
     '[{"min_qty": 25, "price": 365.00}]'::JSONB,
     ARRAY['https://storage.example.com/atta-multigrain-10kg.jpg'],
     true,
     2,
     NOW(),
     NOW()),

    ('b1111111-1111-1111-1111-111111111115'::UUID,
     'a1111111-1111-1111-1111-111111111111'::UUID,
     (SELECT id FROM oil_cat),
     'Refined Sunflower Oil 15L',
     'SG-OIL-SF15',
     'Premium refined sunflower oil for cooking',
     'Tin',
     3,
     1450.00,
     '[{"min_qty": 15, "price": 1400.00}, {"min_qty": 30, "price": 1350.00}]'::JSONB,
     ARRAY['https://storage.example.com/oil-sunflower-15l.jpg'],
     true,
     2,
     NOW(),
     NOW());

-- ============================================
-- SAMPLE PRODUCTS for Supplier 2 (Dairy)
-- ============================================

WITH milk_cat AS (SELECT id FROM supplier_categories WHERE slug = 'milk-cream'),
     cheese_cat AS (SELECT id FROM supplier_categories WHERE slug = 'cheese'),
     butter_cat AS (SELECT id FROM supplier_categories WHERE slug = 'butter-ghee'),
     egg_cat AS (SELECT id FROM supplier_categories WHERE slug = 'eggs')
INSERT INTO supplier_products (id, supplier_id, category_id, name, sku, description, unit, moq, price, bulk_pricing, images, is_active, delivery_days, created_at, updated_at)
VALUES
    ('b2222222-2222-2222-2222-222222222221'::UUID,
     'a2222222-2222-2222-2222-222222222222'::UUID,
     (SELECT id FROM milk_cat),
     'Fresh Toned Milk 1L',
     'AF-MLK-TON1',
     'Farm fresh toned milk, pasteurized',
     'Litre',
     50,
     60.00,
     '[{"min_qty": 200, "price": 55.00}, {"min_qty": 500, "price": 52.00}]'::JSONB,
     ARRAY['https://storage.example.com/milk-toned-1l.jpg'],
     true,
     1,
     NOW(),
     NOW()),

    ('b2222222-2222-2222-2222-222222222222'::UUID,
     'a2222222-2222-2222-2222-222222222222'::UUID,
     (SELECT id FROM milk_cat),
     'Full Cream Milk 1L',
     'AF-MLK-FCM1',
     'Rich full cream milk, high fat content',
     'Litre',
     30,
     70.00,
     '[{"min_qty": 100, "price": 65.00}]'::JSONB,
     ARRAY['https://storage.example.com/milk-fullcream-1l.jpg'],
     true,
     1,
     NOW(),
     NOW()),

    ('b2222222-2222-2222-2222-222222222223'::UUID,
     'a2222222-2222-2222-2222-222222222222'::UUID,
     (SELECT id FROM cheese_cat),
     'Processed Cheese Slices 200g',
     'AF-CHE-SL200',
     'Creamy processed cheese slices, 20 per pack',
     'Pack',
     24,
     180.00,
     '[{"min_qty": 72, "price": 170.00}, {"min_qty": 144, "price": 160.00}]'::JSONB,
     ARRAY['https://storage.example.com/cheese-slices-200g.jpg'],
     true,
     2,
     NOW(),
     NOW()),

    ('b2222222-2222-2222-2222-222222222224'::UUID,
     'a2222222-2222-2222-2222-222222222222'::UUID,
     (SELECT id FROM butter_cat),
     'Table Butter 500g',
     'AF-BUT-TBL500',
     'Premium table butter, salted',
     'Pack',
     12,
     280.00,
     '[{"min_qty": 36, "price": 270.00}]'::JSONB,
     ARRAY['https://storage.example.com/butter-table-500g.jpg'],
     true,
     2,
     NOW(),
     NOW()),

    ('b2222222-2222-2222-2222-222222222225'::UUID,
     'a2222222-2222-2222-2222-222222222222'::UUID,
     (SELECT id FROM egg_cat),
     'Farm Fresh Eggs 30',
     'AF-EGG-FF30',
     'Farm fresh white eggs, Grade A',
     'Tray',
     10,
     210.00,
     '[{"min_qty": 30, "price": 200.00}, {"min_qty": 100, "price": 190.00}]'::JSONB,
     ARRAY['https://storage.example.com/eggs-tray-30.jpg'],
     true,
     1,
     NOW(),
     NOW());

-- ============================================
-- SAMPLE PRODUCTS for Supplier 4 (Fresh Vegetables)
-- ============================================

WITH veg_cat AS (SELECT id FROM supplier_categories WHERE slug = 'vegetables'),
     herbs_cat AS (SELECT id FROM supplier_categories WHERE slug = 'herbs-garnish')
INSERT INTO supplier_products (id, supplier_id, category_id, name, sku, description, unit, moq, price, bulk_pricing, images, is_active, delivery_days, created_at, updated_at)
VALUES
    ('b4444444-4444-4444-4444-444444444441'::UUID,
     'a4444444-4444-4444-4444-444444444444'::UUID,
     (SELECT id FROM veg_cat),
     'Fresh Onions 25kg',
     'GV-VEG-ONI25',
     'Fresh red onions, medium size',
     'Bag',
     5,
     650.00,
     '[{"min_qty": 20, "price": 620.00}]'::JSONB,
     ARRAY['https://storage.example.com/onion-red-25kg.jpg'],
     true,
     1,
     NOW(),
     NOW()),

    ('b4444444-4444-4444-4444-444444444442'::UUID,
     'a4444444-4444-4444-4444-444444444444'::UUID,
     (SELECT id FROM veg_cat),
     'Fresh Tomatoes 10kg',
     'GV-VEG-TOM10',
     'Ripe red tomatoes, uniform size',
     'Crate',
     8,
     480.00,
     '[{"min_qty": 25, "price": 450.00}]'::JSONB,
     ARRAY['https://storage.example.com/tomato-red-10kg.jpg'],
     true,
     1,
     NOW(),
     NOW()),

    ('b4444444-4444-4444-4444-444444444443'::UUID,
     'a4444444-4444-4444-4444-444444444444'::UUID,
     (SELECT id FROM veg_cat),
     'Fresh Potatoes 25kg',
     'GV-VEG-POT25',
     'Clean white potatoes, medium size',
     'Bag',
     5,
     550.00,
     '[{"min_qty": 20, "price": 520.00}]'::JSONB,
     ARRAY['https://storage.example.com/potato-white-25kg.jpg'],
     true,
     1,
     NOW(),
     NOW()),

    ('b4444444-4444-4444-4444-444444444444'::UUID,
     'a4444444-4444-4444-4444-444444444444'::UUID,
     (SELECT id FROM herbs_cat),
     'Fresh Coriander Bunch',
     'GV-HRB-COR1',
     'Fresh green coriander, clean roots',
     'Bunch',
     20,
     25.00,
     '[{"min_qty": 100, "price": 20.00}]'::JSONB,
     ARRAY['https://storage.example.com/coriander-bunch.jpg'],
     true,
     1,
     NOW(),
     NOW()),

    ('b4444444-4444-4444-4444-444444444445'::UUID,
     'a4444444-4444-4444-4444-444444444444'::UUID,
     (SELECT id FROM herbs_cat),
     'Fresh Green Chillies 1kg',
     'GV-HRB-CHI1',
     'Hot and fresh green chillies',
     'Kg',
     5,
     120.00,
     '[{"min_qty": 20, "price": 110.00}]'::JSONB,
     ARRAY['https://storage.example.com/chilli-green-1kg.jpg'],
     true,
     1,
     NOW(),
     NOW());

-- ============================================
-- SAMPLE PRODUCTS for Supplier 5 (Cleaning)
-- ============================================

WITH clean_cat AS (SELECT id FROM supplier_categories WHERE slug = 'cleaning-hygiene')
INSERT INTO supplier_products (id, supplier_id, category_id, name, sku, description, unit, moq, price, bulk_pricing, images, is_active, delivery_days, created_at, updated_at)
VALUES
    ('b5555555-5555-5555-5555-555555555551'::UUID,
     'a5555555-5555-5555-5555-555555555555'::UUID,
     (SELECT id FROM clean_cat),
     'Dishwash Liquid 5L',
     'HC-CLN-DWL5',
     'Concentrated dishwash liquid, lemon fragrance',
     'Can',
     6,
     650.00,
     '[{"min_qty": 24, "price": 620.00}, {"min_qty": 48, "price": 590.00}]'::JSONB,
     ARRAY['https://storage.example.com/dishwash-5l.jpg'],
     true,
     2,
     NOW(),
     NOW()),

    ('b5555555-5555-5555-5555-555555555552'::UUID,
     'a5555555-5555-5555-5555-555555555555'::UUID,
     (SELECT id FROM clean_cat),
     'Floor Cleaner Concentrate 5L',
     'HC-CLN-FLR5',
     'Multi-surface floor cleaner, jasmine fragrance',
     'Can',
     6,
     580.00,
     '[{"min_qty": 24, "price": 550.00}]'::JSONB,
     ARRAY['https://storage.example.com/floor-cleaner-5l.jpg'],
     true,
     2,
     NOW(),
     NOW()),

    ('b5555555-5555-5555-5555-555555555553'::UUID,
     'a5555555-5555-5555-5555-555555555555'::UUID,
     (SELECT id FROM clean_cat),
     'Toilet Cleaner 5L',
     'HC-CLN-TLT5',
     'Thick toilet bowl cleaner, pine fragrance',
     'Can',
     6,
     720.00,
     '[{"min_qty": 24, "price": 690.00}]'::JSONB,
     ARRAY['https://storage.example.com/toilet-cleaner-5l.jpg'],
     true,
     2,
     NOW(),
     NOW()),

    ('b5555555-5555-5555-5555-555555555554'::UUID,
     'a5555555-5555-5555-5555-555555555555'::UUID,
     (SELECT id FROM clean_cat),
     'Hand Sanitizer 5L',
     'HC-CLN-HSN5',
     'Alcohol-based hand sanitizer, 70%',
     'Can',
     10,
     850.00,
     '[{"min_qty": 30, "price": 800.00}]'::JSONB,
     ARRAY['https://storage.example.com/hand-sanitizer-5l.jpg'],
     true,
     2,
     NOW(),
     NOW()),

    ('b5555555-5555-5555-5555-555555555555'::UUID,
     'a5555555-5555-5555-5555-555555555555'::UUID,
     (SELECT id FROM clean_cat),
     'Garbage Bags 100pc (Large)',
     'HC-CLN-GBL100',
     'Heavy duty black garbage bags, 90x120cm',
     'Pack',
     10,
     450.00,
     '[{"min_qty": 50, "price": 420.00}]'::JSONB,
     ARRAY['https://storage.example.com/garbage-bag-100pc.jpg'],
     true,
     2,
     NOW(),
     NOW());

-- ============================================
-- SAMPLE MERCHANTS
-- ============================================

INSERT INTO merchants (id, rez_merchant_id, business_name, category, city, email, phone, source, source_merchant_id, credit_line_id, created_at, updated_at)
VALUES
    ('c1111111-1111-1111-1111-111111111111'::UUID,
     'REZ-MCHT-001',
     'Spice Garden Restaurant',
     'restaurant',
     'Mumbai',
     'info@spicegarden.in',
     '+91 9820012345',
     'rez',
     'REZ-001',
     NULL,
     NOW(),
     NOW()),

    ('c2222222-2222-2222-2222-222222222222'::UUID,
     'REZ-MCHT-002',
     'The Royal Cafe',
     'cafe',
     'Delhi',
     'orders@royalcafe.in',
     '+91 9811123456',
     'rez',
     'REZ-002',
     NULL,
     NOW(),
     NOW()),

    ('c3333333-3333-3333-3333-333333333333'::UUID,
     'REZ-MCHT-003',
     'Taj Banquet Hall',
     'hotel',
     'Bangalore',
     'purchase@tajbanquet.com',
     '+91 9841234567',
     'rez',
     'REZ-003',
     NULL,
     NOW(),
     NOW()),

    ('c4444444-4444-4444-4444-444444444444'::UUID,
     'REZ-MCHT-004',
     'Quick Bites Cloud Kitchen',
     'cloud_kitchen',
     'Pune',
     'procurement@quickbites.in',
     '+91 9861234567',
     'api',
     'QB-004',
     NULL,
     NOW(),
     NOW());

-- ============================================
-- CREDIT LINES for Merchants
-- ============================================

INSERT INTO credit_lines (id, merchant_id, credit_limit, utilized, tenor_days, interest_rate, status, tier, created_at, updated_at)
VALUES
    ('d1111111-1111-1111-1111-111111111111'::UUID,
     'c1111111-1111-1111-1111-111111111111'::UUID,
     500000.00,
     125000.00,
     30,
     0.0015,
     'active',
     'premium',
     NOW(),
     NOW()),

    ('d2222222-2222-2222-2222-222222222222'::UUID,
     'c2222222-2222-2222-2222-222222222222'::UUID,
     250000.00,
     75000.00,
     30,
     0.0018,
     'active',
     'standard',
     NOW(),
     NOW()),

    ('d3333333-3333-3333-3333-333333333333'::UUID,
     'c3333333-3333-3333-3333-333333333333'::UUID,
     1000000.00,
     300000.00,
     45,
     0.0012,
     'active',
     'enterprise',
     NOW(),
     NOW()),

    ('d4444444-4444-4444-4444-444444444444'::UUID,
     'c4444444-4444-4444-4444-444444444444'::UUID,
     100000.00,
     25000.00,
     30,
     0.0020,
     'active',
     'standard',
     NOW(),
     NOW());

-- Update merchants with credit_line_id
UPDATE merchants SET credit_line_id = 'd1111111-1111-1111-1111-111111111111'::UUID WHERE id = 'c1111111-1111-1111-1111-111111111111'::UUID;
UPDATE merchants SET credit_line_id = 'd2222222-2222-2222-2222-222222222222'::UUID WHERE id = 'c2222222-2222-2222-2222-222222222222'::UUID;
UPDATE merchants SET credit_line_id = 'd3333333-3333-3333-3333-333333333333'::UUID WHERE id = 'c3333333-3333-3333-3333-333333333333'::UUID;
UPDATE merchants SET credit_line_id = 'd4444444-4444-4444-4444-444444444444'::UUID WHERE id = 'c4444444-4444-4444-4444-444444444444'::UUID;

-- ============================================
-- SAMPLE INVENTORY SIGNALS
-- ============================================

INSERT INTO inventory_signals (id, merchant_id, source, source_product_id, source_product_name, sku, current_stock, threshold, unit, category, severity, signal_type, metadata, created_at)
VALUES
    ('e1111111-1111-1111-1111-111111111111'::UUID,
     'c1111111-1111-1111-1111-111111111111'::UUID,
     'inventory_system',
     'PROD-001',
     'Basmati Rice 5kg',
     'SG-BAS-5KG',
     15.000,
     50.000,
     'Pack',
     'food-grains',
     'high',
     'low_stock',
     '{"daily_usage": 10, "days_until_empty": 1.5}'::JSONB,
     NOW() - INTERVAL '2 hours'),

    ('e2222222-2222-2222-2222-222222222222'::UUID,
     'c1111111-1111-1111-1111-111111111111'::UUID,
     'inventory_system',
     'PROD-002',
     'Toned Milk 1L',
     'AF-MLK-TON1',
     5.000,
     100.000,
     'Litre',
     'dairy-eggs',
     'critical',
     'low_stock',
     '{"daily_usage": 50, "days_until_empty": 0.1}'::JSONB,
     NOW() - INTERVAL '30 minutes'),

    ('e3333333-3333-3333-3333-333333333333'::UUID,
     'c2222222-2222-2222-2222-222222222222'::UUID,
     'inventory_system',
     'PROD-003',
     'Tomatoes 10kg',
     'GV-VEG-TOM10',
     2.000,
     10.000,
     'Crate',
     'fresh-produce',
     'high',
     'low_stock',
     '{"daily_usage": 5, "days_until_empty": 0.4}'::JSONB,
     NOW() - INTERVAL '1 hour'),

    ('e4444444-4444-4444-4444-444444444444'::UUID,
     'c3333333-3333-3333-3333-333333333333'::UUID,
     'inventory_system',
     'PROD-004',
     'Floor Cleaner 5L',
     'HC-CLN-FLR5',
     8.000,
     15.000,
     'Can',
     'cleaning-hygiene',
     'medium',
     'low_stock',
     '{"daily_usage": 3, "days_until_empty": 2.7}'::JSONB,
     NOW() - INTERVAL '4 hours'),

    ('e5555555-5555-5555-5555-555555555555'::UUID,
     'c1111111-1111-1111-1111-111111111111'::UUID,
     'inventory_system',
     'PROD-005',
     'Processed Cheese 200g',
     'AF-CHE-SL200',
     0.000,
     20.000,
     'Pack',
     'dairy-eggs',
     'critical',
     'out_of_stock',
     '{"last_sold": "2024-01-15T10:30:00Z"}'::JSONB,
     NOW() - INTERVAL '15 minutes');

-- ============================================
-- SAMPLE REORDER SIGNALS
-- ============================================

INSERT INTO reorder_signals (id, merchant_id, inventory_signal_id, suggested_qty, urgency, status, match_confidence, created_at, updated_at)
VALUES
    ('f1111111-1111-1111-1111-111111111111'::UUID,
     'c1111111-1111-1111-1111-111111111111'::UUID,
     'e1111111-1111-1111-1111-111111111111'::UUID,
     100.000,
     'high',
     'matched',
     0.92,
     NOW() - INTERVAL '1 hour',
     NOW() - INTERVAL '30 minutes'),

    ('f2222222-2222-2222-2222-222222222222'::UUID,
     'c1111111-1111-1111-1111-111111111111'::UUID,
     'e2222222-2222-2222-2222-222222222222'::UUID,
     200.000,
     'urgent',
     'matched',
     0.98,
     NOW() - INTERVAL '20 minutes',
     NOW()),

    ('f3333333-3333-3333-3333-333333333333'::UUID,
     'c2222222-2222-2222-2222-222222222222'::UUID,
     'e3333333-3333-3333-3333-333333333333'::UUID,
     30.000,
     'high',
     'pending',
     0.85,
     NOW() - INTERVAL '45 minutes',
     NOW() - INTERVAL '45 minutes'),

    ('f4444444-4444-4444-4444-444444444444'::UUID,
     'c3333333-3333-3333-3333-333333333333'::UUID,
     'e4444444-4444-4444-4444-444444444444'::UUID,
     25.000,
     'medium',
     'dismissed',
     0.75,
     NOW() - INTERVAL '3 hours',
     NOW() - INTERVAL '2 hours'),

    ('f5555555-5555-5555-5555-555555555555'::UUID,
     'c1111111-1111-1111-1111-111111111111'::UUID,
     'e5555555-5555-5555-5555-555555555555'::UUID,
     50.000,
     'urgent',
     'po_created',
     0.95,
     NOW() - INTERVAL '10 minutes',
     NOW());

-- ============================================
-- SAMPLE PURCHASE ORDERS
-- ============================================

INSERT INTO purchase_orders (id, order_number, merchant_id, supplier_id, status, subtotal, net_amount, payment_status, payment_method, delivery_address, expected_delivery, source, rfq_id, created_at, updated_at)
VALUES
    ('g1111111-1111-1111-1111-111111111111'::UUID,
     'PO-000001',
     'c1111111-1111-1111-1111-111111111111'::UUID,
     'a1111111-1111-1111-1111-111111111111'::UUID,
     'delivered',
     8500.00,
     9350.00,
     'paid',
     'credit',
     '{"street": "45 MG Road", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001"}'::JSONB,
     CURRENT_DATE - INTERVAL '5 days',
     'manual',
     NULL,
     NOW() - INTERVAL '10 days',
     NOW() - INTERVAL '5 days'),

    ('g2222222-2222-2222-2222-222222222222'::UUID,
     'PO-000002',
     'c1111111-1111-1111-1111-111111111111'::UUID,
     'a2222222-2222-2222-2222-222222222222'::UUID,
     'shipped',
     12500.00,
     13750.00,
     'pending',
     'credit',
     '{"street": "45 MG Road", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001"}'::JSONB,
     CURRENT_DATE + INTERVAL '2 days',
     'reorder',
     NULL,
     NOW() - INTERVAL '3 days',
     NOW() - INTERVAL '1 day'),

    ('g3333333-3333-3333-3333-333333333333'::UUID,
     'PO-000003',
     'c2222222-2222-2222-2222-222222222222'::UUID,
     'a4444444-4444-4444-4444-444444444444'::UUID,
     'processing',
     5600.00,
     6160.00,
     'pending',
     'upi',
     '{"street": "78 Connaught Place", "city": "Delhi", "state": "Delhi", "pincode": "110001"}'::JSONB,
     CURRENT_DATE + INTERVAL '1 day',
     'manual',
     NULL,
     NOW() - INTERVAL '2 days',
     NOW()),

    ('g4444444-4444-4444-4444-444444444444'::UUID,
     'c3333333-3333-3333-3333-333333333333'::UUID,
     'a5555555-5555-5555-5555-555555555555'::UUID,
     'confirmed',
     18750.00,
     20625.00,
     'partial',
     'credit',
     '{"street": "123 MG Road", "city": "Bangalore", "state": "Karnataka", "pincode": "560001"}'::JSONB,
     CURRENT_DATE + INTERVAL '3 days',
     'manual',
     NULL,
     NOW() - INTERVAL '5 days',
     NOW() - INTERVAL '2 days'),

    ('g5555555-5555-5555-5555-555555555555'::UUID,
     'c1111111-1111-1111-1111-111111111111'::UUID,
     'a2222222-2222-2222-2222-222222222222'::UUID,
     'draft',
     0.00,
     0.00,
     'pending',
     'credit',
     '{"street": "45 MG Road", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001"}'::JSONB,
     CURRENT_DATE + INTERVAL '5 days',
     'reorder',
     NULL,
     NOW(),
     NOW());

-- ============================================
-- SAMPLE PO ITEMS
-- ============================================

INSERT INTO po_items (id, po_id, supplier_product_id, name, sku, qty, unit, unit_price, total, received_qty, created_at)
VALUES
    ('h1111111-1111-1111-1111-111111111111'::UUID,
     'g1111111-1111-1111-1111-111111111111'::UUID,
     'b1111111-1111-1111-1111-111111111111'::UUID,
     'Premium Basmati Rice 5kg',
     'SG-BAS-5KG',
     10.000,
     'Pack',
     450.00,
     4500.00,
     10.000,
     NOW() - INTERVAL '10 days'),

    ('h1111111-1111-1111-1111-111111111112'::UUID,
     'g1111111-1111-1111-1111-111111111111'::UUID,
     'b1111111-1111-1111-1111-111111111113'::UUID,
     'Toor Dal 5kg',
     'SG-DAL-TOOR5',
     8.000,
     'Pack',
     520.00,
     4160.00,
     8.000,
     NOW() - INTERVAL '10 days'),

    ('h2222222-2222-2222-2222-222222222221'::UUID,
     'g2222222-2222-2222-2222-222222222222'::UUID,
     'b2222222-2222-2222-2222-222222222221'::UUID,
     'Fresh Toned Milk 1L',
     'AF-MLK-TON1',
     150.000,
     'Litre',
     60.00,
     9000.00,
     0.000,
     NOW() - INTERVAL '3 days'),

    ('h2222222-2222-2222-2222-222222222222'::UUID,
     'g2222222-2222-2222-2222-222222222222'::UUID,
     'b2222222-2222-2222-2222-222222222225'::UUID,
     'Farm Fresh Eggs 30',
     'AF-EGG-FF30',
     20.000,
     'Tray',
     210.00,
     4200.00,
     0.000,
     NOW() - INTERVAL '3 days'),

    ('h3333333-3333-3333-3333-333333333331'::UUID,
     'g3333333-3333-3333-3333-333333333333'::UUID,
     'b4444444-4444-4444-4444-444444444441'::UUID,
     'Fresh Onions 25kg',
     'GV-VEG-ONI25',
     10.000,
     'Bag',
     650.00,
     6500.00,
     0.000,
     NOW() - INTERVAL '2 days'),

    ('h4444444-4444-4444-4444-444444444441'::UUID,
     'g4444444-4444-4444-4444-444444444444'::UUID,
     'b5555555-5555-5555-5555-555555555551'::UUID,
     'Dishwash Liquid 5L',
     'HC-CLN-DWL5',
     15.000,
     'Can',
     650.00,
     9750.00,
     0.000,
     NOW() - INTERVAL '5 days'),

    ('h4444444-4444-4444-4444-444444444442'::UUID,
     'g4444444-4444-4444-4444-444444444444'::UUID,
     'b5555555-5555-5555-5555-555555555552'::UUID,
     'Floor Cleaner 5L',
     'HC-CLN-FLR5',
     10.000,
     'Can',
     580.00,
     5800.00,
     0.000,
     NOW() - INTERVAL '5 days'),

    ('h4444444-4444-4444-4444-444444444443'::UUID,
     'g4444444-4444-4444-4444-444444444444'::UUID,
     'b5555555-5555-5555-5555-555555555554'::UUID,
     'Hand Sanitizer 5L',
     'HC-CLN-HSN5',
     10.000,
     'Can',
     850.00,
     8500.00,
     0.000,
     NOW() - INTERVAL '5 days');

-- ============================================
-- SAMPLE SUPPLIER SCORES
-- ============================================

INSERT INTO supplier_scores (id, supplier_id, period, period_start, period_end, on_time_delivery_rate, quality_rejection_rate, price_consistency, avg_lead_time_days, response_rate, overall_score, credit_boost, calculated_at)
VALUES
    ('i1111111-1111-1111-1111-111111111111'::UUID,
     'a1111111-1111-1111-1111-111111111111'::UUID,
     'monthly',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day',
     0.9500,
     0.0200,
     0.9800,
     2.50,
     0.9200,
     4.75,
     0.25,
     NOW()),

    ('i2222222-2222-2222-2222-222222222222'::UUID,
     'a2222222-2222-2222-2222-222222222222'::UUID,
     'monthly',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day',
     0.9800,
     0.0100,
     0.9900,
     1.00,
     0.9800,
     4.85,
     0.50,
     NOW()),

    ('i3333333-3333-3333-3333-333333333333'::UUID,
     'a3333333-3333-3333-3333-333333333333'::UUID,
     'monthly',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day',
     0.9200,
     0.0350,
     0.9600,
     1.50,
     0.9000,
     4.50,
     0.15,
     NOW()),

    ('i4444444-4444-4444-4444-444444444444'::UUID,
     'a4444444-4444-4444-4444-444444444444'::UUID,
     'monthly',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day',
     0.9600,
     0.0150,
     0.9750,
     1.00,
     0.9500,
     4.60,
     0.30,
     NOW()),

    ('i5555555-5555-5555-5555-555555555555'::UUID,
     'a5555555-5555-5555-5555-555555555555'::UUID,
     'monthly',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day',
     0.9000,
     0.0450,
     0.9500,
     2.00,
     0.8800,
     4.40,
     0.10,
     NOW()),

    ('i6666666-6666-6666-6666-666666666666'::UUID,
     'a6666666-6666-6666-6666-666666666666'::UUID,
     'monthly',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day',
     0.9400,
     0.0250,
     0.9650,
     1.50,
     0.9200,
     4.55,
     0.20,
     NOW()),

    ('i7777777-7777-7777-7777-777777777777'::UUID,
     'a7777777-7777-7777-7777-777777777777'::UUID,
     'monthly',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month',
     DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day',
     0.9700,
     0.0120,
     0.9850,
     1.00,
     0.9600,
     4.70,
     0.35,
     NOW());

-- ============================================
-- SAMPLE EVENTS (Audit Log)
-- ============================================

INSERT INTO events (id, type, source, payload, created_at)
VALUES
    ('j1111111-1111-1111-1111-111111111111'::UUID,
     'merchant.created',
     'rez_api',
     '{"merchant_id": "c1111111-1111-1111-1111-111111111111", "rez_merchant_id": "REZ-MCHT-001", "business_name": "Spice Garden Restaurant"}'::JSONB,
     NOW() - INTERVAL '30 days'),

    ('j2222222-2222-2222-2222-222222222222'::UUID,
     'credit_line.approved',
     'credit_service',
     '{"merchant_id": "c1111111-1111-1111-1111-111111111111", "credit_limit": 500000, "tier": "premium"}'::JSONB,
     NOW() - INTERVAL '28 days'),

    ('j3333333-3333-3333-3333-333333333333'::UUID,
     'po.created',
     'ordering_service',
     '{"po_id": "g1111111-1111-1111-1111-111111111111", "order_number": "PO-000001", "merchant_id": "c1111111-1111-1111-1111-111111111111", "supplier_id": "a1111111-1111-1111-1111-111111111111", "net_amount": 9350.00}'::JSONB,
     NOW() - INTERVAL '10 days'),

    ('j4444444-4444-4444-4444-444444444444'::UUID,
     'po.shipped',
     'logistics_service',
     '{"po_id": "g2222222-2222-2222-2222-222222222222", "order_number": "PO-000002", "tracking_number": "TRK123456"}'::JSONB,
     NOW() - INTERVAL '1 day'),

    ('j5555555-5555-5555-5555-555555555555'::UUID,
     'inventory.low_stock',
     'inventory_system',
     '{"merchant_id": "c1111111-1111-1111-1111-111111111111", "sku": "SG-BAS-5KG", "product_name": "Basmati Rice 5kg", "current_stock": 15, "threshold": 50}'::JSONB,
     NOW() - INTERVAL '2 hours'),

    ('j6666666-6666-6666-6666-666666666666'::UUID,
     'reorder.created',
     'ai_matching_service',
     '{"reorder_id": "f2222222-2222-2222-2222-222222222222", "merchant_id": "c1111111-1111-1111-1111-111111111111", "suggested_supplier": "a2222222-2222-2222-2222-222222222222", "match_confidence": 0.98}'::JSONB,
     NOW() - INTERVAL '20 minutes'),

    ('j7777777-7777-7777-7777-777777777777'::UUID,
     'po.created_from_reorder',
     'ordering_service',
     '{"po_id": "g5555555-5555-5555-5555-555555555555", "reorder_id": "f5555555-5555-5555-5555-555555555555", "source": "reorder"}'::JSONB,
     NOW() - INTERVAL '10 minutes');

-- ============================================
-- Initialize order sequence numbers
-- ============================================

INSERT INTO order_sequence (prefix, seq) VALUES
    ('PO', 6),
    ('RFQ', 0),
    ('INV', 0),
    ('PAY', 0)
ON CONFLICT (prefix) DO UPDATE SET seq = GREATEST(order_sequence.seq, EXCLUDED.seq);

-- ============================================
-- Verification queries
-- ============================================

DO $$
DECLARE
    supplier_count INTEGER;
    category_count INTEGER;
    product_count INTEGER;
    merchant_count INTEGER;
    po_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO supplier_count FROM suppliers;
    SELECT COUNT(*) INTO category_count FROM supplier_categories;
    SELECT COUNT(*) INTO product_count FROM supplier_products;
    SELECT COUNT(*) INTO merchant_count FROM merchants;
    SELECT COUNT(*) INTO po_count FROM purchase_orders;

    RAISE NOTICE '=== Seed Data Verification ===';
    RAISE NOTICE 'Suppliers: %', supplier_count;
    RAISE NOTICE 'Categories: %', category_count;
    RAISE NOTICE 'Products: %', product_count;
    RAISE NOTICE 'Merchants: %', merchant_count;
    RAISE NOTICE 'Purchase Orders: %', po_count;
    RAISE NOTICE '=== Seed Complete ===';
END $$;

-- Final confirmation
SELECT 'Seed data inserted successfully' AS status,
       NOW() AS seeded_at;
