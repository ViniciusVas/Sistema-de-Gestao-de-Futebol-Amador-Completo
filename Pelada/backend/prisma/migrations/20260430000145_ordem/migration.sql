/*
  Warnings:

  - A unique constraint covering the columns `[time_id,jogador_id]` on the table `TimeJogador` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TimePelada" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "TimeJogador_time_id_jogador_id_key" ON "TimeJogador"("time_id", "jogador_id");
