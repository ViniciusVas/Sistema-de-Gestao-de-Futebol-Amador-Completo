from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


# ── Helpers de campeonato ──────────────────────────────────────────────────────

def _campeonato_bloqueado(campeonato):
    # Retorna True se o campeonato não pode mais ser editado (primeira partida já iniciou)
    if campeonato.jogos.filter(status='realizada').exists():
        return True
    primeiro_jogo = campeonato.jogos.filter(data__isnull=False).order_by('data').first()
    if primeiro_jogo and primeiro_jogo.data <= timezone.now():
        return True
    return False


def _atualizar_status_campeonato(campeonato):
    # Marca o campeonato como 'encerrado' quando não restar nenhum jogo agendado
    if campeonato.status == 'encerrado':
        return
    if not campeonato.jogos.filter(status='agendada').exists():
        Campeonato.objects.filter(pk=campeonato.pk).update(status='encerrado')


from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Jogador, Campeonato, Time, TimeCampeonato, JogadorTime, JogoCampeonato,
    Gol, Cartao, Suspensao, JogadorTimeCampeonato, JogadorDoTime,
    gerar_pontos_corridos, gerar_fase_grupos,
)
from .serializers import (
    JogadorSerializer, PerfilSerializer, RecuperacaoSenhaSerializer,
    RegistroSerializer, ResetSenhaSerializer, CampeonatoSerializer,
    TimeSerializer, TimeCampeonatoSerializer, JogadorTimeSerializer,
    JogoCampeonatoSerializer, JogadorTimeCampeonatoSerializer,
    GolSerializer, CartaoSerializer, SuspensaoSerializer, JogadorDoTimeSerializer,
)

Organizador = get_user_model()


# ── Classificação ──────────────────────────────────────────────────────────────

def _calcular_tabela(inscricoes, jogos, campeonato):
    # Calcula pontos, saldo e estatísticas de cada time e ordena conforme os critérios de desempate
    tabela = []
    for inscricao in inscricoes:
        j = v = e = d = gm = gc = 0
        for jogo in jogos:
            if jogo.gols_casa is None or jogo.gols_fora is None:
                continue
            if jogo.time_casa_id == inscricao:
                j += 1
                gm += jogo.gols_casa
                gc += jogo.gols_fora
                if jogo.gols_casa > jogo.gols_fora:
                    v += 1
                elif jogo.gols_casa == jogo.gols_fora:
                    e += 1
                else:
                    d += 1
            elif jogo.time_visitante_id == inscricao:
                j += 1
                gm += jogo.gols_fora
                gc += jogo.gols_casa
                if jogo.gols_fora > jogo.gols_casa:
                    v += 1
                elif jogo.gols_fora == jogo.gols_casa:
                    e += 1
                else:
                    d += 1
        p = v * campeonato.pontos_vitoria + e * campeonato.pontos_empate + d * campeonato.pontos_derrota
        tabela.append({
            '_inscricao': inscricao,
            'time': inscricao.time.nome,
            'P': p, 'J': j, 'V': v, 'E': e, 'D': d, 'GM': gm, 'GC': gc, 'SG': gm - gc,
        })

    criterios = list(campeonato.criterios_desempate or [])

    def _pre_cd_key(entry):
        # Chave de ordenação para critérios anteriores ao confronto_direto
        key = [entry['P']]
        limit = criterios.index('confronto_direto') if 'confronto_direto' in criterios else len(criterios)
        for c in criterios[:limit]:
            if c == 'saldo_de_gols':
                key.append(entry['SG'])
            elif c == 'numero_de_vitorias':
                key.append(entry['V'])
        return tuple(key)

    def _post_cd_key(entry):
        # Chave de ordenação para critérios posteriores ao confronto_direto
        key = []
        start = criterios.index('confronto_direto') + 1 if 'confronto_direto' in criterios else 0
        for c in criterios[start:]:
            if c == 'saldo_de_gols':
                key.append(entry['SG'])
            elif c == 'numero_de_vitorias':
                key.append(entry['V'])
        return tuple(key)

    tabela.sort(key=_pre_cd_key, reverse=True)

    # confronto_direto — dentro de grupos empatados, re-ordena por resultado direto
    if 'confronto_direto' in criterios:
        from itertools import groupby
        tabela_novo = []
        for _, grupo_iter in groupby(tabela, key=_pre_cd_key):
            grupo_list = list(grupo_iter)
            if len(grupo_list) > 1:
                insc_ids = {e['_inscricao'].pk for e in grupo_list}
                cd_pts = {e['_inscricao'].pk: 0 for e in grupo_list}
                cd_sg  = {e['_inscricao'].pk: 0 for e in grupo_list}
                for jogo in jogos:
                    if jogo.gols_casa is None or jogo.gols_fora is None:
                        continue
                    c_id = jogo.time_casa_id.pk
                    v_id = jogo.time_visitante_id.pk
                    if c_id in insc_ids and v_id in insc_ids:
                        if jogo.gols_casa > jogo.gols_fora:
                            cd_pts[c_id] += campeonato.pontos_vitoria
                            cd_pts[v_id] += campeonato.pontos_derrota
                        elif jogo.gols_casa == jogo.gols_fora:
                            cd_pts[c_id] += campeonato.pontos_empate
                            cd_pts[v_id] += campeonato.pontos_empate
                        else:
                            cd_pts[v_id] += campeonato.pontos_vitoria
                            cd_pts[c_id] += campeonato.pontos_derrota
                        cd_sg[c_id] += jogo.gols_casa - jogo.gols_fora
                        cd_sg[v_id] += jogo.gols_fora - jogo.gols_casa
                grupo_list.sort(
                    key=lambda e: (
                        cd_pts[e['_inscricao'].pk],
                        cd_sg[e['_inscricao'].pk],
                    ) + _post_cd_key(e),
                    reverse=True,
                )
            tabela_novo.extend(grupo_list)
        tabela = tabela_novo
    elif not criterios:
        # Fallback quando nenhum critério de desempate está configurado
        tabela.sort(key=lambda x: (x['P'], x['SG'], x['GM']), reverse=True)

    return tabela


