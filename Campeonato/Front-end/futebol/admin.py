from django.contrib import admin
from .models import Time, Jogador, Pelada, PeladaJogador, TimePelada, TimeJogador, EventoJogo, EstatisticaJogador, Campeonato, TimeCampeonato, JogadorTime, JogoCampeonato

@admin.register(Time)
class TimeAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cidade', 'criado_por')

@admin.register(Jogador)
class JogadorAdmin(admin.ModelAdmin):
    list_display = ('nome', 'nivel_estrelas', 'ativo', 'organizador')

@admin.register(Pelada)
class PeladaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'data_hora', 'local', 'status', 'organizador')

@admin.register(PeladaJogador)
class PeladaJogadorAdmin(admin.ModelAdmin):
    list_display = ('pelada', 'jogador', 'presenca_confirmada')

@admin.register(Campeonato)
class CampeonatoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'formato', 'status', 'organizador')

admin.site.register(TimePelada)
admin.site.register(TimeJogador)
admin.site.register(EventoJogo)
admin.site.register(EstatisticaJogador)
admin.site.register(TimeCampeonato)
admin.site.register(JogadorTime)
admin.site.register(JogoCampeonato)
