from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TimeViewSet, JogadorViewSet, PeladaViewSet, EventoJogoViewSet, CampeonatoViewSet, TimeCampeonatoViewSet, JogoCampeonatoViewSet, PeladaJogadorViewSet

router = DefaultRouter()
router.register(r'times', TimeViewSet, basename='time')
router.register(r'jogadores', JogadorViewSet, basename='jogador')
router.register(r'peladas', PeladaViewSet, basename='pelada')
router.register(r'pelada-jogadores', PeladaJogadorViewSet, basename='pelada-jogador')
router.register(r'eventos', EventoJogoViewSet, basename='evento')
router.register(r'campeonatos', CampeonatoViewSet, basename='campeonato')
router.register(r'times-campeonato', TimeCampeonatoViewSet, basename='time-campeonato')
router.register(r'jogos-campeonato', JogoCampeonatoViewSet, basename='jogo-campeonato')

urlpatterns = [
    path('', include(router.urls)),
]
