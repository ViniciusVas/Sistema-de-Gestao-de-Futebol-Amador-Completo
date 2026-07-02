import random
from django.db import models
from rest_framework import viewsets
from .models import Time, Jogador, Pelada, PeladaJogador, TimePelada, TimeJogador, EventoJogo, EstatisticaJogador, Campeonato, TimeCampeonato, JogoCampeonato
from .serializers import TimeSerializer, JogadorSerializer, PeladaSerializer, PeladaJogadorSerializer, TimePeladaSerializer, TimeJogadorSerializer, EventoJogoSerializer, EstatisticaJogadorSerializer, CampeonatoSerializer, TimeCampeonatoSerializer, JogoCampeonatoSerializer
from rest_framework.decorators import action
from rest_framework.response import Response

class TimeViewSet(viewsets.ModelViewSet):
    serializer_class = TimeSerializer

    def get_queryset(self):
        return Time.objects.filter(criado_por=self.request.user)

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

class JogadorViewSet(viewsets.ModelViewSet):
    serializer_class = JogadorSerializer

    def get_permissions(self):
        from rest_framework.permissions import IsAuthenticated, AllowAny
        if self.action == 'retrieve':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_object(self):
        pk = self.kwargs.get('pk')
        if pk and not pk.isdigit():
            from django.http import Http404
            raise Http404("ID do jogador inválido")
        return super().get_object()

    def get_queryset(self):
        if self.action == 'retrieve':
            return Jogador.objects.all()
        if not self.request.user.is_authenticated:
            return Jogador.objects.none()
        return Jogador.objects.filter(organizador=self.request.user)

    def perform_create(self, serializer):
        serializer.save(organizador=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=204)

