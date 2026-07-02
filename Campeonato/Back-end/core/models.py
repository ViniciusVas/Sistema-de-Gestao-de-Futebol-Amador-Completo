import random
from itertools import permutations, combinations

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction
from django.db.models.signals import post_save
from django.dispatch import receiver


# ── Usuário personalizado ──────────────────────────────────────────────────────

class OrganizadorManager(BaseUserManager):
    # Manager customizado que usa e-mail como campo de login (em vez de username)
    def create_user(self, email, password=None, **extra_fields):
        email = self.normalize_email(email)
        user = self.model(email=email, username=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class Organizador(AbstractUser):
    # Usuário do sistema: dono e gestor dos campeonatos cadastrados
    email = models.EmailField(unique=True)
    objects = OrganizadorManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name']

    def __str__(self):
        return self.email


# ── Jogador ────────────────────────────────────────────────────────────────────

# Nível de 0,5 a 5,0 em incrementos de 0,5 (ex.: 1.0, 1.5, 2.0 …)
NIVEL_ESTRELAS_CHOICE = [(i / 2, str(i / 2)) for i in range(1, 10)]


class Jogador(models.Model):
    # Jogador pertencente ao banco de jogadores de um organizador
    nome = models.CharField(max_length=150)
    nivel_estrelas = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.5), MaxValueValidator(5.0)],
        choices=NIVEL_ESTRELAS_CHOICE,
    )
    ativo = models.BooleanField(default=True)
    organizador = models.ForeignKey(
        Organizador,
        on_delete=models.CASCADE,
        related_name='jogadores',
    )
    data_cadastro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.nome} ({self.nivel_estrelas}*)'


# ── Campeonato ─────────────────────────────────────────────────────────────────

class Campeonato(models.Model):
    FORMATO_CHOICES = [
        ('pontos_corridos', 'Pontos Corridos'),
        ('grupos_mata_mata', 'Grupos + Mata-Mata'),
    ]
    STATUS_CHOICES = [
        ('rascunho', 'Rascunho'),
        ('ativo', 'Ativo'),
        ('encerrado', 'Encerrado'),
    ]
    MODALIDADE_CHOICES = [
        ('futebol', 'Futebol'),
    ]
    TIPO_CHOICES = [
        ('pequeno', 'Pequeno'),
        ('medio', 'Médio'),
        ('grande', 'Grande'),
    ]
    # Número máximo de times por tamanho de campeonato (pontos corridos)
    TIMES_POR_TIPO = {
        'pequeno': 5,
        'medio': 10,
        'grande': 20,
    }
    # Número máximo de times por tamanho de campeonato (grupos + mata-mata)
    TIMES_POR_TIPO_MM = {
        'pequeno': 8,
        'medio': 16,
        'grande': 32,
    }

    nome = models.CharField(max_length=150)
    descricao = models.TextField(blank=True)
    regulamento = models.TextField(blank=True)
    data_inicio = models.DateField(null=True, blank=True)
    data_fim = models.DateField(null=True, blank=True)
    formato = models.CharField(max_length=20, choices=FORMATO_CHOICES, default='pontos_corridos')
    jogos_ida_volta = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='rascunho')
    modalidade = models.CharField(max_length=20, choices=MODALIDADE_CHOICES, default='futebol')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='pequeno')
    pontos_vitoria = models.PositiveIntegerField(default=3)
    pontos_empate = models.PositiveIntegerField(default=1)
    pontos_derrota = models.PositiveIntegerField(default=0)
    criterios_desempate = models.JSONField(default=list, blank=True)
    num_grupos = models.PositiveIntegerField(default=2)
    classificados_por_grupo = models.PositiveIntegerField(default=2)
    jogos_suspensao_vermelho = models.PositiveIntegerField(default=1)

    organizador = models.ForeignKey(
        Organizador,
        on_delete=models.CASCADE,
        related_name='campeonatos',
    )

    def __str__(self):
        return self.nome

    @transaction.atomic
    def gerar_calendario_completo(self, times_queryset):
        # Gera todos os confrontos (permutações para ida/volta, combinações para turno único)
        times = list(times_queryset)

        if self.jogos_ida_volta:
            confrontos = list(permutations(times, 2))
        else:
            confrontos = [(a, b) for a, b in combinations(times, 2)]

        jogos_para_criar = [
            JogoCampeonato(
                campeonato=self,
                time_casa=casa,
                time_fora=fora,
                status='agendada',
            )
            for casa, fora in confrontos
        ]

        JogoCampeonato.objects.bulk_create(jogos_para_criar)
        return len(jogos_para_criar)


