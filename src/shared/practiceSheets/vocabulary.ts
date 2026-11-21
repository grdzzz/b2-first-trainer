// Hojas de vocabulario: Part 1 (multiple-choice cloze) + Part 4 (transformaciones). Contenido original.
import { mc, tr, type SheetSpec } from './helpers'

export const VOCABULARY: SheetSpec[] = [
  {
    title: 'A trip that didn’t go to plan',
    topic: 'Viajes',
    focus: 'Phrasal verbs y expresiones de viaje',
    tasks: [
      {
        type: 'mcCloze',
        title: 'The road trip',
        text: 'Last summer my sister and I decided to {1} off on a road trip along the coast. We had been looking {2} to it for months, but things didn’t go quite as we had expected. On the very first day, the car {3} down in the middle of nowhere, and we had to wait three hours for a mechanic. Then we discovered that the hotel had no {4} of our booking, so we spent the night in a tiny guesthouse.\n\nDespite these problems, we decided to make the {5} of the situation. We took a {6} route through the mountains and found villages that no guidebook mentions. By the end of the week we had {7} so many wonderful memories that the bad start hardly seemed to {8} any more.',
        items: [
          mc(['set', 'go', 'take', 'put'], 'A', '«Set off» = salir de viaje. «Take off» es despegar y «put off», aplazar.'),
          mc(['ahead', 'forward', 'onward', 'further'], 'B', '«Look forward to» = tener ganas de algo.'),
          mc(['broke', 'fell', 'cut', 'turned'], 'A', '«Break down» = averiarse (un coche o una máquina).'),
          mc(['note', 'record', 'sign', 'mark'], 'B', '«Have no record of» = no tener constancia de algo.'),
          mc(['best', 'good', 'better', 'well'], 'A', '«Make the best of» = sacar el mejor partido de una situación mala.'),
          mc(['scenic', 'sightseeing', 'viewing', 'picture'], 'A', '«Scenic route» = ruta panorámica.'),
          mc(['made', 'done', 'got', 'held'], 'A', '«Make memories» = crear recuerdos.'),
          mc(['value', 'matter', 'mind', 'worry'], 'B', '«Matter» = importar. «Mind» necesita sujeto de persona.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I’m sorry I didn’t bring a map.', 'WISH', 'I', 'a map.', ['wish I had brought', 'wish I’d brought'], '«Wish» + past perfect expresa arrepentimiento sobre el pasado.'),
          tr('The journey took us six hours.', 'SPENT', 'We', 'on the journey.', ['spent six hours'], '«Spend time on something» = dedicar tiempo a algo.'),
          tr('It isn’t worth going to the museum on Mondays because it’s closed.', 'POINT', 'There is', 'to the museum on Mondays.', ['no point going', 'no point in going'], '«There is no point (in) + -ing» = no merece la pena.'),
          tr('We arrived late because of the heavy traffic.', 'DUE', 'Our late arrival', 'the heavy traffic.', ['was due to'], '«Be due to» = deberse a. Va con un sustantivo («our late arrival»).')
        ]
      }
    ]
  },
  {
    title: 'First day at a new job',
    topic: 'Trabajo',
    focus: 'Colocaciones con make, do y expresiones fijas',
    tasks: [
      {
        type: 'mcCloze',
        title: 'Making a good start',
        text: 'Starting a new job can be nerve-racking, but there are ways to {1} a good impression. First of all, arrive in good time: being late on your first day will not {2} you any favours. Try to remember your colleagues’ names and don’t be afraid to ask questions — nobody expects you to know everything straight {3}. It’s also a good idea to {4} a record of what is said in meetings, as you will be given a lot of information at once.\n\nIf you are offered help, accept it; most people are happy to {5} a hand. Remember that it usually takes a few weeks to {6} into a new routine. Above all, try not to put too much {7} on yourself. Your employer chose you because they believed you were the right person for the job, so you have every {8} to feel confident.',
        items: [
          mc(['make', 'do', 'have', 'take'], 'A', '«Make a good impression» = causar buena impresión.'),
          mc(['make', 'give', 'do', 'bring'], 'C', '«Do someone a favour» = hacer un favor. «Not do you any favours» = no te ayudará.'),
          mc(['out', 'away', 'on', 'up'], 'B', '«Straight away» = enseguida.'),
          mc(['keep', 'hold', 'save', 'store'], 'A', '«Keep a record of» = llevar un registro de.'),
          mc(['borrow', 'lend', 'hold', 'pass'], 'B', '«Lend a hand» = echar una mano.'),
          mc(['settle', 'sit', 'lie', 'stand'], 'A', '«Settle into» = adaptarse a algo nuevo.'),
          mc(['pressure', 'tension', 'weight', 'force'], 'A', '«Put pressure on yourself» = presionarse.'),
          mc(['reason', 'cause', 'motive', 'purpose'], 'A', '«Have every reason to» = tener motivos de sobra para.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I started working here three years ago.', 'FOR', 'I', 'three years.', ['have been working here for', 'have worked here for', '’ve been working here for', '’ve worked here for'], 'Present perfect + «for» para algo que empezó en el pasado y sigue.'),
          tr('“Don’t be late for the meeting,” my boss told me.', 'REMINDED', 'My boss', 'late for the meeting.', ['reminded me not to be'], '«Remind someone (not) to do something» = recordar a alguien que (no) haga algo.'),
          tr('The interview was easier than I had expected.', 'AS', 'The interview was not', 'I had expected.', ['as difficult as', 'as hard as', 'as tough as', 'so difficult as'], '«Not as + adjetivo + as» = no tan… como.'),
          tr('I’m sure they will offer her the job.', 'BOUND', 'She', 'the job.', ['is bound to be offered', '’s bound to be offered'], '«Be bound to» = seguro que. Aquí en pasiva: «be offered».')
        ]
      }
    ]
  },
  {
    title: 'A month without a smartphone',
    topic: 'Tecnología',
    focus: 'Verbos con preposición y expresiones con attention',
    tasks: [
      {
        type: 'mcCloze',
        title: 'Switching off',
        text: 'When journalist Marta Ruiz decided to give up her smartphone for a month, her friends thought she had {1} her mind. “At first it was really hard,” she admits. “I kept reaching for my pocket out of {2}.” Without maps on her phone, she got lost more than once and had to {3} on strangers for directions.\n\nBut after the first week, something changed. She found that she could {4} on her work for much longer, and she was sleeping better too. “I hadn’t realised how much time I was {5} scrolling through social media,” she says. She also began to {6} more attention to the people around her. Now that the experiment is over, Marta has gone back to using a phone, but she now {7} to a few simple rules: no screens at the dinner table and none in the bedroom. “Technology is great,” she says, “but it shouldn’t {8} over your life.”',
        items: [
          mc(['lost', 'missed', 'dropped', 'left'], 'A', '«Lose your mind» = volverse loco.'),
          mc(['habit', 'custom', 'practice', 'routine'], 'A', '«Out of habit» = por costumbre.'),
          mc(['rely', 'trust', 'believe', 'hope'], 'A', '«Rely on» = depender de. «Trust» no lleva «on».'),
          mc(['concentrate', 'centre', 'pay', 'attend'], 'A', '«Concentrate on» = concentrarse en.'),
          mc(['wasting', 'missing', 'passing', 'keeping'], 'A', '«Waste time (doing)» = perder el tiempo.'),
          mc(['pay', 'make', 'take', 'put'], 'A', '«Pay attention to» = prestar atención a.'),
          mc(['sticks', 'holds', 'stands', 'stays'], 'A', '«Stick to rules» = cumplir unas normas.'),
          mc(['take', 'get', 'come', 'go'], 'A', '«Take over» = apoderarse de, dominar.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I last checked my emails two days ago.', 'SINCE', 'It’s', 'checked my emails.', ['two days since I last', 'been two days since I'], '«It’s + tiempo + since» = hace… que.'),
          tr('Could you show me how this app works?', 'MIND', 'Would', 'me how this app works?', ['you mind showing'], '«Would you mind + -ing?» = ¿te importaría…?'),
          tr('My laptop is too old to run this game.', 'ENOUGH', 'My laptop is', 'to run this game.', ['not new enough', 'not powerful enough', 'not modern enough'], '«Not + adjetivo + enough» = no lo bastante.'),
          tr('People say that the new phone is very expensive.', 'SAID', 'The new phone', 'very expensive.', ['is said to be'], 'Pasiva impersonal: «be said to be».')
        ]
      }
    ]
  },
  {
    title: 'Small changes, big results',
    topic: 'Salud',
    focus: 'Phrasal verbs y expresiones sobre hábitos',
    tasks: [
      {
        type: 'mcCloze',
        title: 'Healthy habits',
        text: 'Many of us start the new year with ambitious plans to get into {1}, but by February most of these resolutions have been forgotten. According to experts, the problem is that we try to change too much at {2}. Instead, they suggest making small changes that are easy to {3} to. For example, rather than joining an expensive gym, you could take the stairs instead of the lift, or get off the bus one stop early and walk the rest of the {4}.\n\nWhen it comes to diet, cutting {5} fizzy drinks completely is a good starting point. It’s also important to make sure you don’t stay {6} too late looking at screens. Finally, don’t be too hard on yourself if you have a bad day. What really {7} is what you do most of the time, not what you do {8} and again.',
        items: [
          mc(['shape', 'form', 'condition', 'health'], 'A', '«Get into shape» = ponerse en forma.'),
          mc(['once', 'time', 'single', 'first'], 'A', '«At once» = a la vez, de golpe.'),
          mc(['stick', 'hold', 'stand', 'stay'], 'A', '«Stick to» = mantener (un plan, una costumbre).'),
          mc(['way', 'road', 'path', 'route'], 'A', '«The rest of the way» = el resto del camino.'),
          mc(['down', 'off', 'out', 'away'], 'C', '«Cut out» = eliminar por completo. «Cut down on» sería reducir.'),
          mc(['up', 'on', 'out', 'over'], 'A', '«Stay up» = quedarse despierto hasta tarde.'),
          mc(['matters', 'values', 'means', 'minds'], 'A', '«What really matters» = lo que de verdad importa.'),
          mc(['now', 'then', 'once', 'often'], 'A', '«Now and again» = de vez en cuando.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('You should see a doctor about that cough.', 'BETTER', 'You', 'a doctor about that cough.', ['had better see', '’d better see'], '«Had better + infinitivo» = más vale que.'),
          tr('I gave up eating meat two years ago.', 'STOPPED', 'I', 'two years ago.', ['stopped eating meat'], '«Stop + -ing» = dejar de hacer algo.'),
          tr('Walking is good for you, and so is swimming.', 'ONLY', 'Not', 'good for you, but so is swimming.', ['only is walking'], 'Inversión tras «Not only»: auxiliar antes del sujeto.'),
          tr('It was difficult for me to sleep because of the noise.', 'DIFFICULTY', 'I', 'because of the noise.', ['had difficulty sleeping', 'had difficulty in sleeping', 'had difficulty getting to sleep'], '«Have difficulty (in) + -ing» = tener dificultad para.')
        ]
      }
    ]
  },
  {
    title: 'The town that said no to plastic',
    topic: 'Medio ambiente',
    focus: 'Expresiones fijas y phrasal verbs',
    tasks: [
      {
        type: 'mcCloze',
        title: 'Plastic-free Hollowbrook',
        text: 'Five years ago, the small town of Hollowbrook decided to {1} a stand against plastic waste. Shops agreed to stop handing {2} plastic bags, and the local market began selling fruit and vegetables without packaging. At first, not everyone was in {3} of the idea. Some shop owners were worried that they would lose customers.\n\nHowever, the scheme turned {4} to be a great success. Residents quickly got {5} to bringing their own bags and containers, and visitors started coming from other towns to see how it worked. The amount of rubbish collected each week has fallen dramatically, and the town has {6} several awards. Other places are now following {7}. “It just shows,” says the mayor, “that a small community can make a real {8}.”',
        items: [
          mc(['take', 'give', 'put', 'hold'], 'A', '«Take a stand against» = posicionarse en contra de.'),
          mc(['out', 'over', 'off', 'in'], 'A', '«Hand out» = repartir.'),
          mc(['favour', 'side', 'agreement', 'approval'], 'A', '«Be in favour of» = estar a favor de.'),
          mc(['out', 'up', 'over', 'into'], 'A', '«Turn out to be» = resultar ser.'),
          mc(['used', 'familiar', 'known', 'usual'], 'A', '«Get used to + -ing» = acostumbrarse a.'),
          mc(['won', 'succeeded', 'reached', 'achieved'], 'A', '«Win an award» = ganar un premio.'),
          mc(['suit', 'example', 'lead', 'path'], 'A', '«Follow suit» = hacer lo mismo. «Example» y «lead» necesitarían «its».'),
          mc(['difference', 'progress', 'effect', 'result'], 'A', '«Make a difference» = marcar la diferencia.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('We must reduce the amount of waste we produce.', 'CUT', 'We must', 'the waste we produce.', ['cut down on', 'cut back on'], '«Cut down on» = reducir el consumo de algo.'),
          tr('If we don’t act now, it will be too late.', 'UNLESS', 'It will be too late', 'now.', ['unless we act'], '«Unless» = a menos que (equivale a «if… not»).'),
          tr('They are building a new recycling centre near the school.', 'BUILT', 'A new recycling centre', 'near the school.', ['is being built'], 'Pasiva del presente continuo: «is being + participio».'),
          tr('I’d prefer to cycle than to drive to work.', 'RATHER', 'I', 'drive to work.', ['would rather cycle than', '’d rather cycle than'], '«Would rather + infinitivo sin to + than» = preferir.')
        ]
      }
    ]
  },
  {
    title: 'Saving for something special',
    topic: 'Dinero',
    focus: 'Vocabulario de dinero y colocaciones',
    tasks: [
      {
        type: 'mcCloze',
        title: 'Leo’s motorbike',
        text: 'When Leo was sixteen, he set his {1} on buying a second-hand motorbike. The problem was that it {2} nearly two thousand euros, and he had almost nothing in the bank. Rather than asking his parents to {3} him the money, he decided to earn it himself. He found a weekend job at a café, which {4} quite well.\n\nHe also stopped buying things on {5}, like snacks and magazines, and began to keep {6} of everything he spent. It took him over a year, but he finally managed to save {7} money. “I’ve never been so proud of myself,” he says. “And because I worked hard for it, I take much better {8} of the bike than I would have otherwise.”',
        items: [
          mc(['heart', 'soul', 'eye', 'head'], 'A', '«Set your heart on something» = desear algo con todas tus fuerzas.'),
          mc(['cost', 'paid', 'valued', 'charged'], 'A', '«It cost…» = costaba. Las demás necesitan otra estructura.'),
          mc(['lend', 'borrow', 'owe', 'pay'], 'A', '«Lend someone money» = prestar. «Borrow» es pedir prestado.'),
          mc(['paid', 'earned', 'gave', 'won'], 'A', '«A job that pays well» = un trabajo bien pagado.'),
          mc(['impulse', 'instinct', 'whim', 'chance'], 'A', '«On impulse» = por impulso. «Whim» necesitaría «a».'),
          mc(['track', 'note', 'record', 'account'], 'A', '«Keep track of» = llevar la cuenta de.'),
          mc(['enough', 'plenty', 'many', 'lot'], 'A', '«Enough money» = suficiente dinero.'),
          mc(['care', 'attention', 'notice', 'interest'], 'A', '«Take care of» = cuidar.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I can’t afford to buy new trainers this month.', 'ENOUGH', 'I haven’t', 'new trainers this month.', ['got enough money to buy', 'got enough money for', 'enough money to buy', 'enough money for'], '«Not have enough money to/for» = no tener suficiente dinero.'),
          tr('The jacket was so expensive that I didn’t buy it.', 'SUCH', 'It was', 'that I didn’t buy it.', ['such an expensive jacket'], '«Such + a/an + adjetivo + sustantivo + that».'),
          tr('“I’ll pay you back on Friday,” Tom said to me.', 'PROMISED', 'Tom', 'back on Friday.', ['promised to pay me'], '«Promise to do something» = prometer hacer algo.'),
          tr('Shopping online is cheaper than going to the shops.', 'EXPENSIVE', 'Going to the shops is', 'shopping online.', ['more expensive than'], 'Comparativo de adjetivo largo: «more + adjetivo + than».')
        ]
      }
    ]
  },
  {
    title: 'Why we love scary films',
    topic: 'Cine y ocio',
    focus: 'Expresiones idiomáticas y colocaciones',
    tasks: [
      {
        type: 'mcCloze',
        title: 'The thrill of fear',
        text: 'Why would anyone pay to be frightened? It’s a question psychologists have been {1} for years. Horror films are more popular than ever, and many of them {2} millions at the box office. One explanation is that watching a scary film allows us to experience fear in a safe environment. Our hearts race and we may even jump out of our {3}, but we know that nothing bad will really happen.\n\nAnother reason is that the experience is often shared. Watching a horror film with friends can {4} people closer together. Some viewers also enjoy the feeling of relief when the film finally comes to an {5}. Not everyone is a {6}, of course. Some people can’t {7} the tension and spend most of the film with their eyes closed. But for fans, there’s {8} quite like a good scare.',
        items: [
          mc(['asking', 'wondering', 'questioning', 'enquiring'], 'A', '«Ask a question» = hacer una pregunta.'),
          mc(['make', 'win', 'gain', 'reach'], 'A', '«Make millions» = ganar millones.'),
          mc(['skin', 'clothes', 'bodies', 'minds'], 'A', '«Jump out of your skin» = pegar un bote del susto.'),
          mc(['bring', 'take', 'get', 'carry'], 'A', '«Bring people closer together» = unir a la gente.'),
          mc(['end', 'finish', 'stop', 'close'], 'A', '«Come to an end» = terminar.'),
          mc(['fan', 'supporter', 'follower', 'lover'], 'A', '«Be a fan» = ser aficionado. «Supporter» se usa para equipos.'),
          mc(['stand', 'carry', 'suffer', 'hold'], 'A', '«Can’t stand» = no soportar.'),
          mc(['nothing', 'anything', 'something', 'everything'], 'A', '«There’s nothing like…» = no hay nada como…')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I’ve never seen such a frightening film.', 'MOST', 'It’s the', 'I have ever seen.', ['most frightening film'], 'Superlativo + present perfect con «ever».'),
          tr('The film was so boring that we left early.', 'SUCH', 'It was', 'that we left early.', ['such a boring film'], '«Such a + adjetivo + sustantivo + that».'),
          tr('We didn’t go to the cinema because it was raining.', 'IF', 'We would have gone to the cinema', 'raining.', ['if it hadn’t been', 'if it had not been'], 'Tercer condicional: «if + past perfect».'),
          tr('It’s a pity I missed the concert.', 'WISH', 'I', 'the concert.', ['wish I hadn’t missed', 'wish I had not missed', 'wish I had gone to', 'wish I’d gone to', 'wish I had seen', 'wish I’d seen'], '«Wish» + past perfect para lamentar el pasado.')
        ]
      }
    ]
  },
  {
    title: 'Learning a language later in life',
    topic: 'Educación',
    focus: 'Colocaciones sobre aprendizaje',
    tasks: [
      {
        type: 'mcCloze',
        title: 'Never too late',
        text: 'Many people believe that it’s too late to learn a language once you’re an adult, but this is a {1}. While children may pick {2} pronunciation more easily, adults have important advantages. They are usually better at organising their time, and they can {3} on years of experience of learning other things. The key is to set realistic goals. Instead of trying to become fluent in a few months, aim to make steady {4}.\n\nIt also helps to {5} the language part of your daily life, for example by listening to podcasts on the way to work. Don’t worry about making mistakes: they are a natural part of the learning {6}. And if you {7} a point where you feel you’re not improving, try something new, like joining a conversation group. With patience and practice, you’ll be surprised at how {8} you can achieve.',
        items: [
          mc(['myth', 'rumour', 'story', 'tale'], 'A', '«Myth» = creencia falsa muy extendida.'),
          mc(['up', 'out', 'on', 'off'], 'A', '«Pick up» = aprender sin esfuerzo.'),
          mc(['draw', 'pull', 'take', 'bring'], 'A', '«Draw on experience» = recurrir a la experiencia.'),
          mc(['progress', 'advance', 'growth', 'development'], 'A', '«Make progress» = progresar.'),
          mc(['make', 'do', 'get', 'turn'], 'A', '«Make something part of your life» = convertir algo en parte de tu vida.'),
          mc(['process', 'method', 'system', 'course'], 'A', '«The learning process» = el proceso de aprendizaje.'),
          mc(['reach', 'arrive', 'get', 'come'], 'A', '«Reach a point» = llegar a un punto. Las demás necesitan preposición.'),
          mc(['much', 'many', 'far', 'long'], 'A', '«How much you can achieve» = cuánto puedes conseguir.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I find it difficult to remember new vocabulary.', 'HARD', 'It', 'to remember new vocabulary.', ['is hard for me', '’s hard for me'], '«It is hard for someone to do something».'),
          tr('Although she studied hard, she failed the exam.', 'DESPITE', 'She failed the exam', 'hard.', ['despite studying', 'despite having studied'], '«Despite + -ing» = a pesar de.'),
          tr('The teacher made us rewrite the essay.', 'TO', 'We', 'rewrite the essay.', ['were made to'], 'En pasiva, «make» lleva «to»: «be made to do».'),
          tr('It’s not necessary for you to buy the book.', 'HAVE', 'You', 'the book.', ['don’t have to buy', 'do not have to buy'], '«Don’t have to» = no es necesario.')
        ]
      }
    ]
  },
  {
    title: 'Running my first marathon',
    topic: 'Deporte',
    focus: 'Phrasal verbs y expresiones de esfuerzo',
    tasks: [
      {
        type: 'mcCloze',
        title: '42 kilometres',
        text: 'I never imagined I would run a marathon. Two years ago I couldn’t even run for a bus without getting out of {1}. But when a friend challenged me to {2} part in a charity race, I decided to {3} to the challenge. I started slowly, running for just ten minutes at a time, and gradually {4} up the distance. There were days when I wanted to give up, but my friend kept me {5}.\n\nOn the day of the race, the atmosphere was incredible. Thousands of people lined the streets, {6} us on. The last few kilometres were really tough, but I was determined to {7} it to the finish line. When I finally crossed it, I burst into tears. It was one of the proudest {8} of my life.',
        items: [
          mc(['breath', 'air', 'wind', 'lungs'], 'A', '«Out of breath» = sin aliento.'),
          mc(['take', 'have', 'make', 'play'], 'A', '«Take part in» = participar en.'),
          mc(['rise', 'stand', 'go', 'come'], 'A', '«Rise to the challenge» = estar a la altura del reto.'),
          mc(['built', 'made', 'put', 'got'], 'A', '«Build up» = aumentar poco a poco.'),
          mc(['going', 'staying', 'lasting', 'doing'], 'A', '«Keep someone going» = dar ánimos para seguir.'),
          mc(['cheering', 'shouting', 'calling', 'crying'], 'A', '«Cheer someone on» = animar a alguien.'),
          mc(['make', 'get', 'reach', 'do'], 'A', '«Make it to» = conseguir llegar a.'),
          mc(['moments', 'minutes', 'periods', 'instants'], 'A', '«One of the proudest moments of my life».')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I haven’t run this far before.', 'FIRST', 'It’s the', 'run this far.', ['first time I have', 'first time I’ve'], '«It’s the first time + present perfect».'),
          tr('He was too tired to finish the race.', 'SO', 'He was', 'he couldn’t finish the race.', ['so tired that', 'so tired'], '«So + adjetivo + (that)».'),
          tr('Training every day was really useful for me.', 'BENEFITED', 'I', 'every day.', ['benefited from training', 'really benefited from training', 'benefited a lot from training'], '«Benefit from + -ing» = beneficiarse de.'),
          tr('“Let’s go for a run tomorrow,” said Ana.', 'SUGGESTED', 'Ana', 'a run the next day.', ['suggested going for', 'suggested that we go for', 'suggested we go for', 'suggested we should go for'], '«Suggest + -ing» o «suggest (that) + sujeto + verbo».')
        ]
      }
    ]
  },
  {
    title: 'The rise of home cooking',
    topic: 'Comida',
    focus: 'Expresiones fijas y phrasal verbs',
    tasks: [
      {
        type: 'mcCloze',
        title: 'Back to the kitchen',
        text: 'In recent years, more and more young people have {1} an interest in cooking. Online videos have made it easier than ever to learn new recipes, and many people now see cooking as a way to {2} after a busy day. Cooking at home also has clear advantages when it {3} to health, as you know exactly what goes into your food. It can save you money, too. A meal for four made from fresh ingredients often costs a {4} of the price of a takeaway.\n\nOf course, things don’t always go according to {5}. Burnt dishes and kitchen disasters are all part of the fun. The important thing is not to be put {6} by mistakes. Before long, your friends may be {7} for an invitation to dinner, and your cooking could become the {8} of the town.',
        items: [
          mc(['taken', 'made', 'got', 'had'], 'A', '«Take an interest in» = interesarse por.'),
          mc(['relax', 'sleep', 'calm', 'relief'], 'A', '«Relax» = relajarse. «Calm» necesitaría «down».'),
          mc(['comes', 'goes', 'turns', 'gets'], 'A', '«When it comes to» = en lo que se refiere a.'),
          mc(['fraction', 'piece', 'part', 'portion'], 'A', '«A fraction of the price» = una mínima parte del precio.'),
          mc(['plan', 'schedule', 'programme', 'idea'], 'A', '«Go according to plan» = salir según lo previsto.'),
          mc(['off', 'on', 'down', 'away'], 'A', '«Be put off» = desanimarse.'),
          mc(['begging', 'demanding', 'requiring', 'needing'], 'A', '«Beg for» = suplicar, pedir con insistencia.'),
          mc(['talk', 'news', 'word', 'speech'], 'A', '«The talk of the town» = de lo que habla todo el mundo.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I haven’t cooked a meal for my friends before.', 'NEVER', 'I', 'a meal for my friends before.', ['have never cooked', '’ve never cooked'], 'Present perfect con «never».'),
          tr('This recipe is too complicated for me.', 'FOLLOW', 'This recipe is too complicated', '.', ['for me to follow'], '«Too + adjetivo + for someone + to do».'),
          tr('It’s possible that she forgot to buy the eggs.', 'MAY', 'She', 'to buy the eggs.', ['may have forgotten'], '«May have + participio» = puede que haya…'),
          tr('Someone is going to deliver our groceries tomorrow.', 'DELIVERED', 'Our groceries', 'tomorrow.', ['are going to be delivered', 'will be delivered'], 'Pasiva con «be going to» o «will».')
        ]
      }
    ]
  }
]