class PeladaViewSet(viewsets.ModelViewSet):
    serializer_class = PeladaSerializer

    def get_queryset(self):
        return Pelada.objects.filter(organizador=self.request.user)

    def perform_create(self, serializer):
        serializer.save(organizador=self.request.user)

    @action(detail=True, methods=['post'], url_path='jogadores')
    def adicionar_jogador(self, request, pk=None):
        pelada = self.get_object()
        jogador_id = request.data.get('jogador_id')
        
        max_order = PeladaJogador.objects.filter(pelada=pelada).aggregate(models.Max('ordem_chegada'))['ordem_chegada__max'] or 0
        
        pelada_jogador, created = PeladaJogador.objects.get_or_create(
            pelada=pelada,
            jogador_id=jogador_id,
            defaults={'ordem_chegada': max_order + 1}
        )
        
        serializer = PeladaJogadorSerializer(pelada_jogador)
        return Response(serializer.data, status=201 if created else 200)

    @action(detail=True, methods=['delete'], url_path='jogadores/(?P<jogador_id>[^/.]+)')
    def remover_jogador(self, request, pk=None, jogador_id=None):
        pelada = self.get_object()
        PeladaJogador.objects.filter(pelada=pelada, jogador_id=jogador_id).delete()
        return Response(status=204)

    @action(detail=True, methods=['put'], url_path='jogadores/reordenar')
    def reordenar_jogadores(self, request, pk=None):
        pelada = self.get_object()
        ordem = request.data.get('ordem')
        
        for index, jogador_id in enumerate(ordem):
            PeladaJogador.objects.filter(pelada=pelada, jogador_id=jogador_id).update(ordem_chegada=index + 1)
            
        return Response({'message': 'Reordenado com sucesso'})

    @action(detail=True, methods=['put'], url_path='jogadores/confirmar-presenca')
    def confirmar_presenca(self, request, pk=None):
        pelada = self.get_object()
        jogador_id = request.data.get('jogador_id')
        confirmar = request.data.get('confirmar', True)
        
        PeladaJogador.objects.filter(pelada=pelada, jogador_id=jogador_id).update(presenca_confirmada=confirmar)
        return Response({'message': 'Presença atualizada'})

    @action(detail=True, methods=['put'], url_path='jogadores/confirmar-pagamento')
    def confirmar_pagamento(self, request, pk=None):
        pelada = self.get_object()
        jogador_id = request.data.get('jogador_id')
        confirmar = request.data.get('confirmar', True)
        
        PeladaJogador.objects.filter(pelada=pelada, jogador_id=jogador_id).update(pagamento_confirmado=confirmar)
        return Response({'message': 'Pagamento atualizado'})

    @action(detail=True, methods=['post'])
    def sortear(self, request, pk=None):
        pelada = self.get_object()
        tipo = request.query_params.get('tipo', 'aleatorio')
        
        inscritos = PeladaJogador.objects.filter(pelada=pelada, presenca_confirmada=True).select_related('jogador')
        if not inscritos.exists():
            return Response({'error': 'Nenhum jogador confirmado'}, status=400)
            
        jogadores = [i.jogador for i in inscritos]
        jog_per_team = pelada.jogadores_por_time
        
        if tipo == 'aleatorio':
            random.shuffle(jogadores)
        else:
            jogadores.sort(key=lambda x: x.nivel_estrelas, reverse=True)

        TimePelada.objects.filter(pelada=pelada).delete()
        
        num_times = (len(jogadores) + jog_per_team - 1) // jog_per_team
        times_data = []
        for i in range(num_times):
            t = TimePelada.objects.create(
                pelada=pelada,
                nome_time=f"Time {i+1}",
                ordem=i+1
            )
            times_data.append({'model': t, 'jogadores': [], 'sum': 0.0})

        if tipo == 'aleatorio':
            for idx, jog in enumerate(jogadores):
                t_idx = idx // jog_per_team
                times_data[t_idx]['jogadores'].append(jog)
                times_data[t_idx]['sum'] += jog.nivel_estrelas
        else:
            for jog in jogadores:
                avail = [t for t in times_data if len(t['jogadores']) < jog_per_team]
                if not avail: break
                target = min(avail, key=lambda x: x['sum'])
                target['jogadores'].append(jog)
                target['sum'] += jog.nivel_estrelas

        for td in times_data:
            td['model'].soma_estrelas = td['sum']
            td['model'].save()
            for jog in td['jogadores']:
                TimeJogador.objects.create(time_pelada=td['model'], jogador=jog)

        return Response(PeladaSerializer(pelada).data)

    @action(detail=True, methods=['get'])
    def times(self, request, pk=None):
        pelada = self.get_object()
        times = TimePelada.objects.filter(pelada=pelada).order_by('ordem')
        return Response(TimePeladaSerializer(times, many=True).data)

    @action(detail=True, methods=['post'], url_path='times/ajustar')
    def ajustar_times(self, request, pk=None):
        data = request.data.get('times')
        for t_data in data:
            time_obj = TimePelada.objects.get(id=t_data['id'])
            TimeJogador.objects.filter(time_pelada=time_obj).delete()
            
            soma = 0
            for j_id in t_data['jogadores']:
                jog = Jogador.objects.get(id=j_id)
                TimeJogador.objects.create(time_pelada=time_obj, jogador=jog)
                soma += jog.nivel_estrelas
            
            time_obj.soma_estrelas = soma
            time_obj.save()
            
        return Response({'message': 'Times ajustados'})

    @action(detail=True, methods=['post'], url_path='times/confirmar')
    def confirmar_times(self, request, pk=None):
        pelada = self.get_object()
        pelada.status = 'em_andamento'
        pelada.save()
        return Response({'message': 'Times confirmados e jogo iniciado'})

    @action(detail=True, methods=['post'], url_path='encerrar')
    def encerrar(self, request, pk=None):
        pelada = self.get_object()
        if pelada.status == 'encerrada':
            return Response({'message': 'Pelada já encerrada'})
            
        pelada.status = 'encerrada'
        pelada.save()

        # Update stats
        eventos = EventoJogo.objects.filter(pelada=pelada)
        for pj in PeladaJogador.objects.filter(pelada=pelada, presenca_confirmada=True):
            stats, _ = EstatisticaJogador.objects.get_or_create(jogador=pj.jogador)
            stats.total_jogos += 1
            stats.total_gols += eventos.filter(jogador=pj.jogador, tipo='gol').count()
            stats.total_assistencias += eventos.filter(jogador=pj.jogador, tipo='assistencia').count()
            stats.save()
            
        return Response({'message': 'Pelada encerrada e estatísticas atualizadas'})

    @action(detail=True, methods=['post'], url_path='substituir')
    def substituir(self, request, pk=None):
        pelada = self.get_object()
        sai_id = request.data.get('sai_id')
        entra_id = request.data.get('entra_id')
        
        tj_sai = TimeJogador.objects.filter(time_pelada__pelada=pelada, jogador_id=sai_id).first()
        if not tj_sai:
            return Response({'error': 'Jogador que sai não encontrado'}, status=400)
            
        time_dest = tj_sai.time_pelada
        tj_sai.delete()
        
        tj_entra = TimeJogador.objects.filter(time_pelada__pelada=pelada, jogador_id=entra_id).first()
        if tj_entra:
            tj_entra.delete()
            
        TimeJogador.objects.create(time_pelada=time_dest, jogador_id=entra_id)
        return Response({'message': 'Substituição realizada'})

    @action(detail=True, methods=['post'], url_path='rodar-times')
    def rodar_times(self, request, pk=None):
        time_id = request.data.get('time_id')
        pelada = self.get_object()
        
        time_to_move = TimePelada.objects.get(id=time_id, pelada=pelada)
        all_times = TimePelada.objects.filter(pelada=pelada).order_by('ordem')
        
        max_ordem = all_times.aggregate(models.Max('ordem'))['ordem__max'] or 0
        time_to_move.ordem = max_ordem + 1
        time_to_move.save()
        
        return Response({'message': 'Rotação concluída'})

