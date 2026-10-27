import type { Nutrients } from '../types';

// A small built-in reference list of common foods.
// Values are typical, rounded figures based on widely published averages
// (e.g. UK CoFID / USDA FoodData Central). Brands and recipes vary, so the app
// always labels these as approximate. Phase 2 can swap this for a live database.
export interface RefFood { name: string; serving: string; per: Nutrients; tags: string[] }

export const FOOD_SOURCE_NOTE =
  'Reference values are rounded typical figures drawn from public food-composition data (UK CoFID / USDA). Products vary, so treat them as estimates and edit when you know the label values.';

const f = (name: string, serving: string, kcal: number, protein: number, carbs: number, fat: number, fibre: number, tags: string[] = []): RefFood =>
  ({ name, serving, per: { kcal, protein, carbs, fat, fibre }, tags });

export const FOODS: RefFood[] = [
  f('Porridge oats, made with water', '40 g oats', 150, 5, 24, 3, 4, ['vegan', 'vegetarian', 'halal']),
  f('Porridge oats, made with semi-skimmed milk', '40 g oats + 200 ml milk', 250, 12, 34, 7, 4, ['vegetarian', 'halal']),
  f('Greek yoghurt, 0% fat', '170 g pot', 100, 17, 6, 0, 0, ['vegetarian', 'halal']),
  f('Greek yoghurt, full fat', '150 g', 195, 9, 6, 15, 0, ['vegetarian', 'halal']),
  f('Egg, large', '1 egg', 80, 7, 0, 6, 0, ['vegetarian', 'halal']),
  f('Wholemeal toast', '1 slice', 90, 4, 15, 1, 2.5, ['vegan', 'vegetarian', 'halal']),
  f('White bread', '1 slice', 95, 3, 18, 1, 1, ['vegan', 'vegetarian', 'halal']),
  f('Banana, medium', '1 banana', 105, 1, 27, 0, 3, ['vegan', 'vegetarian', 'halal']),
  f('Apple, medium', '1 apple', 95, 0, 25, 0, 4, ['vegan', 'vegetarian', 'halal']),
  f('Blueberries', '80 g', 45, 1, 11, 0, 2, ['vegan', 'vegetarian', 'halal']),
  f('Orange', '1 orange', 60, 1, 15, 0, 3, ['vegan', 'vegetarian', 'halal']),
  f('Chicken breast, cooked', '120 g', 200, 38, 0, 4, 0, ['halal-if-certified']),
  f('Turkey mince, 5% fat, cooked', '100 g', 170, 28, 0, 6, 0, []),
  f('Beef mince, 5% fat, cooked', '100 g', 175, 26, 0, 8, 0, []),
  f('Salmon fillet, baked', '120 g', 250, 26, 0, 16, 0, ['pescatarian', 'halal']),
  f('Tuna, canned in water', '1 can (110 g drained)', 120, 27, 0, 1, 0, ['pescatarian', 'halal']),
  f('Cod, baked', '140 g', 135, 30, 0, 1, 0, ['pescatarian', 'halal']),
  f('Tofu, firm', '100 g', 145, 15, 3, 9, 2, ['vegan', 'vegetarian', 'halal']),
  f('Chickpeas, canned, drained', '120 g', 140, 8, 20, 3, 6, ['vegan', 'vegetarian', 'halal']),
  f('Lentils, cooked', '150 g', 175, 13, 30, 1, 8, ['vegan', 'vegetarian', 'halal']),
  f('Black beans, cooked', '150 g', 195, 13, 35, 1, 12, ['vegan', 'vegetarian', 'halal']),
  f('Baked beans', 'half can (200 g)', 160, 10, 26, 1, 8, ['vegan', 'vegetarian', 'halal']),
  f('Cottage cheese', '100 g', 100, 12, 3, 4, 0, ['vegetarian', 'halal']),
  f('Cheddar cheese', '30 g', 125, 7, 0, 10, 0, ['vegetarian']),
  f('Semi-skimmed milk', '250 ml', 125, 9, 12, 4, 0, ['vegetarian', 'halal']),
  f('Oat drink', '250 ml', 115, 1, 17, 4, 2, ['vegan', 'vegetarian', 'halal']),
  f('Whey protein shake, with water', '1 scoop (30 g)', 120, 24, 3, 2, 0, ['vegetarian']),
  f('Pea protein shake, with water', '1 scoop (30 g)', 115, 23, 1, 2, 0, ['vegan', 'vegetarian', 'halal']),
  f('Basmati rice, cooked', '180 g', 235, 5, 50, 1, 1, ['vegan', 'vegetarian', 'halal']),
  f('Brown rice, cooked', '180 g', 220, 5, 46, 2, 3, ['vegan', 'vegetarian', 'halal']),
  f('Pasta, cooked', '200 g', 310, 11, 62, 2, 4, ['vegan', 'vegetarian', 'halal']),
  f('Potatoes, boiled', '200 g', 160, 4, 36, 0, 3, ['vegan', 'vegetarian', 'halal']),
  f('Sweet potato, baked', '1 medium (150 g)', 135, 2, 31, 0, 5, ['vegan', 'vegetarian', 'halal']),
  f('Couscous, cooked', '150 g', 170, 6, 35, 0, 2, ['vegan', 'vegetarian', 'halal']),
  f('Quinoa, cooked', '150 g', 180, 7, 32, 3, 4, ['vegan', 'vegetarian', 'halal']),
  f('Broccoli, steamed', '80 g', 28, 2, 3, 0, 2, ['vegan', 'vegetarian', 'halal']),
  f('Mixed salad leaves', '50 g', 10, 1, 1, 0, 1, ['vegan', 'vegetarian', 'halal']),
  f('Spinach, cooked', '80 g', 20, 2, 1, 0, 2, ['vegan', 'vegetarian', 'halal']),
  f('Mixed vegetables, frozen, cooked', '100 g', 55, 3, 8, 1, 4, ['vegan', 'vegetarian', 'halal']),
  f('Avocado', 'half avocado', 120, 1, 1, 12, 5, ['vegan', 'vegetarian', 'halal']),
  f('Hummus', '2 tbsp (30 g)', 90, 2, 4, 7, 2, ['vegan', 'vegetarian', 'halal']),
  f('Peanut butter', '1 tbsp (15 g)', 95, 4, 2, 8, 1, ['vegan', 'vegetarian', 'halal']),
  f('Almonds', '30 g', 175, 6, 2, 15, 4, ['vegan', 'vegetarian', 'halal']),
  f('Olive oil', '1 tbsp', 120, 0, 0, 14, 0, ['vegan', 'vegetarian', 'halal']),
  f('Butter', '10 g', 75, 0, 0, 8, 0, ['vegetarian']),
  f('Dark chocolate, 70%', '20 g', 120, 2, 7, 9, 2, ['vegetarian']),
  f('Milk chocolate bar', '45 g bar', 240, 3, 26, 14, 1, ['vegetarian']),
  f('Crisps', '25 g bag', 130, 2, 13, 8, 1, ['vegan', 'vegetarian']),
  f('Biscuit, digestive', '2 biscuits', 140, 2, 19, 6, 1, ['vegetarian']),
  f('Croissant', '1 croissant', 230, 5, 26, 12, 1, ['vegetarian']),
  f('Pizza, margherita', '2 slices', 480, 20, 58, 18, 3, ['vegetarian']),
  f('Chicken curry with rice (takeaway)', '1 portion', 750, 38, 85, 26, 5, []),
  f('Fish and chips', '1 portion', 850, 35, 90, 40, 7, ['pescatarian']),
  f('Burger in bun', '1 burger', 520, 28, 40, 27, 2, []),
  f('Chicken wrap', '1 wrap', 430, 30, 42, 15, 3, []),
  f('Falafel wrap', '1 wrap', 480, 14, 60, 20, 9, ['vegan', 'vegetarian', 'halal']),
  f('Sushi, mixed', '8 pieces', 350, 14, 60, 6, 2, ['pescatarian']),
  f('Granola', '45 g', 200, 5, 28, 8, 3, ['vegan', 'vegetarian', 'halal']),
  f('Protein bar', '1 bar (60 g)', 210, 20, 20, 7, 3, ['vegetarian']),
  f('Orange juice', '200 ml', 90, 1, 20, 0, 0, ['vegan', 'vegetarian', 'halal']),
  f('Latte, semi-skimmed', 'regular cup', 130, 8, 12, 5, 0, ['vegetarian', 'halal']),
  f('Cola', '330 ml can', 140, 0, 35, 0, 0, ['vegan', 'vegetarian', 'halal']),
  f('Beer, lager', '1 pint', 215, 2, 18, 0, 0, ['vegan']),
  f('Wine, red', '175 ml glass', 150, 0, 4, 0, 0, ['vegan']),
  f('Ice cream, vanilla', '2 scoops (100 g)', 200, 4, 24, 11, 0, ['vegetarian']),
];
