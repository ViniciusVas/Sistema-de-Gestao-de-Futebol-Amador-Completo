from django.core.management.base import BaseCommand
from core.models import TimeCampeonato, Partida, Campeonato


class Command(BaseCommand):
    help = 'Importa times ou partidas de um arquivo .txt'

    def add_arguments(self, parser):
        parser.add_argument('tipo', choices=['times', 'partidas'])
        parser.add_argument('arquivo')

    def handle(self, *args, **options):
        tipo = options['tipo']
        arquivo = options['arquivo']

        with open(arquivo, 'r', encoding='utf-8') as f:
            linhas = [l.strip() for l in f if l.strip() and not l.startswith('#')]

        if tipo == 'times':
            for linha in linhas:
                partes = [p.strip() for p in linha.split(',', 1)]
                nome, campeonato_id = partes
                try:
                    campeonato = Campeonato.objects.get(pk=int(campeonato_id))
                    TimeCampeonato.objects.create(nome=nome, campeonato=campeonato)
                except Campeonato.DoesNotExist:
                    self.stdout.write(f'Campeonato {campeonato_id} não encontrado. Linha ignorada: {linha}')
            self.stdout.write(f'{len(linhas)} times importados.')

        elif tipo == 'partidas':
            for linha in linhas:
                partes = [p.strip() for p in linha.split(',', 4)]
                casa_id, fora_id, gols_casa, gols_fora, status = partes
                try:
                    time_casa = TimeCampeonato.objects.get(pk=int(casa_id))
                    Partida.objects.create(
                        campeonato=time_casa.campeonato,
                        time_casa_id=int(casa_id),
                        time_fora_id=int(fora_id),
                        gols_casa=int(gols_casa),
                        gols_fora=int(gols_fora),
                        status=status,
                    )
                except TimeCampeonato.DoesNotExist:
                    self.stdout.write(f'Time {casa_id} não encontrado. Linha ignorada: {linha}')
            self.stdout.write(f'{len(linhas)} partidas importadas.')