class PeladaJogadorViewSet(viewsets.ModelViewSet):
    serializer_class = PeladaJogadorSerializer
    
    def get_queryset(self):
        return PeladaJogador.objects.filter(pelada__organizador=self.request.user)

class EventoJogoViewSet(viewsets.ModelViewSet):
    serializer_class = EventoJogoSerializer
    
    def get_queryset(self):
        return EventoJogo.objects.filter(pelada__organizador=self.request.user)

class CampeonatoViewSet(viewsets.ModelViewSet):
    serializer_class = CampeonatoSerializer

    def get_queryset(self):
        return Campeonato.objects.filter(organizador=self.request.user)

    def perform_create(self, serializer):
        serializer.save(organizador=self.request.user)

    @action(detail=True, methods=['post'])
    def gerar_tabela(self, request, pk=None):
        campeonato = self.get_object()
        times = list(campeonato.times.all())
        if len(times) < 2:
            return Response({'error': 'Necessário ao menos 2 times'}, status=400)
            
        JogoCampeonato.objects.filter(campeonato=campeonato).delete()
        
        # Simple Round Robin
        team_list = times[:]
        if len(team_list) % 2 != 0:
            team_list.append(None)
            
        n = len(team_list)
        for r in range(n - 1):
            for i in range(n // 2):
                t1 = team_list[i]
                t2 = team_list[n - 1 - i]
                if t1 and t2:
                    JogoCampeonato.objects.create(
                        campeonato=campeonato,
                        time_casa=t1,
                        time_visitante=t2,
                        data_hora=campeonato.data_inicio
                    )
                    if campeonato.jogos_ida_volta:
                        JogoCampeonato.objects.create(
                            campeonato=campeonato,
                            time_casa=t2,
                            time_visitante=t1,
                            data_hora=campeonato.data_inicio
                        )
            team_list = [team_list[0]] + [team_list[-1]] + team_list[1:-1]
            
        return Response({'message': 'Tabela gerada'})

class TimeCampeonatoViewSet(viewsets.ModelViewSet):
    serializer_class = TimeCampeonatoSerializer
    def get_queryset(self):
        return TimeCampeonato.objects.filter(campeonato__organizador=self.request.user)

class JogoCampeonatoViewSet(viewsets.ModelViewSet):
    serializer_class = JogoCampeonatoSerializer
    def get_queryset(self):
        return JogoCampeonato.objects.filter(campeonato__organizador=self.request.user)