# ── Helpers do mata-mata ───────────────────────────────────────────────────────

def _determinar_fase_mm(n_times):
    # Retorna o nome da fase eliminatória de acordo com o número de times restantes
    if n_times <= 2:
        return 'final'
    if n_times <= 4:
        return 'semi'
    if n_times <= 8:
        return 'quartas'
    return 'oitavas'


def _standings_grupos(campeonato):
    # Retorna a classificação ordenada de cada grupo (dict grupo → lista de TimeCampeonato)
    inscricoes = list(campeonato.times.select_related('time').all())
    jogos = list(campeonato.jogos.filter(fase='grupos', status='realizada'))
    grupos = {}
    for i in inscricoes:
        grupos.setdefault(i.grupo or '', []).append(i)
    resultado = {}
    for grupo, membros in grupos.items():
        tabela = _calcular_tabela(membros, jogos, campeonato)
        resultado[grupo] = [entry['_inscricao'] for entry in tabela]
    return resultado


def _gerar_mm_primeira_rodada(campeonato):
    # Gera as partidas da primeira rodada eliminatória cruzando classificados dos grupos
    standings = _standings_grupos(campeonato)
    n = campeonato.classificados_por_grupo
    total = campeonato.num_grupos * n
    fase = _determinar_fase_mm(total)
    jogos = []
    # Dentro de cada grupo: 1º vs último classificado, 2º vs penúltimo, etc.
    for letra in sorted(standings.keys()):
        qualificados = standings[letra][:n]
        for i in range(n // 2):
            ta = qualificados[i]
            tb = qualificados[n - 1 - i]
            jogos.append(JogoCampeonato(
                campeonato=campeonato, time_casa_id=ta, time_visitante_id=tb,
                fase=fase, rodada=1,
            ))
    JogoCampeonato.objects.bulk_create(jogos)
    return len(jogos), fase


def _gerar_mm_proxima_rodada(campeonato):
    # Avança para a próxima rodada do mata-mata com base nos vencedores da rodada anterior
    jogos_mm = campeonato.jogos.exclude(fase='grupos')
    ultima_rodada = jogos_mm.order_by('-rodada').values_list('rodada', flat=True).first()
    jogos_ultima = list(jogos_mm.filter(rodada=ultima_rodada))
    ultima_fase = jogos_ultima[0].fase if jogos_ultima else ''

    if ultima_fase == 'final':
        return 0, 'campeao'
    if any(j.status == 'agendada' for j in jogos_ultima):
        return 0, None  # rodada ainda em andamento
    if any(j.gols_casa is None or j.gols_fora is None or j.gols_casa == j.gols_fora
           for j in jogos_ultima):
        return 0, None  # placar inválido ou empate

    vencedores = []
    for jogo in jogos_ultima:
        vencedor = jogo.time_casa_id if jogo.gols_casa > jogo.gols_fora else jogo.time_visitante_id
        vencedores.append(vencedor)

    if len(vencedores) < 2:
        return 0, 'campeao'

    fase = _determinar_fase_mm(len(vencedores))
    nova_rodada = ultima_rodada + 1
    jogos_novos = []
    for i in range(0, len(vencedores) - 1, 2):
        jogos_novos.append(JogoCampeonato(
            campeonato=campeonato,
            time_casa_id=vencedores[i],
            time_visitante_id=vencedores[i + 1],
            fase=fase,
            rodada=nova_rodada,
        ))
    JogoCampeonato.objects.bulk_create(jogos_novos)
    return len(jogos_novos), fase


def _auto_progressao_mm(campeonato):
    # Tenta avançar automaticamente as fases do mata-mata após a conclusão dos jogos de grupo
    jogos_grupos = campeonato.jogos.filter(fase='grupos')
    if not jogos_grupos.exists():
        return
    if jogos_grupos.filter(status='agendada').exists():
        return  # ainda há jogos de grupo pendentes

    jogos_mm = campeonato.jogos.exclude(fase='grupos')
    if not jogos_mm.exists():
        _gerar_mm_primeira_rodada(campeonato)
    else:
        _gerar_mm_proxima_rodada(campeonato)


# ── Views de autenticação ──────────────────────────────────────────────────────

class RegistroView(APIView):
    # Cria um novo organizador e retorna tokens JWT de acesso
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


class RecuperacaoSenhaView(APIView):
    # Envia por e-mail um link de redefinição de senha com UID e token temporário
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RecuperacaoSenhaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        user = Organizador.objects.get(email=email)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)
        reset_link = f"{settings.FRONTEND_URL}/reset-senha?uid={uid}&token={token}"

        send_mail(
            subject='Recuperação de senha',
            message=f'Clique no link para redefinir sua senha: {reset_link}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
        )

        return Response({'detail': 'Email de recuperação enviado.'}, status=status.HTTP_200_OK)


class ResetSenhaView(APIView):
    # Valida o token de redefinição e aplica a nova senha ao organizador
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetSenhaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Senha redefinida com sucesso.'}, status=status.HTTP_200_OK)


