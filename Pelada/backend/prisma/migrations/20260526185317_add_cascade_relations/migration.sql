-- DropForeignKey
ALTER TABLE "EventoJogo" DROP CONSTRAINT "EventoJogo_pelada_id_fkey";

-- DropForeignKey
ALTER TABLE "EventoJogo" DROP CONSTRAINT "EventoJogo_time_id_fkey";

-- DropForeignKey
ALTER TABLE "PeladaJogador" DROP CONSTRAINT "PeladaJogador_pelada_id_fkey";

-- DropForeignKey
ALTER TABLE "TimeJogador" DROP CONSTRAINT "TimeJogador_time_id_fkey";

-- DropForeignKey
ALTER TABLE "TimePelada" DROP CONSTRAINT "TimePelada_pelada_id_fkey";

-- AddForeignKey
ALTER TABLE "PeladaJogador" ADD CONSTRAINT "PeladaJogador_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimePelada" ADD CONSTRAINT "TimePelada_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeJogador" ADD CONSTRAINT "TimeJogador_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "TimePelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoJogo" ADD CONSTRAINT "EventoJogo_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoJogo" ADD CONSTRAINT "EventoJogo_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "TimePelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
