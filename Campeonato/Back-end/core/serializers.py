from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from .models import Jogador, Campeonato, Time, JogadorDoTime, TimeCampeonato, JogadorTime, JogoCampeonato, JogadorTimeCampeonato, Gol, Cartao, Suspensao


Organizador = get_user_model()


# ── Autenticação e perfil ──────────────────────────────────────────────────────

class RegistroSerializer(serializers.ModelSerializer):
    # Valida e cria um novo organizador a partir de nome, e-mail e senha
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Organizador
        fields = ('first_name', 'email', 'password')

    def create(self, validated_data):
        return Organizador.objects.create_user(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            password=validated_data['password'],
        )


class RecuperacaoSenhaSerializer(serializers.Serializer):
    # Valida se o e-mail pertence a um organizador cadastrado antes de enviar o link de redefinição
    email = serializers.EmailField()

    def validate_email(self, value):
        if not Organizador.objects.filter(email=value).exists():
            raise serializers.ValidationError('Nenhum usuário encontrado com este email.')
        return value


class ResetSenhaSerializer(serializers.Serializer):
    # Verifica o token de redefinição e salva a nova senha do organizador
    uid = serializers.CharField()
    token = serializers.CharField()
    nova_senha = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        try:
            uid = force_str(urlsafe_base64_decode(attrs['uid']))
            user = Organizador.objects.get(pk=uid)
        except (Organizador.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError({'uid': 'Link inválido.'})

        if not PasswordResetTokenGenerator().check_token(user, attrs['token']):
            raise serializers.ValidationError({'token': 'Token inválido ou expirado.'})

        attrs['user'] = user
        return attrs

    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['nova_senha'])
        user.save()


class PerfilSerializer(serializers.ModelSerializer):
    # Expõe e permite editar os dados básicos do organizador autenticado
    class Meta:
        model = Organizador
        fields = ('first_name', 'last_name', 'email', 'is_superuser')
        read_only_fields = ('is_superuser',)


# ── Jogadores ──────────────────────────────────────────────────────────────────

class JogadorSerializer(serializers.ModelSerializer):
    # Serializa jogadores do banco geral do organizador; valida o nível de estrelas
    nivel_estrelas = serializers.FloatField()

    class Meta:
        model = Jogador
        fields = ('id', 'nome', 'nivel_estrelas', 'ativo', 'data_cadastro')
        read_only_fields = ('id', 'data_cadastro')

    def validate_nivel_estrelas(self, value):
        valores_validos = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]
        if value not in valores_validos:
            raise serializers.ValidationError('O nível deve ser um dos valores: 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0.')
        return value


class JogadorDoTimeSerializer(serializers.ModelSerializer):
    # Representa um membro do elenco fixo de um time, incluindo nível e status do jogador
    nivel_estrelas = serializers.FloatField(source='jogador.nivel_estrelas', read_only=True)
    ativo = serializers.BooleanField(source='jogador.ativo', read_only=True)

    class Meta:
        model = JogadorDoTime
        fields = ('id', 'jogador', 'nome', 'numero', 'nivel_estrelas', 'ativo')
        read_only_fields = ('id', 'nome', 'nivel_estrelas', 'ativo')


# ── Times ──────────────────────────────────────────────────────────────────────

class TimeSerializer(serializers.ModelSerializer):
    # Serializa um time com seu elenco completo; aceita lista de nomes ao criar
    elenco = JogadorDoTimeSerializer(many=True, read_only=True)
    total_jogadores = serializers.SerializerMethodField()
    jogadores = serializers.ListField(
        child=serializers.CharField(max_length=150),
        write_only=True, required=False,
    )

    class Meta:
        model = Time
        fields = ('id', 'nome', 'escudo', 'escudo_url', 'cor', 'elenco', 'total_jogadores', 'jogadores')
        read_only_fields = ('id',)

    def get_total_jogadores(self, obj):
        return obj.elenco.count()

    def validate(self, data):
        jogadores = data.get('jogadores')
        if jogadores is None:
            return data
        data['jogadores'] = [n.strip() for n in jogadores if n.strip()]
        return data

    def create(self, validated_data):
        # Cria o time e, em seguida, insere os jogadores do elenco em lote
        jogadores = validated_data.pop('jogadores', [])
        time = super().create(validated_data)
        if jogadores:
            JogadorDoTime.objects.bulk_create(
                [JogadorDoTime(time=time, nome=nome) for nome in jogadores]
            )
        return time


# ── Inscrições de times em campeonatos ────────────────────────────────────────

