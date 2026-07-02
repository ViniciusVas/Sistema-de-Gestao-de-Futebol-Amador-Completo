from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def criar_times_a_partir_de_inscricoes(apps, schema_editor):
    TimeCampeonato = apps.get_model('core', 'TimeCampeonato')
    Time = apps.get_model('core', 'Time')
    for tc in TimeCampeonato.objects.select_related('campeonato').all():
        time = Time.objects.create(
            nome=tc.nome,
            cor=tc.cor,
            escudo_url=tc.escudo_url,
            organizador_id=tc.campeonato.organizador_id,
        )
        tc.time_id = time.pk
        tc.save(update_fields=['time_id'])


def reverter(apps, schema_editor):
    TimeCampeonato = apps.get_model('core', 'TimeCampeonato')
    for tc in TimeCampeonato.objects.select_related('time').all():
        tc.nome = tc.time.nome
        tc.cor = tc.time.cor
        tc.escudo_url = tc.time.escudo_url
        tc.save(update_fields=['nome', 'cor', 'escudo_url'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_partida_local'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Criar tabela Time
        migrations.CreateModel(
            name='Time',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=150)),
                ('escudo_url', models.URLField(blank=True)),
                ('cor', models.CharField(blank=True, max_length=10)),
                ('organizador', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='times',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        # 2. Adicionar time_id nullable em TimeCampeonato
        migrations.AddField(
            model_name='timecampeonato',
            name='time',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='inscricoes',
                to='core.time',
            ),
        ),
        # 3. Migrar dados: criar Time para cada TimeCampeonato existente
        migrations.RunPython(criar_times_a_partir_de_inscricoes, reverter),
        # 4. Tornar time_id obrigatório
        migrations.AlterField(
            model_name='timecampeonato',
            name='time',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='inscricoes',
                to='core.time',
            ),
        ),
        # 5. Remover campos antigos de TimeCampeonato
        migrations.RemoveField(model_name='timecampeonato', name='nome'),
        migrations.RemoveField(model_name='timecampeonato', name='cor'),
        migrations.RemoveField(model_name='timecampeonato', name='escudo_url'),
        # 6. Unicidade time + campeonato
        migrations.AlterUniqueTogether(
            name='timecampeonato',
            unique_together={('time', 'campeonato')},
        ),
    ]
