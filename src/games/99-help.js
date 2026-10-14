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
    'Vies': t === 0 ? 'Tu as 3 cœurs.' : t === 1 ? 'Tu as 2 cœurs.' : 'Une seule vie : sois précis !'
  }),
  platform: t => ({
    'But du jeu': 'Rejoins le drapeau rose à la fin de chacun des 5 niveaux.',
    'Commandes': ['◀ ▶ pour courir', 'SAUT (ou tape l\'écran) pour sauter', 'Maintiens SAUT pour sauter plus haut, appui bref pour un petit saut'],
    'Les bestioles': ['Saute sur leur tête pour les écraser (50 points)', 'Les toucher sur le côté fait perdre un cœur', 'Escargots : lents · Blobs : moyens · Sauterelles : elles bondissent vers toi' + (t === 2 ? ' · Chauves-souris : elles volent' : '')],
    'Objets': ['Bloc « ? » : saute dessous pour le frapper (pièce ou champignon)', 'Champignon rose : il encaisse un coup à ta place', '50 pièces = 1 vie en plus', 'Drapeau vert au milieu du niveau = checkpoint'],
    'Astuce': 'Tomber dans un trou coûte un cœur mais tu reprends au dernier checkpoint.'
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
  duel: () => ({
    'But du jeu': 'Gagne 2 rounds sur 3 contre le Robot en vidant sa barre de vie.',
    'Commandes': ['◀ ▶ : bouger · SAUT : sauter', 'POING : coup rapide (8 dégâts) · PIED : coup puissant (15 dégâts) mais plus lent', 'Bas (ou S) : garde, les coups ne font presque rien'],
    'Règle': ['60 secondes par round ; s\'il reste du temps, celui qui a le plus de vie gagne', 'Les points dépendent des dégâts, de la vie restante et du temps'],
    'Astuce': 'Recule quand le Robot attaque, puis frappe au pied quand il se retourne.'
  })
};
