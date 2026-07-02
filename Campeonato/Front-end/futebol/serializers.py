from rest_framework import serializers
from .models import Time, Jogador, Pelada, PeladaJogador, TimePelada, TimeJogador, EventoJogo, EstatisticaJogador, Campeonato, TimeCampeonato, JogadorTime, JogoCampeonato

# ... common logic ...

class TimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Time
        fields = '__all__'
        read_only_fields = ('criado_por',)

class JogadorTimeSerializer(serializers.ModelSerializer):
    jogador_nome = serializers.ReadOnlyField(source='jogador.nome')
    class Meta:
        model = JogadorTime
        fields = '__all__'

class TimeCampeonatoSerializer(serializers.ModelSerializer):
    jogadores = JogadorTimeSerializer(many=True, read_only=True)
    class Meta:
        model = TimeCampeonato
        fields = '__all__'

class JogoCampeonatoSerializer(serializers.ModelSerializer):
    time_casa_nome = serializers.ReadOnlyField(source='time_casa.nome')
    time_visitante_nome = serializers.ReadOnlyField(source='time_visitante.nome')
    class Meta:
        model = JogoCampeonato
        fields = '__all__'

class CampeonatoSerializer(serializers.ModelSerializer):
    times = TimeCampeonatoSerializer(many=True, read_only=True)
    jogos = JogoCampeonatoSerializer(many=True, read_only=True)
    
    class Meta:
        model = Campeonato
        fields = '__all__'
        read_only_fields = ('organizador',)

class EstatisticaJogadorSerializer(serializers.ModelSerializer):
    media_gols = serializers.ReadOnlyField()
    class Meta:
        model = EstatisticaJogador
        fields = '__all__'

class JogadorSerializer(serializers.ModelSerializer):
    estatisticas = EstatisticaJogadorSerializer(read_only=True)
    class Meta:
        model = Jogador
        fields = '__all__'
        read_only_fields = ('organizador',)

class PeladaJogadorSerializer(serializers.ModelSerializer):
    jogador_nome = serializers.ReadOnlyField(source='jogador.nome')
    jogador_nivel = serializers.ReadOnlyField(source='jogador.nivel_estrelas')

    class Meta:
        model = PeladaJogador
        fields = '__all__'

class TimeJogadorSerializer(serializers.ModelSerializer):
    jogador_nome = serializers.ReadOnlyField(source='jogador.nome')
    jogador_nivel = serializers.ReadOnlyField(source='jogador.nivel_estrelas')

    class Meta:
        model = TimeJogador
        fields = '__all__'

class TimePeladaSerializer(serializers.ModelSerializer):
    jogadores = TimeJogadorSerializer(many=True, read_only=True)

    class Meta:
        model = TimePelada
        fields = '__all__'

class EventoJogoSerializer(serializers.ModelSerializer):
    jogador_nome = serializers.ReadOnlyField(source='jogador.nome')
    class Meta:
        model = EventoJogo
        fields = '__all__'

class PeladaSerializer(serializers.ModelSerializer):
    inscritos = PeladaJogadorSerializer(many=True, read_only=True)
    times = TimePeladaSerializer(many=True, read_only=True)
    
    class Meta:
        model = Pelada
        fields = '__all__'
        read_only_fields = ('organizador',)
