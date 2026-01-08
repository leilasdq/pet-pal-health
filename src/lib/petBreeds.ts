// Pet breeds organized by pet type for dropdown selection

export const DOG_BREEDS = [
  'mixed', // Mixed breed / Unknown
  'golden_retriever',
  'german_shepherd',
  'labrador',
  'bulldog',
  'poodle',
  'beagle',
  'rottweiler',
  'yorkshire_terrier',
  'boxer',
  'dachshund',
  'siberian_husky',
  'shih_tzu',
  'doberman',
  'great_dane',
  'chihuahua',
  'pomeranian',
  'border_collie',
  'maltese',
  'cocker_spaniel',
  'shetland_sheepdog',
  'boston_terrier',
  'pug',
  'akita',
  'samoyed',
  'shiba_inu',
  'chow_chow',
  'saint_bernard',
  'bernese_mountain_dog',
  'australian_shepherd',
  'french_bulldog',
  'cavalier_king_charles',
  'miniature_schnauzer',
  'west_highland_terrier',
  'bichon_frise',
  'havanese',
  'papillon',
  'japanese_spitz',
  'persian_dog', // سگ ایرانی
  'terrier',
  'other',
] as const;

export const CAT_BREEDS = [
  'mixed', // Mixed breed / DSH (Domestic Short Hair)
  'persian',
  'british_shorthair',
  'maine_coon',
  'siamese',
  'ragdoll',
  'bengal',
  'abyssinian',
  'scottish_fold',
  'russian_blue',
  'sphynx',
  'norwegian_forest',
  'exotic_shorthair',
  'birman',
  'burmese',
  'oriental_shorthair',
  'himalayan',
  'turkish_angora',
  'turkish_van',
  'devon_rex',
  'cornish_rex',
  'american_shorthair',
  'tonkinese',
  'ragamuffin',
  'somali',
  'chartreux',
  'korat',
  'manx',
  'balinese',
  'ocicat',
  'singapura',
  'bombay',
  'havana_brown',
  'egyptian_mau',
  'domestic_longhair',
  'domestic_shorthair',
  'other',
] as const;

export type DogBreed = typeof DOG_BREEDS[number];
export type CatBreed = typeof CAT_BREEDS[number];
export type PetBreed = DogBreed | CatBreed;

export const getBreedsByPetType = (petType: 'dog' | 'cat'): readonly string[] => {
  return petType === 'dog' ? DOG_BREEDS : CAT_BREEDS;
};
