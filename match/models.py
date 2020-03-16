from django.db import models

class Player(models.Model):
    when = models.DateTimeField("date created", auto_now_add=True)
    game = models.CharField(max_length=200)
    ip_address = models.GenericIPAddressField()
    port = models.IntegerField()
    player_id = models.CharField(max_length=200)
    connected_to = models.ForeignKey("Player",models.SET_NULL,blank=True,null=True)
