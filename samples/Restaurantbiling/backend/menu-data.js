/**
 * Curated Restaurant Menu & Promo Codes
 * Zero external database required — pure in-memory catalog.
 */

export const CATEGORIES = [
  'All',
  'Starters',
  'Wood-Fired Pizza',
  'Mains',
  'Beverages',
  'Desserts'
];

export const MENU_ITEMS = [
  {
    id: 'item-101',
    name: 'Crispy Truffle Arancini',
    category: 'Starters',
    price: 11.50,
    badge: 'Popular',
    isVeg: true,
    description: 'Wild mushroom risotto balls, black truffle aioli & aged parmesan.'
  },
  {
    id: 'item-102',
    name: 'Chargrilled Chicken Satay',
    category: 'Starters',
    price: 13.00,
    badge: 'Spicy',
    isVeg: false,
    description: 'Skewered free-range chicken with roasted peanut-chili glaze.'
  },
  {
    id: 'item-103',
    name: 'Burrata & Heirloom Bruschetta',
    category: 'Starters',
    price: 14.00,
    badge: 'Chef Special',
    isVeg: true,
    description: 'Creamy Puglia burrata, basil oil, and toasted sourdough.'
  },
  {
    id: 'item-201',
    name: 'Margherita D.O.P.',
    category: 'Wood-Fired Pizza',
    price: 16.50,
    badge: 'Classic',
    isVeg: true,
    description: 'San Marzano tomatoes, fresh fior di latte, sweet basil, EVOO.'
  },
  {
    id: 'item-202',
    name: 'Diavola Piccante',
    category: 'Wood-Fired Pizza',
    price: 19.00,
    badge: 'Hot',
    isVeg: false,
    description: 'Artisanal spicy calabrese salami, chili honey, mozzarella.'
  },
  {
    id: 'item-203',
    name: 'Truffle Funghi Bianca',
    category: 'Wood-Fired Pizza',
    price: 20.50,
    badge: 'Bestseller',
    isVeg: true,
    description: 'Roasted cremini & oyster mushrooms, thyme, truffle cream base.'
  },
  {
    id: 'item-301',
    name: 'Herb-Crusted Atlantic Salmon',
    category: 'Mains',
    price: 24.00,
    badge: 'Healthy',
    isVeg: false,
    description: 'Pan-seared fillet, lemon caper butter, charred asparagus.'
  },
  {
    id: 'item-302',
    name: 'Penne Arrabbiata Fresca',
    category: 'Mains',
    price: 15.50,
    badge: 'Vegan',
    isVeg: true,
    description: 'Bronze-die pasta, roasted garlic, crushed red chili & parsley.'
  },
  {
    id: 'item-303',
    name: 'Slow-Braised Lamb Shank',
    category: 'Mains',
    price: 27.50,
    badge: 'Signature',
    isVeg: false,
    description: '6-hour rosemary jus reduction served over saffron mashed potatoes.'
  },
  {
    id: 'item-401',
    name: 'Artisanal Yuzu Sparkler',
    category: 'Beverages',
    price: 6.50,
    badge: 'Refreshing',
    isVeg: true,
    description: 'Japanese yuzu citrus, mint leaf, and botanical soda.'
  },
  {
    id: 'item-402',
    name: 'Single-Origin Cold Brew',
    category: 'Beverages',
    price: 5.50,
    badge: 'Craft',
    isVeg: true,
    description: '18-hour steeped Ethiopian roast over crystal ice.'
  },
  {
    id: 'item-501',
    name: 'Classic Espresso Tiramisu',
    category: 'Desserts',
    price: 9.50,
    badge: 'Must Try',
    isVeg: true,
    description: 'Mascarpone sabayon, savoiardi soaked in dark roast espresso.'
  },
  {
    id: 'item-502',
    name: 'Warm Belgian Lava Cake',
    category: 'Desserts',
    price: 10.50,
    badge: 'Hot',
    isVeg: true,
    description: '70% dark chocolate core with Madagascar vanilla bean gelato.'
  }
];

export const PROMO_CODES = {
  WELCOME10: {
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    minSubtotal: 0,
    description: '10% off any order'
  },
  FEAST20: {
    code: 'FEAST20',
    type: 'percent',
    value: 20,
    minSubtotal: 40,
    description: '20% off orders of $40.00 or more'
  },
  FLAT5: {
    code: 'FLAT5',
    type: 'fixed',
    value: 5.00,
    minSubtotal: 25,
    description: '$5.00 off orders of $25.00 or more'
  }
};

