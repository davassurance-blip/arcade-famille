/* ===== Fiches d'aide (ampoule) — par jeu, adaptées à l'âge (tier 0 petits, 1 moyens, 2 grands) ===== */
const HELP = {
  fruits: t => ({
    'But du jeu': 'Attrape le plus de fruits possible dans ton panier.',
    'Commandes': ['Glisse ton doigt à gauche ou à droite pour déplacer le panier', 'Ou utilise les flèches ◀ ▶'],
    'Attention': t === 0 ? ['Les bombes noires font perdre un cœur', 'Tu as 3 cœurs'] : ['Les bombes noires font perdre un cœur', 'Un fruit qui tombe par terre fait aussi perdre un cœur', 'Les fruits dorés valent 50 points'],
    'Astuce': 'Attrape plusieurs fruits d\'affilée sans bombe : le combo donne des points en plus.'
  }),
  frog: () => ({
    'But du jeu': 'Fais courir la grenouille le plus loin possible.',
    'Commandes': ['Tape sur l\'écran ou sur SAUT pour sauter par-dessus les troncs'],
    'Points': ['Chaque mètre parcouru rapporte des points', 'Une mouche attrapée = 25 points'],
    'Astuce': 'Saute juste avant le tronc, pas trop tôt. Ça va de plus en plus vite !'
  }),
  memo: () => ({
    'But du jeu': 'Retrouve toutes les paires de formes identiques.',
    'Règle': ['Retourne deux cartes', 'Si elles sont pareilles, elles restent ouvertes', 'Sinon elles se referment : mémorise leur place !'],
    'Points': 'Moins tu fais de coups et plus tu es rapide, plus tu gagnes de points.'
  }),
  calc: t => ({
    'But du jeu': 'Réponds à un maximum de calculs en 60 secondes.',
    'Règle': t === 0 ? ['Tape la bonne réponse parmi les 3', 'Les calculs vont jusqu\'à 10'] : ['Tape la bonne réponse parmi les 4', 'Une erreur enlève 2 secondes', 'Enchaîne 4 bonnes réponses : les points sont multipliés (×2 puis ×3)'],
    'Astuce': 'Mieux vaut réfléchir une seconde que se tromper : l\'erreur casse la série.'
  }),
  moles: t => ({
    'But du jeu': 'Tape sur les taupes dès qu\'elles sortent de leur trou.',
    'Règle': t === 0 ? ['Chaque taupe touchée = 1 point', 'Tu as 30 secondes'] : ['Chaque taupe touchée = 1 point', 'Les bombes enlèvent 3 points : ne les touche pas !', 'Tu as 30 secondes'],
    'Astuce': 'Garde le doigt au-dessus du milieu de la grille pour aller vite partout.'
  }),
  rocket: t => ({
    'But du jeu': 'Fais voler la fusée entre les nuages le plus longtemps possible.',
    'Commandes': ['Tape sur l\'écran (ou HOP) : la fusée monte', 'Ne touche à rien : elle redescend'],
    'Points': ['Chaque passage entre deux nuages = 10 points', 'Chaque étoile attrapée = 5 points'],
    'Vies': 'Tu as 5 cœurs. Toucher un nuage en enlève un ; le sol te fait juste rebondir.'
  }),
  platform: t => ({
    'But du jeu': 'Traverse les 8 mondes. Au bout de chacun, un boss garde le drapeau : bats-le !',
    'Commandes': ['◀ ▶ pour courir', 'SAUT (ou tape l\'écran) pour sauter ; maintiens pour sauter plus haut', 'TIR : tu tires autant que tu veux (tu peux laisser le doigt dessus)', 'TIR vise tout seul les bêtes qui volent'],
    'Les armes': ['Tu commences avec des cailloux', 'Chaque boss battu laisse une arme plus forte : boules de feu (elles rebondissent), double feu, éclairs (ils traversent), triple éclair', 'Cristaux bleus : +4 super tirs, deux fois plus forts', 'Les bêtes deviennent plus résistantes tous les deux mondes : garde tes super tirs pour les costaudes'],
    'Les boss': ['Gros Robot : il saute, passe dessous ou saute-lui sur la tête', 'Roi Cube : il crache en éventail puis bondit', 'Reine Chauve-souris : elle plonge sur toi, tire quand elle vole', 'Pique Géant : il fonce, ne lui saute PAS dessus, tire', 'Du monde 5 au monde 8, ils reviennent en plus forts', 'Si tu perds une vie, le boss garde ses blessures'],
    'Pour monter': ['Une marche trop haute ? Cherche le ressort rouge, l\'ascenseur ou la balançoire', 'Balançoire et plateformes qui bougent : saute dessus, elles te portent de l\'autre côté du trou'],
    'Les bestioles': ['Petit robot, gros robot, sauteur orange : saute sur leur tête ou tire', 'Monstre rouge à pique : ne saute PAS dessus, tire', 'Cracheur jaune sur ses caisses : évite ses boules', 'Boule grise qui tourne : passe au bon moment', 'Chauves-souris : tire, ça vise tout seul'],
    'Objets': ['Bloc jaune « ! » : tape-le par en dessous (pièce, champignon, cristaux, étoile ou cœur)', 'Champignon : tu grandis et tu encaisses un coup', 'Étoile : 8 secondes invincible et plus rapide', 'Cœur : +1 vie · 50 pièces = +1 vie', 'Levier = checkpoint (il y en a un juste avant chaque boss)'],
    'Astuce': 'Contre un boss, reste à distance et tire en sautant par-dessus ses boules.'
  }),
  snake: t => ({
    'But du jeu': 'Mange les points roses pour grandir sans te cogner.',
    'Commandes': ['Croix directionnelle en bas de l\'écran', 'Ou glisse le doigt dans la direction voulue (même sans lever le doigt)', 'Ou tape à côté de la tête : au-dessus, en dessous, à gauche ou à droite', 'Deux virages rapides sont mémorisés l\'un après l\'autre'],
    'Règle': ['Toucher un mur ou ta propre queue termine la partie', 'Plus tu manges, plus ça va vite' + (t === 2 ? ' · Des blocs rouges apparaissent sur le terrain' : '')],
    'Astuce': 'Tourne en suivant les bords pour garder de la place au milieu.'
  }),
  chess: () => ({
    'But du jeu': 'Mettre le roi adverse échec et mat : il est attaqué et ne peut plus s\'échapper.',
    'Comment jouer': ['Touche une pièce : ses cases possibles s\'affichent (points et cercles roses pour les prises)', 'Touche la case où tu veux aller', 'Bouton « Robot / 2 joueurs » pour jouer contre l\'ordinateur ou à deux, et « Facile / Moyen / Fort » pour sa force', 'Bouton « Annuler » pour reprendre ton dernier coup, « Indice » pour voir un bon coup', 'Un pion qui arrive au bout devient la pièce de ton choix'],
    'Les pièces': ['Pion : avance d\'une case (deux au premier coup), prend en diagonale', 'Tour : lignes droites · Fou : diagonales · Dame : les deux', 'Cavalier : en L, il saute par-dessus les autres', 'Roi : une case dans tous les sens'],
    'Astuce': 'Sors tes cavaliers et tes fous au début, protège ton roi, et regarde ce que le Robot attaque avant de jouer.'
  }),
  bricks: t => ({
    'But du jeu': 'Casse toutes les briques avec la balle sans la laisser tomber.',
    'Commandes': ['Glisse le doigt pour la raquette', 'GO (ou tape l\'écran) : lancer la balle, ou tirer avec le LASER'],
    'Les capsules': ['×3 : trois balles · LARGE : grande raquette · LASER : tu tires', 'FEU : la balle traverse les briques · LENT : balle ralentie', 'COLLE : la balle se colle à la raquette · VIE : un cœur de plus' + (t === 2 ? ' · MINI : piège, petite raquette' : '')],
    'Les briques': ['Grises avec contour : 2 ou 3 coups', 'Violettes foncées : incassables (sauf balle de feu)', 'Rouges qui clignotent : explosives, elles détruisent leurs voisines', 'Jaunes : elles bougent'],
    'Boss': 'Tous les 5 niveaux, un boss arrive : renvoie la balle dessus jusqu\'à vider sa jauge, et évite ses projectiles rouges.',
    'Astuce': 'La balle part dans la direction du bord de la raquette qu\'elle touche. Enchaîne les briques sans toucher la raquette pour le combo.'
  }),
  galaxy: t => ({
    'But du jeu': 'Détruis les vagues d\'envahisseurs et le boss de chaque étape.',
    'Commandes': ['Glisse le doigt (ou ◀ ▶) pour piloter', 'Le vaisseau tire tout seul'],
    'Les capsules': ['ARME : tir double, triple puis quadruple', 'RAPIDE : cadence doublée 10 s · LASER : rayon continu 7 s', 'BOUCLIER : absorbe un coup · VIE : un cœur de plus'],
    'Étape': ['5 vagues, puis le BOSS avec sa jauge en haut', 'Les petits chasseurs orange traversent l\'écran : faciles à abattre, mais ils foncent sur toi'],
    'Attention': 'Se faire toucher fait perdre un niveau d\'arme.' + (t === 2 ? ' Les envahisseurs ripostent et des astéroïdes tombent.' : '')
  }),
  blocks: () => ({
    'But du jeu': 'Empile les pièces pour remplir des lignes complètes, qui disparaissent.',
    'Commandes': ['Glisse à gauche / droite : déplacer', 'Tape l\'écran ou TOUR : tourner la pièce', 'Glisse vers le bas ou BAS : chute immédiate'],
    'Points': ['1 ligne = 100 · 2 = 300 · 3 = 500 · 4 d\'un coup = 800 (× le niveau)', 'Tous les 10 lignes, le niveau monte et ça accélère'],
    'Astuce': 'Garde une colonne vide sur le côté pour y glisser la barre et faire 4 lignes d\'un coup.'
  }),
  g2048: () => ({
    'But du jeu': 'Obtenir une tuile 2048 en fusionnant les tuiles.',
    'Règle': ['Glisse dans une direction (ou croix) : toutes les tuiles glissent au maximum', 'Deux tuiles de même valeur qui se touchent fusionnent (2+2 = 4, 4+4 = 8…)', 'Une nouvelle tuile (2 ou 4) apparaît à chaque coup', 'Quand la grille est pleine et qu\'aucune fusion n\'est possible, c\'est fini'],
    'Astuce': 'Choisis un coin, garde ta plus grosse tuile dedans, et ne glisse presque jamais dans la direction opposée.'
  }),
  glouton: t => ({
    'But du jeu': 'Manger toutes les pastilles du labyrinthe sans te faire attraper. Il y a 12 niveaux et 4 labyrinthes : le Jardin, le Manoir, le Temple et le Château.',
    'Commandes': ['Croix directionnelle, ou glisse le doigt', 'Le Glouton continue tout seul ; ta direction s\'applique au prochain croisement, et tu peux faire demi-tour à tout moment', 'Les tunnels sur les côtés ressortent de l\'autre côté'],
    'Les niveaux': ['Niveau 1 : un seul fantôme, lent et distrait', 'Les autres fantômes arrivent un par un : ' + (t === 2 ? '2 au niveau 2, 3 au niveau 4, 4 au niveau 6' : '2 au niveau 3, 3 au niveau 5, 4 au niveau 7'), 'À chaque niveau, ils vont un peu plus vite et les super-pastilles durent un peu moins longtemps'],
    'Les fantômes': ['Rouge : te suit à la trace', 'Orange : fonce puis se dégonfle quand il est près', 'Rose : vise devant toi pour te couper la route', 'Bleu : essaie de te prendre à revers'],
    'Super-pastilles': ['Les 4 grosses pastilles rendent les fantômes bleus (' + (t === 2 ? '8' : '10') + ' secondes au niveau 1, moins ensuite) : croque-les ! 200, 400, 800 puis 1600 points', 'La petite jauge sous le labyrinthe montre le temps qui reste ; quand ils clignotent, ils vont redevenir dangereux'],
    'Gagner des vies': ['Une vie bonus tous les ' + (t === 2 ? '4000' : '3000') + ' points', 'Un cœur à attraper apparaît dans les niveaux pairs, et aussi quand il ne te reste qu\'une vie', '+1 vie en finissant les niveaux 3, 6 et 9', '5 vies au maximum : au-delà, tu gagnes 300 points'],
    'Bonus': 'Un fruit apparaît deux fois par niveau au point de départ : cerise 100, fraise 200, orange 300, pomme 500, raisin 700, étoile 1000 points.'
  }),
  simon: () => ({
    'But du jeu': 'Répéter la suite de couleurs le plus longtemps possible.',
    'Règle': ['Les couleurs s\'allument avec leur son : regarde et écoute', 'Rejoue-les dans le même ordre en tapant dessus', 'Si tu réussis, la suite s\'allonge d\'une couleur'],
    'Astuce': 'Chante les couleurs dans ta tête ou associe chaque son à une note.'
  }),
  road: t => ({
    'But du jeu': 'Rouler le plus loin possible sans accident et sans panne d\'essence.',
    'Commandes': ['Tape à gauche ou à droite de l\'écran pour changer de voie', 'Ou utilise ◀ ▶'],
    'Règle': ['La jauge d\'essence baisse : attrape les bidons verts « E »', 'Les étoiles valent 50 points', t === 0 ? 'Tu as 3 cœurs : un accident en enlève un' : 'Un seul accident et c\'est fini !'],
    'Astuce': 'Regarde loin devant : les voitures lentes se voient venir de loin.'
  }),
  defense: t => ({
    'But du jeu': 'Protéger le château de la reine : aucun ennemi ne doit arriver au bout du chemin. 5 royaumes à sauver, de plus en plus grands.',
    'Comment jouer': ['Choisis une tour, puis tape une case d\'herbe libre pour la poser (ça coûte de l\'or)', 'Tape « Lancer la vague » quand tu es prêt (sinon elle part à la fin du compte à rebours ; en avance, tu gagnes un bonus)', 'Tape une tour posée : tu vois sa portée, tu peux l\'améliorer (3 niveaux) ou la vendre (70 % de l\'or rendu)', '×2 accélère le jeu', 'Pluie de flèches : la reine blesse tous les ennemis d\'un coup (se recharge en 45 secondes)'],
    'Les tours': ['Archer (50) : tire vite, touche tout le monde', 'Canon (90) : explosion qui touche plusieurs ennemis, mais pas ceux qui volent', 'Glace (70) : ralentit les ennemis', 'Mage (120) : éclair qui rebondit d\'un ennemi à l\'autre'],
    'Les ennemis': ['Gobelin vert : normal · Filou jaune : très rapide', 'Chauve-souris : vole tout droit vers le château, sans suivre le chemin', 'Blindé rouge casqué : les flèches lui font peu de mal, utilise Canon ou Mage', 'Sorcier au chapeau : soigne ses voisins, vise-le vite', 'Chef à couronne : très costaud, il arrive à la dernière vague de chaque carte'],
    'Le château': ['Il a ' + (t === 2 ? 15 : 20) + ' points de vie ; chaque ennemi qui entre en enlève 1 (Blindé 2, Chef 5)', 'À chaque nouvelle carte il est réparé, mais tes tours sont à replacer', 'Si tu perds, tu peux reprendre à la carte où tu es tombé (le score repart de zéro)'],
    'Astuce': 'Pose tes tours dans les virages : les ennemis y passent plus longtemps. Une Glace à côté d\'un Canon, c\'est redoutable. Garde des Archers ou des Mages près du château pour les chauves-souris.'
  }),
  mots: t => ({
    'But du jeu': 'Retrouver dans la grille tous les mots de la liste' + (t === 0 ? '.' : ', puis le mot mystère.'),
    'Commandes': ['Pose le doigt sur la première lettre du mot', 'Glisse jusqu\'à la dernière lettre, puis lâche', 'Tu peux tracer le mot dans un sens ou dans l\'autre', 'La liste est longue ? Glisse-la vers le haut pour voir la suite', 'INDICE : entoure la première lettre d\'un mot (3 par grille' + (t === 0 ? ')' : ', −20 points)')],
    'Les niveaux': t === 0 ? ['6 grilles, de plus en plus grandes', 'Mots vers la droite et vers le bas', 'À partir de la grille 5 : des mots en diagonale', 'Pas de chrono : prends ton temps'] : ['12 grilles, de ' + (t === 1 ? '7×7 à 11×11' : '8×8 à 12×12'), 'D\'abord quelques mots, puis en diagonale, puis à l\'envers', 'À partir du niveau ' + (t === 1 ? 4 : 3) + ' : grille pleine, 15 à 30 mots, la liste défile', 'Le chrono est de plus en plus serré'],
    'Le mot mystère': t === 0 ? ['Pour les plus grands'] : ['Dans une grille pleine, presque toutes les lettres servent à un mot', 'Quand tous les mots sont trouvés, il reste quelques lettres', 'Touche-les : dans l\'ordre de lecture, elles forment le mot mystère (gros bonus)'],
    'Astuce': 'Cherche d\'abord la première lettre du mot, surtout les lettres rares comme K, Z, X ou Y.'
  }),
  ping: t => ({
    'But du jeu': 'Gagner le championnat : 3 coupes (Bronze, Argent, Or), chacune avec un quart, une demi et une finale. Match en ' + (t === 0 ? '4 points' : '5 points (Bronze) ou 7 points (Argent, Or)') + '.',
    'Commandes': ['Glisse le doigt : la raquette le suit (ou ◀ ▶)', 'Place la raquette devant la balle : elle repart toute seule', 'Le bord de la raquette envoie la balle sur le côté'],
    'Les coups': ['LIFT : glisse vers le haut en frappant (ou bouton LIFT). Balle rapide qui accélère après le rebond', 'COUPÉ : glisse vers le bas (ou bouton COUPÉ). Balle lente et basse : l\'adversaire renvoie souvent une balle haute', 'SMASH : sur une balle haute, glisse vers le haut' + (t === 0 ? ' (pour toi, il part tout seul)' : ''), 'EFFET : bouge vite sur le côté en frappant, la balle tourne'].concat(t === 0 ? [] : ['Attention : trop sur le côté, la balle sort (« Dehors ! »)']),
    'Les adversaires': ['Ils sont de plus en plus rapides et précis, et chacun a son style (lifteur, coupeur, smasheur, effets)', 'Tu as 3 cœurs : un match perdu coûte un cœur et tu le rejoues', 'Ton championnat est gardé : tu reprends au même match, même après avoir quitté'],
    'Astuce': 'Coupe la balle, attends la balle haute, puis smashe dans le coin vide.'
  }),
  parking: t => ({
    'But du jeu': 'Faire sortir la voiture jaune par la sortie verte, à droite.',
    'Commandes': ['Pose le doigt sur un véhicule et glisse-le', 'Une voiture ne roule que dans son sens : en avant ou en arrière', 'Camions et bus prennent 3 cases, les voitures 2'],
    'Les boutons': ['ANNULER : reprend le dernier coup', 'REFAIRE : recommence le niveau', 'INDICE : montre le prochain bon coup' + (t === 0 ? '' : ' (plus de 2 indices : 2 étoiles au maximum)'), 'NIVEAUX : choisir un autre niveau déjà ouvert'],
    'Les niveaux': ['30 niveaux, du plus simple au plus dur (' + (t === 0 ? '1 à 10' : t === 1 ? '3 à 24' : '6 à 38') + ' coups)', '3 étoiles si tu réussis avec le nombre de coups de l\'objectif' + (t === 0 ? ' (ou presque)' : ''), 'Tes étoiles sont gardées : tu reprends où tu t\'es arrêté', 'TERMINER (sur l\'écran des niveaux) valide tes points'],
    'Astuce': 'Regarde ce qui bloque la voiture jaune, puis ce qui bloque ce véhicule-là, et ainsi de suite.'
  }),
  kart3d: t => ({
    'But du jeu': 'Finir premier après 3 tours de circuit, contre 3 adversaires. C\'est une version d\'essai en vraie 3D : un seul circuit pour l\'instant.',
    'Commandes': ['Le kart accélère tout seul', '◀ ▶ pour tourner', 'FREIN avant les virages serrés', 'Bouton jaune VUE (en haut à gauche) : derrière le kart, de haut, ou au volant'],
    'Sur la piste': ['Reste sur la route : dans l\'herbe, tu roules deux fois moins vite', 'Flèches orange sur la route : turbo', 'Les panneaux jaunes à flèches annoncent un virage', 'La petite carte montre où tu es (point jaune) et où sont les autres'],
    'Astuce': 'Commence à tourner un peu avant le virage, et freine si tu vois les piles de pneus arriver vite.'
  }),
  kart: t => ({
    'But du jeu': 'Finir premier. Choisis une course simple sur un circuit, ou la COUPE : 3 circuits, 10 / 6 / 4 / 2 points selon ta place.',
    'Commandes': ['La voiture accélère toute seule', '◀ ▶ (ou glisse le doigt) : tourner', 'FREIN : ralentir avant un virage serré', 'Pour lancer ton objet : tape sur ta voiture (ou sur la case en haut, ou le bouton OBJET)'],
    'Les caisses « ? »': ['TURBO : gros coup de vitesse', 'MISSILE : part devant toi et fait tourner la première voiture touchée', 'HUILE : tu la lâches derrière toi', 'BOUCLIER : 8 secondes protégé, et tu roules vite même dans l\'herbe', 'ÉCLAIR : ralentit tous les autres pendant 3 secondes', 'TRIPLE MISSILE : trois missiles, un par tape', 'ÉTOILE : 6 secondes invincible et plus rapide, tu bouscules tout le monde', 'AIMANT : attire les pièces autour de toi', 'BOMBE : lancée devant, elle explose et fait tourner tous ceux qui sont près', 'GLAÇON : gèle la voiture juste devant toi', 'Plus tu es loin derrière, meilleurs sont les objets'],
    'Sur la piste': ['Pièces : chacune te rend un peu plus rapide (jusqu\'à 10)', 'Flèches jaunes : accélération gratuite', 'Flaques d\'huile : tête-à-queue', 'Dans l\'herbe tu roules deux fois moins vite'],
    'Astuce': t === 0 ? 'La voiture t\'aide à suivre la route : vise les pièces et les caisses.' : 'Garde un bouclier quand tu es en tête : les autres te visent avec leurs missiles.'
  })
};
