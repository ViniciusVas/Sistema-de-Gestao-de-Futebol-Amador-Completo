-- CreateTable
CREATE TABLE "EstatisticaJogadorPelada" (
    "id" SERIAL NOT NULL,
    "jogadorId" INTEGER NOT NULL,
    "totalJogos" INTEGER NOT NULL DEFAULT 0,
    "totalGols" INTEGER NOT NULL DEFAULT 0,
    "totalAssistencias" INTEGER NOT NULL DEFAULT 0,
    "totalVitorias" INTEGER NOT NULL DEFAULT 0,
    "totalEmpates" INTEGER NOT NULL DEFAULT 0,
    "totalDerrotas" INTEGER NOT NULL DEFAULT 0,
    "mediaGols" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstatisticaJogadorPelada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstatisticaJogadorPelada_jogadorId_key" ON "EstatisticaJogadorPelada"("jogadorId");

-- AddForeignKey
ALTER TABLE "EstatisticaJogadorPelada" ADD CONSTRAINT "EstatisticaJogadorPelada_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Jogador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
