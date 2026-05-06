CREATE TYPE "company_amenity_enum" AS ENUM (
  'ACCEPTS_CHILDREN',
  'WIFI',
  'PARKING',
  'ACCEPTS_AUTISTIC',
  'ACCESSIBILITY',
  'PET_FRIENDLY'
);

ALTER TABLE "companies"
ADD COLUMN "amenities" "company_amenity_enum"[] NOT NULL DEFAULT ARRAY[]::"company_amenity_enum"[];
