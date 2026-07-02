-- CreateTable
CREATE TABLE "Pelada" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT,
    "data_hora" TIMESTAMP(3) NOT NULL,
    "local" TEXT NOT NULL,
    "duracao_minutos" INTEGER NOT NULL,
    "jogadores_por_time" INTEGER NOT NULL,
    "times_simultaneos" INTEGER NOT NULL,
    "valor_por_jogador" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'agendada',
    "organizador_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pelada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeladaJogador" (
    "id" SERIAL NOT NULL,
    "pelada_id" INTEGER NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "ordem_chegada" INTEGER NOT NULL,
    "presenca_confirmada" BOOLEAN NOT NULL DEFAULT false,
    "pagamento_confirmado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PeladaJogador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PeladaJogador_pelada_id_jogador_id_key" ON "PeladaJogador"("pelada_id", "jogador_id");

-- AddForeignKey
ALTER TABLE "Pelada" ADD CONSTRAINT "Pelada_organizador_id_fkey" FOREIGN KEY ("organizador_id") REFERENCES "Organizador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeladaJogador" ADD CONSTRAINT "PeladaJogador_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "Pelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeladaJogador" ADD CONSTRAINT "PeladaJogador_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "Jogador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