class TimeCampeonatoSerializer(serializers.ModelSerializer):
    # Inscrição de um time num campeonato; valida limite de vagas e unicidade
    time_nome = serializers.CharField(source='time.nome', read_only=True)
    time_cor = serializers.CharField(source='time.cor', read_only=True)
    time_escudo = serializers.CharField(source='time.escudo', read_only=True)
    total_jogadores_campeonato = serializers.SerializerMethodField()

    class Meta:
        model = TimeCampeonato
        fields = ('id', 'time', 'time_nome', 'time_cor', 'time_escudo',
                  'total_jogadores_campeonato', 'campeonato', 'grupo')
        validators = []  # validação de unicidade tratada em validate()

    def get_total_jogadores_campeonato(self, obj):
        return obj.elenco_campeonato.count()

    def validate(self, data):
        campeonato = data.get('campeonato')
        time = data.get('time')
        if campeonato:
            if campeonato.status == 'encerrado':
                raise serializers.ValidationError('Não é possível inscrever times em um campeonato encerrado.')
            if campeonato.jogos.exists():
                raise serializers.ValidationError('Não é possível inscrever times após o calendário ser gerado.')
            if campeonato.formato == 'pontos_corridos':
                limite = Campeonato.TIMES_POR_TIPO[campeonato.tipo]
                if campeonato.times.count() >= limite:
                    raise serializers.ValidationError(
                        f'Este campeonato já atingiu o limite de {limite} times.'
                    )
            elif campeonato.formato == 'grupos_mata_mata':
                limite = Campeonato.TIMES_POR_TIPO_MM[campeonato.tipo]
                if campeonato.times.count() >= limite:
                    raise serializers.ValidationError(
                        f'Este campeonato já atingiu o limite de {limite} times.'
                    )
        if time and campeonato:
            if TimeCampeonato.objects.filter(time=time, campeonato=campeonato).exists():
                raise serializers.ValidationError('Este time já está inscrito neste campeonato.')
            if time.elenco.count() == 0:
                raise serializers.ValidationError(
                    f'O time "{time.nome}" não possui jogadores. Adicione jogadores antes de inscrever.'
                )
        return data


# ── Campeonato ─────────────────────────────────────────────────────────────────

CRITERIOS_VALIDOS = {'saldo_de_gols', 'confronto_direto', 'numero_de_vitorias'}


class CampeonatoSerializer(serializers.ModelSerializer):
    # Serializa um campeonato completo; valida critérios de desempate e coerência de grupos
    class Meta:
        model = Campeonato
        fields = ('id', 'nome', 'descricao', 'regulamento', 'data_inicio', 'data_fim', 'formato',
                  'jogos_ida_volta', 'criterios_desempate', 'status', 'modalidade', 'tipo',
                  'pontos_vitoria', 'pontos_empate', 'pontos_derrota',
                  'num_grupos', 'classificados_por_grupo', 'jogos_suspensao_vermelho')

    def validate_criterios_desempate(self, value):
        # Rejeita critérios desconhecidos para evitar falhas silenciosas na classificação
        invalidos = [c for c in value if c not in CRITERIOS_VALIDOS]
        if invalidos:
            raise serializers.ValidationError(
                f'Critério(s) inválido(s): {invalidos}. '
                f'Use: saldo_de_gols, confronto_direto, numero_de_vitorias.'
            )
        return value

    def validate(self, data):
        # Garante que o número de classificados por grupo seja menor que o total por grupo
        formato = data.get('formato') or (self.instance.formato if self.instance else None)
        tipo = data.get('tipo') or (self.instance.tipo if self.instance else None)
        num_grupos = data.get('num_grupos') or (self.instance.num_grupos if self.instance else 2)
        classificados = data.get('classificados_por_grupo') or (
            self.instance.classificados_por_grupo if self.instance else 2
        )

        if formato == 'grupos_mata_mata' and tipo and num_grupos and classificados:
            total_times = Campeonato.TIMES_POR_TIPO_MM.get(tipo, 0)
            if total_times and total_times % num_grupos == 0:
                times_por_grupo = total_times // num_grupos
                if classificados >= times_por_grupo:
                    raise serializers.ValidationError({
                        'classificados_por_grupo': (
                            f'Com {num_grupos} grupo(s) e {total_times} times no total, cada grupo tem '
                            f'{times_por_grupo} times. O número de classificados por grupo deve ser '
                            f'menor que {times_por_grupo} (máximo: {times_por_grupo - 1}).'
                        )
                    })
        return data


# ── Partidas ───────────────────────────────────────────────────────────────────

class JogoCampeonatoSerializer(serializers.ModelSerializer):
    # Serializa uma partida; ao atualizar o placar completo, marca automaticamente como realizada
    time_casa_nome = serializers.CharField(source='time_casa_id.time.nome', read_only=True)
    time_fora_nome = serializers.CharField(source='time_visitante_id.time.nome', read_only=True)

    class Meta:
        model = JogoCampeonato
        fields = ('id', 'rodada', 'fase', 'data', 'local', 'status', 'time_casa_id', 'time_casa_nome', 'time_visitante_id', 'time_fora_nome', 'gols_casa', 'gols_fora')

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        # Auto-finaliza se os dois placares foram fornecidos explicitamente
        if 'gols_casa' in validated_data and 'gols_fora' in validated_data:
            if instance.gols_casa is not None and instance.gols_fora is not None:
                instance.status = 'realizada'
                instance.save(update_fields=['status'])
        return instance