class PerfilView(APIView):
    # Retorna (GET) ou atualiza parcialmente (PATCH) os dados do organizador autenticado
    def get(self, request):
        serializer = PerfilSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = PerfilSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Views de jogadores ─────────────────────────────────────────────────────────

class JogadorListCreateView(APIView):
    # Lista todos os jogadores do organizador autenticado ou cria um novo
    def get(self, request):
        jogadores = Jogador.objects.filter(organizador=request.user)
        serializer = JogadorSerializer(jogadores, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = JogadorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organizador=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JogadorDetailView(APIView):
    # Detalha, atualiza ou remove um jogador específico do organizador
    def get_object(self, pk, user):
        try:
            return Jogador.objects.get(pk=pk, organizador=user)
        except Jogador.DoesNotExist:
            return None

    def get(self, request, pk):
        jogador = self.get_object(pk, request.user)
        if jogador is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(JogadorSerializer(jogador).data)

    def put(self, request, pk):
        jogador = self.get_object(pk, request.user)
        if jogador is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = JogadorSerializer(jogador, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        jogador = self.get_object(pk, request.user)
        if jogador is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        jogador.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Views de times ─────────────────────────────────────────────────────────────

class TimeListCreateView(APIView):
    # Lista os times do organizador autenticado ou cria um novo
    def get(self, request):
        times = Time.objects.filter(organizador=request.user)
        serializer = TimeSerializer(times, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TimeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organizador=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TimeDetailView(APIView):
    # Detalha, atualiza parcialmente ou remove um time do organizador
    def get_object(self, pk, user):
        try:
            return Time.objects.get(pk=pk, organizador=user)
        except Time.DoesNotExist:
            return None

    def get(self, request, pk):
        time = self.get_object(pk, request.user)
        if time is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(TimeSerializer(time).data)

    def patch(self, request, pk):
        time = self.get_object(pk, request.user)
        if time is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = TimeSerializer(time, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        time = self.get_object(pk, request.user)
        if time is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        time.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ElencoListCreateView(APIView):
    # Lista o elenco do time (GET) ou adiciona um jogador do banco ao elenco (POST)
    def _get_time(self, pk, user):
        try:
            return Time.objects.get(pk=pk, organizador=user)
        except Time.DoesNotExist:
            return None

    def get(self, request, pk):
        time = self._get_time(pk, request.user)
        if time is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        elenco = time.elenco.select_related('jogador').all()
        serializer = JogadorDoTimeSerializer(elenco, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        time = self._get_time(pk, request.user)
        if time is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        jogador_id = request.data.get('jogador_id')
        if not jogador_id:
            return Response({'jogador_id': 'Campo obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            jogador = Jogador.objects.get(pk=jogador_id, organizador=request.user)
        except Jogador.DoesNotExist:
            return Response({'jogador_id': 'Jogador não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if time.elenco.filter(jogador=jogador).exists():
            return Response({'jogador_id': 'Jogador já está no elenco.'}, status=status.HTTP_400_BAD_REQUEST)
        membro = JogadorDoTime.objects.create(time=time, jogador=jogador, nome=jogador.nome)
        return Response(JogadorDoTimeSerializer(membro).data, status=status.HTTP_201_CREATED)


class ElencoDetailView(APIView):
    # Remove um jogador do elenco fixo de um time (somente o organizador do time pode fazer isso)
    def delete(self, request, pk):
        try:
            membro = JogadorDoTime.objects.select_related('time').get(pk=pk)
        except JogadorDoTime.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if membro.time.organizador != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        membro.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Views de campeonatos ───────────────────────────────────────────────────────

class CampeonatoListCreateView(APIView):
    # Lista todos os campeonatos (qualquer usuário) ou cria um novo para o organizador autenticado
    def get(self, request):
        campeonatos = Campeonato.objects.all()
        serializer = CampeonatoSerializer(campeonatos, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CampeonatoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organizador=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CampeonatoDetailView(APIView):
    # Detalha, edita parcialmente ou exclui um campeonato; bloqueia edições após o início das partidas
    def get_object(self, pk, organizador=None):
        try:
            qs = Campeonato.objects.filter(pk=pk)
            if organizador:
                qs = qs.filter(organizador=organizador)
            return qs.get()
        except Campeonato.DoesNotExist:
            return None

    def get(self, request, pk):
        campeonato = self.get_object(pk)
        if campeonato is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = CampeonatoSerializer(campeonato)
        return Response(serializer.data)

    def patch(self, request, pk):
        campeonato = self.get_object(pk, organizador=request.user)
        if campeonato is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        # Alteração de status é sempre permitida, mesmo após o início das partidas
        only_status = set(request.data.keys()) == {'status'}
        if not only_status and _campeonato_bloqueado(campeonato):
            return Response(
                {'detail': 'Não é possível editar o campeonato após o início da primeira partida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = CampeonatoSerializer(campeonato, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        campeonato = self.get_object(pk, organizador=request.user)
        if campeonato is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        campeonato.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Views de inscrições (times × campeonatos) ──────────────────────────────────

class TimeCampeonatoListCreateView(APIView):
    # Lista inscrições (filtráveis por campeonato) ou inscreve um time num campeonato
    def get(self, request):
        qs = TimeCampeonato.objects.select_related('time')
        campeonato_id = request.query_params.get('campeonato')
        if campeonato_id:
            qs = qs.filter(campeonato_id=campeonato_id)
        serializer = TimeCampeonatoSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TimeCampeonatoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        campeonato = serializer.validated_data['campeonato']
        if campeonato.organizador != request.user:
            return Response(
                {'campeonato': 'Você não tem permissão para inscrever times neste campeonato.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        inscricao = serializer.save()
        # A geração automática de jogos é disparada via signal post_save em models.py
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TimeCampeonatoDetailView(APIView):
    # Detalha, atualiza (ex.: grupo) ou remove a inscrição de um time
    def get_object(self, pk):
        try:
            return TimeCampeonato.objects.get(pk=pk)
        except TimeCampeonato.DoesNotExist:
            return None

    def get(self, request, pk):
        time = self.get_object(pk)
        if time is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = TimeCampeonatoSerializer(time)
        return Response(serializer.data)

    def patch(self, request, pk):
        time = self.get_object(pk)
        if time is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if time.campeonato.organizador != request.user:
            return Response({'detail': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = TimeCampeonatoSerializer(time, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        time = self.get_object(pk)
        if time is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if time.campeonato.organizador != request.user:
            return Response({'detail': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        time.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Views de partidas ──────────────────────────────────────────────────────────

class JogoListCreateView(APIView):
    # Lista todas as partidas de um campeonato (público)
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            campeonato = Campeonato.objects.get(pk=pk)
        except Campeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        jogos = campeonato.jogos.all()
        serializer = JogoCampeonatoSerializer(jogos, many=True)
        return Response(serializer.data)


class GerarJogoCampeonatoView(APIView):
    # Gera manualmente o calendário de partidas de um campeonato (pontos corridos ou fase de grupos)
    def post(self, request, pk):
        try:
            campeonato = Campeonato.objects.get(pk=pk, organizador=request.user)
        except Campeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if campeonato.jogos.exists():
            return Response({'erro': 'Os jogos já foram gerados.'}, status=status.HTTP_400_BAD_REQUEST)

        if campeonato.formato == 'grupos_mata_mata':
            total_times = campeonato.times.count()
            limite = Campeonato.TIMES_POR_TIPO_MM[campeonato.tipo]
            num_grupos = campeonato.num_grupos
            if total_times != limite:
                return Response(
                    {'erro': f'O campeonato precisa de exatamente {limite} times. Atualmente tem {total_times}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if total_times % num_grupos != 0:
                return Response(
                    {'erro': f'O número de times ({total_times}) deve ser divisível por {num_grupos} grupos.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            n = gerar_fase_grupos(campeonato)
            Campeonato.objects.filter(pk=campeonato.pk).update(status='ativo')
            return Response({'jogos_gerados': n}, status=status.HTTP_201_CREATED)

        # pontos_corridos
        limite = Campeonato.TIMES_POR_TIPO[campeonato.tipo]
        total_times = campeonato.times.count()
        if total_times < limite:
            return Response(
                {'erro': f'O campeonato precisa de {limite} times. Atualmente tem {total_times}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        n = gerar_pontos_corridos(campeonato)
        Campeonato.objects.filter(pk=campeonato.pk).update(status='ativo')
        return Response({'jogos_gerados': n}, status=status.HTTP_201_CREATED)


class GerarMataMataView(APIView):
    # Gera a próxima rodada do mata-mata ou a primeira após a fase de grupos ser concluída
    def post(self, request, pk):
        try:
            campeonato = Campeonato.objects.get(pk=pk, organizador=request.user)
        except Campeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if campeonato.formato != 'grupos_mata_mata':
            return Response(
                {'erro': 'Este campeonato não usa o formato grupos + mata-mata.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        jogos_grupos = campeonato.jogos.filter(fase='grupos')
        if not jogos_grupos.exists():
            return Response(
                {'erro': 'Fase de grupos ainda não foi gerada. Use gerar-partidas primeiro.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if jogos_grupos.filter(status='agendada').exists():
            return Response(
                {'erro': 'Ainda há jogos da fase de grupos não finalizados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        jogos_mm = campeonato.jogos.exclude(fase='grupos')
        if not jogos_mm.exists():
            n, fase = _gerar_mm_primeira_rodada(campeonato)
            return Response({'jogos_gerados': n, 'fase': fase}, status=status.HTTP_201_CREATED)

        ultima_rodada = jogos_mm.order_by('-rodada').values_list('rodada', flat=True).first()
        jogos_ultima = list(jogos_mm.filter(rodada=ultima_rodada))
        ultima_fase = jogos_ultima[0].fase if jogos_ultima else ''

        if ultima_fase == 'final':
            return Response({'erro': 'O campeonato já tem um campeão!'}, status=status.HTTP_400_BAD_REQUEST)
        if any(j.status == 'agendada' for j in jogos_ultima):
            return Response({'erro': 'Ainda há jogos da rodada anterior não finalizados.'}, status=status.HTTP_400_BAD_REQUEST)
        if jogos_mm.filter(rodada=ultima_rodada + 1).exists():
            return Response({'erro': 'A próxima rodada já foi gerada.'}, status=status.HTTP_400_BAD_REQUEST)

        n, fase = _gerar_mm_proxima_rodada(campeonato)
        if fase is None:
            return Response({'erro': 'Há jogos com placar inválido ou empate.'}, status=status.HTTP_400_BAD_REQUEST)
        if fase == 'campeao':
            return Response({'erro': 'Apenas um time restante — campeão determinado!'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'jogos_gerados': n, 'fase': fase}, status=status.HTTP_201_CREATED)


class JogoCampeonatoDetailView(APIView):
    # Detalha ou atualiza uma partida; detecta conflito de horário e sugere alternativas
    def get_object(self, pk):
        try:
            return JogoCampeonato.objects.get(pk=pk)
        except JogoCampeonato.DoesNotExist:
            return None

    def get(self, request, pk):
        jogos = self.get_object(pk)
        if jogos is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(JogoCampeonatoSerializer(jogos).data)

    def patch(self, request, pk):
        jogo = self.get_object(pk)
        if jogo is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if jogo.campeonato.organizador != request.user:
            return Response({'detail': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        # verifica conflito de horário ao agendar a partida (janela de 90 min)
        nova_data_str = request.data.get('data')
        if nova_data_str:
            from datetime import timedelta
            from django.utils.dateparse import parse_datetime
            from django.db.models import Q
            nova_data = parse_datetime(str(nova_data_str))
            if nova_data:
                margem = timedelta(minutes=90)
                times_insc = [jogo.time_casa_id, jogo.time_visitante_id]
                conflitos = JogoCampeonato.objects.filter(
                    campeonato=jogo.campeonato,
                    data__isnull=False,
                    data__gte=nova_data - margem,
                    data__lte=nova_data + margem,
                ).exclude(pk=pk).filter(
                    Q(time_casa_id__in=times_insc) | Q(time_visitante_id__in=times_insc)
                )
                if conflitos.exists():
                    # Sugere até 5 horários alternativos em intervalos de 2 h
                    sugestoes = []
                    candidato = nova_data + timedelta(hours=2)
                    tentativas = 0
                    while len(sugestoes) < 5 and tentativas < 100:
                        tentativas += 1
                        sem_conflito = not JogoCampeonato.objects.filter(
                            campeonato=jogo.campeonato,
                            data__isnull=False,
                            data__gte=candidato - margem,
                            data__lte=candidato + margem,
                        ).exclude(pk=pk).filter(
                            Q(time_casa_id__in=times_insc) | Q(time_visitante_id__in=times_insc)
                        ).exists()
                        if sem_conflito:
                            sugestoes.append(candidato.isoformat())
                        candidato += timedelta(hours=2)
                    return Response({
                        'conflito': True,
                        'mensagem': 'Um dos times já possui jogo neste horário (janela de 90 min).',
                        'sugestoes': sugestoes,
                    }, status=status.HTTP_409_CONFLICT)

        status_anterior = jogo.status
        serializer = JogoCampeonatoSerializer(jogo, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        jogo = serializer.save()

        if status_anterior != 'realizada' and jogo.status == 'realizada':
            _descontar_suspensoes(jogo)

        if jogo.campeonato.formato == 'grupos_mata_mata':
            _auto_progressao_mm(jogo.campeonato)

        _atualizar_status_campeonato(jogo.campeonato)
        return Response(serializer.data)


# ── Views de classificação e estatísticas ─────────────────────────────────────

class ClassificacaoView(APIView):
    # Retorna a tabela de classificação (pontos corridos) ou por grupos (mata-mata) — público
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            campeonato = Campeonato.objects.get(pk=pk)
        except Campeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        inscricoes = list(campeonato.times.select_related('time').all())

        if campeonato.formato == 'pontos_corridos':
            jogos = list(campeonato.jogos.filter(status='realizada'))
            tabela = _calcular_tabela(inscricoes, jogos, campeonato)
            for i, entry in enumerate(tabela, start=1):
                entry['classificacao'] = i
                del entry['_inscricao']
            return Response(tabela)

        # grupos_mata_mata: retorna classificação separada por grupo
        jogos_grupos = list(campeonato.jogos.filter(fase='grupos', status='realizada'))
        grupos = {}
        for inscricao in inscricoes:
            g = inscricao.grupo or 'Sem Grupo'
            grupos.setdefault(g, [])
            grupos[g].append(inscricao)

        resultado = {}
        for grupo in sorted(grupos.keys()):
            tabela = _calcular_tabela(grupos[grupo], jogos_grupos, campeonato)
            for i, entry in enumerate(tabela, start=1):
                entry['classificacao'] = i
                del entry['_inscricao']
            resultado[grupo] = tabela

        return Response(resultado)


class ArtilhariaView(APIView):
    # Ranking de gols por jogador no campeonato, com média e assistências — público
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            campeonato = Campeonato.objects.get(pk=pk)
        except Campeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        from django.db.models import Count
        artilheiros = (
            Gol.objects
            .filter(jogo__campeonato=campeonato)
            .values('jogador__id', 'jogador__nome', 'jogador__time_campeonato__time__nome')
            .annotate(gols=Count('id'), jogos_marcou=Count('jogo', distinct=True))
            .order_by('-gols')
        )
        # Mapa auxiliar de assistências por jogador 
        assistentes = (
            Gol.objects
            .filter(jogo__campeonato=campeonato, assistencia__isnull=False)
            .values('assistencia__id')
            .annotate(assists=Count('id'))
        )
        assists_map = {a['assistencia__id']: a['assists'] for a in assistentes}

        return Response([
            {
                'jogador_id':   a['jogador__id'],
                'nome':         a['jogador__nome'],
                'time':         a['jogador__time_campeonato__time__nome'],
                'gols':         a['gols'],
                'jogos':        a['jogos_marcou'],
                'media':        round(a['gols'] / a['jogos_marcou'], 2) if a['jogos_marcou'] else 0,
                'assistencias': assists_map.get(a['jogador__id'], 0),
            }
            for a in artilheiros
        ])


class AssistenciasView(APIView):
    # Ranking de assistências por jogador no campeonato — público 
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            campeonato = Campeonato.objects.get(pk=pk)
        except Campeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        from django.db.models import Count
        ranking = (
            Gol.objects
            .filter(jogo__campeonato=campeonato, assistencia__isnull=False)
            .values('assistencia__id', 'assistencia__nome', 'assistencia__time_campeonato__time__nome')
            .annotate(assistencias=Count('id'), jogos=Count('jogo', distinct=True))
            .order_by('-assistencias')
        )
        return Response([
            {
                'jogador_id': r['assistencia__id'],
                'nome':       r['assistencia__nome'],
                'time':       r['assistencia__time_campeonato__time__nome'],
                'assistencias': r['assistencias'],
                'jogos':        r['jogos'],
            }
            for r in ranking
        ])


class CartoesResumoView(APIView):
    # Resumo de cartões e suspensões por jogador no campeonato — público
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            campeonato = Campeonato.objects.get(pk=pk)
        except Campeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        from django.db.models import Count, Q
        resumo = (
            Cartao.objects
            .filter(jogo__campeonato=campeonato)
            .values('jogador__id', 'jogador__nome', 'jogador__time_campeonato__time__nome')
            .annotate(
                amarelos_total=Count('id', filter=Q(tipo='amarelo')),
                amarelos_acumulo=Count('id', filter=Q(tipo='amarelo', conta_acumulo=True)),
                vermelhos_diretos=Count('id', filter=Q(tipo='vermelho')),
            )
            .order_by('-vermelhos_diretos', '-amarelos_total')
        )

        # Mapa de suspensões pendentes e cumpridas por jogador
        suspensoes_qs = Suspensao.objects.filter(campeonato=campeonato).values(
            'jogador_id', 'cumprida', 'motivo', 'jogos_restantes'
        )
        suspensoes_pendentes: dict = {}
        suspensoes_cumpridas: dict = {}
        expulsoes: dict = {}
        for s in suspensoes_qs:
            jid = s['jogador_id']
            if s['motivo'] == 'duplo_amarelo':
                expulsoes[jid] = expulsoes.get(jid, 0) + 1
            if not s['cumprida']:
                suspensoes_pendentes[jid] = suspensoes_pendentes.get(jid, 0) + 1
            else:
                suspensoes_cumpridas[jid] = suspensoes_cumpridas.get(jid, 0) + 1

        return Response([
            {
                'jogador_id':           r['jogador__id'],
                'nome':                 r['jogador__nome'],
                'time':                 r['jogador__time_campeonato__time__nome'],
                # campos mantidos para compatibilidade com o frontend
                'amarelos':             r['amarelos_total'],
                'vermelhos':            r['vermelhos_diretos'],
                # campos novos com detalhamento
                'amarelos_total':       r['amarelos_total'],
                'amarelos_acumulo':     r['amarelos_acumulo'],
                'vermelhos_diretos':    r['vermelhos_diretos'],
                'expulsoes':            expulsoes.get(r['jogador__id'], 0),
                'suspenso':             suspensoes_pendentes.get(r['jogador__id'], 0) > 0,
                'suspensoes_pendentes': suspensoes_pendentes.get(r['jogador__id'], 0),
                'suspensoes_cumpridas': suspensoes_cumpridas.get(r['jogador__id'], 0),
            }
            for r in resumo
        ])


class SuspensoesView(APIView):
    # Lista todas as suspensões de um campeonato, filtráveis por pendentes/cumpridas — público
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            campeonato = Campeonato.objects.get(pk=pk)
        except Campeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        qs = Suspensao.objects.filter(campeonato=campeonato).select_related(
            'jogador__time_campeonato__time', 'jogo_origem'
        ).order_by('-id')

        pendente = request.query_params.get('pendente')
        if pendente == 'true':
            qs = qs.filter(cumprida=False)
        elif pendente == 'false':
            qs = qs.filter(cumprida=True)

        return Response(SuspensaoSerializer(qs, many=True).data)


# ── Views de vínculo jogador ↔ time no campeonato ─────────────────────────────

class JogadorTimeListCreateView(APIView):
    # Lista ou cria vínculos jogador–time dentro de campeonatos do organizador
    def get(self, request):
        jogadores = JogadorTime.objects.filter(time__campeonato__organizador=request.user)
        serializer = JogadorTimeSerializer(jogadores, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = JogadorTimeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JogadorTimeDetailView(APIView):
    # Detalha, atualiza ou remove o vínculo de um jogador com um time de campeonato
    def get_object(self, pk, user):
        try:
            return JogadorTime.objects.get(pk=pk, time__campeonato__organizador=user)
        except JogadorTime.DoesNotExist:
            return None

    def get(self, request, pk):
        jogadortime = self.get_object(pk, request.user)
        if jogadortime is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = JogadorTimeSerializer(jogadortime)
        return Response(serializer.data)

    def patch(self, request, pk):
        jogadortime = self.get_object(pk, request.user)
        if jogadortime is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = JogadorTimeSerializer(jogadortime, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        jogadortime = self.get_object(pk, request.user)
        if jogadortime is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        jogadortime.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JogadorTimeCampeonatoListCreateView(APIView):
    # Lista ou adiciona jogadores ao elenco de um time inscrito num campeonato específico
    def get(self, request, pk):
        try:
            inscricao = TimeCampeonato.objects.get(pk=pk)
        except TimeCampeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        jogadores = inscricao.elenco_campeonato.all().order_by('nome')
        return Response(JogadorTimeCampeonatoSerializer(jogadores, many=True).data)

    def post(self, request, pk):
        try:
            inscricao = TimeCampeonato.objects.get(pk=pk, campeonato__organizador=request.user)
        except TimeCampeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        data = {**request.data, 'time_campeonato': pk}
        serializer = JogadorTimeCampeonatoSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JogadorTimeCampeonatoDetailView(APIView):
    # Atualiza (nível/nome) ou remove um jogador do elenco de campeonato
    def get_object(self, pk, user):
        try:
            return JogadorTimeCampeonato.objects.get(
                pk=pk, time_campeonato__campeonato__organizador=user
            )
        except JogadorTimeCampeonato.DoesNotExist:
            return None

    def patch(self, request, pk):
        jogador = self.get_object(pk, request.user)
        if jogador is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = JogadorTimeCampeonatoSerializer(jogador, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        jogador = self.get_object(pk, request.user)
        if jogador is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        jogador.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Páginas públicas ───────────────────────────────────────────────

class PublicCampeonatosView(APIView):
    # Lista todos os campeonatos não rascunho para visitantes não autenticados
    permission_classes = [AllowAny]

    def get(self, request):
        campeonatos = Campeonato.objects.exclude(status='rascunho').order_by('-id')
        return Response(CampeonatoSerializer(campeonatos, many=True).data)


class PublicCampeonatoDetailView(APIView):
    # Exibe os detalhes de um campeonato público específico
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            campeonato = Campeonato.objects.exclude(status='rascunho').get(pk=pk)
        except Campeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(CampeonatoSerializer(campeonato).data)


# ── Boletim / Gols / Cartões  ──────────────────────────────────────

def _recalcular_placar(jogo):
    # Reconta os gols registrados e atualiza os campos gols_casa/gols_fora da partida
    gols_casa = Gol.objects.filter(jogo=jogo, jogador__time_campeonato=jogo.time_casa_id).count()
    gols_fora = Gol.objects.filter(jogo=jogo, jogador__time_campeonato=jogo.time_visitante_id).count()
    JogoCampeonato.objects.filter(pk=jogo.pk).update(gols_casa=gols_casa, gols_fora=gols_fora)


def _auto_popular_elenco(time_campeonato):
    # Importa JogadorDoTime → JogadorTimeCampeonato quando o elenco do campeonato ainda está vazio
    if time_campeonato.elenco_campeonato.exists():
        return
    for jdt in JogadorDoTime.objects.filter(time=time_campeonato.time).order_by('nome'):
        nivel = jdt.jogador.nivel_estrelas if jdt.jogador else 3.0
        JogadorTimeCampeonato.objects.get_or_create(
            time_campeonato=time_campeonato,
            nome=jdt.nome,
            defaults={'nivel_estrelas': nivel},
        )


# ── Lógica de cartões e suspensões ────────────────────────────────────────────

def _amarelos_acumulados(jogador, campeonato):
    # Conta amarelos válidos para acúmulo desde a última suspensão de acúmulo cumprida
    ultima_cumprida = (
        Suspensao.objects
        .filter(jogador=jogador, campeonato=campeonato, motivo='acumulo_amarelos', cumprida=True)
        .order_by('-id')
        .first()
    )
    qs = Cartao.objects.filter(
        jogador=jogador, jogo__campeonato=campeonato,
        tipo='amarelo', conta_acumulo=True,
    )
    if ultima_cumprida:
        qs = qs.filter(jogo_id__gt=ultima_cumprida.jogo_origem_id)
    return qs.count()


def _processar_cartao(cartao):
    # Aplica as regras de suspensão após o registro de um cartão
    jogo = cartao.jogo
    campeonato = jogo.campeonato
    jogador = cartao.jogador

    if cartao.tipo == 'amarelo':
        amarelos_no_jogo = Cartao.objects.filter(
            jogo=jogo, jogador=jogador, tipo='amarelo'
        ).count()

        if amarelos_no_jogo >= 2:
            # Regra 2: duplo amarelo → expulsão; nenhum deles conta para acúmulo
            Cartao.objects.filter(jogo=jogo, jogador=jogador, tipo='amarelo').update(conta_acumulo=False)
            # Cancela suspensão de acúmulo que possa ter sido criada pelo 1.º amarelo deste jogo
            Suspensao.objects.filter(
                jogador=jogador, campeonato=campeonato,
                jogo_origem=jogo, motivo='acumulo_amarelos',
            ).delete()
            # Cria suspensão de expulsão (idempotente)
            Suspensao.objects.get_or_create(
                jogador=jogador, campeonato=campeonato,
                jogo_origem=jogo, motivo='duplo_amarelo',
                defaults={'jogos_restantes': 1},
            )
        else:
            # Regra 1: verifica acúmulo (somente se ainda não há suspensão de acúmulo pendente deste jogo)
            acumulados = _amarelos_acumulados(jogador, campeonato)
            if acumulados >= 3:
                Suspensao.objects.get_or_create(
                    jogador=jogador, campeonato=campeonato,
                    jogo_origem=jogo, motivo='acumulo_amarelos',
                    defaults={'jogos_restantes': 1},
                )

    elif cartao.tipo == 'vermelho':
        # Regra 3: vermelho direto → suspensão configurável pelo organizador
        Suspensao.objects.get_or_create(
            jogador=jogador, campeonato=campeonato,
            jogo_origem=jogo, motivo='vermelho_direto',
            defaults={'jogos_restantes': campeonato.jogos_suspensao_vermelho},
        )


def _recalcular_suspensoes_jogador_jogo(jogo, jogador):
    # Chamado ao excluir um cartão: recalcula todas as suspensões do jogador neste jogo
    campeonato = jogo.campeonato
    Cartao.objects.filter(jogo=jogo, jogador=jogador, tipo='amarelo').update(conta_acumulo=True)
    Suspensao.objects.filter(jogador=jogador, campeonato=campeonato, jogo_origem=jogo).delete()
    for cartao in Cartao.objects.filter(jogo=jogo, jogador=jogador).order_by('minuto', 'id'):
        _processar_cartao(cartao)


def _descontar_suspensoes(jogo):
    # Decrementa suspensões pendentes dos jogadores de ambos os times ao finalizar uma partida
    campeonato = jogo.campeonato
    for tc in [jogo.time_casa_id, jogo.time_visitante_id]:
        jogadores_ids = list(tc.elenco_campeonato.values_list('id', flat=True))
        pendentes = Suspensao.objects.filter(
            jogador_id__in=jogadores_ids,
            campeonato=campeonato,
            cumprida=False,
        ).exclude(jogo_origem=jogo)
        for s in pendentes:
            s.jogos_restantes = max(0, s.jogos_restantes - 1)
            if s.jogos_restantes == 0:
                s.cumprida = True
            s.save()


class BoletimView(APIView):
    # Retorna o boletim completo de uma partida: gols, cartões e elencos dos dois times — público
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            jogo = JogoCampeonato.objects.select_related(
                'time_casa_id__time', 'time_visitante_id__time'
            ).get(pk=pk)
        except JogoCampeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Preenche o elenco do campeonato a partir do JogadorDoTime caso ainda não exista
        _auto_popular_elenco(jogo.time_casa_id)
        _auto_popular_elenco(jogo.time_visitante_id)

        gols    = jogo.gols.select_related('jogador__time_campeonato__time', 'assistencia').order_by('minuto')
        cartoes = jogo.cartoes.select_related('jogador__time_campeonato__time').order_by('minuto')
        elenco_casa  = jogo.time_casa_id.elenco_campeonato.order_by('nome')
        elenco_visit = jogo.time_visitante_id.elenco_campeonato.order_by('nome')

        return Response({
            'jogo':              JogoCampeonatoSerializer(jogo).data,
            'gols':              GolSerializer(gols, many=True).data,
            'cartoes':           CartaoSerializer(cartoes, many=True).data,
            'elenco_casa':       JogadorTimeCampeonatoSerializer(elenco_casa,  many=True).data,
            'elenco_visitante':  JogadorTimeCampeonatoSerializer(elenco_visit, many=True).data,
        })


class GolListCreateView(APIView):
    # Registra um gol em uma partida e recalcula o placar automaticamente 
    def post(self, request, pk):
        try:
            jogo = JogoCampeonato.objects.get(pk=pk, campeonato__organizador=request.user)
        except JogoCampeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        data = {**request.data, 'jogo': pk}
        serializer = GolSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        gol = serializer.save()
        _recalcular_placar(jogo)
        return Response(GolSerializer(gol).data, status=status.HTTP_201_CREATED)


class GolDetailView(APIView):
    # Remove um gol e recalcula o placar da partida
    def get_object(self, pk, user):
        try:
            return Gol.objects.get(pk=pk, jogo__campeonato__organizador=user)
        except Gol.DoesNotExist:
            return None

    def delete(self, request, pk):
        gol = self.get_object(pk, request.user)
        if gol is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        jogo = gol.jogo
        gol.delete()
        _recalcular_placar(jogo)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartaoListCreateView(APIView):
    # Registra cartão amarelo ou vermelho e aplica as regras de suspensão automaticamente
    def post(self, request, pk):
        try:
            jogo = JogoCampeonato.objects.get(pk=pk, campeonato__organizador=request.user)
        except JogoCampeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        data = {**request.data, 'jogo': pk}
        serializer = CartaoSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        cartao = serializer.save()
        _processar_cartao(cartao)
        return Response(CartaoSerializer(cartao).data, status=status.HTTP_201_CREATED)


class CartaoDetailView(APIView):
    # Remove um cartão e recalcula as suspensões do jogador naquele jogo
    def get_object(self, pk, user):
        try:
            return Cartao.objects.get(pk=pk, jogo__campeonato__organizador=user)
        except Cartao.DoesNotExist:
            return None

    def delete(self, request, pk):
        cartao = self.get_object(pk, request.user)
        if cartao is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        jogo = cartao.jogo
        jogador = cartao.jogador
        cartao.delete()
        _recalcular_suspensoes_jogador_jogo(jogo, jogador)
        return Response(status=status.HTTP_204_NO_CONTENT)


class FinalizarJogoView(APIView):
    # Marca a partida como realizada e, se aplicável, avança o mata-mata ou encerra o campeonato
    def post(self, request, pk):
        try:
            jogo = JogoCampeonato.objects.get(pk=pk, campeonato__organizador=request.user)
        except JogoCampeonato.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if jogo.status == 'realizada':
            return Response({'detail': 'Jogo já finalizado.'}, status=status.HTTP_400_BAD_REQUEST)

        jogo.status = 'realizada'
        jogo.save(update_fields=['status'])

        _descontar_suspensoes(jogo)

        if jogo.campeonato.formato == 'grupos_mata_mata':
            _auto_progressao_mm(jogo.campeonato)

        _atualizar_status_campeonato(jogo.campeonato)
        return Response(JogoCampeonatoSerializer(jogo).data)
