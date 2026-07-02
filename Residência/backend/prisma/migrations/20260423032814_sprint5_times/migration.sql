-- CreateTable
CREATE TABLE "TimePelada" (
    "id" SERIAL NOT NULL,
    "nome_time" TEXT NOT NULL,
    "cor" TEXT,
    "soma_estrelas" DOUBLE PRECISION NOT NULL,
    "pelada_id" INTEGER NOT NULL,

    CONSTRAINT "TimePelada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeJogador" (
    "id" SERIAL NOT NULL,
    "time_id" INTEGER NOT NULL,
    "jogador_id" INTEGER NOT NULL,

    CONSTRAINT "TimeJogador_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TimePelada" ADD CONSTRAINT "TimePelada_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "Pelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeJogador" ADD CONSTRAINT "TimeJogador_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "TimePelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeJogador" ADD CONSTRAINT "TimeJogador_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "Jogador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
