# Generated by Django 3.0.4 on 2020-03-16 15:25

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Player',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('when', models.DateTimeField(auto_now_add=True, verbose_name='date created')),
                ('game', models.CharField(max_length=200)),
                ('ip_address', models.GenericIPAddressField()),
                ('port', models.IntegerField()),
                ('player_id', models.CharField(max_length=200)),
            ],
        ),
    ]
