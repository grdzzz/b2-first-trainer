// Hojas de lectura: Part 5 (multiple choice) y Part 7 (multiple matching). Textos originales.
import { mt, q, type SheetSpec } from './helpers'

export const READING: SheetSpec[] = [
  {
    title: 'The lighthouse summer',
    topic: 'Relato',
    focus: 'Comprender actitudes y sentimientos del narrador',
    tasks: [
      {
        type: 'readingMc',
        title: 'The lighthouse summer',
        text: 'The summer I turned seventeen, my parents sent me to stay with my aunt Iris, who ran a small café next to a lighthouse on the north coast. I was furious. All my friends were spending the holidays together in the city, and I was convinced I would die of boredom in a place where the only excitement was the arrival of the morning ferry.\n\nIris was not what I had expected. I had imagined a quiet, slightly old-fashioned woman who would ask me to wash dishes and go to bed early. Instead, she turned out to be a former sailor who had crossed the Atlantic twice and could fix almost anything with a screwdriver and a piece of string. She didn’t ask me to do much at all, at least at first. “You’ll find something to keep you busy,” she said on my first evening, and then she went back to reading her book.\n\nFor the first week, I did nothing except sulk and send long, dramatic messages to my friends. But the signal was terrible, and most of my messages never arrived. Gradually, almost without noticing, I started helping in the café. I learned to make coffee that people actually wanted to drink, and I began to recognise the regular customers: the fisherman who always asked for extra sugar, the painter who sat by the window for hours.\n\nBy the end of August, I didn’t want to leave. When my parents came to collect me, my mother looked at me as if I were a stranger. “You look different,” she said. I wasn’t sure what she meant, but I knew she was right. I had arrived believing that nothing could happen in a place like that. I left understanding that the most important things are often the ones you don’t notice while they are happening.',
        items: [
          q('How did the writer feel about going to stay with Iris?', ['curious about what the area would be like', 'angry about missing time with friends', 'nervous about meeting a relative', 'worried about having to work'], 'B', '«I was furious. All my friends were spending the holidays together…»'),
          q('What surprised the writer about Iris?', ['She was stricter than expected.', 'She was much older than expected.', 'She had led an adventurous life.', 'She wanted help in the café immediately.'], 'C', 'Había cruzado el Atlántico dos veces: «a former sailor».'),
          q('What does the writer suggest about the first week?', ['The writer behaved in a rather childish way.', 'The writer’s friends ignored the messages.', 'Iris was disappointed with the writer.', 'The café was too busy to enjoy.'], 'A', '«I did nothing except sulk and send long, dramatic messages».'),
          q('The phrase “almost without noticing” in paragraph 3 shows that the writer’s change', ['was encouraged by the customers.', 'happened slowly and naturally.', 'was planned by Iris.', 'surprised the writer’s friends.'], 'B', '«Gradually, almost without noticing»: un cambio lento y natural.'),
          q('What is the writer’s main point in the final paragraph?', ['Parents often fail to understand their children.', 'It is important to try new jobs when you are young.', 'Valuable experiences are not always obvious at the time.', 'Living in the countryside is better than living in a city.'], 'C', '«The most important things are often the ones you don’t notice while they are happening».')
        ]
      }
    ]
  },
  {
    title: 'A year away',
    topic: 'Año sabático',
    focus: 'Localizar información concreta en varios textos',
    tasks: [
      {
        type: 'matching',
        title: 'My gap year',
        intro: 'Four young people talk about the year they took off between school and university.',
        sections: [
          { label: 'A', title: 'Nadia', text: 'I spent six months working on an organic farm in New Zealand. The work was physically exhausting, and I’d never done anything like it before. What I hadn’t expected was how much I would enjoy the routine. Getting up at dawn and going to bed early made me feel healthier than I ever had at school. I came back with very little money, but I didn’t mind at all.' },
          { label: 'B', title: 'Tom', text: 'My parents weren’t keen on the idea of a gap year at first. They were worried I would lose interest in studying and never go to university. I promised them I would use the time to save money, and I did: I worked in a supermarket for nine months and then travelled around South America for three. The travelling part was amazing, though I had to be very careful with my budget.' },
          { label: 'C', title: 'Lucía', text: 'I volunteered at a school in Ghana, teaching English to young children. It was challenging, especially at the beginning, when I felt I had no idea what I was doing. The other teachers were incredibly patient with me. That experience made me change my mind about what I wanted to study: I had planned to do law, but I ended up choosing education instead.' },
          { label: 'D', title: 'Ben', text: 'Honestly, I took a gap year because I didn’t get the grades I needed. I retook two exams and spent the rest of the time working in a café. It wasn’t the adventure some of my friends had, but it gave me time to grow up a bit. When I finally started university, I was much more organised than the people around me, and I think that was a direct result of that year.' }
        ],
        items: [
          mt('Which person changed their plans for the future?', 'C', 'Lucía iba a estudiar derecho y eligió educación.'),
          mt('Which person had to persuade other people that a gap year was a good idea?', 'B', 'Sus padres no estaban convencidos.'),
          mt('Which person was surprised to like something?', 'A', '«What I hadn’t expected was how much I would enjoy the routine».'),
          mt('Which person did not originally intend to take a gap year?', 'D', 'Lo hizo porque no sacó las notas necesarias.'),
          mt('Which person mentions receiving support from colleagues?', 'C', '«The other teachers were incredibly patient with me».'),
          mt('Which person felt they were better prepared than other students?', 'D', '«I was much more organised than the people around me».')
        ]
      }
    ]
  },
  {
    title: 'In praise of boredom',
    topic: 'Psicología',
    focus: 'Opinión del autor, propósito y referencia',
    tasks: [
      {
        type: 'readingMc',
        title: 'Why being bored is good for you',
        text: 'When was the last time you were truly bored? For most of us, the answer is probably “not recently”. The moment we have nothing to do — waiting for a bus, standing in a queue — we reach for our phones. Within seconds, the uncomfortable feeling has disappeared. It seems like a perfect solution. But according to a growing number of researchers, we may be losing something valuable.\n\nIn one well-known experiment, participants were asked to complete a deliberately dull task: copying numbers from a phone book. Afterwards, they were asked to come up with as many uses as possible for a pair of plastic cups. Those who had done the boring task produced more ideas, and more original ones, than a group who had gone straight to the creative challenge. The researchers concluded that boredom pushes the mind to wander, and that this “daydreaming” is when some of our best ideas appear.\n\nThis does not mean that boredom is always pleasant or useful. Long periods of it, particularly when people feel they have no control over their situation, can lead to frustration and even depression. The point is not that we should seek it out, but that we shouldn’t automatically try to escape it either.\n\nSo what can we do? Some experts suggest setting aside short periods each day without screens: a walk without headphones, or ten minutes looking out of the window. It may feel strange at first. In fact, many people find it surprisingly difficult, which says a lot about how used we have become to constant entertainment. But those who persist often report that they feel calmer and that ideas come to them more easily. Perhaps, then, the next time you find yourself waiting for a bus, it might be worth leaving your phone in your pocket.',
        items: [
          q('What does the writer say about the way people react to boredom today?', ['They rarely notice when they are bored.', 'They avoid it as quickly as possible.', 'They find it more unpleasant than before.', 'They are bored more often than in the past.'], 'B', '«The moment we have nothing to do… we reach for our phones».'),
          q('What did the experiment show?', ['Boring tasks make people less creative.', 'People who were bored had more original ideas.', 'Most people enjoy creative challenges.', 'Daydreaming makes people work more slowly.'], 'B', 'Los que hicieron la tarea aburrida dieron más ideas y más originales.'),
          q('In the third paragraph, the writer wants to', ['warn that boredom can have negative effects.', 'encourage readers to look for boredom.', 'explain why some people are never bored.', 'criticise the results of the experiment.'], 'A', 'Matiza: el aburrimiento largo puede causar frustración y depresión.'),
          q('What does “which” refer to in paragraph 4?', ['looking out of the window', 'the fact that people find it hard', 'the walk without headphones', 'constant entertainment'], 'B', '«Which» se refiere a que a mucha gente le resulta difícil.'),
          q('What is the writer’s overall attitude to boredom?', ['It should be avoided whenever possible.', 'It is only useful for creative people.', 'It can be beneficial in small amounts.', 'It is the main cause of depression.'], 'C', 'Propone periodos breves y no huir automáticamente del aburrimiento.')
        ]
      }
    ]
  },
  {
    title: 'Unusual jobs',
    topic: 'Trabajo',
    focus: 'Encontrar ideas expresadas con otras palabras',
    tasks: [
      {
        type: 'matching',
        title: 'My job is different',
        intro: 'Four people describe jobs that most people have never heard of.',
        sections: [
          { label: 'A', title: 'Water slide tester', text: 'People think I just have fun all day, and I suppose that’s partly true. But I also have to write detailed reports on safety, speed and comfort, and I travel constantly, which can be lonely. The best part is seeing a family enjoy a slide that I helped to improve. The worst part? Getting into cold water at eight in the morning in October.' },
          { label: 'B', title: 'Professional queuer', text: 'Busy people pay me to stand in line for them — for concert tickets, new phones, that kind of thing. It sounds boring, but I’ve met fascinating people in queues. I always bring a good book and a folding chair. The pay isn’t brilliant, but I can choose when I work, which suits me perfectly as I’m also studying.' },
          { label: 'C', title: 'Ice cream flavour developer', text: 'I studied chemistry, so I never imagined I’d end up working with ice cream. Every new flavour takes months of testing, and most ideas never reach the shops. You need a lot of patience. People always ask if I get tired of eating ice cream. The honest answer is yes — I hardly ever eat it at home.' },
          { label: 'D', title: 'Golf ball diver', text: 'I collect golf balls from the bottom of lakes on golf courses, clean them and sell them. Visibility in the water is often zero, so I do everything by touch. It’s not for everyone: you need to stay calm in uncomfortable conditions. I started doing it as a summer job ten years ago and never stopped.' }
        ],
        items: [
          mt('Which person says their job has flexible hours?', 'B', '«I can choose when I work».'),
          mt('Which person’s job is not related to what they studied?', 'C', 'Estudió química y trabaja con helados.'),
          mt('Which person admits that others have a mistaken idea about the job?', 'A', '«People think I just have fun all day».'),
          mt('Which person has lost interest in a product they work with?', 'C', 'Ya casi no come helado en casa.'),
          mt('Which person describes working without being able to see?', 'D', '«Visibility… is often zero, so I do everything by touch».'),
          mt('Which person mentions spending a lot of time away from home?', 'A', '«I travel constantly, which can be lonely».')
        ]
      }
    ]
  },
  {
    title: 'Lost in Tokyo',
    topic: 'Viajes',
    focus: 'Inferir significado y actitudes',
    tasks: [
      {
        type: 'readingMc',
        title: 'My first week in Tokyo',
        text: 'I had prepared for my move to Tokyo for months. I had studied Japanese every evening, read countless blogs and memorised the map of the neighbourhood where I would be living. So I was quite confident when I stepped off the plane. That confidence lasted until roughly the moment I tried to buy a train ticket.\n\nThe machine in front of me had at least thirty buttons, and although there was an English option, I couldn’t find it. A queue was forming behind me. Just as I was about to give up, an elderly man stepped forward, pressed three buttons in quick succession and handed me a ticket. Before I could thank him properly, he had bowed and disappeared into the crowd.\n\nThat was the first of many small kindnesses. In my first week I got lost every single day, and every single day someone helped me. A shop assistant walked me two streets to show me where the post office was. A schoolgirl drew me a map on the back of her homework. I began to realise that the city’s reputation for being cold and unfriendly — something I had read about on more than one blog — was simply wrong, or at least incomplete.\n\nWhat I found harder to adjust to was not the language or the transport but the silence. On a packed train in the morning, with hundreds of people pressed together, you could hear a pin drop. At first I found it almost uncomfortable; I kept wanting to apologise for breathing. Now, a year later, it is one of the things I love most about the city. When I go home to visit my family, the noise of public transport there seems unbearable.',
        items: [
          q('What does the writer say about the first moments in Tokyo?', ['The writer felt nervous from the start.', 'The writer’s preparation was quickly put to the test.', 'The writer immediately found the area familiar.', 'The writer regretted not studying more.'], 'B', 'La confianza duró «until… I tried to buy a train ticket».'),
          q('Why did the elderly man leave so quickly?', ['He was annoyed by the queue.', 'He did not want to be thanked at length.', 'He was late for his train.', 'He could not speak English.'], 'B', 'Se inclinó y desapareció antes de que pudiera darle las gracias: no buscaba agradecimiento.'),
          q('What does the writer say about the blogs?', ['They gave a misleading picture of the people.', 'They were useful for finding places.', 'They were written by people who had never lived there.', 'They exaggerated the problems with transport.'], 'A', 'La fama de ciudad fría «was simply wrong, or at least incomplete».'),
          q('The writer uses the expression “you could hear a pin drop” to show that', ['the trains were dangerously crowded.', 'passengers were unfriendly to foreigners.', 'the trains were extremely quiet.', 'people were listening to the writer.'], 'C', '«Se podía oír caer un alfiler» = silencio total.'),
          q('How has the writer’s attitude to the silence changed?', ['It now seems strange to the writer.', 'The writer has come to appreciate it.', 'The writer still finds it uncomfortable.', 'The writer now prefers noisy places.'], 'B', 'Ahora es una de las cosas que más le gustan.')
        ]
      }
    ]
  },
  {
    title: 'Never too late to play',
    topic: 'Música',
    focus: 'Distinguir información parecida entre textos',
    tasks: [
      {
        type: 'matching',
        title: 'Learning an instrument as an adult',
        intro: 'Four adults explain why they started learning an instrument.',
        sections: [
          { label: 'A', title: 'Maria, 52 — cello', text: 'I always wanted to play the cello, but my parents couldn’t afford lessons. When my children left home, I finally had both the time and the money. My teacher is half my age, which felt strange at first, but she’s brilliant. Progress is slow, and some weeks I barely practise. Still, I wouldn’t give it up for anything.' },
          { label: 'B', title: 'Jonas, 38 — drums', text: 'My job is very stressful, and my doctor suggested I find a hobby to help me relax. I don’t think she had drums in mind! The neighbours weren’t delighted, so I now practise on an electronic kit with headphones. Hitting something hard after a long day at the office is the best therapy I’ve found.' },
          { label: 'C', title: 'Aisha, 45 — piano', text: 'I played the piano as a child but stopped at fourteen because I hated the exams. Thirty years later, I bought a second-hand piano and was amazed at how much my fingers remembered. This time I’m playing just for pleasure — no exams, no pressure. I mostly play film music, which my old teacher would never have allowed.' },
          { label: 'D', title: 'Raj, 61 — ukulele', text: 'My granddaughter got a ukulele for her birthday and I started learning so that we could play together. Neither of us is very good, but that doesn’t matter. It’s become something special that we share. I’ve also joined a ukulele club in my town, and it has been a great way to meet new people since I retired.' }
        ],
        items: [
          mt('Which person started playing again after a long break?', 'C', 'Tocaba de niña y lo retomó 30 años después.'),
          mt('Which person took up an instrument on professional advice?', 'B', 'Se lo sugirió su médica.'),
          mt('Which person was unable to learn when they were young for financial reasons?', 'A', '«My parents couldn’t afford lessons».'),
          mt('Which person mentions making new friends through music?', 'D', 'Se unió a un club y conoce a gente nueva.'),
          mt('Which person had to find a solution to avoid disturbing others?', 'B', 'Usa una batería electrónica con auriculares por los vecinos.'),
          mt('Which person admits that they do not always practise regularly?', 'A', '«Some weeks I barely practise».')
        ]
      }
    ]
  },
  {
    title: 'Foxes in the city',
    topic: 'Naturaleza',
    focus: 'Detalle, actitud del autor y vocabulario en contexto',
    tasks: [
      {
        type: 'readingMc',
        title: 'The secret life of urban foxes',
        text: 'If you live in a large British city, you have probably seen one: a thin, reddish animal crossing the road late at night or sitting calmly on a garden wall. Urban foxes have become so common that many people no longer give them a second glance. Yet only a century ago, foxes were almost unknown in towns. Their move into cities is one of the most remarkable wildlife stories of recent times.\n\nScientists believe the change began in the 1930s, when cities expanded rapidly and new suburbs with large gardens were built on what had been farmland. Instead of leaving, the foxes simply stayed and adapted. Gardens offered shelter, and the rubbish people threw away provided an almost endless supply of food. Today, some researchers estimate that there are around 150,000 foxes living in British towns and cities.\n\nNot everyone is pleased about this. Some residents complain about noise — foxes can make alarming screaming sounds at night — and about rubbish bins being knocked over. There are also occasional stories in the press about foxes attacking people, although experts point out that such incidents are extremely rare and usually exaggerated.\n\nWhat fascinates biologists is how quickly city foxes have changed their behaviour. Compared with their country cousins, they are bolder, less afraid of humans and more willing to try new kinds of food. Some studies even suggest that their physical appearance is changing, with shorter faces that may be better suited to eating rubbish than hunting. In other words, the city is not just a new home for foxes; it may be turning them into a slightly different animal.',
        items: [
          q('What does the writer suggest in the first paragraph?', ['Most people are frightened of urban foxes.', 'People have become used to seeing foxes in cities.', 'Foxes have lived in cities for centuries.', 'Foxes are rarely seen in gardens.'], 'B', '«Many people no longer give them a second glance».'),
          q('According to the second paragraph, why did foxes stay in the new suburbs?', ['They were protected by law.', 'They found places to hide and plenty to eat.', 'Farmers drove them out of the countryside.', 'People started feeding them deliberately.'], 'B', 'Los jardines daban refugio y la basura, comida.'),
          q('What does the writer say about reports of foxes attacking people?', ['They have increased recently.', 'They are often not accurate.', 'They are mostly about children.', 'They have caused many complaints.'], 'B', '«Extremely rare and usually exaggerated».'),
          q('The word “bolder” in paragraph 4 is closest in meaning to', ['more confident', 'more aggressive', 'more intelligent', 'more careful'], 'A', '«Bold» = atrevido, seguro; lo aclara «less afraid of humans».'),
          q('What is the main point of the final paragraph?', ['City foxes are becoming dangerous.', 'Country foxes are more intelligent than city ones.', 'City life may be changing foxes in significant ways.', 'Foxes will soon leave the cities.'], 'C', 'La ciudad podría estar convirtiéndolos en un animal algo distinto.')
        ]
      }
    ]
  },
  {
    title: 'Starting again',
    topic: 'Trabajo',
    focus: 'Parafrasear: misma idea con otras palabras',
    tasks: [
      {
        type: 'matching',
        title: 'A new career',
        intro: 'Four people describe changing career in their thirties or forties.',
        sections: [
          { label: 'A', title: 'From banker to baker', text: 'I earned a fortune in the bank, but I was miserable. Opening a bakery meant giving up my salary and my company car, and my friends thought I was crazy. The first two years were incredibly hard financially. Now the business is doing well, and although I work longer hours than ever, I’ve never been happier.' },
          { label: 'B', title: 'From nurse to software developer', text: 'I loved helping patients, but the night shifts were destroying my health. I took an online coding course in my free time, which took almost two years. The hardest part was believing that someone my age could start again. My nursing experience turned out to be useful: I now build apps for hospitals.' },
          { label: 'C', title: 'From lawyer to primary teacher', text: 'Changing career was the easy part; telling my parents was much harder. They had made a lot of sacrifices to send me to law school. Eventually they came round, especially when they saw how much I enjoy teaching. The salary is lower, of course, but I have more time for my own family.' },
          { label: 'D', title: 'From journalist to farmer', text: 'I wrote about farming for years before I decided to try it myself. I thought I knew a lot, but I quickly discovered how little I understood. My neighbours taught me more in one season than I had learned in a decade of interviews. It’s physically demanding work, but I sleep better than I ever did in the city.' }
        ],
        items: [
          mt('Which person had to deal with family disapproval?', 'C', 'Lo difícil fue decírselo a sus padres.'),
          mt('Which person was able to use skills from their previous job?', 'B', 'Su experiencia como enfermera le sirve en apps para hospitales.'),
          mt('Which person realised they knew less than they thought?', 'D', '«I quickly discovered how little I understood».'),
          mt('Which person went through a period of money problems?', 'A', '«The first two years were incredibly hard financially».'),
          mt('Which person doubted their ability to change at their age?', 'B', '«Believing that someone my age could start again».'),
          mt('Which person now works more than before?', 'A', '«I work longer hours than ever».')
        ]
      }
    ]
  },
  {
    title: 'The young chef',
    topic: 'Comida',
    focus: 'Seguir el hilo de una historia y la referencia',
    tasks: [
      {
        type: 'readingMc',
        title: 'Learning the hard way',
        text: 'When Daniel Moreno started working in a professional kitchen at the age of nineteen, he thought he knew how to cook. He had spent his teenage years making dinner for his family and watching cookery programmes, and friends always praised his food. On his first day at a busy restaurant in Valencia, the head chef asked him to chop onions. Three hours later, he was still chopping.\n\n“I thought it was some kind of joke,” Daniel remembers. “I was waiting for them to let me do something interesting.” But it was no joke. For the first two months, he did almost nothing but prepare vegetables. When he asked the head chef when he would be allowed to cook, she replied that he already was. “She told me that a chef who can’t cut vegetables perfectly will never cook anything perfectly,” he says. “At the time I thought she was just being difficult. Now I repeat it to every new person in my own kitchen.”\n\nThe hours were long and the pressure enormous. On busy nights the kitchen was so hot and noisy that he could barely think. More than once, he considered giving up. What kept him going, he says, was the sense of being part of a team. “When a service goes well, it’s an amazing feeling. Nobody can do it alone.”\n\nTen years later, Daniel runs his own small restaurant, which has just received its first important award. He admits he is a demanding boss, but insists he is a fair one. “I don’t ask anyone to do anything I haven’t done myself,” he says. “Including chopping onions for three hours.”',
        items: [
          q('How did Daniel feel about his cooking skills before his first job?', ['He was confident about them.', 'He was worried they were not good enough.', 'He thought they needed formal training.', 'He had never really thought about them.'], 'A', 'Creía que sabía cocinar y sus amigos le elogiaban.'),
          q('What was Daniel’s first reaction to the task he was given?', ['He was proud to be trusted.', 'He did not take it seriously.', 'He found it physically exhausting.', 'He complained to the head chef.'], 'B', '«I thought it was some kind of joke».'),
          q('What did the head chef mean when she said he was already cooking?', ['Preparing food well is an essential part of cooking.', 'He would be given more responsibility soon.', 'He was better at cooking than he thought.', 'Other chefs were doing the difficult work.'], 'A', 'Sin cortar perfectamente no se cocina perfectamente.'),
          q('What helped Daniel to continue when things were hard?', ['the money he was earning', 'the support of his family', 'the feeling of working together with others', 'the chance to win awards'], 'C', '«The sense of being part of a team».'),
          q('What does the final sentence show about Daniel?', ['He still finds chopping onions boring.', 'He treats his staff as he was treated.', 'He regrets how hard his training was.', 'He prefers to do the simple jobs himself.'], 'B', 'Pide lo mismo que él hizo: ser exigente pero justo.')
        ]
      }
    ]
  },
  {
    title: 'Weekend breaks',
    topic: 'Viajes',
    focus: 'Buscar información rápida (scanning) en reseñas',
    tasks: [
      {
        type: 'matching',
        title: 'Four short breaks',
        intro: 'Four travellers review a weekend break they took recently.',
        sections: [
          { label: 'A', title: 'A cabin in the mountains', text: 'No Wi-Fi, no phone signal and the nearest shop was an hour’s walk away. My partner was horrified at first, but by Sunday neither of us wanted to leave. The cabin itself was basic but spotless. Bring warm clothes — even in June, the nights were freezing. I’d go back tomorrow.' },
          { label: 'B', title: 'A city break in Porto', text: 'We packed a lot into two days: museums, a boat trip and far too many custard tarts. The old town is steep, so comfortable shoes are a must. Our hotel was in a great location but the room was tiny and noisy. Next time I’d spend a bit more on somewhere quieter.' },
          { label: 'C', title: 'A cooking weekend in Tuscany', text: 'I booked this as a birthday present for my mother and we both loved it. The classes were relaxed and fun, and we ate everything we made. The group was small, which meant we got plenty of attention from the chef. It wasn’t cheap, but it was worth every cent.' },
          { label: 'D', title: 'A beach weekend on the coast', text: 'The beach was beautiful, but it rained for the whole weekend, so we barely saw it. Luckily, the town had a good aquarium and a lovely old cinema. The guesthouse owner lent us umbrellas and recommended a fantastic fish restaurant. Not the weekend we planned, but we still had fun.' }
        ],
        items: [
          mt('Which person changed their opinion of the place during the stay?', 'A', 'La pareja estaba horrorizada al principio y luego no quería irse.'),
          mt('Which person warns about low temperatures?', 'A', '«Even in June, the nights were freezing».'),
          mt('Which person was disappointed with the accommodation?', 'B', 'Habitación pequeña y ruidosa.'),
          mt('Which person bought the trip as a gift?', 'C', 'Fue un regalo de cumpleaños para su madre.'),
          mt('Which person had to change plans because of the weather?', 'D', 'Llovió todo el fin de semana.'),
          mt('Which person praises someone for being helpful?', 'D', 'El dueño les prestó paraguas y les recomendó un restaurante.')
        ]
      }
    ]
  }
]
