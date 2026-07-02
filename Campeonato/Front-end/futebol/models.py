from django.db import models
from django.conf import settings

class Time(models.Model):
    nome = models.CharField(max_length=255)
    cidade = models.CharField(max_length=255)
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def __str__(self):
        return self.nome

class Jogador(models.Model):
    nome = models.CharField(max_length=255)
    nivel_estrelas = models.FloatField(default=0.5)
    ativo = models.BooleanField(default=True)
    organizador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    data_cadastro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome

class Pelada(models.Model):
    STATUS_CHOICES = [
        ('agendada', 'Agendada'),
        ('em_andamento', 'Em Andamento'),
        ('encerrada', 'Encerrada'),
    ]
    titulo = models.CharField(max_length=255)
    data_hora = models.DateTimeField()
    local = models.CharField(max_length=255)
    duracao_minutos = models.IntegerField(default=60)
    jogadores_por_time = models.IntegerField(default=5)
    times_simultaneos = models.IntegerField(default=2)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    valor_por_jogador = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    config_pagamento_visivel = models.BooleanField(default=True)
    organizador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='agendada')
    times_jogando = models.IntegerField(default=2)
    placar_casa = models.IntegerField(default=0)
    placar_visitante = models.IntegerField(default=0)
    cronometro_segundos = models.IntegerField(default=0)
    cronometro_ativo = models.BooleanField(default=False)
    # proximas_ordem is handled by TimePelada.ordem and filtering times > times_jogando

    def __str__(self):
        return self.titulo

class PeladaJogador(models.Model):
    pelada = models.ForeignKey(Pelada, on_delete=models.CASCADE, related_name='inscritos')
    jogador = models.ForeignKey(Jogador, on_delete=models.CASCADE)
    ordem_chegada = models.IntegerField()
    presenca_confirmada = models.BooleanField(default=False)
    pagamento_confirmado = models.BooleanField(default=False)

    class Meta:
        ordering = ['ordem_chegada']
        unique_together = ('pelada', 'jogador')

class TimePelada(models.Model):
    pelada = models.ForeignKey(Pelada, on_delete=models.CASCADE, related_name='times')
    nome_time = models.CharField(max_length=50)
    cor = models.CharField(max_length=20, blank=True, null=True)
    soma_estrelas = models.FloatField(default=0.0)
    ordem = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.nome_time} - {self.pelada.titulo}"

class TimeJogador(models.Model):
    time_pelada = models.ForeignKey(TimePelada, on_delete=models.CASCADE, related_name='jogadores')
    jogador = models.ForeignKey(Jogador, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('time_pelada', 'jogador')

class EventoJogo(models.Model):
    TIPO_CHOICES = [
        ('gol', 'Gol'),
        ('assistencia', 'Assistência'),
        ('cartao_amarelo', 'Cartão Amarelo'),
        ('cartao_vermelho', 'Cartão Vermelho'),
    ]
    pelada = models.ForeignKey(Pelada, on_delete=models.CASCADE, related_name='eventos')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    time = models.ForeignKey(TimePelada, on_delete=models.SET_NULL, null=True, blank=True)
    jogador = models.ForeignKey(Jogador, on_delete=models.CASCADE, related_name='eventos_jogador')
    jogador_assistencia = models.ForeignKey(Jogador, on_delete=models.SET_NULL, null=True, blank=True, related_name='assistencias_jogador')
    minuto = models.IntegerField()
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tipo} - {self.jogador.nome} ({self.minuto}')"

class EstatisticaJogador(models.Model):
    jogador = models.OneToOneField(Jogador, on_delete=models.CASCADE, related_name='estatisticas')
    total_jogos = models.IntegerField(default=0)
    total_gols = models.IntegerField(default=0)
    total_assistencias = models.IntegerField(default=0)
    total_vitorias = models.IntegerField(default=0)
    total_empates = models.IntegerField(default=0)
    total_derrotas = models.IntegerField(default=0)

    @property
    def media_gols(self):
        if self.total_jogos == 0: return 0
        return self.total_gols / self.total_jogos

    def __str__(self):
        return f"Estatísticas de {self.jogador.nome}"

class Campeonato(models.Model):
    FORMATO_CHOICES = [
        ('pontos_corridos', 'Pontos Corridos'),
        ('grupos_mata', 'Grupos + Mata-Mata'),
    ]
    STATUS_CHOICES = [
        ('rascunho', 'Rascunho'),
        ('ativo', 'Ativo'),
        ('encerrada', 'Encerrado'),
    ]
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True, null=True)
    data_inicio = models.DateField()
    data_fim = models.DateField()
    formato = models.CharField(max_length=20, choices=FORMATO_CHOICES)
    jogos_ida_volta = models.BooleanField(default=False)
    organizador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='rascunho')

    def __str__(self):
        return self.nome

class TimeCampeonato(models.Model):
    campeonato = models.ForeignKey(Campeonato, on_delete=models.CASCADE, related_name='times')
    nome = models.CharField(max_length=255)
    escudo_url = models.URLField(blank=True, null=True)
    cor = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.nome} ({self.campeonato.nome})"

class JogadorTime(models.Model):
    time_campeonato = models.ForeignKey(TimeCampeonato, on_delete=models.CASCADE, related_name='jogadores')
    jogador = models.ForeignKey(Jogador, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('time_campeonato', 'jogador')

class JogoCampeonato(models.Model):
    STATUS_CHOICES = [
        ('agendado', 'Agendado'),
        ('realizado', 'Realizado'),
    ]
    campeonato = models.ForeignKey(Campeonato, on_delete=models.CASCADE, related_name='jogos')
    time_casa = models.ForeignKey(TimeCampeonato, on_delete=models.CASCADE, related_name='jogos_casa')
    time_visitante = models.ForeignKey(TimeCampeonato, on_delete=models.CASCADE, related_name='jogos_visitante')
    data_hora = models.DateTimeField()
    gols_casa = models.IntegerField(default=0)
    gols_visitante = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='agendado')

    def __str__(self):
        return f"{self.time_casa.nome} x {self.time_visitante.nome}"