# ── Times e elencos ────────────────────────────────────────────────────────────

class Time(models.Model):
    # Time permanente do organizador (pode ser inscrito em vários campeonatos)
    nome = models.CharField(max_length=150)
    escudo_url = models.URLField(blank=True)
    escudo = models.TextField(blank=True)
    cor = models.CharField(max_length=10, blank=True)
    organizador = models.ForeignKey(
        Organizador,
        on_delete=models.CASCADE,
        related_name='times',
    )

    def __str__(self):
        return self.nome


class JogadorDoTime(models.Model):
    # Vínculo de um jogador ao elenco fixo de um time (pré-campeonato)
    time = models.ForeignKey(Time, on_delete=models.CASCADE, related_name='elenco')
    jogador = models.ForeignKey(
        Jogador, on_delete=models.CASCADE, null=True, blank=True, related_name='membros_time'
    )
    nome = models.CharField(max_length=150)
    numero = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('time', 'jogador')

    def __str__(self):
        return f'{self.nome} ({self.time.nome})'


class JogadorTimeCampeonato(models.Model):
    # Jogador inscrito em um time dentro de um campeonato específico
    NIVEL_CHOICES = [(i / 2, str(i / 2)) for i in range(1, 11)]

    time_campeonato = models.ForeignKey(
        'TimeCampeonato',
        on_delete=models.CASCADE,
        related_name='elenco_campeonato',
    )
    nome = models.CharField(max_length=150)
    nivel_estrelas = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.5), MaxValueValidator(5.0)],
        choices=NIVEL_CHOICES,
    )

    class Meta:
        unique_together = [('time_campeonato', 'nome')]

    def __str__(self):
        return f'{self.nome} → {self.time_campeonato.time.nome}'


class TimeCampeonato(models.Model):
    # Inscrição de um time em um campeonato; armazena o grupo (A, B, …) quando aplicável
    time = models.ForeignKey(
        Time,
        on_delete=models.CASCADE,
        related_name='inscricoes',
    )
    campeonato = models.ForeignKey(
        Campeonato,
        on_delete=models.CASCADE,
        related_name='times',
    )

    grupo = models.CharField(max_length=5, blank=True, default='')

    class Meta:
        unique_together = ('time', 'campeonato')

    def __str__(self):
        return f'{self.time.nome} — {self.campeonato.nome}'


class JogadorTime(models.Model):
    # Vínculo legado entre Jogador e TimeCampeonato (substituído por JogadorTimeCampeonato)
    time = models.ForeignKey(
        TimeCampeonato,
        on_delete=models.CASCADE,
        related_name='jogadores_time',
    )
    jogador = models.ForeignKey(
        Jogador,
        on_delete=models.CASCADE,
        related_name='times_campeonato',
    )

    class Meta:
        unique_together = ('time', 'jogador')

    def __str__(self):
        return f'{self.jogador.nome} → {self.time.time.nome}'


# ── Eventos de jogo ────────────────────────────────────────────────────────────

class Gol(models.Model):
    # Registra um gol, o artilheiro, a assistência (opcional) e o minuto em que ocorreu
    jogador = models.ForeignKey(
        'JogadorTimeCampeonato',
        on_delete=models.CASCADE,
        related_name='gols',
    )
    assistencia = models.ForeignKey(
        'JogadorTimeCampeonato',
        on_delete=models.SET_NULL,
        related_name='assistencias',
        null=True, blank=True,
    )
    jogo = models.ForeignKey(
        'JogoCampeonato',
        on_delete=models.CASCADE,
        related_name='gols',
    )
    minuto = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = 'Gol'
        verbose_name_plural = 'Gols'

    def __str__(self):
        return f'Gol de {self.jogador.nome} (min. {self.minuto or "?"})'


