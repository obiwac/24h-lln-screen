# 24h-lln-screen

Code used for the screen on the Grand' Place during the 24h vélo in Louvain-la-Neuve

## Starting server

Super simple, just do:

```console
python -m http.server 5000
```

You can now navigate to [localhost:5000](localhost:5000).

## Controls
### Décompte
A 12h59 il faut lancer le décompte -> touche "d"
### Messages du CSE
⚠️ Les messages du CSE sont destinés à être affichés en cas d'urgence. Il faut une validation par un des deux membres de l'organe avant.

| Touche | Action |
| :---------------  |:---------------:|
| e  |    permet de modifier le message à afficher et après il faut appuyer sur "Afficher le message".     |
| c  |    permet d'afficher le message déjà enregistré.     |


### Messages de l'Organes
Toutes les ± 15mins en aprèm et ±20 mins en soirée (après 19h) il faut passer la vidéo des sponsors de l'organe.
De temps en temps il faut passer aussi la vidéo de prévention.

| Touche | Message |
| :---------------  |:---------------:|
| 2  |    Organe sponsor     |
| g  |    Guindaille 2.0     |
| s  |    Plan sacha         |
| i  |    Infeau             |
| 9  |    Promotion CSE      |

### A passer pdt le concert du certino
Touche "y" -> lance une vidéo de promotion du certino, à pacer on boucle pdt leur concert.
### Affiches / vidéos animés des kaps
| Touche | KAP |
| :---------------  |:---------------:|
| r  |    radio     |
| k  |    kapo      |
| o  |    koty      |
| t  |    textile   |
| l  |    kapsla    |
| p  |    photo     |
| a  |    auk       |
| 4  |    carpe1    |
| 5  |    carpe2    |
| 6  |    circo     |
| 7  |    kaptech     |
| 8  |    electro     |

Vous pouvez apuiller sur 0 pour faire un défilement automatique, si vous apuillez sur une autre touche pendant le défilement, il s'arrêteras il faudras recommencer.

### Affiches inanimées des kaps
| Touche | KAP |
| :---------------  |:---------------:|
| 1  |    112       |
| v  |    kap vert  |
| m  |    manga     |
| 3  |    verdom    |
| f  |    fairkot   |
| j  |    bar du linux   |
| z  |    kotangente   |

Touche "b" -> affiche un message d'erreur windows -> demander à Aymeric pq il a fait ça


## Attribution
- Radio model: [Luka Aleksic](https://aleksicluka.itch.io/low-poly-retro-radio)
