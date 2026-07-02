from django.urls import path

from .views import (
    JogadorDetailView, JogadorListCreateView, PerfilView, RecuperacaoSenhaView,
    RegistroView, ResetSenhaView, CampeonatoDetailView, CampeonatoListCreateView,
    TimeListCreateView, TimeDetailView,
    TimeCampeonatoListCreateView, TimeCampeonatoDetailView, JogadorTimeDetailView,
    JogadorTimeListCreateView, JogoListCreateView, JogoCampeonatoDetailView,
    GerarJogoCampeonatoView, GerarMataMataView, ClassificacaoView,
    ArtilhariaView, AssistenciasView, CartoesResumoView, SuspensoesView,
    JogadorTimeCampeonatoListCreateView, JogadorTimeCampeonatoDetailView,
    GolListCreateView, GolDetailView,
    CartaoListCreateView, CartaoDetailView,
    BoletimView, FinalizarJogoView,
    PublicCampeonatosView, PublicCampeonatoDetailView,
    ElencoListCreateView, ElencoDetailView,
)

urlpatterns = [
    # ── Autenticação ───────────────────────────────────────────────────────────
    path('register/', RegistroView.as_view(), name='register'),
    path('password/recovery/', RecuperacaoSenhaView.as_view(), name='password_recovery'),
    path('password/reset/', ResetSenhaView.as_view(), name='password_reset'),
    path('perfil/', PerfilView.as_view(), name='perfil'),

    # ── Jogadores (banco geral do organizador) ─────────────────────────────────
    path('jogadores/', JogadorListCreateView.as_view(), name='jogadores'),
    path('jogadores/<int:pk>/', JogadorDetailView.as_view(), name='jogador_detail'),

    # ── Campeonatos ────────────────────────────────────────────────────────────
    path('campeonatos/', CampeonatoListCreateView.as_view(), name='campeonatos'),
    path('campeonatos/<int:pk>/', CampeonatoDetailView.as_view(), name='campeonato_detail'),
    path('campeonatos/<int:pk>/gerar-partidas/', GerarJogoCampeonatoView.as_view(), name='gerar_partidas'),
    path('campeonatos/<int:pk>/gerar-mata-mata/', GerarMataMataView.as_view(), name='gerar_mata_mata'),
    path('campeonatos/<int:pk>/partidas/', JogoListCreateView.as_view(), name='partidas'),
    path('campeonatos/<int:pk>/classificacao/', ClassificacaoView.as_view(), name='classificacao'),
    path('campeonatos/<int:pk>/artilharia/', ArtilhariaView.as_view(), name='artilharia'),
    path('campeonatos/<int:pk>/assistencias/', AssistenciasView.as_view(), name='assistencias'),
    path('campeonatos/<int:pk>/cartoes/', CartoesResumoView.as_view(), name='cartoes'),
    path('campeonatos/<int:pk>/suspensoes/', SuspensoesView.as_view(), name='suspensoes'),

    # ── Partidas ───────────────────────────────────────────────────────────────
    path('partidas/<int:pk>/', JogoCampeonatoDetailView.as_view(), name='partida_detail'),
    path('partidas/<int:pk>/boletim/', BoletimView.as_view(), name='partida_boletim'),
    path('partidas/<int:pk>/finalizar/', FinalizarJogoView.as_view(), name='partida_finalizar'),
    path('partidas/<int:pk>/gols/', GolListCreateView.as_view(), name='partida_gols'),
    path('partidas/<int:pk>/cartoes/', CartaoListCreateView.as_view(), name='partida_cartoes'),

    # ── Gols e cartões individuais ─────────────────────────────────────────────
    path('gols/<int:pk>/', GolDetailView.as_view(), name='gol_detail'),
    path('cartoes/<int:pk>/', CartaoDetailView.as_view(), name='cartao_detail'),

    # ── Times ──────────────────────────────────────────────────────────────────
    path('times/', TimeListCreateView.as_view(), name='times'),
    path('times/<int:pk>/', TimeDetailView.as_view(), name='time_detail'),
    path('times/<int:pk>/elenco/', ElencoListCreateView.as_view(), name='elenco'),
    path('elenco/<int:pk>/', ElencoDetailView.as_view(), name='elenco_detail'),

    # ── Inscrições de times em campeonatos ─────────────────────────────────────
    path('inscricoes/', TimeCampeonatoListCreateView.as_view(), name='inscricoes'),
    path('inscricoes/<int:pk>/', TimeCampeonatoDetailView.as_view(), name='inscricao_detail'),
    path('inscricoes/<int:pk>/jogadores/', JogadorTimeCampeonatoListCreateView.as_view(), name='jogadores_inscricao'),

    # ── Vínculo jogador ↔ time (legado) ───────────────────────────────────────
    path('jogadores-time/', JogadorTimeListCreateView.as_view(), name='jogadortime'),
    path('jogadores-time/<int:pk>/', JogadorTimeDetailView.as_view(), name='jogadortime_detail'),

    # ── Jogador de campeonato (elenco específico por inscrição) ───────────────
    path('jogadores-campeonato/<int:pk>/', JogadorTimeCampeonatoDetailView.as_view(), name='jogador_campeonato_detail'),

    # ── Páginas públicas (RF65–RF67) ───────────────────────────────────────────
    path('public/campeonatos/', PublicCampeonatosView.as_view(), name='public_campeonatos'),
    path('public/campeonatos/<int:pk>/', PublicCampeonatoDetailView.as_view(), name='public_campeonato_detail'),
]
