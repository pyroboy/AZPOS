import type { Category } from '$lib/types';

// Sample categories data
const sampleCategories: Category[] = [
	{
		id: 'seasoning',
		name: 'Seasoning',
		description: 'Spices, herbs, and blends to enhance the flavor of your dishes.'
	},
	{
		id: 'condiment',
		name: 'Condiment',
		description: 'Sauces, dressings, and spreads to accompany your meals.'
	},
	{
		id: 'dairy',
		name: 'Dairy',
		description: 'Milk, cheese, yogurt, and other milk-based products.'
	},
	{
		id: 'personal_care',
		name: 'Personal Care',
		description: 'Products for personal hygiene, grooming, and beauty.'
	},
	{
		id: 'laundry',
		name: 'Laundry',
		description: 'Detergents, softeners, and other supplies for washing clothes.'
	},
	{
		id: 'dish',
		name: 'Dish',
		description: 'Soaps and supplies for washing dishes.'
	},
	{
		id: 'beverage',
		name: 'Beverage',
		description: 'A variety of drinks, both hot and cold.'
	},
	{
		id: 'healthcare',
		name: 'Healthcare',
		description: 'Over-the-counter medicines and health-related products.'
	},
	{
		id: 'cooking_oil',
		name: 'Cooking Oil',
		description: 'Various types of oils for cooking and frying.'
	},
	{
		id: 'household',
		name: 'Household',
		description: 'Cleaning supplies and other items for home maintenance.'
	},
	{
		id: 'snack',
		name: 'Snack',
		description: 'Chips, crackers, cookies, and other ready-to-eat treats.'
	},
	{
		id: 'canned_meat',
		name: 'Canned Meat',
		description: 'Preserved meat products in cans for long shelf life.'
	},
	{
		id: 'coffee',
		name: 'Coffee',
		description: 'Ground, whole bean, and instant coffee.'
	},
	{
		id: 'oral_care',
		name: 'Oral Care',
		description: 'Toothpaste, toothbrushes, and other dental hygiene products.'
	},
	{
		id: 'alcohol',
		name: 'Alcohol',
		description: 'Beer, wine, and spirits.'
	},
	{
		id: 'baby_food',
		name: 'Baby Food',
		description: 'Food products specifically formulated for infants and toddlers.'
	},
	{
		id: 'spread',
		name: 'Spread',
		description: 'Jams, jellies, and other spreads for bread and crackers.'
	},
	{
		id: 'canned_fruit',
		name: 'Canned Fruit',
		description: 'Fruits preserved in cans.'
	},
	{
		id: 'pasta',
		name: 'Pasta',
		description: 'Dried pasta in various shapes and sizes.'
	},
	{
		id: 'sauce',
		name: 'Sauce',
		description: 'Cooking sauces and pasta sauces.'
	},
	{
		id: 'canned_vegetable',
		name: 'Canned Vegetable',
		description: 'Vegetables preserved in cans.'
	},
	{
		id: 'electronics',
		name: 'Electronics',
		description: 'Small electronic devices and accessories.'
	},
	{
		id: 'nutrition',
		name: 'Nutrition',
		description: 'Vitamins, supplements, and nutritional products.'
	},
	{
		id: 'baking',
		name: 'Baking',
		description: 'Flour, sugar, and other ingredients for baking.'
	},
	{
		id: 'noodles',
		name: 'Noodles',
		description: 'Instant and dried noodles.'
	},
	{
		id: 'paper',
		name: 'Paper',
		description: 'Paper towels, tissues, and other paper goods.'
	},
	{
		id: 'soup',
		name: 'Soup',
		description: 'Canned and instant soups.'
	},
	{
		id: 'cereal',
		name: 'Cereal',
		description: 'Breakfast cereals and grains.'
	},
	{
		id: 'tobacco',
		name: 'Tobacco',
		description: 'Cigarettes and other tobacco products.'
	},
	{
		id: 'dessert_mix',
		name: 'Dessert Mix',
		description: 'Packaged mixes for making desserts like cakes and brownies.'
	}
];

// Use $state for the categories array
export const categories = $state<Category[]>([]);

// Export functions that directly mutate the state
export function addCategory(category: Omit<Category, 'id'>) {
	const newCategory = {
		...category,
		id: `cat_${crypto.randomUUID()}`
	};
	categories.push(newCategory);
}

export function initializeSampleData() {
	categories.length = 0; // Clear existing categories
	categories.push(...sampleCategories);
}

export function setCategories(newCategories: Category[]) {
	categories.length = 0; // Clear existing categories
	categories.push(...newCategories);
}