class Cartao(models.Model):
    # Registra cartão amarelo ou vermelho aplicado a um jogador em uma partida
    TIPO_CHOICES = [
        ('amarelo', 'Amarelo'),
        ('vermelho', 'Vermelho'),
    ]

    jogador = models.ForeignKey(
        'JogadorTimeCampeonato',
        on_delete=models.CASCADE,
        related_name='cartoes',
    )
    jogo = models.ForeignKey(
        'JogoCampeonato',
        on_delete=models.CASCADE,
        related_name='cartoes',
    )
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    minuto = models.PositiveSmallIntegerField(null=True, blank=True)
    # False para os dois amarelos de uma expulsão por duplo amarelo (não somam no acúmulo)
    conta_acumulo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Cartão'
        verbose_name_plural = 'Cartões'

    def __str__(self):
        return f'{self.get_tipo_display()} — {self.jogador.nome} (min. {self.minuto or "?"})'


class Suspensao(models.Model):
    MOTIVO_CHOICES = [
        ('acumulo_amarelos', 'Acúmulo de Amarelos'),
        ('duplo_amarelo', 'Duplo Amarelo (Expulsão)'),
        ('vermelho_direto', 'Cartão Vermelho Direto'),
    ]

    jogador = models.ForeignKey(
        'JogadorTimeCampeonato',
        on_delete=models.CASCADE,
        related_name='suspensoes',
    )
    campeonato = models.ForeignKey(
        Campeonato,
        on_delete=models.CASCADE,
        related_name='suspensoes',
    )
    jogo_origem = models.ForeignKey(
        'JogoCampeonato',
        on_delete=models.CASCADE,
        related_name='suspensoes_geradas',
    )
    motivo = models.CharField(max_length=20, choices=MOTIVO_CHOICES)
    jogos_restantes = models.PositiveIntegerField(default=1)
    cumprida = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Suspensão'
        verbose_name_plural = 'Suspensões'

    def __str__(self):
        status = 'cumprida' if self.cumprida else f'{self.jogos_restantes} jogo(s) restante(s)'
        return f'Suspensão de {self.jogador.nome} — {self.get_motivo_display()} ({status})'


# ── Partida ────────────────────────────────────────────────────────────────────

class JogoCampeonato(models.Model):
    # Representa uma partida entre dois times, com placar, rodada, fase e status
    STATUS_CHOICE = [('agendada', 'Agendada'), ('realizada', 'Realizada')]
    FASE_CHOICES = [
        ('grupos', 'Fase de Grupos'),
        ('oitavas', 'Oitavas de Final'),
        ('quartas', 'Quartas de Final'),
        ('semi', 'Semifinal'),
        ('final', 'Final'),
    ]

    campeonato = models.ForeignKey(Campeonato, on_delete=models.CASCADE, related_name='jogos')
    time_casa_id = models.ForeignKey(TimeCampeonato, on_delete=models.CASCADE, related_name='jogos_casa')
    time_visitante_id = models.ForeignKey(TimeCampeonato, on_delete=models.CASCADE, related_name='jogos_fora')
    local = models.CharField(max_length=100, blank=True)
    gols_casa = models.PositiveIntegerField(null=True, blank=True)
    gols_fora = models.PositiveIntegerField(null=True, blank=True)
    data = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICE, default='agendada')
    rodada = models.PositiveIntegerField(null=True, blank=True)
    fase = models.CharField(max_length=10, choices=FASE_CHOICES, default='grupos')

    def __str__(self):
        return f'Rodada {self.rodada}: {self.time_casa_id.time.nome} x {self.time_visitante_id.time.nome}'


# ── Geração de calendário ──────────────────────────────────────────────────────

