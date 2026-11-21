// Hojas de formación de palabras: Part 3 (word formation) + Part 4 (transformaciones). Contenido original.
import { tr, wf, type SheetSpec } from './helpers'

export const WORD_FORMATION: SheetSpec[] = [
  {
    title: 'Living near a volcano',
    topic: 'Naturaleza',
    focus: 'Sufijos -ion, -ment, -ous y prefijos negativos',
    tasks: [
      {
        type: 'wordFormation',
        title: 'Life in the shadow of a volcano',
        text: 'Around 800 million people live within 100 kilometres of an active volcano. To outsiders, this may seem a strange {1}. Why would anyone choose to live in such a {2} place? The answer is that volcanic soil is {3} rich, which makes it ideal for farming. In addition, many volcanic areas attract large numbers of tourists, providing an important source of {4}.\n\nOf course, the risks are real. Eruptions are {5}, and even with modern technology scientists cannot always say exactly when one will happen. However, the {6} of early warning systems has made life much safer for local residents. In many places, regular {7} drills are held so that people know what to do in an emergency. For most residents, the {8} of living near a volcano clearly outweigh the dangers.',
        items: [
          wf('DECIDE', 'decision', 'Sustantivo: decide → decision.'),
          wf('DANGER', 'dangerous', 'Adjetivo con -ous delante de «place».'),
          wf('EXTREME', 'extremely', 'Adverbio que modifica al adjetivo «rich».'),
          wf('EMPLOY', 'employment', 'Sustantivo incontable: employment = empleo.'),
          wf('PREDICT', 'unpredictable', 'Adjetivo negativo: el texto dice que no se puede saber cuándo.'),
          wf('DEVELOP', 'development', 'Sustantivo tras «the… of».'),
          wf('EVACUATE', 'evacuation', 'Sustantivo usado como adjetivo: evacuation drills.'),
          wf('BENEFIT', 'benefits', 'Plural: el verbo es «outweigh».')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('The eruption destroyed several villages.', 'WERE', 'Several villages', 'the eruption.', ['were destroyed by'], 'Pasiva en pasado: «were + participio + by».'),
          tr('Scientists can’t predict exactly when it will erupt.', 'POSSIBLE', 'It isn’t', 'exactly when it will erupt.', ['possible to predict', 'possible for scientists to predict'], '«It isn’t possible to + infinitivo».'),
          tr('Living there is less dangerous than it used to be.', 'AS', 'Living there isn’t', 'it used to be.', ['as dangerous as', 'so dangerous as'], '«Not as + adjetivo + as».')
        ]
      }
    ]
  },
  {
    title: 'The online shopping boom',
    topic: 'Compras',
    focus: 'Adverbios, sustantivos abstractos y prefijos dis-/un-',
    tasks: [
      {
        type: 'wordFormation',
        title: 'Click and buy',
        text: 'Over the past decade, online shopping has grown {1}. For many people, the main attraction is {2}: you can buy almost anything without leaving your home. However, there are some {3}. It can be difficult to judge the {4} of a product from a photo, and returning items can be time-consuming. There are also concerns about the {5} impact of so many deliveries.\n\nSome shoppers have become so used to buying things with a single click that they find it hard to resist temptation, which can lead to {6} spending. Experts advise making a list before you start browsing and asking yourself whether a purchase is really {7}. It’s also worth reading comments from other {8} before you decide.',
        items: [
          wf('DRAMATIC', 'dramatically', 'Adverbio que modifica a «has grown».'),
          wf('CONVENIENT', 'convenience', 'Sustantivo: la comodidad.'),
          wf('ADVANTAGE', 'disadvantages', 'Plural y negativo: «some» + inconvenientes.'),
          wf('APPEAR', 'appearance', 'Sustantivo: el aspecto.'),
          wf('ENVIRONMENT', 'environmental', 'Adjetivo delante de «impact».'),
          wf('NECESSARY', 'unnecessary', 'Adjetivo negativo: gasto innecesario.'),
          wf('ESSENCE', 'essential', 'Adjetivo: esencial, imprescindible.'),
          wf('BUY', 'buyers', 'Persona y plural: «other buyers».')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I regret buying such an expensive coat.', 'WISH', 'I', 'such an expensive coat.', ['wish I hadn’t bought', 'wish I had not bought'], '«Wish + past perfect» para lamentar el pasado.'),
          tr('The parcel will probably arrive tomorrow.', 'LIKELY', 'The parcel', 'tomorrow.', ['is likely to arrive'], '«Be likely to» = es probable que.'),
          tr('You can return the item if you keep the receipt.', 'LONG', 'You can return the item', 'keep the receipt.', ['as long as you', 'so long as you'], '«As long as» = siempre que.')
        ]
      }
    ]
  },
  {
    title: 'Giving your time',
    topic: 'Voluntariado',
    focus: 'Sufijos de adjetivo (-able, -ive, -ing) y sustantivos',
    tasks: [
      {
        type: 'wordFormation',
        title: 'Why volunteer?',
        text: 'Volunteering is growing in {1} among young people. Many say that helping others gives them a great sense of {2}, but there is also a {3} side to it. Volunteering allows you to gain {4} experience that can make your CV more {5} to employers.\n\nPeople who volunteer often say they have become more {6} and better at working with others. Of course, the work can sometimes be {7}, and volunteers need to be {8}, as charities depend on them turning up when they have promised to.',
        items: [
          wf('POPULAR', 'popularity', 'Sustantivo tras «growing in».'),
          wf('SATISFY', 'satisfaction', 'Sustantivo: sense of satisfaction.'),
          wf('PRACTICE', 'practical', 'Adjetivo: el lado práctico.'),
          wf('VALUE', 'valuable', 'Adjetivo: experiencia valiosa.'),
          wf('ATTRACT', 'attractive', 'Adjetivo tras «more».'),
          wf('CONFIDENCE', 'confident', 'Adjetivo tras «become more».'),
          wf('CHALLENGE', 'challenging', 'Adjetivo: exigente, difícil.'),
          wf('RELY', 'reliable', 'Adjetivo: fiable.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I started volunteering at the shelter two years ago.', 'BEEN', 'I', 'at the shelter for two years.', ['have been volunteering', '’ve been volunteering'], 'Present perfect continuous + «for».'),
          tr('“You should try volunteering,” my teacher said to me.', 'ADVISED', 'My teacher', 'volunteering.', ['advised me to try'], '«Advise someone to do something».'),
          tr('The charity couldn’t survive without volunteers.', 'DEPENDS', 'The charity', 'volunteers.', ['depends on', 'depends completely on', 'depends entirely on'], '«Depend on» = depender de.')
        ]
      }
    ]
  },
  {
    title: 'Buildings of the future',
    topic: 'Arquitectura',
    focus: 'Sufijos -ive, -ing, -al y prefijo un-',
    tasks: [
      {
        type: 'wordFormation',
        title: 'Green architecture',
        text: 'Architects are becoming increasingly {1} in their efforts to design buildings that are kind to the planet. One {2} idea is the “vertical forest”: tall apartment blocks covered with thousands of trees and plants. Supporters say these buildings improve air quality and provide a {3} home for birds and insects. Another trend is the {4} use of wood rather than concrete and steel. Modern timber is surprisingly strong, and its {5} creates far less pollution.\n\nCritics point out that some of these designs are {6} to build and difficult to maintain. Nevertheless, as cities continue to grow, it seems {7} that architects will have to find new solutions. The {8} of these projects could shape the way we live for generations to come.',
        items: [
          wf('CREATE', 'creative', 'Adjetivo tras «increasingly».'),
          wf('EXCITE', 'exciting', 'Adjetivo en -ing: algo que emociona.'),
          wf('NATURE', 'natural', 'Adjetivo delante de «home».'),
          wf('INCREASE', 'increasing', 'Adjetivo en -ing delante de «use»: cada vez mayor.'),
          wf('PRODUCE', 'production', 'Sustantivo: la fabricación.'),
          wf('EXPENSE', 'expensive', 'Adjetivo: caro.'),
          wf('AVOID', 'unavoidable', 'Adjetivo negativo: inevitable.'),
          wf('SUCCEED', 'success', 'Sustantivo: el éxito.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('They finished the tower in only two years.', 'TOOK', 'It', 'to finish the tower.', ['only took them two years', 'took only two years', 'took them only two years', 'only took two years'], '«It took (someone) + tiempo + to do».'),
          tr('The building is so tall that you can see it from everywhere.', 'SUCH', 'It is', 'that you can see it from everywhere.', ['such a tall building'], '«Such a + adjetivo + sustantivo + that».'),
          tr('Wooden buildings are cheaper to heat than concrete ones.', 'COSTS', 'It', 'heat wooden buildings than concrete ones.', ['costs less to'], '«It costs less to + infinitivo».')
        ]
      }
    ]
  },
  {
    title: 'Remembering childhood',
    topic: 'Psicología',
    focus: 'Prefijos negativos (un-, im-) y sustantivos',
    tasks: [
      {
        type: 'wordFormation',
        title: 'Why can’t we remember being babies?',
        text: 'Most of us have very few memories from our early {1}. Scientists have a name for this: “childhood amnesia”. Our earliest memories usually date from around the age of three, and even these are often {2}. Some experts believe this is because the parts of the brain responsible for memory are still {3} in young children. Others think that language plays an important role: before we can talk, it may be {4} to store memories in a way we can later access.\n\n{5}, many people have clear “memories” of events that never actually happened. These are often based on photos or stories told by {6}. Researchers have shown how {7} false memories can be created, which has important {8} for the reliability of witnesses in court.',
        items: [
          wf('CHILD', 'childhood', 'Sustantivo: la infancia.'),
          wf('RELY', 'unreliable', 'Adjetivo negativo: poco fiables.'),
          wf('DEVELOP', 'developing', 'Participio en -ing: aún se están desarrollando.'),
          wf('POSSIBLE', 'impossible', 'Prefijo im- delante de p.'),
          wf('INTEREST', 'Interestingly', 'Adverbio al principio de la frase.'),
          wf('RELATE', 'relatives', 'Sustantivo plural: familiares.'),
          wf('EASY', 'easily', 'Adverbio que modifica a «can be created».'),
          wf('IMPLY', 'implications', 'Sustantivo plural: consecuencias.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I can’t remember anything before I was three.', 'MEMORY', 'I have', 'anything before I was three.', ['no memory of'], '«Have no memory of» = no recordar.'),
          tr('My parents often told me that story.', 'USED', 'My parents', 'me that story.', ['used to tell'], '«Used to» para hábitos del pasado.'),
          tr('It’s possible that I imagined the whole thing.', 'MIGHT', 'I', 'the whole thing.', ['might have imagined'], '«Might have + participio».')
        ]
      }
    ]
  },
  {
    title: 'Taking better photos',
    topic: 'Fotografía',
    focus: 'Sufijos -ful, -able, -ive y personas (-er)',
    tasks: [
      {
        type: 'wordFormation',
        title: 'Think before you click',
        text: 'Thanks to smartphones, we take more photos than ever before, yet many of them are quickly forgotten. If you want to improve, professional {1} say the most important thing is to think before you press the button. Pay {2} attention to the light: early morning and late afternoon often produce the most {3} results.\n\nTry to avoid {4} details in the background, as they can be a {5} from your main subject. Don’t be afraid to experiment with unusual angles — the most {6} photos often break the rules. Finally, be {7}. Instead of keeping hundreds of similar pictures, keep a few of the best. Your {8} will be far more impressive as a result.',
        items: [
          wf('PHOTOGRAPH', 'photographers', 'Persona y plural: «professional photographers».'),
          wf('CARE', 'careful', 'Adjetivo delante de «attention».'),
          wf('BEAUTY', 'beautiful', 'Adjetivo tras «the most».'),
          wf('NECESSARY', 'unnecessary', 'Adjetivo negativo: detalles innecesarios.'),
          wf('DISTRACT', 'distraction', 'Sustantivo tras «a».'),
          wf('MEMORY', 'memorable', 'Adjetivo: memorable.'),
          wf('SELECT', 'selective', 'Adjetivo tras «be».'),
          wf('COLLECT', 'collection', 'Sustantivo tras «your».')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I haven’t taken a good photo for weeks.', 'SINCE', 'It’s weeks', 'a good photo.', ['since I took', 'since I last took', 'since I’ve taken'], '«It’s + tiempo + since».'),
          tr('Someone stole my camera on holiday.', 'HAD', 'I', 'on holiday.', ['had my camera stolen'], '«Have something done»: algo que te pasa (a menudo malo).'),
          tr('Don’t delete any photos until you have checked them.', 'BEFORE', 'Check the photos', 'any of them.', ['before you delete', 'before deleting'], '«Before + -ing» o «before + sujeto + verbo».')
        ]
      }
    ]
  },
  {
    title: 'The mysteries of the deep',
    topic: 'Océanos',
    focus: 'Adverbios, adjetivos en -ed/-ing y sustantivos',
    tasks: [
      {
        type: 'wordFormation',
        title: 'Into the deep',
        text: 'Although oceans cover more than 70% of our planet, they remain {1} unexplored. In fact, we have more {2} maps of the surface of Mars than of the ocean floor. The deep sea is an extremely {3} environment: it is completely dark, freezing cold, and the {4} is enormous.\n\nDespite these conditions, it is home to an {5} variety of life. Many deep-sea creatures produce their own light, an ability known as bioluminescence. Exploring these depths is technically {6} and very {7}, but each new {8} brings fresh surprises.',
        items: [
          wf('LARGE', 'largely', 'Adverbio: en gran parte.'),
          wf('DETAIL', 'detailed', 'Adjetivo en -ed: detallados.'),
          wf('FRIEND', 'unfriendly', 'Adjetivo negativo: hostil.'),
          wf('PRESS', 'pressure', 'Sustantivo: la presión.'),
          wf('ASTONISH', 'astonishing', 'Adjetivo en -ing: asombrosa.'),
          wf('DEMAND', 'demanding', 'Adjetivo: exigente.'),
          wf('COST', 'costly', 'Adjetivo: costoso.'),
          wf('EXPEDITE', 'expedition', 'Sustantivo: expedición.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('Nobody has ever explored this part of the ocean.', 'BEEN', 'This part of the ocean', 'explored.', ['has never been'], 'Pasiva del present perfect con «never».'),
          tr('The submarine was too small for three people.', 'ENOUGH', 'The submarine wasn’t', 'three people.', ['big enough for', 'large enough for'], '«Adjetivo + enough for».'),
          tr('Every year our knowledge of the ocean increases.', 'MORE', 'Every year we learn', 'about the ocean.', ['more and more'], '«More and more» = cada vez más.')
        ]
      }
    ]
  },
  {
    title: 'Fast fashion',
    topic: 'Moda',
    focus: 'Sustantivos de persona, adverbios y prefijos',
    tasks: [
      {
        type: 'wordFormation',
        title: 'The true cost of cheap clothes',
        text: 'Clothes have never been cheaper, but this comes at a price. The fashion industry is one of the world’s biggest {1}, and huge quantities of clothing end up in landfill every year. Many items are worn only a few times before being thrown away, which is extremely {2}. Campaigners are calling for greater {3} from brands, and for better conditions for factory workers, many of whom are treated {4}.\n\nFortunately, there is a growing {5} of these problems. Second-hand clothes are becoming {6} popular, and some brands now offer to repair damaged items at no {7} cost. {8}, however, the most sustainable item of clothing is the one you already own.',
        items: [
          wf('POLLUTE', 'polluters', 'Sustantivo de agente y plural: los que contaminan.'),
          wf('WASTE', 'wasteful', 'Adjetivo: derrochador.'),
          wf('RESPONSIBLE', 'responsibility', 'Sustantivo tras «greater».'),
          wf('FAIR', 'unfairly', 'Adverbio negativo: de forma injusta.'),
          wf('AWARE', 'awareness', 'Sustantivo: conciencia.'),
          wf('INCREASE', 'increasingly', 'Adverbio: cada vez más.'),
          wf('ADD', 'additional', 'Adjetivo: adicional.'),
          wf('ULTIMATE', 'Ultimately', 'Adverbio al inicio: en última instancia.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I haven’t bought any new clothes this year.', 'ANYTHING', 'I haven’t', 'this year.', ['bought anything new', 'bought anything new to wear'], '«Anything new» = nada nuevo.'),
          tr('These jeans are too tight for me.', 'FIT', 'These jeans', 'me.', ['don’t fit', 'do not fit'], '«Fit» = quedar bien de talla.'),
          tr('Buying second-hand clothes is a good idea.', 'WORTH', 'It’s', 'second-hand clothes.', ['worth buying'], '«It’s worth + -ing» = merece la pena.')
        ]
      }
    ]
  },
  {
    title: 'Introverts and extroverts',
    topic: 'Personalidad',
    focus: 'Adjetivos de carácter (-ive, -able, -ed)',
    tasks: [
      {
        type: 'wordFormation',
        title: 'Which one are you?',
        text: 'We often describe people as either introverts or extroverts. Extroverts are typically {1} and outgoing, and they feel most {2} when they are surrounded by others. Introverts, on the other hand, often need time alone to recharge. Contrary to popular belief, introversion is not the same as {3}. Many introverts are {4} speakers who simply prefer deep conversations to small talk.\n\nIn {5}, most of us are somewhere in between. Psychologists use the term “ambivert” to describe people with a {6} personality. Understanding your own personality can be {7} when choosing a career, as it can help you find a working environment in which you will feel {8}.',
        items: [
          wf('TALK', 'talkative', 'Adjetivo: hablador.'),
          wf('COMFORT', 'comfortable', 'Adjetivo tras «feel most».'),
          wf('SHY', 'shyness', 'Sustantivo: la timidez.'),
          wf('CONFIDENCE', 'confident', 'Adjetivo delante de «speakers».'),
          wf('REAL', 'reality', '«In reality» = en realidad.'),
          wf('BALANCE', 'balanced', 'Adjetivo en -ed: equilibrada.'),
          wf('USE', 'useful', 'Adjetivo: útil.'),
          wf('MOTIVATE', 'motivated', 'Adjetivo en -ed: cómo te sientes tú.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I prefer staying at home to going to parties.', 'RATHER', 'I’d', 'than go to parties.', ['rather stay at home', 'rather stay home'], '«Would rather + infinitivo + than».'),
          tr('She is too shy to speak in public.', 'CONFIDENT', 'She isn’t', 'to speak in public.', ['confident enough'], '«Adjetivo + enough to».'),
          tr('“I’m not an introvert,” said Tom.', 'DENIED', 'Tom', 'an introvert.', ['denied being', 'denied that he was'], '«Deny + -ing» o «deny that…».')
        ]
      }
    ]
  },
  {
    title: 'Robots at home',
    topic: 'Tecnología',
    focus: 'Adverbios, adjetivos y prefijos negativos',
    tasks: [
      {
        type: 'wordFormation',
        title: 'Help around the house',
        text: 'Robot vacuum cleaners are already a common sight in many homes, but {1} are working on machines that can do much more. Some robots can now fold laundry, load the dishwasher and even cook simple meals. Their {2} say they will give people more free time and help elderly people to live {3} for longer.\n\nHowever, not everyone is {4}. Some people worry about {5}, as many home robots are fitted with cameras and microphones. Others argue that relying too much on machines could make us lazy. There are also {6} problems: domestic robots are still {7}, and their high price means they are {8} for most families.',
        items: [
          wf('ENGINE', 'engineers', 'Persona y plural: ingenieros.'),
          wf('SUPPORT', 'supporters', 'Persona y plural: partidarios.'),
          wf('DEPEND', 'independently', 'Adverbio negativo: de forma independiente.'),
          wf('ENTHUSIASM', 'enthusiastic', 'Adjetivo tras «is».'),
          wf('PRIVATE', 'privacy', 'Sustantivo: la privacidad.'),
          wf('PRACTICE', 'practical', 'Adjetivo delante de «problems».'),
          wf('RELY', 'unreliable', 'Adjetivo negativo: poco fiables.'),
          wf('AFFORD', 'unaffordable', 'Adjetivo negativo: inasequibles.')
        ]
      },
      {
        type: 'transformation',
        items: [
          tr('I’m sure robots will do most housework one day.', 'BOUND', 'Robots', 'most housework one day.', ['are bound to do'], '«Be bound to» = seguro que.'),
          tr('Somebody repaired our robot last week.', 'HAD', 'We', 'last week.', ['had our robot repaired'], '«Have something done» = encargar que te lo hagan.'),
          tr('It isn’t necessary to switch it off at night.', 'NEED', 'You', 'it off at night.', ['don’t need to switch', 'do not need to switch', 'needn’t switch'], '«Don’t need to / needn’t» = no hace falta.')
        ]
      }
    ]
  }
]
