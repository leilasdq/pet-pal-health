// Pet breeds organized by pet type for dropdown selection
// Sorted by popularity in Iran (most common first)

export const DOG_BREEDS = [
  'mixed', // Mixed breed / Unknown - most common
  'shih_tzu', // Very popular in Iran
  'pomeranian', // Very popular in Iran
  'german_shepherd', // Classic, popular
  'terrier', // Common
  'poodle', // Popular
  'maltese', // Popular small dog
  'chihuahua', // Popular small dog
  'golden_retriever', // Popular family dog
  'labrador', // Popular family dog
  'persian_dog', // سگ ایرانی - native breed
  'siberian_husky', // Increasingly popular
  'pug', // Popular small dog
  'french_bulldog', // Trendy breed
  'yorkshire_terrier', // Popular small dog
  'cocker_spaniel', // Popular
  'shiba_inu', // Trendy breed
  'beagle', // Popular
  'rottweiler', // Guard dog, popular
  'doberman', // Guard dog, popular
  'bulldog', // Popular
  'boxer', // Popular
  'dachshund', // Popular small dog
  'bichon_frise', // Popular small dog
  'japanese_spitz', // White fluffy, popular
  'samoyed', // White fluffy, trendy
  'chow_chow', // Distinctive, known
  'akita', // Known breed
  'border_collie', // Known breed
  'australian_shepherd', // Known breed
  'cavalier_king_charles', // Known breed
  'miniature_schnauzer', // Known breed
  'west_highland_terrier', // Known breed
  'great_dane', // Large breed, known
  'saint_bernard', // Large breed, known
  'bernese_mountain_dog', // Known breed
  'boston_terrier', // Known breed
  'shetland_sheepdog', // Less common
  'havanese', // Less common
  'papillon', // Less common
  'other', // For unlisted breeds
] as const;

export const CAT_BREEDS = [
  'mixed', // Mixed breed - most common (domestic cats)
  'domestic_shorthair', // DSH - extremely common
  'domestic_longhair', // DLH - very common
  'persian', // Very popular in Iran (origin country!)
  'british_shorthair', // Popular
  'scottish_fold', // Very popular, trendy
  'exotic_shorthair', // Popular (short-haired Persian)
  'siamese', // Well-known, popular
  'himalayan', // Popular (Persian-Siamese cross)
  'ragdoll', // Popular, trendy
  'maine_coon', // Popular large cat
  'turkish_angora', // Regional, known
  'turkish_van', // Regional, known
  'bengal', // Trendy breed
  'russian_blue', // Known breed
  'sphynx', // Distinctive, trendy
  'norwegian_forest', // Known breed
  'birman', // Known breed
  'burmese', // Known breed
  'abyssinian', // Known breed
  'oriental_shorthair', // Known breed
  'devon_rex', // Less common
  'cornish_rex', // Less common
  'american_shorthair', // Less common in Iran
  'ragamuffin', // Less common
  'somali', // Less common
  'chartreux', // Less common
  'korat', // Less common
  'manx', // Less common
  'balinese', // Less common
  'ocicat', // Less common
  'singapura', // Less common
  'bombay', // Less common
  'havana_brown', // Rare
  'egyptian_mau', // Rare
  'tonkinese', // Rare
  'other', // For unlisted breeds
] as const;

export type DogBreed = typeof DOG_BREEDS[number];
export type CatBreed = typeof CAT_BREEDS[number];
export type PetBreed = DogBreed | CatBreed;

export const getBreedsByPetType = (petType: 'dog' | 'cat'): readonly string[] => {
  return petType === 'dog' ? DOG_BREEDS : CAT_BREEDS;
};
