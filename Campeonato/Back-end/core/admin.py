from django.contrib import admin
from .models import Campeonato, TimeCampeonato, JogadorTime, JogoCampeonato, Jogador, Cartao, Gol, Time, JogadorTimeCampeonato


@admin.register(JogadorTimeCampeonato)
class JogadorTimeCampeonatoAdmin(admin.ModelAdmin):
    # Exibe jogadores inscritos em times de campeonato com busca por nome
    list_display = ('nome', 'time_campeonato', 'nivel_estrelas')
    search_fields = ('nome',)


# ── Inlines para JogoCampeonato ────────────────────────────────────────────────

class GolInline(admin.TabularInline):
    # Permite registrar gols diretamente na tela de edição de uma partida
    model = Gol
    extra = 1
    fields = ('jogador', 'assistencia', 'minuto')
    autocomplete_fields = ('jogador', 'assistencia')
    verbose_name = 'Gol / Artilheiro'
    verbose_name_plural = 'Gols / Artilharia'


class CartaoInline(admin.TabularInline):
    # Permite registrar cartões diretamente na tela de edição de uma partida
    model = Cartao
    extra = 1
    fields = ('jogador', 'tipo', 'minuto')
    autocomplete_fields = ('jogador',)


# ── Admins de eventos de jogo ──────────────────────────────────────────────────

@admin.register(Gol)
class GolAdmin(admin.ModelAdmin):
    # Lista gols com informação do campeonato; permite busca e filtro por partida
    list_display = ('jogador', 'jogo', 'minuto', 'campeonato_nome')
    list_filter = ('jogo__campeonato',)
    search_fields = ('jogador__nome',)
    autocomplete_fields = ('jogador', 'assistencia', 'jogo')
    ordering = ('jogo', 'minuto')

    @admin.display(description='Campeonato')
    def campeonato_nome(self, obj):
        return obj.jogo.campeonato.nome


@admin.register(Cartao)
class CartaoAdmin(admin.ModelAdmin):
    # Lista cartões com ícone colorido por tipo (amarelo/vermelho) e campeonato
    list_display = ('jogador', 'tipo_display', 'jogo', 'minuto', 'campeonato_nome')
    list_filter = ('tipo', 'jogo__campeonato')
    search_fields = ('jogador__nome',)
    autocomplete_fields = ('jogador', 'jogo')
    ordering = ('jogo', 'minuto')

    @admin.display(description='Tipo')
    def tipo_display(self, obj):
        cores = {'amarelo': '🟨', 'vermelho': '🟥'}
        return f"{cores.get(obj.tipo, '')} {obj.get_tipo_display()}"

    @admin.display(description='Campeonato')
    def campeonato_nome(self, obj):
        return obj.jogo.campeonato.nome


# ── Admins de entidades principais ────────────────────────────────────────────

@admin.register(Jogador)
class JogadorAdmin(admin.ModelAdmin):
    # Lista jogadores com filtros por status (ativo) e nível de estrelas
    list_display = ('nome', 'nivel_estrelas', 'ativo', 'organizador')
    list_filter = ('ativo', 'nivel_estrelas')
    search_fields = ('nome',)


@admin.register(JogoCampeonato)
class JogoCampeonatoAdmin(admin.ModelAdmin):
    # Gerencia partidas com placar inline de gols e cartões
    list_display = ('__str__', 'campeonato', 'rodada', 'fase', 'placar', 'status')
    list_filter = ('campeonato', 'fase', 'status')
    search_fields = ('campeonato__nome',)
    inlines = [GolInline, CartaoInline]
    fields = ('campeonato', 'time_casa_id', 'time_visitante_id', 'rodada', 'fase',
              'data', 'local', 'gols_casa', 'gols_fora', 'status')

    @admin.display(description='Placar')
    def placar(self, obj):
        if obj.gols_casa is not None and obj.gols_fora is not None:
            return f'{obj.gols_casa} x {obj.gols_fora}'
        return '—'


@admin.register(Campeonato)
class CampeonatoAdmin(admin.ModelAdmin):
    # Lista campeonatos com filtros por formato, status e modalidade
    list_display = ('nome', 'formato', 'modalidade', 'tipo', 'status', 'organizador')
    list_filter = ('formato', 'status', 'modalidade')
    search_fields = ('nome',)


@admin.register(TimeCampeonato)
class TimeCampeonatoAdmin(admin.ModelAdmin):
    # Lista inscrições de times com indicação do grupo (mata-mata)
    list_display = ('time', 'campeonato', 'grupo')
    list_filter = ('campeonato',)
    search_fields = ('time__nome', 'campeonato__nome')


@admin.register(JogadorTime)
class JogadorTimeAdmin(admin.ModelAdmin):
    # Lista vínculos entre jogadores e times de campeonato
    list_display = ('jogador', 'time')
    search_fields = ('jogador__nome',)


@admin.register(Time)
class TimeAdmin(admin.ModelAdmin):
    # Lista os times cadastrados por organizador
    list_display = ('nome', 'organizador')
    search_fields = ('nome',)
