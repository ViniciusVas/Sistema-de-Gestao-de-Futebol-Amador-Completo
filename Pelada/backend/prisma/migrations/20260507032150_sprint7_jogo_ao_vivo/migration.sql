-- AlterTable
ALTER TABLE "Pelada" ADD COLUMN     "cronometro_ativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "placar_time1" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "placar_time2" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tempo_restante" INTEGER;
