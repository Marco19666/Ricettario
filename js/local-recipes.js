// Piccolo archivio iniziale di ricette originali in italiano.
// Le schede sono curate per Ricettario; non dipendono da servizi esterni.
export const LOCAL_RECIPES = [
  {
    id: 'local-carbonara',
    title: 'Spaghetti alla carbonara',
    category: 'Primi piatti',
    area: 'Lazio',
    photoUrl: '',
    ingredients: [
      { name: 'Spaghetti', measure: '320 g' },
      { name: 'Guanciale', measure: '150 g' },
      { name: 'Tuorli', measure: '4' },
      { name: 'Pecorino romano grattugiato', measure: '50 g' },
      { name: 'Pepe nero', measure: 'q.b.' },
      { name: 'Sale', measure: 'per l’acqua' }
    ],
    instructions: 'Porta a bollore una pentola d’acqua, sala con moderazione e cuoci gli spaghetti. Taglia il guanciale a listarelle e rosolalo in padella a fuoco medio, senza aggiungere olio, finché diventa dorato. In una ciotola mescola i tuorli con pecorino e abbondante pepe, fino a ottenere una crema. Conserva un po’ di acqua di cottura e scola la pasta al dente. Fuori dal fuoco unisci gli spaghetti al guanciale, poi incorpora la crema di tuorli mescolando rapidamente. Regola la consistenza con poca acqua di cottura e servi subito.'
  },
  {
    id: 'local-amatriciana',
    title: 'Bucatini all’amatriciana',
    category: 'Primi piatti',
    area: 'Lazio',
    photoUrl: '',
    ingredients: [
      { name: 'Bucatini', measure: '320 g' },
      { name: 'Guanciale', measure: '150 g' },
      { name: 'Pomodori pelati', measure: '400 g' },
      { name: 'Pecorino romano', measure: '60 g' },
      { name: 'Peperoncino', measure: 'facoltativo' },
      { name: 'Sale', measure: 'q.b.' }
    ],
    instructions: 'Taglia il guanciale a listarelle e rosolalo in una padella finché il grasso diventa trasparente e la carne croccante. Togli momentaneamente il guanciale e tienilo da parte. Nella stessa padella aggiungi i pelati schiacciati e, se gradito, poco peperoncino. Cuoci il sugo per circa 15 minuti. Nel frattempo lessa i bucatini in acqua salata e scolali al dente. Versali nella padella con il pomodoro, aggiungi il guanciale e salta per un minuto. Completa con pecorino grattugiato e servi caldo.'
  },
  {
    id: 'local-pesto-genovese',
    title: 'Pesto alla genovese',
    category: 'Salse e condimenti',
    area: 'Liguria',
    photoUrl: '',
    ingredients: [
      { name: 'Basilico fresco', measure: '50 g' },
      { name: 'Olio extravergine d’oliva', measure: '100 ml' },
      { name: 'Parmigiano Reggiano', measure: '70 g' },
      { name: 'Pecorino', measure: '30 g' },
      { name: 'Pinoli', measure: '30 g' },
      { name: 'Aglio', measure: '1 spicchio piccolo' },
      { name: 'Sale grosso', measure: 'un pizzico' }
    ],
    instructions: 'Lava delicatamente le foglie di basilico e asciugale molto bene. Metti nel mortaio (oppure nel mixer usato a impulsi) l’aglio con il sale e pestalo. Aggiungi i pinoli e riduci in crema. Unisci il basilico poco alla volta, lavorandolo senza scaldarlo. Incorpora i formaggi grattugiati e versa l’olio a filo fino a ottenere una salsa omogenea. Se il pesto è troppo denso, ammorbidiscilo con un cucchiaio di acqua di cottura della pasta. Conserva in frigorifero coperto da un velo d’olio e consumalo in breve tempo.'
  },
  {
    id: 'local-risotto-zucca',
    title: 'Risotto alla zucca',
    category: 'Primi piatti',
    area: 'Lombardia',
    photoUrl: '',
    ingredients: [
      { name: 'Riso Carnaroli', measure: '320 g' },
      { name: 'Zucca pulita', measure: '400 g' },
      { name: 'Brodo vegetale caldo', measure: '1 l circa' },
      { name: 'Cipolla', measure: 'mezza' },
      { name: 'Burro', measure: '40 g' },
      { name: 'Parmigiano grattugiato', measure: '50 g' },
      { name: 'Vino bianco', measure: 'mezzo bicchiere' },
      { name: 'Olio extravergine d’oliva', measure: '2 cucchiai' }
    ],
    instructions: 'Taglia la zucca a cubetti. Trita la cipolla e falla appassire in casseruola con l’olio e metà del burro. Aggiungi la zucca e cuoci per 8-10 minuti, versando un mestolino di brodo se necessario. Unisci il riso e tostalo per un paio di minuti. Sfuma con il vino bianco e lascia evaporare. Porta il risotto a cottura aggiungendo il brodo caldo poco alla volta e mescolando spesso. Quando il riso è al dente, spegni il fuoco e manteca con il burro rimasto e il parmigiano. Lascia riposare un minuto e servi.'
  },
  {
    id: 'local-caprese',
    title: 'Insalata caprese',
    category: 'Antipasti',
    area: 'Campania',
    photoUrl: '',
    ingredients: [
      { name: 'Pomodori maturi', measure: '3' },
      { name: 'Mozzarella fiordilatte', measure: '250 g' },
      { name: 'Basilico fresco', measure: 'alcune foglie' },
      { name: 'Olio extravergine d’oliva', measure: 'q.b.' },
      { name: 'Sale', measure: 'q.b.' },
      { name: 'Origano', measure: 'facoltativo' }
    ],
    instructions: 'Lava e asciuga i pomodori, poi tagliali a fette regolari. Scola la mozzarella e affettala. Disponi pomodoro e mozzarella alternandoli su un piatto da portata. Aggiungi le foglie di basilico, condisci con olio extravergine e poco sale. Se ti piace, completa con un pizzico di origano. Lascia insaporire per qualche minuto e servi a temperatura ambiente.'
  },
  {
    id: 'local-tiramisu',
    title: 'Tiramisù classico',
    category: 'Dolci',
    area: 'Veneto',
    photoUrl: '',
    ingredients: [
      { name: 'Savoiardi', measure: '250 g' },
      { name: 'Mascarpone', measure: '500 g' },
      { name: 'Uova freschissime', measure: '4' },
      { name: 'Zucchero', measure: '100 g' },
      { name: 'Caffè espresso freddo', measure: '300 ml' },
      { name: 'Cacao amaro', measure: 'q.b.' }
    ],
    instructions: 'Prepara il caffè e lascialo raffreddare. Separa tuorli e albumi. Monta i tuorli con lo zucchero fino a ottenere un composto chiaro, poi incorpora il mascarpone poco alla volta. In una ciotola pulita monta gli albumi a neve e incorporali delicatamente alla crema con movimenti dal basso verso l’alto. Bagna rapidamente i savoiardi nel caffè e disponili in una pirofila. Copri con uno strato di crema e ripeti gli strati. Completa con la crema, copri e lascia riposare in frigorifero per almeno 4 ore. Spolvera con cacao amaro prima di servire. Per sicurezza alimentare, usa uova pastorizzate se il dolce è destinato a persone fragili.'
  },
  {
    id: 'local-pasta-pomodoro',
    title: 'Pasta al pomodoro e basilico',
    category: 'Primi piatti',
    area: 'Cucina italiana',
    photoUrl: '',
    ingredients: [
      { name: 'Pasta corta o spaghetti', measure: '320 g' },
      { name: 'Pomodori pelati', measure: '400 g' },
      { name: 'Aglio', measure: '1 spicchio' },
      { name: 'Olio extravergine d’oliva', measure: '2 cucchiai' },
      { name: 'Basilico fresco', measure: 'alcune foglie' },
      { name: 'Sale', measure: 'q.b.' }
    ],
    instructions: 'Scalda l’olio in una padella con lo spicchio d’aglio schiacciato. Quando profuma, aggiungi i pomodori pelati e schiacciali con una forchetta. Sala e cuoci a fuoco dolce per 15-20 minuti, poi elimina l’aglio e aggiungi il basilico spezzettato. Cuoci la pasta in acqua salata, scolala al dente conservando poca acqua di cottura. Trasferiscila nel sugo e mescola per un minuto, aggiungendo acqua se serve. Servi subito.'
  },
  {
    id: 'local-patate-forno',
    title: 'Patate al forno croccanti',
    category: 'Contorni',
    area: 'Cucina italiana',
    photoUrl: '',
    ingredients: [
      { name: 'Patate', measure: '800 g' },
      { name: 'Rosmarino', measure: '2 rametti' },
      { name: 'Aglio', measure: '2 spicchi' },
      { name: 'Olio extravergine d’oliva', measure: '3 cucchiai' },
      { name: 'Sale e pepe', measure: 'q.b.' }
    ],
    instructions: 'Scalda il forno a 200 °C. Lava e sbuccia le patate, poi tagliale a spicchi di dimensioni simili. Sciacquale e asciugale molto bene. Condiscile in una ciotola con olio, sale, pepe, rosmarino e aglio schiacciato. Disponile in un solo strato su una teglia, senza sovrapporle. Cuoci per 35-45 minuti, girandole a metà cottura, finché sono dorate fuori e morbide al centro.'
  }
];
