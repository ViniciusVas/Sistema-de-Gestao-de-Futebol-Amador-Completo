-- AlterTable
ALTER TABLE "TimePelada" ADD COLUMN     "gols" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EventoJogo" (
    "id" SERIAL NOT NULL,
    "pelada_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "time_id" INTEGER NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "jogador_assistencia_id" INTEGER,
    "minuto" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoJogo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventoJogo" ADD CONSTRAINT "EventoJogo_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "Pelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoJogo" ADD CONSTRAINT "EventoJogo_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "TimePelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoJogo" ADD CONSTRAINT "EventoJogo_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "Jogador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoJogo" ADD CONSTRAINT "EventoJogo_jogador_assistencia_id_fkey" FOREIGN KEY ("jogador_assistencia_id") REFERENCES "Jogador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
