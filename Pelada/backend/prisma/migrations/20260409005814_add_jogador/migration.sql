-- CreateTable
CREATE TABLE "Jogador" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "nivel_estrelas" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizadorId" INTEGER NOT NULL,

    CONSTRAINT "Jogador_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Jogador" ADD CONSTRAINT "Jogador_organizadorId_fkey" FOREIGN KEY ("organizadorId") REFERENCES "Organizador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
