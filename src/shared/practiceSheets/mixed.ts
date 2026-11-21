// Hojas mixtas: un poco de Part 1, 2 y 3 en textos cortos. Contenido original.
import { gap, mc, wf, type SheetSpec } from './helpers'

export const MIXED: SheetSpec[] = [
  {
    title: 'All about coffee',
    topic: 'Comida y bebida',
    focus: 'Repaso de Use of English: Parts 1, 2 y 3',
    tasks: [
      {
        type: 'mcCloze',
        title: 'The world’s favourite drink',
        text: 'Coffee is one of the most widely {1} drinks in the world, with around two billion cups drunk every day. According to legend, its effects were first {2} by a goat herder in Ethiopia, who noticed that his animals became unusually lively after eating the berries of a certain plant. Whether or not the story is true, coffee soon {3} on, spreading to Arabia and later to Europe. Today, it plays a central {4} in many cultures. For many people, the day simply can’t {5} without a cup.',
        items: [
          mc(['consumed', 'eaten', 'taken', 'swallowed'], 'A', '«Widely consumed» = muy consumido.'),
          mc(['discovered', 'invented', 'created', 'produced'], 'A', 'Los efectos se descubren; no se inventan.'),
          mc(['caught', 'took', 'held', 'got'], 'A', '«Catch on» = ponerse de moda.'),
          mc(['role', 'act', 'place', 'position'], 'A', '«Play a role» = desempeñar un papel.'),
          mc(['begin', 'open', 'launch', 'initiate'], 'A', '«The day begins» = el día empieza.')
        ]
      },
      {
        type: 'openCloze',
        title: 'Too much of a good thing?',
        text: 'Is coffee good or bad {1} you? The answer depends largely on how much you drink. Most experts agree that up to four cups a day is safe for healthy adults, and some studies suggest it may {2} reduce the risk of certain diseases. However, too much can cause headaches and make it hard to sleep, especially {3} you have it late in the day. It’s also worth remembering that {4} body reacts differently. The key, {5} with most things, is moderation.',
        items: [
          gap('for', '«Good/bad for you».'),
          gap('even', '«May even» = incluso puede.'),
          gap(['if', 'when'], 'Condición: «especially if…».'),
          gap(['every', 'each'], '«Every/each body» (singular).'),
          gap('as', '«As with most things» = como con casi todo.')
        ]
      },
      {
        type: 'wordFormation',
        title: 'Coffee shops',
        text: 'In recent years, coffee shops have become {1} popular places to work and study. Many offer free Wi-Fi and a {2} atmosphere, and for people who work from home they provide a {3} change of scene. However, some owners now limit how long customers can stay, since people who spend hours over a single coffee are not very {4} for the business. {5}, most customers understand and are happy to buy another drink.',
        items: [
          wf('INCREASE', 'increasingly', 'Adverbio: cada vez más.'),
          wf('RELAX', ['relaxed', 'relaxing'], 'Adjetivo delante de «atmosphere».'),
          wf('PLEASE', 'pleasant', 'Adjetivo: agradable.'),
          wf('PROFIT', 'profitable', 'Adjetivo: rentable.'),
          wf('FORTUNATE', 'Fortunately', 'Adverbio al inicio de la frase.')
        ]
      }
    ]
  },
  {
    title: 'Life on two wheels',
    topic: 'Transporte',
    focus: 'Repaso de Use of English: Parts 1, 2 y 3',
    tasks: [
      {
        type: 'mcCloze',
        title: 'Two wheels good',
        text: 'Cycling to work has {1} in popularity in many European cities. It’s cheap, healthy and, in heavy traffic, often faster than driving. Many cities have {2} money into building safe bike lanes, and some companies even offer staff a shower and a place to {3} their bikes. Of course, cycling in the rain is not much fun, and some people are put off by the idea of sharing the road {4} cars and lorries. But those who make the {5} rarely regret it.',
        items: [
          mc(['grown', 'raised', 'lifted', 'built'], 'A', '«Grow in popularity» = ganar popularidad.'),
          mc(['put', 'spent', 'given', 'paid'], 'A', '«Put money into» = invertir en.'),
          mc(['park', 'stop', 'rest', 'sit'], 'A', '«Park a bike» = aparcar.'),
          mc(['with', 'to', 'by', 'for'], 'A', '«Share something with someone».'),
          mc(['switch', 'turn', 'exchange', 'swap'], 'A', '«Make the switch» = hacer el cambio.')
        ]
      },
      {
        type: 'openCloze',
        title: 'Learning to ride',
        text: 'Most people learn to ride a bike {1} children, but some never get the chance. In several cities, there are now classes for adults {2} want to learn. Instructors say the biggest obstacle is not balance but fear. “Adults are much more afraid of falling {3} children,” says one teacher. “Children just get back on.” Students don’t move on to busy streets {4} they feel completely confident, and most can ride on their {5} after just a few lessons.',
        items: [
          gap('as', '«As children» = de niños.'),
          gap(['who', 'that'], 'Relativo para personas.'),
          gap('than', 'Comparativo: «more afraid… than».'),
          gap(['until', 'till', 'unless'], '«Until» = hasta que.'),
          gap('own', '«On their own» = solos.')
        ]
      },
      {
        type: 'wordFormation',
        title: 'Bike sharing',
        text: 'Bike-sharing schemes have been a great {1} in many cities. Users can pick up a bike at one station and leave it at another, which is very {2}. Electric bikes are especially popular with older riders, as they make hills much less {3}. However, there have been problems with {4}, and in some cities bikes left {5} on pavements have caused complaints.',
        items: [
          wf('SUCCEED', 'success', 'Sustantivo tras «a great».'),
          wf('CONVENIENCE', 'convenient', 'Adjetivo: práctico.'),
          wf('TIRE', 'tiring', 'Adjetivo en -ing: que cansa.'),
          wf('VANDAL', 'vandalism', 'Sustantivo: vandalismo.'),
          wf('CARE', 'carelessly', 'Adverbio negativo: sin cuidado.')
        ]
      }
    ]
  },
  {
    title: 'Game night',
    topic: 'Ocio',
    focus: 'Repaso de Use of English: Parts 1, 2 y 3',
    tasks: [
      {
        type: 'mcCloze',
        title: 'The board game revival',
        text: 'You might think that in the age of video games, board games would have {1} out of fashion. In fact, the opposite is true. Sales have {2} in recent years, and board game cafés are opening in cities around the world. Fans say that games {3} people together in a way that screens can’t. “It’s a completely different {4},” says one café owner. Some new games are so popular that they {5} out within days of being released.',
        items: [
          mc(['gone', 'moved', 'come', 'left'], 'A', '«Go out of fashion» = pasar de moda.'),
          mc(['soared', 'flown', 'raised', 'lifted'], 'A', '«Soar» = dispararse. «Raise» necesita objeto.'),
          mc(['bring', 'take', 'put', 'hold'], 'A', '«Bring people together» = unir a la gente.'),
          mc(['experience', 'practice', 'event', 'occasion'], 'A', '«A different experience».'),
          mc(['sell', 'go', 'give', 'buy'], 'A', '«Sell out» = agotarse.')
        ]
      },
      {
        type: 'openCloze',
        title: 'Win or lose',
        text: 'Playing games can teach children important lessons, {1} as how to wait their turn and how to lose gracefully. Psychologists say that letting children win every time is not a good idea, {2} it doesn’t prepare them for real life. On the {3} hand, losing all the time can be discouraging. The best approach is to choose games {4} depend partly on luck. And {5} matter who wins, the most important thing is to have fun together.',
        items: [
          gap('such', '«Such as» = como (ejemplos).'),
          gap(['as', 'because', 'since'], 'Conjunción causal.'),
          gap('other', '«On the other hand» = por otro lado.'),
          gap(['that', 'which'], 'Relativo para cosas.'),
          gap('no', '«No matter who» = da igual quién.')
        ]
      },
      {
        type: 'wordFormation',
        title: 'Designing a game',
        text: 'Designing a board game is harder than it looks. A good game needs rules that are simple to learn but offer almost {1} possibilities. The {2} must test it hundreds of times to make sure that no single strategy is {3}. Interestingly, many of today’s best-selling games were {4} created by amateurs who turned their hobby into a {5} business.',
        items: [
          wf('END', 'endless', 'Adjetivo con -less: infinitas.'),
          wf('DESIGN', 'designer', 'Persona: el diseñador.'),
          wf('BEAT', 'unbeatable', 'Adjetivo negativo: imbatible.'),
          wf('ORIGIN', 'originally', 'Adverbio: originalmente.'),
          wf('SUCCEED', 'successful', 'Adjetivo delante de «business».')
        ]
      }
    ]
  },
  {
    title: 'Busy bees',
    topic: 'Naturaleza',
    focus: 'Repaso de Use of English: Parts 1, 2 y 3',
    tasks: [
      {
        type: 'mcCloze',
        title: 'Why bees matter',
        text: 'Bees play a {1} role in our lives. Around a third of the food we eat depends on them, because they carry pollen from one flower to another. Without bees, many fruits and vegetables would become {2} and expensive. Sadly, bee populations have been {3} in many parts of the world. The good news is that everyone can {4} a difference. Leaving part of your garden to grow wild can help, {5} it may look a little untidy.',
        items: [
          mc(['vital', 'lively', 'living', 'lifelong'], 'A', '«A vital role» = un papel fundamental.'),
          mc(['scarce', 'lacking', 'seldom', 'few'], 'A', '«Scarce» = escaso.'),
          mc(['declining', 'lessening', 'lowering', 'reducing'], 'A', '«Decline» = disminuir (intransitivo).'),
          mc(['make', 'do', 'give', 'take'], 'A', '«Make a difference».'),
          mc(['even if', 'unless', 'so that', 'in case'], 'A', '«Even if» = aunque.')
        ]
      },
      {
        type: 'openCloze',
        title: 'Bees on the roof',
        text: 'Keeping bees has become a popular hobby, even {1} cities. Rooftop hives can now be found on hotels, offices and schools. Beginners are often surprised {2} how calm bees are. A healthy hive can produce {3} much as thirty kilos of honey a year, {4} is far more than most families can eat. Many beekeepers sell {5} they don’t need at local markets.',
        items: [
          gap('in', '«In cities».'),
          gap(['by', 'at'], '«Surprised by/at».'),
          gap('as', '«As much as» = hasta.'),
          gap('which', '«Which» se refiere a toda la idea anterior.'),
          gap('what', '«What» = lo que.')
        ]
      },
      {
        type: 'wordFormation',
        title: 'Liquid gold',
        text: 'Honey has been used as food and medicine for thousands of years. Archaeologists have even found pots of honey in ancient tombs that were still {1}. This is because honey contains very little water, which makes it almost {2}. Many people use it as a {3} remedy for sore throats, and there is some {4} evidence that it works. {5}, honey should never be given to babies under one year old.',
        items: [
          wf('EAT', 'edible', 'Adjetivo: comestible.'),
          wf('DESTROY', 'indestructible', 'Adjetivo negativo: indestructible.'),
          wf('NATURE', 'natural', 'Adjetivo: natural.'),
          wf('SCIENCE', 'scientific', 'Adjetivo: científica.'),
          wf('FORTUNATE', 'Unfortunately', 'Adverbio negativo: por desgracia.')
        ]
      }
    ]
  },
  {
    title: 'A night at the museum',
    topic: 'Cultura',
    focus: 'Repaso de Use of English: Parts 1, 2 y 3',
    tasks: [
      {
        type: 'mcCloze',
        title: 'Museums for everyone',
        text: 'Museums used to have a {1} for being quiet, serious places where you weren’t allowed to touch anything. Today, interactive exhibitions allow visitors to {2} part rather than just look. The aim is to {3} new audiences, particularly young people who might never have {4} foot in a museum before. Critics say museums are becoming too much like theme parks, but supporters say it’s better than {5} empty halls.',
        items: [
          mc(['reputation', 'fame', 'glory', 'image'], 'A', '«Have a reputation for» = tener fama de.'),
          mc(['take', 'have', 'do', 'play'], 'A', '«Take part» = participar.'),
          mc(['attract', 'collect', 'pull', 'gather'], 'A', '«Attract audiences» = atraer público.'),
          mc(['set', 'put', 'placed', 'stepped'], 'A', '«Set foot in» = pisar un lugar.'),
          mc(['having', 'owning', 'keeping', 'making'], 'A', '«Having empty halls» = tener salas vacías.')
        ]
      },
      {
        type: 'openCloze',
        title: 'Sleeping with dinosaurs',
        text: 'Last year, I spent a night in a natural history museum {1} part of a special event for families. We were given torches and {2} to explore the galleries in the dark. The dinosaur skeletons looked {3} more impressive by torchlight! I didn’t sleep much, but it was {4} of the best experiences I’ve ever had. I’d recommend it to anyone, {5} of their age.',
        items: [
          gap('as', '«As part of» = como parte de.'),
          gap(['allowed', 'invited', 'encouraged', 'told', 'asked'], 'Pasiva + infinitivo: «were allowed to…».'),
          gap(['even', 'much', 'far'], 'Refuerzo del comparativo.'),
          gap('one', '«One of the best…».'),
          gap(['regardless', 'irrespective'], '«Regardless of» = sin importar.')
        ]
      },
      {
        type: 'wordFormation',
        title: 'Behind the scenes',
        text: 'Most of a museum’s {1} is never on display. Thousands of objects are kept in storage, where {2} look after them. Some items are so {3} that their location is kept secret. Temperature and humidity must be {4} controlled, as even small changes can cause {5} damage.',
        items: [
          wf('COLLECT', 'collection', 'Sustantivo: la colección.'),
          wf('SPECIAL', 'specialists', 'Persona y plural: especialistas.'),
          wf('VALUE', 'valuable', 'Adjetivo: valiosos.'),
          wf('CARE', 'carefully', 'Adverbio: con cuidado.'),
          wf('REPAIR', 'irreparable', 'Adjetivo negativo: irreparable.')
        ]
      }
    ]
  },
  {
    title: 'What’s the weather like?',
    topic: 'Tiempo',
    focus: 'Repaso de Use of English: Parts 1, 2 y 3',
    tasks: [
      {
        type: 'mcCloze',
        title: 'Lovely day, isn’t it?',
        text: 'It’s often said that the British {1} about the weather more than any other nation. In fact, it’s such a common topic that it {2} as a kind of social glue. Comments like “Lovely day, isn’t it?” aren’t really about the weather at all; they’re a way of {3} up a conversation with a stranger. The {4} answer is almost always to agree. Disagreeing, even if it’s {5} with rain, can seem slightly rude!',
        items: [
          mc(['talk', 'say', 'tell', 'discuss'], 'A', '«Talk about». «Discuss» no lleva «about».'),
          mc(['acts', 'makes', 'does', 'plays'], 'A', '«Act as» = funcionar como.'),
          mc(['striking', 'hitting', 'knocking', 'beating'], 'A', '«Strike up a conversation» = entablar una conversación.'),
          mc(['polite', 'kind', 'nice', 'gentle'], 'A', '«The polite answer» = la respuesta educada.'),
          mc(['pouring', 'falling', 'dropping', 'spilling'], 'A', '«Pouring with rain» = lloviendo a cántaros.')
        ]
      },
      {
        type: 'openCloze',
        title: 'Can animals predict the weather?',
        text: 'People have long believed that animals can sense changes in the weather {1} they happen. Birds tend to fly lower before a storm, possibly {2} the drop in air pressure makes it harder for them to fly high. {3} the evidence is limited, it’s fun to watch for these signs. Just don’t cancel your picnic {4} of a cow lying down — check the forecast {5} well!',
        items: [
          gap('before', '«Before» = antes de que.'),
          gap(['because', 'as', 'since'], 'Conjunción causal.'),
          gap(['Although', 'Though', 'While'], 'Concesión: aunque.'),
          gap('because', '«Because of» = por culpa de.'),
          gap('as', '«As well» = también.')
        ]
      },
      {
        type: 'wordFormation',
        title: 'Extreme weather',
        text: 'Scientists warn that extreme weather events are becoming more {1}. Heatwaves, floods and storms are causing {2} damage, and many regions are {3} for the consequences. Improving weather {4} is a priority, so that people can be {5} in good time.',
        items: [
          wf('FREQUENCY', 'frequent', 'Adjetivo: frecuentes.'),
          wf('WIDE', 'widespread', 'Adjetivo compuesto: generalizados.'),
          wf('PREPARE', 'unprepared', 'Adjetivo negativo: sin preparar.'),
          wf('PREDICT', 'predictions', 'Sustantivo plural: predicciones.'),
          wf('WARN', 'warned', 'Participio en pasiva: «be warned».')
        ]
      }
    ]
  },
  {
    title: 'The modern library',
    topic: 'Cultura',
    focus: 'Repaso de Use of English: Parts 1, 2 y 3',
    tasks: [
      {
        type: 'mcCloze',
        title: 'More than just books',
        text: 'Some people believe libraries will soon {1} a thing of the past. But in many towns, libraries are busier than ever. As well as lending books, they {2} a wide range of services, from computer classes to homework clubs. For many people, they are also a place to meet others and {3} friends. “It’s one of the few places where you don’t have to {4} money to be welcome,” says one librarian. Many people would {5} with that.',
        items: [
          mc(['become', 'turn', 'get', 'grow'], 'A', '«Become a thing of the past» = pasar a la historia.'),
          mc(['offer', 'hand', 'serve', 'present'], 'A', '«Offer services» = ofrecer servicios.'),
          mc(['make', 'do', 'get', 'take'], 'A', '«Make friends» = hacer amigos.'),
          mc(['spend', 'pay', 'cost', 'buy'], 'A', '«Spend money» = gastar dinero.'),
          mc(['agree', 'accept', 'approve', 'admit'], 'A', '«Agree with» = estar de acuerdo con.')
        ]
      },
      {
        type: 'openCloze',
        title: 'The library cat',
        text: 'For more than ten years, a cat called Biscuit lived in a small public library in Scotland. Visitors came {1} all over the country to meet him. He spent {2} days sleeping on shelves and sitting on readers’ laps. When he died, {3} than fifty newspapers reported the news. A book about his life became a bestseller, {4} proves that people never get tired {5} a good animal story.',
        items: [
          gap('from', '«From all over» = de todas partes.'),
          gap('his', 'Posesivo: «his days».'),
          gap('more', '«More than» = más de.'),
          gap('which', '«Which» se refiere a toda la idea anterior.'),
          gap('of', '«Get tired of» = cansarse de.')
        ]
      },
      {
        type: 'wordFormation',
        title: 'Quiet, please',
        text: 'Libraries are traditionally places of {1}, but many now have areas where talking is {2}. Group study rooms are especially popular with students {3} for exams. Librarians say this {4} has attracted new users, though some regular visitors find the extra noise {5}.',
        items: [
          wf('SILENT', 'silence', 'Sustantivo: el silencio.'),
          wf('PERMIT', 'permitted', 'Participio: permitido.'),
          wf('PREPARE', 'preparing', 'Participio en -ing: que se preparan.'),
          wf('FLEXIBLE', 'flexibility', 'Sustantivo: flexibilidad.'),
          wf('ANNOY', 'annoying', 'Adjetivo en -ing: molesto.')
        ]
      }
    ]
  },
  {
    title: 'Grow your own',
    topic: 'Jardinería',
    focus: 'Repaso de Use of English: Parts 1, 2 y 3',
    tasks: [
      {
        type: 'mcCloze',
        title: 'A garden on your balcony',
        text: 'You don’t need a large garden to grow your own vegetables. Herbs, tomatoes and even strawberries can be grown {1} in pots on a balcony. Experts say it’s best to start small and {2} on a few easy plants. Water them regularly, but be careful not to {3} it. Growing your own food also gives you a greater {4} for the work that goes into producing what we buy. And it’s a great way to {5} off after a stressful day.',
        items: [
          mc(['successfully', 'luckily', 'fortunately', 'hopefully'], 'A', '«Successfully» = con éxito.'),
          mc(['concentrate', 'centre', 'pay', 'attend'], 'A', '«Concentrate on» = centrarse en.'),
          mc(['overdo', 'overtake', 'overcome', 'overlook'], 'A', '«Overdo it» = pasarse.'),
          mc(['appreciation', 'estimation', 'thanks', 'valuation'], 'A', '«Appreciation for» = valoración de.'),
          mc(['switch', 'turn', 'put', 'take'], 'A', '«Switch off» = desconectar, relajarse.')
        ]
      },
      {
        type: 'openCloze',
        title: 'The community garden',
        text: 'Five years ago, the empty land behind our flats was full of rubbish. Now it’s a community garden, {1} neighbours grow vegetables together. It all started when two residents asked the council {2} they could clean it up. Today more than forty families take part, and there’s {3} waiting list. “It’s not {4} about vegetables,” says one of the founders. Every September they hold a harvest party {5} which everyone is invited.',
        items: [
          gap('where', '«Where» = donde.'),
          gap(['if', 'whether'], 'Pregunta indirecta: si podían…'),
          gap('a', '«A waiting list».'),
          gap(['just', 'only'], '«Not just/only» = no solo.'),
          gap('to', '«Invite someone to something» → «to which».')
        ]
      },
      {
        type: 'wordFormation',
        title: 'Good for body and mind',
        text: 'Research shows that gardening is good for both {1} and mental health. Regular {2} in the open air can improve sleep and reduce {3}. In some countries, doctors now give {4} for gardening rather than {5}.',
        items: [
          wf('PHYSICS', 'physical', 'Adjetivo: física.'),
          wf('ACTIVE', 'activity', 'Sustantivo: actividad.'),
          wf('ANXIOUS', 'anxiety', 'Sustantivo: ansiedad.'),
          wf('PRESCRIBE', 'prescriptions', 'Sustantivo plural: recetas.'),
          wf('MEDICINE', 'medication', 'Sustantivo: medicación.')
        ]
      }
    ]
  },
  {
    title: 'Sweet history',
    topic: 'Comida',
    focus: 'Repaso de Use of English: Parts 1, 2 y 3',
    tasks: [
      {
        type: 'mcCloze',
        title: 'The story of chocolate',
        text: 'The ancient Maya and Aztecs {1} cacao beans so highly that they used them as money. Their chocolate was a bitter drink, often {2} with chilli. When cacao reached Europe in the sixteenth century, sugar was added to {3} the drink. For a long time, chocolate was a luxury that only the rich could {4}. It wasn’t until the nineteenth century that new machines made it possible to produce solid chocolate {5} a large scale.',
        items: [
          mc(['valued', 'priced', 'costed', 'charged'], 'A', '«Value highly» = valorar mucho.'),
          mc(['flavoured', 'tasted', 'cooked', 'eaten'], 'A', '«Flavoured with» = con sabor a.'),
          mc(['sweeten', 'soften', 'lighten', 'brighten'], 'A', '«Sweeten» = endulzar.'),
          mc(['afford', 'pay', 'spend', 'earn'], 'A', '«Afford» = permitirse.'),
          mc(['on', 'in', 'at', 'by'], 'A', '«On a large scale» = a gran escala.')
        ]
      },
      {
        type: 'openCloze',
        title: 'Is chocolate good for you?',
        text: 'Good news for chocolate lovers: dark chocolate may actually be good {1} your health. It contains substances that can help protect the heart, {2} long as you don’t eat too much of it. Milk chocolate, {3} the other hand, contains more sugar and fat. Experts recommend choosing chocolate with {4} least 70% cocoa. A small piece is a treat, but a whole bar every day is {5} from healthy!',
        items: [
          gap('for', '«Good for».'),
          gap(['as', 'so'], '«As long as» = siempre que.'),
          gap('on', '«On the other hand».'),
          gap('at', '«At least» = al menos.'),
          gap('far', '«Far from» = lejos de.')
        ]
      },
      {
        type: 'wordFormation',
        title: 'A dream job?',
        text: 'Professional chocolate tasters have one of the most {1} jobs in the world. But it requires a great deal of {2}. Tasters must be able to identify subtle {3} in flavour and describe them {4}. Surprisingly, many eat very little chocolate in their free time, as it could affect their {5}.',
        items: [
          wf('ENVY', 'enviable', 'Adjetivo: envidiable.'),
          wf('TRAIN', 'training', 'Sustantivo: formación.'),
          wf('DIFFER', 'differences', 'Sustantivo plural.'),
          wf('ACCURATE', 'accurately', 'Adverbio: con precisión.'),
          wf('SENSITIVE', 'sensitivity', 'Sustantivo: sensibilidad.')
        ]
      }
    ]
  },
  {
    title: 'Are you listening?',
    topic: 'Medios',
    focus: 'Repaso de Use of English: Parts 1, 2 y 3',
    tasks: [
      {
        type: 'mcCloze',
        title: 'The podcast boom',
        text: 'Podcasts have {1} off in a big way over the past decade. There are now millions of them, {2} everything from history to comedy. Part of their appeal is that you can listen while doing something else, such as driving or {3} the housework. Many listeners feel a personal {4} with the presenters. Starting a podcast is easy, but building an audience is a different {5} altogether.',
        items: [
          mc(['taken', 'set', 'gone', 'made'], 'A', '«Take off» = despegar, triunfar.'),
          mc(['covering', 'treating', 'containing', 'holding'], 'A', '«Cover a topic» = tratar un tema.'),
          mc(['doing', 'making', 'having', 'taking'], 'A', '«Do the housework».'),
          mc(['connection', 'relation', 'contact', 'link'], 'A', '«Feel a connection with».'),
          mc(['story', 'tale', 'case', 'history'], 'A', '«A different story» = otra cosa muy distinta.')
        ]
      },
      {
        type: 'openCloze',
        title: 'My first episode',
        text: 'When I started my podcast, I had no idea {1} I was doing. Only twelve people listened to {2}, and most of them were my relatives. But I kept going. I invested {3} a decent microphone and started inviting interesting guests. My advice is simple: don’t wait {4} everything is perfect. Just start, and learn as you go {5}.',
        items: [
          gap('what', '«No idea what» = ni idea de lo que.'),
          gap('it', '«It» = el primer episodio.'),
          gap('in', '«Invest in» = invertir en.'),
          gap(['until', 'till'], '«Until» = hasta que.'),
          gap('along', '«As you go along» = sobre la marcha.')
        ]
      },
      {
        type: 'wordFormation',
        title: 'The perfect host',
        text: 'What makes a great podcast presenter? A pleasant voice helps, but {1} matters more. {2} is also key, though the best hosts make their conversations sound {3} natural. Listeners can quickly tell when someone is being {4}, so {5} is essential.',
        items: [
          wf('PERSON', 'personality', 'Sustantivo: personalidad.'),
          wf('PREPARE', 'Preparation', 'Sustantivo al inicio de la frase.'),
          wf('COMPLETE', 'completely', 'Adverbio que modifica a «natural».'),
          wf('HONEST', 'dishonest', 'Adjetivo negativo: deshonesto.'),
          wf('AUTHENTIC', 'authenticity', 'Sustantivo: autenticidad.')
        ]
      }
    ]
  }
]
