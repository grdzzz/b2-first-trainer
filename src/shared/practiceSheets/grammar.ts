// Hojas de gramática: Part 2 (open cloze) + Part 4 (transformaciones). Contenido original.
import { gap, tr, type SheetSpec } from './helpers'

export const GRAMMAR: SheetSpec[] = [
  {
    title: 'Old friends, new friends',
    topic: 'Amistad',
    focus: 'Relativos, artículos y expresiones fijas',
    tasks: [
      {
        type: 'openCloze',
        title: 'How many friends do we need?',
        text: 'Research suggests that most adults have {1} more than five close friends. This may seem a small number, but experts say it is {2} quality of our friendships that matters, not the quantity. Making new friends as an adult isn’t always easy. At school or university, we spend a lot of time with people {3} share our interests, but once we start working, opportunities to meet new people become less frequent.\n\n{4} order to build new friendships, psychologists recommend joining a club or taking up a hobby. It’s also important to stay in touch with old friends, even if you live {5} away from each other. A quick message or phone call can make {6} big difference. After {7}, the friends who have known us for years are often the best at understanding {8} we really feel.',
        items: [
          gap('no', '«No more than» = como mucho, no más de.'),
          gap('the', 'Artículo definido: «the quality of…» (algo concreto).'),
          gap(['who', 'that'], 'Pronombre relativo para personas.'),
          gap('In', '«In order to» = para, con el fin de.'),
          gap('far', '«Live far away» = vivir lejos.'),
          gap('a', '«Make a big difference» (sustantivo contable singular).'),
          gap('all', '«After all» = al fin y al cabo.'),
          gap(['how', 'what'], '«Understand how/what we feel»: pregunta indirecta.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I haven’t seen Laura for ages.', 'SINCE', 'It’s ages', 'Laura.', ['since I last saw', 'since I saw'], '«It’s + tiempo + since + pasado simple».'),
          tr('Lucy is my friend. I went to Italy with her last summer.', 'WHO', 'Lucy is the friend', 'to Italy with last summer.', ['who I went'], 'Relativo «who»; la preposición «with» queda al final.'),
          tr('My best friend is the most generous person I know.', 'AS', 'I don’t know anyone', 'my best friend.', ['as generous as', 'so generous as'], '«Not… anyone as + adjetivo + as».'),
          tr('Max regrets arguing with his brother.', 'WISHES', 'Max', 'with his brother.', ['wishes he hadn’t argued', 'wishes he had not argued'], '«Wish + past perfect» para lamentar algo pasado.')
        ]
      }
    ]
  },
  {
    title: 'Car-free city centres',
    topic: 'Ciudades',
    focus: 'Preposiciones, relativos y conectores',
    tasks: [
      {
        type: 'openCloze',
        title: 'Streets for people',
        text: 'More and more cities around the world are banning cars {1} their centres. Supporters of the idea argue that streets without traffic are safer, quieter and much more pleasant {2} walk in. In Pontevedra, a city in northern Spain, cars have been restricted {3} the late 1990s. Since then, the number of people living in the centre has increased, and local businesses, {4} owners were originally worried, have done well.\n\nNot everyone is convinced, {5}. Some people complain that it is harder for elderly people to get around, and that deliveries take longer. {6} these concerns, the trend seems likely to continue. As one city planner put it, “Cities should be designed for people, not for cars. {7} we had started thinking like that decades ago, our cities would be very different today.” It remains to be seen {8} other cities will follow Pontevedra’s example.',
        items: [
          gap('from', '«Ban something from a place» = prohibir en un lugar.'),
          gap('to', 'Adjetivo + infinitivo con «to»: «pleasant to walk in».'),
          gap('since', '«Since» + punto de partida con present perfect.'),
          gap('whose', '«Whose» = cuyos (posesión).'),
          gap(['though', 'however'], '«Though/however» al final = sin embargo.'),
          gap('Despite', '«Despite + sustantivo» = a pesar de.'),
          gap('If', 'Condicional mixto: «If + past perfect, would + infinitivo».'),
          gap(['whether', 'if'], '«Whether» = si (en preguntas indirectas).')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('The new park is too far away to walk to.', 'ENOUGH', 'The new park is', 'to walk to.', ['not close enough', 'not near enough'], '«Not + adjetivo + enough».'),
          tr('People say the old bridge is going to be closed.', 'SAID', 'The old bridge', 'going to be closed.', ['is said to be'], 'Pasiva impersonal: «be said to + infinitivo».'),
          tr('I’ve never been to such a noisy city.', 'NOISIEST', 'It’s', 'I have ever been to.', ['the noisiest city'], 'Superlativo + present perfect con «ever».'),
          tr('Traffic was heavy, so we arrived late.', 'BECAUSE', 'We arrived late', 'heavy traffic.', ['because of the', 'because of'], '«Because of + sustantivo» = a causa de.')
        ]
      }
    ]
  },
  {
    title: 'A job out of this world',
    topic: 'Ciencia y espacio',
    focus: 'Comparativos, conectores y expresiones fijas',
    tasks: [
      {
        type: 'openCloze',
        title: 'Life in orbit',
        text: 'Have you ever dreamed {1} becoming an astronaut? Thousands of people apply every time a space agency advertises for new recruits, but only a handful are chosen. Candidates must be in excellent physical condition, and most have a background in science or engineering. {2} is more, they need to be able to stay calm under pressure.\n\nLife on the International Space Station is not as glamorous {3} it might seem. Astronauts work long hours, and because there is no gravity, even simple tasks like eating or washing {4} to be planned carefully. {5} spite of the difficulties, almost all astronauts describe the experience as the best of their lives. Many say that seeing the Earth from space changed the {6} they think about our planet. “You realise how small and fragile it is,” {7} astronaut explained. “It makes you want to look after it {8} more.”',
        items: [
          gap(['of', 'about'], '«Dream of/about + -ing».'),
          gap('What', '«What is more» = además.'),
          gap('as', '«Not as + adjetivo + as».'),
          gap('have', '«Have to» = tener que (sujeto plural: tasks).'),
          gap('In', '«In spite of» = a pesar de.'),
          gap('way', '«The way they think» = la forma en que piensan.'),
          gap('one', '«One astronaut» = un astronauta (uno de ellos).'),
          gap(['even', 'much', 'far'], '«Even/much more» refuerza el comparativo.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('It’s possible that life exists on other planets.', 'MIGHT', 'Life', 'on other planets.', ['might exist'], '«Might + infinitivo» = puede que.'),
          tr('The launch was cancelled because of the storm.', 'CALLED', 'The launch', 'because of the storm.', ['was called off'], '«Call off» = cancelar (aquí en pasiva).'),
          tr('Nobody has ever travelled further than the Moon.', 'FURTHEST', 'The Moon is the', 'ever travelled.', ['furthest anyone has', 'furthest that anyone has', 'furthest people have'], 'Superlativo + present perfect.'),
          tr('Scientists believe the comet will be visible next year.', 'BELIEVED', 'The comet', 'visible next year.', ['is believed to be'], 'Pasiva impersonal: «be believed to + infinitivo».')
        ]
      }
    ]
  },
  {
    title: 'Why we can’t stop singing along',
    topic: 'Música',
    focus: 'Relativos, cuantificadores y preposiciones',
    tasks: [
      {
        type: 'openCloze',
        title: 'Earworms',
        text: 'Have you ever had a song stuck in your head for hours {1} end? Scientists call this an “earworm”, and almost everyone experiences it {2} time to time. Songs with simple, repetitive melodies are the most likely to cause earworms. Interestingly, the songs {3} get stuck are not necessarily ones we like.\n\nResearchers have found that one of the best ways to get rid of an earworm is to listen to the whole song, {4} than just the part that keeps repeating. Another strategy is to chew gum, {5} seems to interfere with the brain’s ability to “replay” music. Some people even try solving a puzzle, {6} as a crossword, to keep their mind busy. Whatever method you choose, don’t worry too {7}: earworms are completely harmless, and most disappear on {8} own within a few hours.',
        items: [
          gap('on', '«For hours on end» = durante horas sin parar.'),
          gap('from', '«From time to time» = de vez en cuando.'),
          gap(['that', 'which'], 'Relativo especificativo para cosas.'),
          gap('rather', '«Rather than» = en lugar de.'),
          gap('which', '«Which» tras coma: se refiere a toda la idea anterior.'),
          gap('such', '«Such as» = como (para dar ejemplos).'),
          gap('much', '«Don’t worry too much».'),
          gap('their', '«On their own» = solos, por sí mismos.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I can’t get this song out of my head.', 'RID', 'I can’t', 'this song.', ['get rid of'], '«Get rid of» = librarse de.'),
          tr('She started playing the guitar when she was ten.', 'BEEN', 'She', 'the guitar since she was ten.', ['has been playing', '’s been playing'], 'Present perfect continuous + «since».'),
          tr('“Turn the music down!” my dad said to me.', 'TOLD', 'My dad', 'the music down.', ['told me to turn'], '«Tell someone to do something» (orden en estilo indirecto).'),
          tr('I’m sure the concert wasn’t cancelled.', 'CAN’T', 'The concert', 'cancelled.', ['can’t have been', 'cannot have been'], '«Can’t have + participio» = es imposible que.')
        ]
      }
    ]
  },
  {
    title: 'Accidental inventions',
    topic: 'Historia e inventos',
    focus: 'Inversión, condicionales y preposiciones',
    tasks: [
      {
        type: 'openCloze',
        title: 'Happy accidents',
        text: 'Some of the most useful inventions in history were discovered completely {1} accident. Take the microwave oven, for example. In 1945, an engineer called Percy Spencer was working {2} radar equipment when he noticed that a chocolate bar in his pocket had melted. Curious, he placed some corn kernels near the machine, and they began to pop. {3} long afterwards, the first microwave oven was produced.\n\nAnother famous example is penicillin. When the scientist Alexander Fleming returned from holiday, he found that mould had grown on some of his experiments. {4} than throwing them away, he looked at them more closely and noticed that the mould had killed the bacteria around it. This discovery has {5} saved millions of lives. Of course, these inventors were not simply lucky. {6} they not been curious and observant, these opportunities {7} have been missed. As the saying goes, chance favours the prepared mind — and that is something {8} of us can learn from.',
        items: [
          gap('by', '«By accident» = por casualidad.'),
          gap(['on', 'with'], '«Work on/with something».'),
          gap('Not', '«Not long afterwards» = poco después.'),
          gap('Rather', '«Rather than» = en lugar de.'),
          gap('since', '«Has since saved» = ha salvado desde entonces.'),
          gap('Had', 'Inversión en el tercer condicional: «Had they not been…» = If they hadn’t been…'),
          gap(['would', 'might', 'could'], 'Tercer condicional: «would have + participio».'),
          gap('all', '«All of us» = todos nosotros.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('Fleming didn’t throw the experiments away, so he made the discovery.', 'IF', 'Fleming wouldn’t have made the discovery', 'the experiments away.', ['if he had thrown', 'if he’d thrown'], 'Tercer condicional.'),
          tr('Spencer was the first person to notice this effect.', 'NOTICED', 'Nobody', 'this effect before Spencer.', ['had noticed', 'had ever noticed'], 'Past perfect: algo anterior a otro momento del pasado.'),
          tr('It’s possible that someone else invented it first.', 'HAVE', 'Someone else', 'it first.', ['may have invented', 'might have invented', 'could have invented'], '«May/might/could have + participio» = puede que haya…'),
          tr('He was so curious that he tried again.', 'SUCH', 'He was', 'that he tried again.', ['such a curious man', 'such a curious person'], '«Such a + adjetivo + sustantivo + that».')
        ]
      }
    ]
  },
  {
    title: 'Clever crows',
    topic: 'Animales',
    focus: 'Preposiciones dependientes y comparativos dobles',
    tasks: [
      {
        type: 'openCloze',
        title: 'Birds with brains',
        text: 'Crows are among the most intelligent animals on the planet. In experiments, they have shown that they can use tools, solve puzzles and even recognise individual human faces. In {1} study, scientists wearing masks caught a few crows and then released them. Years later, the birds still reacted angrily whenever they saw someone wearing the same mask, {2} though the person was different. Even more surprisingly, crows that had never been caught joined {3}, suggesting that the birds had “told” each other about the danger.\n\nCrows are also known {4} their ability to plan ahead. Some hide food and come back for it later, and if they notice another bird watching them, they move it somewhere else. Scientists believe that this kind of behaviour requires the ability to imagine {5} another animal might be thinking. Until recently, it was thought that only humans and a few apes were capable {6} this. The more we learn about crows, the {7} we realise how much we have underestimated {8}.',
        items: [
          gap('one', '«In one study» = en un estudio.'),
          gap('even', '«Even though» = aunque.'),
          gap('in', '«Join in» = unirse (a una actividad).'),
          gap('for', '«Be known for» = ser conocido por.'),
          gap('what', '«Imagine what… might be thinking» (pregunta indirecta).'),
          gap('of', '«Be capable of» = ser capaz de.'),
          gap('more', '«The more…, the more…» = cuanto más…, más…'),
          gap('them', 'Pronombre objeto que se refiere a «crows».')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('Crows are cleverer than most other birds.', 'AS', 'Most other birds', 'crows.', ['are not as clever as', 'aren’t as clever as'], '«Not as + adjetivo + as».'),
          tr('The scientists made the crows wear tiny cameras.', 'WERE', 'The crows', 'wear tiny cameras.', ['were made to'], 'Pasiva de «make»: «be made to do».'),
          tr('I didn’t know that crows could recognise faces.', 'IDEA', 'I', 'crows could recognise faces.', ['had no idea that', 'had no idea'], '«Have no idea (that)» = no tener ni idea.'),
          tr('The crow managed to open the box.', 'SUCCEEDED', 'The crow', 'the box.', ['succeeded in opening'], '«Succeed in + -ing» = conseguir.')
        ]
      }
    ]
  },
  {
    title: 'Do you really need to post it?',
    topic: 'Redes sociales',
    focus: 'Pronombres reflexivos, auxiliares y phrasal verbs',
    tasks: [
      {
        type: 'openCloze',
        title: 'Think before you share',
        text: 'It’s hard to imagine life without social media. Many of us check our accounts dozens of times a day, often without even realising we’re doing {1}. But is it good for us? A growing number of studies suggest that spending too long online can make people feel anxious, especially if they compare {2} with others. {3} is easy to forget that most people only share the best moments of their lives.\n\nOn the other hand, social media also has its benefits. It allows us to keep in touch with friends who live far away, and it can help people {4} feel lonely find others with similar interests. The key, experts say, is to be aware of how much time you spend online. Some people turn {5} notifications, while others set a daily limit. Rather {6} giving up completely, try asking yourself a simple question before you post something: “{7} I share this if nobody could ‘like’ it?” If the answer is no, maybe it’s not worth posting {8} all.',
        items: [
          gap(['it', 'so'], '«Doing it» se refiere a «check our accounts».'),
          gap('themselves', 'Reflexivo: «compare themselves with others».'),
          gap('It', 'Sujeto vacío: «It is easy to…».'),
          gap(['who', 'that'], 'Relativo para personas.'),
          gap('off', '«Turn off» = desactivar.'),
          gap('than', '«Rather than» = en lugar de.'),
          gap('Would', 'Segundo condicional en pregunta: «Would I…if…?»'),
          gap('at', '«Not at all» = en absoluto.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I spend too much time on my phone.', 'LESS', 'I should', 'on my phone.', ['spend less time'], '«Less + sustantivo incontable».'),
          tr('She deleted the photo because she didn’t want anyone to see it.', 'AVOID', 'She deleted the photo', 'seeing it.', ['to avoid anyone', 'to avoid people', 'so as to avoid anyone'], '«Avoid + -ing / + objeto + -ing».'),
          tr('“Did you see my post?” Ella asked me.', 'WHETHER', 'Ella asked me', 'her post.', ['whether I had seen', 'whether I’d seen'], 'Pregunta indirecta con «whether» y cambio de tiempo.'),
          tr('It isn’t necessary to reply to every message.', 'NEED', 'You', 'to every message.', ['don’t need to reply', 'do not need to reply', 'needn’t reply'], '«Don’t need to / needn’t» = no hace falta.')
        ]
      }
    ]
  },
  {
    title: 'Jobs that don’t exist yet',
    topic: 'Trabajo del futuro',
    focus: 'Modales, comparativos y preposiciones',
    tasks: [
      {
        type: 'openCloze',
        title: 'The future of work',
        text: 'It is often said that many of today’s schoolchildren will end up doing jobs that don’t exist yet. Twenty years ago, few people {1} have imagined working as an app developer or a social media manager. Technology is changing the world of work {2} quickly that it is difficult to predict which skills will be needed in the future. {3} we can be sure of, however, is that some abilities will always be valuable.\n\nEmployers are increasingly looking for people {4} can communicate well, work in a team and solve problems creatively. Machines may be able to do many things better {5} humans, but they still struggle with tasks that involve empathy or imagination. For this reason, experts recommend that young people focus not only {6} technical knowledge but also on developing these “human” skills. {7} the end, the ability to adapt may be the most important skill {8} all.',
        items: [
          gap(['would', 'could'], '«Would/could have + participio»: algo hipotético en el pasado.'),
          gap('so', '«So + adverbio + that».'),
          gap('What', '«What we can be sure of» = de lo que podemos estar seguros.'),
          gap(['who', 'that'], 'Relativo para personas.'),
          gap('than', 'Comparativo: «better than».'),
          gap('on', '«Focus on» = centrarse en.'),
          gap('In', '«In the end» = al final.'),
          gap('of', '«The most important… of all».')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('Robots will probably replace some jobs.', 'LIKELY', 'Robots', 'some jobs.', ['are likely to replace', 'are very likely to replace'], '«Be likely to + infinitivo» = es probable que.'),
          tr('You must apply before the end of the month.', 'LATER', 'You must apply', 'the end of the month.', ['no later than', 'not later than'], '«No later than» = como muy tarde.'),
          tr('I’m not used to working from home.', 'ACCUSTOMED', 'I’m not', 'from home.', ['accustomed to working'], '«Be accustomed to + -ing» = estar acostumbrado a.'),
          tr('They will train the new staff next week.', 'TRAINED', 'The new staff', 'next week.', ['will be trained'], 'Pasiva con «will».')
        ]
      }
    ]
  },
  {
    title: 'A festival like no other',
    topic: 'Fiestas y tradiciones',
    focus: 'Preposiciones, conjunciones y phrasal verbs',
    tasks: [
      {
        type: 'openCloze',
        title: 'La Tomatina',
        text: 'Every August, the small Spanish town of Buñol is transformed {1} the scene of one of the messiest festivals in the world. La Tomatina, as it is known, involves thousands of people throwing tomatoes at each {2} for exactly one hour. Nobody knows for certain {3} the tradition began, but the most popular story says that it started in 1945, {4} a group of young people got into a food fight during a parade.\n\nThe festival was banned several times in its early years, but it became so popular that the authorities eventually gave {5}. Today, there are strict rules. Participants must squash the tomatoes before throwing them so that nobody gets hurt, and nobody is allowed {6} bring bottles or other hard objects. When the hour is {7}, fire engines hose down the streets, and the town is clean again {8} a matter of hours.',
        items: [
          gap('into', '«Be transformed into» = convertirse en.'),
          gap('other', '«Each other» = unos a otros.'),
          gap(['how', 'when', 'why'], 'Pregunta indirecta.'),
          gap('when', '«When» introduce el momento en que pasó.'),
          gap('in', '«Give in» = ceder.'),
          gap('to', '«Be allowed to + infinitivo».'),
          gap(['up', 'over'], '«Be up/over» = haber terminado.'),
          gap(['in', 'within'], '«In a matter of hours» = en cuestión de horas.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('They don’t let people bring glass bottles.', 'ALLOWED', 'People', 'glass bottles.', ['are not allowed to bring', 'aren’t allowed to bring'], '«Be allowed to» en negativa = no se permite.'),
          tr('The festival has taken place every year since 1945, except for a few years.', 'HELD', 'The festival', 'every year since 1945, except for a few years.', ['has been held'], 'Pasiva del present perfect: «has been held».'),
          tr('We got there early so that we would find a good spot.', 'ORDER', 'We got there early', 'a good spot.', ['in order to find', 'in order to get'], '«In order to» = para.'),
          tr('I’d never been to such a crowded event before.', 'MOST', 'It was the', 'I had ever been to.', ['most crowded event'], 'Superlativo + past perfect con «ever».')
        ]
      }
    ]
  },
  {
    title: 'Teenagers and sleep',
    topic: 'Salud',
    focus: 'Conectores, cuantificadores y preposiciones',
    tasks: [
      {
        type: 'openCloze',
        title: 'Late nights, early mornings',
        text: 'Teenagers are often accused of being lazy because they find it {1} difficult to get up in the morning. However, scientists now believe there is a biological reason for this. During adolescence, the body’s internal clock shifts, {2} means that teenagers naturally feel sleepy later at night and want to wake up later in the morning. This is a problem when school starts early. Many teenagers get {3} less sleep than the eight to ten hours they need, and this can affect {4} their mood and their ability to concentrate.\n\nSome schools have experimented {5} starting lessons later, with impressive results: students’ grades improved and fewer of them were late. Not everyone agrees that this is the answer, though. Some parents argue that teenagers should simply go to bed earlier. The problem is that, {6} if they do, their bodies may not be ready to sleep. Experts also recommend avoiding screens for at least an hour before bed, {7} the light they produce can keep the brain awake. Whatever the solution, a good night’s sleep is clearly {8} more important than many of us realise.',
        items: [
          gap('so', '«So + adjetivo» para enfatizar.'),
          gap('which', '«Which» tras coma: se refiere a toda la frase anterior.'),
          gap(['much', 'far'], '«Much/far less» refuerza el comparativo.'),
          gap('both', '«Both… and…» = tanto… como…'),
          gap('with', '«Experiment with» = probar algo.'),
          gap('even', '«Even if» = aunque, incluso si.'),
          gap(['as', 'because', 'since'], 'Conjunción causal.'),
          gap(['much', 'far', 'even'], 'Refuerzo del comparativo «more important».')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('Getting up so early is new to me.', 'USED', 'I’m', 'up so early.', ['not used to getting'], '«Be used to + -ing» = estar acostumbrado.'),
          tr('You should switch off your phone before bed.', 'WERE', 'If I', 'switch off my phone before bed.', ['were you, I would', 'were you, I’d', 'were you I would', 'were you I’d'], '«If I were you, I would…» para dar consejos.'),
          tr('Teenagers need more sleep than adults.', 'AS', 'Adults don’t need', 'teenagers.', ['as much sleep as'], '«As much + incontable + as».'),
          tr('It took me a long time to fall asleep last night.', 'AGES', 'I', 'to fall asleep last night.', ['took ages'], '«Take ages to do something» = tardar muchísimo.')
        ]
      }
    ]
  }
]