# ── Gols e cartões ─────────────────────────────────────────────────────────────

class GolSerializer(serializers.ModelSerializer):
    # Serializa um gol com dados legíveis do artilheiro e assistente; valida se pertencem à partida
    jogador_nome     = serializers.CharField(source='jogador.nome', read_only=True)
    jogador_time     = serializers.CharField(source='jogador.time_campeonato.time.nome', read_only=True)
    assistencia_nome = serializers.CharField(source='assistencia.nome', read_only=True, allow_null=True, default=None)

    class Meta:
        model = Gol
        fields = ('id', 'jogo', 'jogador', 'jogador_nome', 'jogador_time',
                  'assistencia', 'assistencia_nome', 'minuto')
        read_only_fields = ('id',)

    def validate(self, data):
        jogo     = data.get('jogo') or (self.instance.jogo if self.instance else None)
        jogador  = data.get('jogador')
        assist   = data.get('assistencia')

        if jogo and jogador:
            validos = {jogo.time_casa_id.pk, jogo.time_visitante_id.pk}
            if jogador.time_campeonato_id not in validos:
                raise serializers.ValidationError({'jogador': 'Jogador não pertence a esta partida.'})

        if assist and jogador and assist.pk == jogador.pk:
            raise serializers.ValidationError({'assistencia': 'O assistente não pode ser o mesmo artilheiro.'})

        return data


class CartaoSerializer(serializers.ModelSerializer):
    # Serializa um cartão (amarelo/vermelho) e valida se o jogador pertence à partida
    jogador_nome = serializers.CharField(source='jogador.nome', read_only=True)
    jogador_time = serializers.CharField(source='jogador.time_campeonato.time.nome', read_only=True)

    class Meta:
        model = Cartao
        fields = ('id', 'jogo', 'jogador', 'jogador_nome', 'jogador_time', 'tipo', 'minuto', 'conta_acumulo')
        read_only_fields = ('id', 'conta_acumulo')

    def validate(self, data):
        jogo    = data.get('jogo') or (self.instance.jogo if self.instance else None)
        jogador = data.get('jogador')

        if jogo and jogador:
            validos = {jogo.time_casa_id.pk, jogo.time_visitante_id.pk}
            if jogador.time_campeonato_id not in validos:
                raise serializers.ValidationError({'jogador': 'Jogador não pertence a esta partida.'})

        return data


# ── Vínculo jogador ↔ time no campeonato ──────────────────────────────────────

class JogadorTimeSerializer(serializers.ModelSerializer):
    # Valida que um jogador não esteja inscrito em dois times diferentes no mesmo campeonato
    class Meta:
        model = JogadorTime
        fields = ('id', 'time', 'jogador')

    def validate(self, data):
        time_campeonato = data.get('time')
        jogador = data.get('jogador')
        if time_campeonato and jogador:
            conflito = JogadorTime.objects.filter(
                jogador=jogador,
                time__campeonato=time_campeonato.campeonato,
            ).exclude(time=time_campeonato)
            if conflito.exists():
                outro_time = conflito.first().time.time.nome
                raise serializers.ValidationError(
                    {'jogador': f'Este jogador já está inscrito no time "{outro_time}" neste campeonato.'}
                )
        return data


class SuspensaoSerializer(serializers.ModelSerializer):
    jogador_nome = serializers.CharField(source='jogador.nome', read_only=True)
    jogador_time = serializers.CharField(source='jogador.time_campeonato.time.nome', read_only=True)
    motivo_display = serializers.CharField(source='get_motivo_display', read_only=True)

    class Meta:
        model = Suspensao
        fields = (
            'id', 'jogador', 'jogador_nome', 'jogador_time',
            'campeonato', 'jogo_origem', 'motivo', 'motivo_display',
            'jogos_restantes', 'cumprida',
        )
        read_only_fields = ('id',)


class JogadorTimeCampeonatoSerializer(serializers.ModelSerializer):
    # Serializa o jogador inscrito no elenco de um time dentro de um campeonato; impede duplicatas de nome
    class Meta:
        model = JogadorTimeCampeonato
        fields = ('id', 'time_campeonato', 'nome', 'nivel_estrelas')
        read_only_fields = ('id',)

    def validate_nivel_estrelas(self, value):
        validos = [i / 2 for i in range(1, 11)]
        if value not in validos:
            raise serializers.ValidationError(
                'Nível deve ser entre 0.5 e 5.0 em incrementos de 0.5.'
            )
        return value

    def validate(self, data):
        # Impede que o mesmo nome apareça em dois times diferentes dentro do campeonato
        time_camp = data.get('time_campeonato') or (
            self.instance.time_campeonato if self.instance else None
        )
        nome = (data.get('nome') or '').strip()
        if time_camp and nome:
            qs = JogadorTimeCampeonato.objects.filter(
                time_campeonato__campeonato=time_camp.campeonato,
                nome__iexact=nome,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'nome': f'O jogador "{nome}" já está em outro time neste campeonato.'}
                )
        return data
