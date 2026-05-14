ALTER TABLE "companies"
  ADD COLUMN "evolution_instance_name" VARCHAR(255),
  ADD COLUMN "evolution_connection_status" VARCHAR(50),
  ADD COLUMN "evolution_connected_phone" VARCHAR(20),
  ADD COLUMN "evolution_last_qr" TEXT;

CREATE UNIQUE INDEX "companies_evolution_instance_name_key"
  ON "companies"("evolution_instance_name");
