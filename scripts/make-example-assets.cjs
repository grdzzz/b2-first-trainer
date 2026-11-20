// Genera los archivos del examen de ejemplo (PDF y audio) en resources/example/.
// Todo el contenido es ORIGINAL, escrito para esta app: no es material de Cambridge.
// Requisitos (solo para regenerarlos): playwright, espeak-ng y ffmpeg.
// Uso: node scripts/make-example-assets.cjs
const { chromium } = require('playwright')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const OUT = path.join(__dirname, '..', 'resources', 'example')
fs.mkdirSync(OUT, { recursive: true })

const NOTE = 'Material original de ejemplo creado para B2 First Trainer. No es contenido de Cambridge English.'
const css = `
  @page { size: A4; margin: 22mm 20mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.55; color: #111; }
  .cover { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 22px; }
  .cover h1 { font-size: 20pt; margin: 0 0 4px; }
  .cover p { margin: 0; color: #444; }
  h2 { font-size: 14pt; border-bottom: 1px solid #111; padding-bottom: 4px; margin: 28px 0 10px; }
  .instr { font-style: normal; margin-bottom: 12px; }
  .text { margin: 0 0 14px; text-align: justify; }
  table.opts { border-collapse: collapse; margin: 6px 0 14px; }
  table.opts td { padding: 2px 14px 2px 0; }
  .q { margin: 10px 0; }
  .q b { display: inline-block; width: 26px; }
  .kw { font-weight: bold; letter-spacing: .05em; }
  .box { border: 1px solid #444; padding: 10px 14px; margin: 8px 0 12px; }
  .note { margin-top: 30px; font-size: 8.5pt; color: #666; border-top: 1px solid #ccc; padding-top: 6px; }
  .pb { page-break-before: always; }
`
const page = (title, sub, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <div class="cover"><h1>${title}</h1><p>${sub}</p><p>Examen de ejemplo · B2 First Trainer</p></div>${body}<p class="note">${NOTE}</p></body></html>`

const options = (rows) => `<table class="opts">${rows.map(([n, o]) => `<tr><td><b>${n}</b></td>${o.map((x, i) => `<td>${'ABCD'[i]}&nbsp; ${x}</td>`).join('')}</tr>`).join('')}</table>`

const reading = page('Reading and Use of English', 'Time 10 minutes', `
  <h2>Reading and Use of English • Part 1</h2>
  <p class="instr">For questions 1 – 4, read the text below and decide which answer (A, B, C or D) best fits each gap.</p>
  <p class="text"><b>Learning Spanish at the night market</b><br>
  Every Friday evening, the old car park behind the station (<b>1</b>) ________ into a busy night market. Students who are learning Spanish have started going there to (<b>2</b>) ________ their speaking skills, because the stallholders are happy to chat while they cook. One student said that she had (<b>3</b>) ________ up more Spanish in three evenings at the market than in a month of lessons. The organisers have now (<b>4</b>) ________ up a small ‘language table’ where visitors can practise with volunteers.</p>
  ${options([[1, ['turns', 'makes', 'becomes', 'goes']], [2, ['increase', 'improve', 'raise', 'grow']], [3, ['caught', 'picked', 'taken', 'brought']], [4, ['put', 'made', 'set', 'took']]])}

  <h2>Reading and Use of English • Part 2</h2>
  <p class="instr">For questions 5 – 8, read the text below and think of the word which best fits each gap. Use only one word in each gap.</p>
  <p class="text"><b>My first week as a volunteer</b><br>
  I had never worked in a library (<b>5</b>) ________, so I was a bit nervous on my first day. Luckily, the other volunteers were very friendly and showed me (<b>6</b>) ________ to use the computer system. By Friday, I was able to help visitors find books (<b>7</b>) ________ asking anyone for help. I’m really glad I decided to (<b>8</b>) ________ part in the project.</p>

  <h2 class="pb">Reading and Use of English • Part 3</h2>
  <p class="instr">For questions 9 – 10, complete the second sentence so that it has a similar meaning to the first sentence, using the word given. Do not change the word given. You must use between two and five words, including the word given.</p>
  <div class="q"><b>9</b> It wasn’t necessary for us to bring food to the party.<br><span class="kw">HAVE</span><br>We ______________________ food to the party.</div>
  <div class="q"><b>10</b> I haven’t seen my cousin for two years.<br><span class="kw">LAST</span><br>The ______________________ my cousin was two years ago.</div>
`)

const writing = page('Writing', 'Time 20 minutes', `
  <h2>Writing • Part 1</h2>
  <p class="instr">You must answer this question. Write your answer in 140 – 190 words in an appropriate style.</p>
  <div class="q"><b>1</b> In your English class you have been talking about technology and free time. Now your English teacher has asked you to write an essay.<br>Write your essay using all the notes and giving reasons for your point of view.</div>
  <div class="box"><p><b>Young people spend too much time on their phones. Do you agree?</b></p>
  <p>Notes<br>Write about:<br>1. friendships<br>2. studying<br>3. ……………… (your own idea)</p></div>
`)

const listening = page('Listening', 'Approximately 5 minutes', `
  <h2>Listening • Part 1</h2>
  <p class="instr">You will hear a message about a swimming course. For questions 1 – 3, choose the best answer (A, B or C).</p>
  <div class="q"><b>1</b> When does the beginners’ group meet?<br>A&nbsp; on Mondays<br>B&nbsp; on Tuesdays<br>C&nbsp; on Fridays</div>
  <div class="q"><b>2</b> How much does the first class cost?<br>A&nbsp; nothing<br>B&nbsp; forty euros<br>C&nbsp; eight euros</div>
  <div class="q"><b>3</b> What should students bring?<br>A&nbsp; a swimming cap<br>B&nbsp; a towel<br>C&nbsp; a form</div>
`)

const speaking = page('Speaking', 'Approximately 5 minutes', `
  <h2>Speaking • Part 1</h2>
  <p class="instr">Answer the examiner’s questions. Speak for about one minute in total.</p>
  <div class="box"><p>• Where are you from? What do you like about living there?</p><p>• What do you enjoy doing in your free time?</p><p>• Tell us about a place you would like to visit, and why.</p></div>
`)

const LISTENING_SCRIPT =
  "Hi, it's Laura from the sports centre. I'm calling about the swimming course you asked about. " +
  "The beginners' group meets on Tuesdays, not on Mondays as it says on our website, because the pool is closed for cleaning on Monday evenings. " +
  'The course lasts eight weeks, and the first class is free, so you can see if you like it. After that, it costs forty euros. ' +
  "Please bring your own towel. Don't worry about a swimming cap, because we provide those. " +
  'If you want to join, just reply to this message before Friday. Thanks, and see you soon!'

;(async () => {
  const browser = await chromium.launch()
  const p = await browser.newPage()
  for (const [name, html] of Object.entries({ reading, writing, listening, speaking })) {
    await p.setContent(html)
    await p.pdf({ path: path.join(OUT, `${name}.pdf`), format: 'A4', printBackground: true })
  }
  await browser.close()
  const wav = path.join(OUT, 'listening.tmp.wav')
  execFileSync('espeak-ng', ['-v', 'en-gb', '-s', '145', '-g', '4', '-w', wav, LISTENING_SCRIPT])
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', path.join(OUT, 'listening.mp3')])
  fs.rmSync(wav)
  for (const f of fs.readdirSync(OUT)) console.log(f, fs.statSync(path.join(OUT, f)).size)
})()
