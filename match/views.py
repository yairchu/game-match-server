from datetime import datetime, timedelta
import random

from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from match import models

some_words = '''
able ably ache achy acid acme acne acre acts adam adar aeon aero aery afar aged
ahem ahoy aide aint airy ajar akin alan alas alba alco alec alef alex alfa ally
alma aloe also alto alum amar amen amid amir ammo amok amos anal anat andy anew
anna anne anon anti anus apex aqua area arms army arse atom atop aunt aura auto
avid away awry axis babe baby bach back bait bald balm bane bang bank bark barn
bash bask bath bead beak beam bean beat beef been beer bees bell belt best beth
bias bike bill bind bird bite blip blob bloc blue blur boat body bola bolt bomb
bond bone bong boom boot boss brag brat brim bull bump burp busk bust busy butt
buzz cage cake calf calm cape card cart case cash cave cell chat chef chew chia
chin chip chug city clam clan clap claw clay clip club clue coal coat coca code
coin cold cone cook cool cord cork corn cost cosy crab crap crib cuba cube cult
curb cure cusp cute cyan dali dare dash data date dawn dead deaf deal dean dear
debt deck deed deer defy demi desk dial dibs dice dire dirt diva dive dock does
doom door dorm dose doug dove drag draw dual duck dude duel duet dull dumb dump
dune dunk dusk dust duty each ease east easy eats echo edge else envy epic even
ever evil exam exit face fact fade fail fame farm fast fate fear feel fiat film
'''.split()

def make_random_phrase():
    r = []
    for i in range(3):
        r.append(random.choice(some_words))
    return ' '.join(r)

fresh = timedelta(hours=1)

def make_unique_random_phrase(game):
    while True:
        phrase = make_random_phrase()
        if not models.Player.objects.filter(
                game=game, player_id=phrase,
                when__gt=datetime.now() - fresh):
            return phrase

def register(request, game, ip, port):
    phrase = make_unique_random_phrase(game)
    player = models.Player(game=game, ip_address=ip, port=port, player_id=phrase)
    player.save()
    while True:
        try:
            models.Player.objects.get(game=game, player_id=phrase, when__gt=datetime.now() - fresh)
        except:
            pass
        else:
            break
        phrase = make_unique_random_phrase(game)
        player.player_id = phrase
        player.save()
    return HttpResponse(phrase)

def connect(request, game, src_id, dst_id):
    thres = datetime.now() - fresh
    src = get_object_or_404(models.Player, game=game, player_id=src_id, when__gt=thres)
    dst = get_object_or_404(models.Player, game=game, player_id=dst_id, when__gt=thres)
    assert dst.connected_to is None
    src.connected_to = dst
    src.save()
    return lookup(request, game, dst_id)

def lookup(request, game, player_id):
    thres = datetime.now() - fresh
    host_player = get_object_or_404(
        models.Player,
        game=game, player_id=player_id,
        when__gt=thres)
    res = ['%s:%d'%(host_player.ip_address, host_player.port)]
    for other in models.Player.objects.filter(game=game, connected_to__id=host_player.id):
        res.append('%s:%d'%(other.ip_address, other.port))
    return HttpResponse(' '.join(res))