def gerar_pontos_corridos(campeonato):
    # Cria as partidas de um campeonato em pontos corridos usando algoritmo round-robin
    times = list(campeonato.times.all())
    random.shuffle(times)
    n = len(times)
    if n % 2 == 1:
        times.append(None)  # time fantasma para equilibrar rodadas com número ímpar
        n += 1
    total_rodadas = n - 1
    jogos = []
    times_rotacao = times[:]
    for rodada in range(total_rodadas):
        for i in range(n // 2):
            casa = times_rotacao[i]
            fora = times_rotacao[n - 1 - i]
            if casa and fora:
                jogos.append(JogoCampeonato(
                    campeonato=campeonato, time_casa_id=casa, time_visitante_id=fora,
                    rodada=rodada + 1,
                ))
                if campeonato.jogos_ida_volta:
                    jogos.append(JogoCampeonato(
                        campeonato=campeonato, time_casa_id=fora, time_visitante_id=casa,
                        rodada=rodada + 1 + total_rodadas,
                    ))
        times_rotacao.insert(1, times_rotacao.pop())
    JogoCampeonato.objects.bulk_create(jogos)
    return len(jogos)


def _distribuir_grupos(campeonato):
    # Atribui grupos aleatoriamente (A, B, C…) aos times sem gerar jogos ainda
    times = list(campeonato.times.all())
    random.shuffle(times)
    letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    num_grupos = campeonato.num_grupos
    times_por_grupo = len(times) // num_grupos
    for g in range(num_grupos):
        letra = letras[g]
        for t in times[g * times_por_grupo:(g + 1) * times_por_grupo]:
            t.grupo = letra
            t.save(update_fields=['grupo'])


def gerar_fase_grupos(campeonato):
    # Gera as partidas da fase de grupos usando round-robin dentro de cada grupo
    groups: dict = {}
    for tc in campeonato.times.order_by('grupo', 'id'):
        g = tc.grupo or 'A'
        groups.setdefault(g, []).append(tc)

    jogos = []
    for letra in sorted(groups.keys()):
        grupo_times = groups[letra]
        times_rot = grupo_times[:]
        n = len(times_rot)
        if n % 2 == 1:
            times_rot.append(None)
            n += 1
        total_rodadas = n - 1
        for rodada in range(total_rodadas):
            for i in range(n // 2):
                casa = times_rot[i]
                fora = times_rot[n - 1 - i]
                if casa and fora:
                    jogos.append(JogoCampeonato(
                        campeonato=campeonato, time_casa_id=casa, time_visitante_id=fora,
                        fase='grupos', rodada=rodada + 1,
                    ))
                    if campeonato.jogos_ida_volta:
                        jogos.append(JogoCampeonato(
                            campeonato=campeonato, time_casa_id=fora, time_visitante_id=casa,
                            fase='grupos', rodada=rodada + 1 + total_rodadas,
                        ))
            times_rot.insert(1, times_rot.pop())

    JogoCampeonato.objects.bulk_create(jogos)
    return len(jogos)


# ── Signal: geração automática de partidas ────────────────────────────────────

@receiver(post_save, sender=TimeCampeonato)
def auto_gerar_partidas(sender, instance, created, **kwargs):
    # Dispara automaticamente a geração de jogos ao atingir o número exato de times inscrito
    if not created:
        return

    camp = instance.campeonato

    if camp.jogos.exists():
        return  # tabela já gerada, não sobrescrever

    total = camp.times.count()

    if camp.formato == 'pontos_corridos':
        if total == Campeonato.TIMES_POR_TIPO.get(camp.tipo):
            gerar_pontos_corridos(camp)
            Campeonato.objects.filter(pk=camp.pk).update(status='ativo')

    elif camp.formato == 'grupos_mata_mata':
        limite = Campeonato.TIMES_POR_TIPO_MM.get(camp.tipo)
        if limite and total == limite and limite % camp.num_grupos == 0:
            _distribuir_grupos(camp)  # O organizador analisa os grupos antes que os jogos sejam gerados.
